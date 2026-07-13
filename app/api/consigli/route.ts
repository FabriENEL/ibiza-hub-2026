import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
// Chiave letta solo lato server: non raggiunge mai il browser.
const GP_KEY = process.env.GOOGLE_PLACES_KEY;
const GP_URL = 'https://places.googleapis.com/v1/places:searchText';
// Field mask: chiediamo SOLO i campi del livello Pro. rating/reviews farebbero salire
// la chiamata al livello Enterprise (35-40$/1000 invece di 32$). Non li chiediamo mai.
const GP_FIELDS = 'places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.photos';
const CACHE_GIORNI = 30;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Categorie cucite sul mood "viaggio tra amici". Query testuali: semplici da
// estendere ad altri tipi di evento (matrimonio, meeting...) senza toccare la logica.
const CATEGORIES = [
  { id: 'colazione', title: 'Colazione e caffe', query: 'caffetteria' },
  { id: 'beach', title: 'Spiagge e relax', query: 'spiaggia' },
  { id: 'aperitivo', title: 'Aperitivo e tramonto', query: 'cocktail bar' },
  { id: 'food', title: 'Cena di gruppo', query: 'ristorante' },
  { id: 'night', title: 'Nightlife', query: 'discoteca' },
  { id: 'cultura', title: 'Arte e cultura', query: 'museo' },
  { id: 'natura', title: 'Natura e passeggiate', query: 'parco' },
  { id: 'parking', title: 'Parcheggi', query: 'parcheggio' },
];
// Set predefinito quando l'Hub non ha ancora scelto le sue sei categorie.
const CATS_DEFAULT = ['colazione', 'food', 'aperitivo', 'night', 'beach', 'cultura'];

type Geo = { lat: number; lon: number; risolto: string };

// Geocoding gratuito Open-Meteo (nessuna chiave). Riconosce COMUNI, non nomi di locali.
async function geocode(nome: string): Promise<Geo | null> {
  try {
    const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=it&name=' + encodeURIComponent(nome));
    const d = await res.json();
    const r = d?.results?.[0];
    return r ? { lat: r.latitude, lon: r.longitude, risolto: r.name } : null;
  } catch { return null; }
}

// Il "regista" Groq estrae il solo comune da un luogo scritto liberamente.
// "Ristorante Garden Monza" -> "Monza". Restituisce null se non ne riconosce uno.
async function comuneDa(luogo: string): Promise<string | null> {
  if (!GROQ_KEY) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        max_tokens: 20,
        messages: [
          { role: 'system', content: 'Estrai il nome del comune o citta da un luogo scritto liberamente. Rispondi SOLO con il nome del comune, senza altro testo. Se non riconosci nessun comune rispondi esattamente: NESSUNO' },
          { role: 'user', content: luogo },
        ],
      }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const out = (d?.choices?.[0]?.message?.content ?? '').trim();
    if (!out || out.toUpperCase().includes('NESSUNO') || out.length > 60) return null;
    return out;
  } catch { return null; }
}

// Ultima rete: se Groq tace, il comune e' spesso l'ultima parola ("... Monza") o le ultime due ("... Reggio Emilia").
function candidatiEuristici(luogo: string): string[] {
  const p = luogo.replace(/[,;]/g, ' ').split(/\s+/).filter(Boolean);
  const out: string[] = [];
  if (p.length >= 1) out.push(p[p.length - 1]);
  if (p.length >= 2) out.push(p.slice(-2).join(' '));
  return out.filter((c) => c.length > 2);
}

// Cascata: luogo intero -> comune via Groq -> euristica. Il primo che geolocalizza vince.
async function risolviLuogo(luogo: string): Promise<Geo | null> {
  const diretto = await geocode(luogo);
  if (diretto) return diretto;

  const comune = await comuneDa(luogo);
  if (comune) {
    const g = await geocode(comune);
    if (g) return g;
  }

  for (const c of candidatiEuristici(luogo)) {
    const g = await geocode(c);
    if (g) return g;
  }
  return null;
}

// Client Supabase con chiave di servizio: la cache e' roba del server, RLS senza policy la blinda.
function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try { return createClient(url, key); } catch { return null; }
}

