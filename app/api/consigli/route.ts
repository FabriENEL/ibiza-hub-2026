import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Chiave letta solo lato server: non raggiunge mai il browser.
const FSQ_KEY = process.env.FOURSQUARE_API_KEY;
const FSQ_URL = 'https://places-api.foursquare.com/places/search';
const FSQ_VERSION = '2025-06-17'; // intestazione di versione obbligatoria della nuova API

// Categorie cucite sul mood "viaggio tra amici". Per ora query testuali: semplici da
// modificare/estendere per altri tipi di evento (matrimonio, meeting...) senza toccare la logica.
const CATEGORIES = [
  { id: 'beach', title: 'Spiagge e relax', query: 'beach' },
  { id: 'aperitivo', title: 'Aperitivo e tramonto', query: 'cocktail bar' },
  { id: 'food', title: 'Cena di gruppo', query: 'restaurant' },
  { id: 'night', title: 'Nightlife', query: 'nightclub' },
  { id: 'parking', title: 'Parcheggi', query: 'parking' },
];

// Geocoding gratuito Open-Meteo (nessuna chiave): qualsiasi luogo -> coordinate.
// Sostituisce la vecchia lista di città scritta a mano: Rimini, Ibiza o ovunque.
async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=it&name=' + encodeURIComponent(location));
    const d = await res.json();
    const r = d?.results?.[0];
    return r ? { lat: r.latitude, lon: r.longitude } : null;
  } catch { return null; }
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
        name: p.name ?? '—',
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
  if (!FSQ_KEY) return NextResponse.json({ sections: [], geo: null, error: 'no_key' });

  let location: string | null = null;
  try { location = (await req.json())?.location ?? null; } catch { /* body assente */ }

  const geo = location ? await geocode(location) : null;
  if (!geo) return NextResponse.json({ sections: [], geo: null, error: location ? 'geocode_failed' : 'no_location' });

  const ll = geo.lat + ',' + geo.lon;
  const results = await Promise.all(
    CATEGORIES.map(async (c) => {
      const r = await fsqTop3(ll, c.query);
      return { id: c.id, title: c.title, tips: r.tips, diag: r.error };
    })
  );
  const sections = results.map(({ id, title, tips }) => ({ id, title, tips }));
  const diag = results.find((r) => r.diag)?.diag ?? null;

  return NextResponse.json({ sections, geo, diag });
}