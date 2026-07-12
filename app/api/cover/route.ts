import { NextRequest, NextResponse } from 'next/server';

const UNSPLASH_URL = 'https://api.unsplash.com/search/photos';

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
        temperature: 0.3, max_tokens: 30,
      }),
    });
    if (!res.ok) return title;
    const data = await res.json();
    const kw = data.choices?.[0]?.message?.content?.trim();
    return kw && kw.length > 2 ? kw.slice(0, 80) : title;
  } catch { return title; }
}

export async function POST(req: NextRequest) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ url: null });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) return NextResponse.json({ url: null });

  try {
    const { query } = await req.json();
    const raw = String(query ?? '').trim().slice(0, 120);
    if (!raw) return NextResponse.json({ url: null });
    const q = await toEnglishQuery(raw);

    const url = UNSPLASH_URL + '?query=' + encodeURIComponent(q)
      + '&per_page=1&orientation=landscape&content_filter=high';
    const res = await fetch(url, { headers: { 'Authorization': 'Client-ID ' + key } });
    if (!res.ok) return NextResponse.json({ url: null });

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

