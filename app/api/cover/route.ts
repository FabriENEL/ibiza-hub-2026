import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { segna } from '../../lib/usage';

const UNSPLASH_URL = 'https://api.unsplash.com/search/photos';
const GP_URL = 'https://places.googleapis.com/v1/places:searchText';
// Stessa field mask di /api/consigli: esclude i campi a pagamento (rating, price).
const GP_FIELDS = 'places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.photos';
const CACHE_GIORNI = 30;

const RATE_MAX = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();
function rateLimited(id: string): boolean {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) { hits.set(id, recent); return true; }
  recent.push(now); hits.set(id, recent); return false;
}

// Restituisce { url, credit } oppure { url: null } se nulla trovato / errore.
// Il chiamante decide il fallback: nessuna crepa mai a schermo.
// Regista invisibile: distilla un titolo evento (gergo IT) in query immagine inglese, 3-5 parole.
async function toEnglishQuery(title: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return title;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You turn a short Italian event title into 3-5 English keywords for a stock photo search. Reply ONLY with the keywords, no punctuation, no quotes. Capture the atmosphere and setting. Example: \'torneo di padel tra amici\' -> padel tennis tournament friends outdoor' },
          { role: 'user', content: title },
        ],
        temperature: 0.3, max_tokens: 200, reasoning_effort: 'low',
      }),
    });
    if (!res.ok) { console.error('GROQ regista', res.status, await res.text()); return title; }
    const data = await res.json();
    const kw = data.choices?.[0]?.message?.content?.trim();
if (!res.ok) return title;
return kw && kw.length > 2 ? kw.slice(0, 80) : title;
  } catch { return title; }
}

// Client con chiave di servizio per la cache: stessa infrastruttura di /api/consigli.
function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try { return createClient(url, key); } catch { return null; }
}

// Google Places (New) - Text Search: cerca il luogo e ne prende la prima foto.
async function placePhoto(location: string): Promise<string | null> {
  const gpKey = process.env.GOOGLE_PLACES_KEY;
  if (!gpKey) return null;
  try {
    const res = await fetch(GP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': gpKey, 'X-Goog-FieldMask': GP_FIELDS },
      body: JSON.stringify({ textQuery: location, languageCode: 'it', maxResultCount: 1 }),
    });
    segna('google_places', 'cover', { meta: { location } });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.places?.[0]?.photos?.[0]?.name ?? null;
  } catch { return null; }
}

// Cache PRIMA di ogni chiamata a Google (TTL 30 giorni); scrittura DOPO, solo su
// risultato buono: una risposta vuota non merita 30 giorni di vita (come /api/consigli).
async function luogoPhotoConCache(location: string): Promise<string | null> {
  const sb = sbAdmin();
  const city = location.toLowerCase();
  const CAT = 'cover'; // namespace dedicato dentro places_cache, non collide con le categorie Consigli
  if (sb) {
    const { data } = await sb.from('places_cache').select('payload, fetched_at').eq('city', city).eq('categoria', CAT).maybeSingle();
    if (data) {
      const eta = (Date.now() - new Date((data as any).fetched_at).getTime()) / 86400000;
      if (eta < CACHE_GIORNI) return (data as any).payload?.photo ?? null;
    }
  }
  const photo = await placePhoto(location);
  if (sb && photo) {
    await sb.from('places_cache').upsert({ city, categoria: CAT, payload: { photo }, fetched_at: new Date().toISOString() }, { onConflict: 'city,categoria' });
  }
  return photo;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) return NextResponse.json({ url: null });

  try {
    const body = await req.json();
    const raw = String(body?.query ?? '').trim().slice(0, 120);
    const loc = String(body?.location ?? '').trim().slice(0, 120);

    // LIVELLO 1: foto reale del luogo via Google Places (cache-first). Un luogo vero
    // merita la sua foto, non un'immagine generica da parole chiave.
    if (loc) {
      const photo = await luogoPhotoConCache(loc);
      if (photo) return NextResponse.json({ url: '/api/foto?n=' + encodeURIComponent(photo), credit: null, creditUrl: null });
    }

    // LIVELLO 2: Unsplash dalle parole chiave del titolo (comportamento invariato).
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return NextResponse.json({ url: null });
    if (!raw) return NextResponse.json({ url: null });
    const q = await toEnglishQuery(raw);

    const url = UNSPLASH_URL + '?query=' + encodeURIComponent(q)
      + '&per_page=1&orientation=landscape&content_filter=high';
    segna('unsplash', 'cover', { meta: { q } });
    const res = await fetch(url, { headers: { 'Authorization': 'Client-ID ' + key } });
    if (!res.ok) return NextResponse.json({ url: null, diag: 'HTTP ' + res.status + ' ' + (await res.text()).slice(0, 160) });

    const data = await res.json();
    const photo = data.results?.[0];
    if (!photo) return NextResponse.json({ url: null, diag: 'ok ma 0 foto per: ' + q });

    return NextResponse.json({
      url: photo.urls?.regular ?? null,
      credit: photo.user?.name ?? null,
      creditUrl: photo.user?.links?.html ?? null,
    });
  } catch {
    return NextResponse.json({ url: null });
  }
}

