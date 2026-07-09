import { NextRequest, NextResponse } from 'next/server';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

const SYSTEM = `Sei J.U.L.I.E. (Join Us Living In EventGarden), l'assistente dell'app EventGarden per l'organizzazione di eventi di gruppo.
Ti rivolgi sempre all'utente con il "Lei", tono formale ma caldo e rassicurante. Sei concisa, elegante, mai prolissa.
Il tuo ruolo è aiutare a gestire eventi, spese e ricordi del gruppo. Rispondi sempre in italiano.
Se l'utente chiede qualcosa fuori dalle tue competenze, lo riporti gentilmente al contesto dell'app.`;

function azionePrompt(oggi: string): string {
  const schema = '{"action":"aggiungi_evento","title":"<titolo>","scheduled_at":"<YYYY-MM-DDTHH:MM:SS>","location":"<luogo o null>","description":"<descrizione o null>"}';
  const esempio = '2026-07-11T21:30:00';
  return '\n\nAZIONE EVENTI: quando l\'utente vuole aggiungere o creare un evento, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo, in questo formato esatto: '
    + schema
    + '. Data e ora attuale di riferimento: ' + oggi
    + '. Usa esattamente l\'ora che l\'utente indica, senza fusi orari e senza offset. Il formato di scheduled_at deve essere YYYY-MM-DDTHH:MM:SS, esempio ' + esempio
    + '. Se manca il titolo o la data, chiedili prima in linguaggio naturale senza produrre il JSON. Per ogni altra richiesta rispondi normalmente in italiano.';
}

export async function POST(req: NextRequest) {
  // Kill-switch: se Julie e disattivata, risponde con cortesia senza chiamare Groq.
  if (process.env.NEXT_PUBLIC_JULIE_ENABLED !== 'true') {
    return NextResponse.json({ reply: 'Mi perdoni, sono momentaneamente non disponibile. Riprovi piu tardi.' });
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ reply: 'Mi perdoni, non sono al momento raggiungibile. Riprovi tra poco.' });

  try {
    const { messages } = await req.json();
    const oggi = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).replace(' ', 'T');
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM + azionePrompt(oggi) }, ...(messages ?? [])],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });
    if (!res.ok) {
      // Degradazione elegante: mai errore grezzo all'utente. Il dettaglio resta nei log server.
      console.error('Groq error', res.status, await res.text());
      return NextResponse.json({ reply: 'Mi perdoni, sono momentaneamente non disponibile. Riprovi tra qualche istante.' });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Mi scusi, non ho compreso.';
    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error('Julie exception', String(e));
    return NextResponse.json({ reply: 'Mi perdoni, ho avuto un contrattempo. Riprovi tra qualche istante.' });
  }
}


