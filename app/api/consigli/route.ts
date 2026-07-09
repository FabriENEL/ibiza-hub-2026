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
    '&sort=POPULARITY&limit=15&fields=fsq_place_id,name,rating,price,categories';
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: 'Bearer ' + FSQ_KEY,
        'X-Places-Api-Version': FSQ_VERSION,
        accept: 'application/json',
      },
    });
    if (!res.ok) return { tips: [], error: 'fsq_' + res.status };
    const d = await res.json();
    const raw = (d?.results ?? d?.places ?? []) as any[];
    const tips = raw
      .map((p) => ({
        name: p.name ?? '—',
        type: p.categories?.[0]?.name ?? '',
        rating: typeof p.rating === 'number' ? p.rating : null,
        price: typeof p.price === 'number' ? p.price : null,
      }))
      // ordina per valutazione decrescente (i senza voto in fondo), poi i 3 migliori
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
      .slice(0, 3);
    return { tips, error: null };
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
  const sections = await Promise.all(
    CATEGORIES.map(async (c) => {
      const r = await fsqTop3(ll, c.query);
      return { id: c.id, title: c.title, tips: r.tips };
    })
  );

  return NextResponse.json({ sections, geo, error: null });
}