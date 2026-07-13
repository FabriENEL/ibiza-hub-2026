import { NextRequest, NextResponse } from 'next/server';
import { segna } from '../../lib/usage';
export const dynamic = 'force-dynamic';

// Serve la foto di Google Places senza esporre la chiave al browser.
// Il client chiede /api/foto?n=places/XXX/photos/YYY e riceve un redirect all'immagine.
// La cache HTTP (30 giorni) evita di ripetere la chiamata a ogni apertura del calendario.
export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_KEY;
  const nome = req.nextUrl.searchParams.get('n');
  if (!key || !nome) return new NextResponse(null, { status: 404 });

  const url = 'https://places.googleapis.com/v1/' + nome
    + '/media?maxWidthPx=800&key=' + key;

  try {
    segna('google_foto', 'photo');
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return new NextResponse(null, { status: 404 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=2592000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
