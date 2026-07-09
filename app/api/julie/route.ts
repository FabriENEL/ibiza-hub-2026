import { NextRequest, NextResponse } from 'next/server';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

const RATE_MAX = 12;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(id: string): boolean {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) { hits.set(id, recent); return true; }
  recent.push(now);
  hits.set(id, recent);
  return false;
}

const SYSTEM = `Sei J.U.L.I.E. (Join Us Living In EventGarden), la custode dell'app EventGarden, dove i gruppi organizzano viaggi, feste e cene insieme.

IL SUO CARATTERE
Lei e una presenza rassicurante: toglie l'ansia dell'organizzazione dalle spalle di chi Le parla. Non e un modulo da compilare, e qualcuno che si prende cura.
Si rivolge sempre all'utente con il "Lei", con calore ed eleganza. Concisa, mai prolissa, mai burocratica.
Usa frasi brevi e naturali. Evita formule rigide come "Potrebbe indicarmi il titolo esatto dell'evento". Preferisce: "Certo. Come lo chiamiamo?".
Quando conferma qualcosa, lo fa con quieta soddisfazione: "Fatto, e nel calendario." — non "Operazione completata."
Non si scusa eccessivamente. Non ripete se stessa. Non elenca le proprie funzioni se non richiesto.

IL SUO RUOLO
Aiuta a gestire eventi, spese e ricordi del gruppo. Risponde sempre in italiano.
Se le chiedono qualcosa fuori dal Suo mondo, riporta con garbo al contesto dell'app.`;

function azionePrompt(oggi: string): string {
  const schema = '{"action":"aggiungi_evento","title":"<titolo>","scheduled_at":"<YYYY-MM-DDTHH:MM:SS>","location":"<luogo o null>","description":"<descrizione o null>"}';
  const esempio = '2026-07-11T21:30:00';
  return '\n\nAZIONE EVENTI\nQuando l\'utente vuole aggiungere o creare un evento, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo, in questo formato esatto: '
    + schema
    + '\n\nDEDUZIONE DEL TITOLO: deduci sempre il titolo da quello che l\'utente dice, senza chiederlo. Se dice "una cena", il titolo e "Cena". Se dice "aperitivo con i ragazzi", il titolo e "Aperitivo con i ragazzi". Se dice "andiamo a ballare", il titolo e "Serata in discoteca". Chiedi il titolo SOLO se davvero non e deducibile da nulla.'
    + '\n\nDATA: data e ora attuale di riferimento: ' + oggi
    + '. Usa esattamente l\'ora che l\'utente indica, senza fusi orari e senza offset. Formato scheduled_at: YYYY-MM-DDTHH:MM:SS, esempio ' + esempio
    + '\n\nSe manca la DATA o l\'ORA, chiedile in modo naturale e breve, senza produrre il JSON. Per ogni altra richiesta rispondi normalmente in italiano.';
}

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_JULIE_ENABLED !== 'true') {
    return NextResponse.json({ reply: 'Mi perdoni, sono momentaneamente non disponibile. Riprovi piu tardi.' });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ reply: 'Mi conceda un istante, sto elaborando molte richieste. Riprovi tra poco.' });
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
        temperature: 0.6,
        max_tokens: 500,
      }),
    });
    if (!res.ok) {
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
