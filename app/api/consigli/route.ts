import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Chiave letta solo lato server: non raggiunge mai il browser.
const FSQ_KEY = process.env.FOURSQUARE_API_KEY;
const FSQ_URL = 'https://places-api.foursquare.com/places/search';
const FSQ_VERSION = '2025-06-17'; // intestazione di versione obbligatoria della nuova API

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Categorie cucite sul mood "viaggio tra amici". Query testuali: semplici da
// estendere ad altri tipi di evento (matrimonio, meeting...) senza toccare la logica.
const CATEGORIES = [
  { id: 'beach', title: 'Spiagge e relax', query: 'beach' },
  { id: 'aperitivo', title: 'Aperitivo e tramonto', query: 'cocktail bar' },
  { id: 'food', title: 'Cena di gruppo', query: 'restaurant' },
  { id: 'night', title: 'Nightlife', query: 'nightclub' },
  { id: 'parking', title: 'Parcheggi', query: 'parking' },
];

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

async function fsqTop3(ll: string, query: string) {
  const url = FSQ_URL + '?ll=' + ll + '&radius=6000&query=' + encodeURIComponent(query) +
    '&sort=POPULARITY&limit=10&fields=fsq_place_id,name,categories,latitude,longitude,location';
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: 'Bearer ' + FSQ_KEY,
        'X-Places-Api-Version': FSQ_VERSION,
        accept: 'application/json',
      },
    });
    const bodyText = await res.text();
    if (!res.ok) return { tips: [], error: 'HTTP ' + res.status + ' ' + bodyText.slice(0, 160) };
    let d: any = {};
    try { d = JSON.parse(bodyText); } catch { return { tips: [], error: 'risposta non-JSON: ' + bodyText.slice(0, 120) }; }
    const raw = (d?.results ?? d?.places ?? []) as any[];
    const diag = raw.length === 0 ? 'ok ma 0 risultati (chiavi: ' + Object.keys(d).join(',') + ')' : null;
    const tips = raw
      .slice(0, 3) // gia' ordinati per popolarita' da Foursquare
      .map((p) => ({
        name: p.name ?? '-',
        type: p.categories?.[0]?.name ?? '',
        lat: typeof p.latitude === 'number' ? p.latitude : null,
        lon: typeof p.longitude === 'number' ? p.longitude : null,
        address: p.location?.formatted_address ?? p.location?.address ?? null,
      }));
    return { tips, error: diag };
  } catch {
    return { tips: [], error: 'fetch_failed' };
  }
}

export async function POST(req: Request) {
  if (!FSQ_KEY) return NextResponse.json({ sections: [], geo: null, error: 'no_key', diag: 'Chiave Foursquare assente sul server.' });

  let location: string | null = null;
  try { location = (await req.json())?.location ?? null; } catch { /* body assente */ }

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

  const ll = geo.lat + ',' + geo.lon;
  const results = await Promise.all(
    CATEGORIES.map(async (c) => {
      const r = await fsqTop3(ll, c.query);
      return { id: c.id, title: c.title, tips: r.tips, diag: r.error };
    })
  );
  const sections = results.map(({ id, title, tips }) => ({ id, title, tips }));
  const diag = results.find((r) => r.diag)?.diag ?? null;

  // 'risolto' dice su quale comune sono ancorati consigli e meteo: utile all'utente e alla diagnosi.
  return NextResponse.json({ sections, geo, risolto: geo.risolto, diag });
}