// Google Places (New) - Text Search. Il campo languageCode restituisce i nomi in italiano.
async function googleTop3(lat: number, lon: number, query: string, comune: string) {
  if (!GP_KEY) return { tips: [], error: 'no_key' };
  try {
    const res = await fetch(GP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GP_KEY,
        'X-Goog-FieldMask': GP_FIELDS,
      },
      body: JSON.stringify({
        textQuery: query + ' a ' + comune,
        languageCode: 'it',
        maxResultCount: 6,
        locationBias: { circle: { center: { latitude: lat, longitude: lon }, radius: 6000 } },
      }),
    });
    const body = await res.text();
    if (!res.ok) return { tips: [], error: 'HTTP ' + res.status + ' ' + body.slice(0, 160) };
    let d: any = {};
    try { d = JSON.parse(body); } catch { return { tips: [], error: 'risposta non-JSON' }; }
    const raw = (d?.places ?? []) as any[];
    if (raw.length === 0) return { tips: [], error: 'ok ma 0 risultati' };
    const tips = raw.slice(0, 6).map((p) => ({
      name: p.displayName?.text ?? '-',
      type: p.primaryTypeDisplayName?.text ?? '',
      lat: typeof p.location?.latitude === 'number' ? p.location.latitude : null,
      lon: typeof p.location?.longitude === 'number' ? p.location.longitude : null,
      address: p.formattedAddress ?? null,
      photo: p.photos?.[0]?.name ?? null,
    }));
    return { tips, error: null };
  } catch {
    return { tips: [], error: 'fetch_failed' };
  }
}

// Scudo economico: i luoghi di una citta' non cambiano ogni giorno. Una chiamata a Google
// vale 30 giorni per tutti gli utenti. Senza questa cache le 5.000 chiamate gratuite mensili
// si bruciano in una settimana di collaudi.
async function luoghiConCache(comune: string, lat: number, lon: number, cat: { id: string; query: string }) {
  const sb = sbAdmin();
  const city = comune.trim().toLowerCase();

  if (sb) {
    const { data } = await sb.from('places_cache')
      .select('payload, fetched_at').eq('city', city).eq('categoria', cat.id).maybeSingle();
    if (data) {
      const eta = (Date.now() - new Date((data as any).fetched_at).getTime()) / 86400000;
      if (eta < CACHE_GIORNI) return { tips: (data as any).payload ?? [], error: null, cached: true };
    }
  }

  const r = await googleTop3(lat, lon, cat.query, comune);
  // Si salva solo il risultato buono: una risposta vuota non merita 30 giorni di vita.
  if (sb && r.tips.length > 0) {
    await sb.from('places_cache')
      .upsert({ city, categoria: cat.id, payload: r.tips, fetched_at: new Date().toISOString() }, { onConflict: 'city,categoria' });
  }
  return { ...r, cached: false };
}

export async function POST(req: Request) {
  if (!GP_KEY) return NextResponse.json({ sections: [], geo: null, error: 'no_key', diag: 'Chiave Google Places assente sul server.' });

  let location: string | null = null;
  let cats: string[] | null = null;
  try { const b = await req.json(); location = b?.location ?? null; cats = Array.isArray(b?.cats) ? b.cats : null; } catch { /* body assente */ }

  if (!location) return NextResponse.json({ sections: [], geo: null, error: 'no_location', diag: null });

  const geo = await risolviLuogo(location);
  if (!geo) {
    return NextResponse.json({
      sections: [],
      geo: null,
      error: 'geocode_failed',
      diag: 'Non ho individuato la zona di "' + location + '". Provi ad aggiungere il comune (es. "Ristorante Garden, Monza").',
    });
  }

  // L'Hub sceglie le sue categorie (colonna consigli_cats). Senza scelta, il set predefinito.
  const scelte: string[] = Array.isArray(cats) && cats.length > 0 ? cats : CATS_DEFAULT;
  const attive = CATEGORIES.filter((c) => scelte.includes(c.id));
  const results = await Promise.all(
    attive.map(async (c) => {
      const r = await luoghiConCache(geo.risolto, geo.lat, geo.lon, c);
      return { id: c.id, title: c.title, tips: r.tips, diag: r.error };
    })
  );
  const sections = results.map(({ id, title, tips }) => ({ id, title, tips }));
  const diag = results.find((r) => r.diag)?.diag ?? null;

  // 'risolto' dice su quale comune sono ancorati consigli e meteo: utile all'utente e alla diagnosi.
  return NextResponse.json({ sections, geo, risolto: geo.risolto, diag });
}
