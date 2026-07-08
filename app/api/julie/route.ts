import { NextRequest, NextResponse } from 'next/server';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

// System prompt: personalità di J.U.L.I.E. — custode formale e rassicurante dell'ecosistema EventGarden.
const SYSTEM = `Sei J.U.L.I.E. (Join Us Living In EventGarden), l'assistente dell'app EventGarden per l'organizzazione di eventi di gruppo.
Ti rivolgi sempre all'utente con il "Lei", tono formale ma caldo e rassicurante. Sei concisa, elegante, mai prolissa.
Il tuo ruolo è aiutare a gestire eventi, spese e ricordi del gruppo. Rispondi sempre in italiano.
Se l'utente chiede qualcosa fuori dalle tue competenze, lo riporti gentilmente al contesto dell'app.`;

export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: 'Configurazione mancante' }, { status: 500 });

  try {
    const { messages } = await req.json();
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM }, ...(messages ?? [])],
        temperature: 0.6,
        max_tokens: 500,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: 'Julie non risponde', detail }, { status: 502 });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Mi scusi, non ho compreso.';
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: 'Errore interno', detail: String(e) }, { status: 500 });
  }
}
