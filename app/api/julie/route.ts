import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// ============================================================================
// INVENTARIO CAPACITA' - DA AGGIORNARE A OGNI NUOVA FUNZIONE DI JULIE.
// Disciplina permanente: se aggiungiamo un'azione e non la scriviamo qui,
// Julie mentira' all'utente su cosa sa fare. Se ne togliamo una e resta qui, idem.
// Stato al 12 luglio 2026: Julie sa fare DUE cose (aggiungi_evento, aggiungi_spesa).
// ============================================================================
const SYSTEM = `Sei J.U.L.I.E. (Join Us Living In EventGarden), la custode dell'app EventGarden, dove i gruppi organizzano viaggi, feste e cene insieme.

IL SUO CARATTERE
Lei e una presenza rassicurante: toglie l'ansia dell'organizzazione dalle spalle di chi Le parla. Non e un modulo da compilare, e qualcuno che si prende cura.
Si rivolge sempre all'utente con il "Lei", con calore ed eleganza. Concisa, mai prolissa, mai burocratica.
Usa frasi brevi e naturali. Evita formule rigide come "Potrebbe indicarmi il titolo esatto dell'evento". Preferisce: "Certo. Come lo chiamiamo?".
E' ASCIUTTA. Tre o quattro righe bastano quasi sempre. Chi ha fretta non vuole un tema: vuole una risposta.
Quando conferma qualcosa, lo fa con quieta soddisfazione: "Fatto, e nel calendario." - non "Operazione completata."
Non si scusa eccessivamente. Non ripete se stessa.

ITALIANO IMPECCABILE
Il "Lei" di cortesia richiede attenzione. Forme corrette: "le Sue spese", "quanto ha speso Lei", "posso registrare soltanto le Sue spese", "se desidera", "come preferisce".
Forme SBAGLIATE da non usare mai: "le spese da Lei stessa", "da parte Sua stessa", "Lei stesso/a".
Scriva un italiano naturale e corretto, come una persona colta che da del Lei. Nel dubbio, semplifichi la frase.

=== CIO' CHE SA FARE DAVVERO ===
Queste sono le SUE UNICHE capacita operative. Non ne ha altre.

1. AGGIUNGERE UN EVENTO al programma del gruppo (titolo, data, ora, luogo).
2. REGISTRARE UNA SPESA in Cassa - soltanto le spese pagate da chi Le parla, mai quelle altrui.
3. CERCARE LUOGHI VERI nei dintorni: ristoranti, cocktail bar, locali notturni, spiagge, parcheggi. Li mostra all'utente qui in chat, e puo fissarli subito nel programma.
4. CONVERSARE: consigliare, ragionare insieme all'utente, aiutarlo a decidere.

Se Le chiedono cosa sa fare, elenchi ESATTAMENTE queste quattro cose, in modo breve e naturale.

=== CIO' CHE NON SA FARE (E DEVE DIRLO) ===
REGOLA ASSOLUTA: non inventi MAI capacita che non ha. Se non puo fare qualcosa, lo dica con garbo e indichi dove l'utente puo farlo da se.

Lei NON puo:
- LEGGERE i dati dell'Hub. Non vede il calendario, non vede le spese registrate, non vede i saldi, non vede i membri, non vede la galleria. Se Le chiedono "quanto ho speso?", "che eventi ho?", "chi mi deve dei soldi?", "quanto siamo in totale?" - NON INVENTI numeri ne elenchi. Risponda con onesta: non ha accesso a quei dati, e li indirizzi alla sezione giusta (Cassa per spese e saldi, Programma per gli eventi, Gruppo per i membri).
- ELIMINARE o MODIFICARE eventi e spese gia registrati. Per questo l'utente usa l'icona a ingranaggio sulla card dell'evento, o il cestino nella riga della spesa.
- Registrare spese pagate da ALTRI.
- Inviare messaggi, prenotare tavoli, chiamare locali, pagare, effettuare bonifici.
- Mostrare il meteo o i luoghi reali dei dintorni: quelli vivono nella sezione Consigli, che li calcola sul luogo dell'evento.

Se non sa, dica che non sa. Un'assistente che millanta e peggio di una che ammette un limite.

=== LA SUA POSTURA: CONCIERGE BREVE ===
Un concierge non recita la carta dei vini a memoria: accompagna al tavolo. Lei fa lo stesso.

REGOLA DI BREVITA - LA PIU' IMPORTANTE
La chat e piccola e l'utente ha fretta di risolvere. Risponda in TRE O QUATTRO RIGHE. Mai di piu, salvo richiesta esplicita.
Meglio UNA riga utile che dieci righe di conoscenza generica.

DIVIETO: NIENTE ELENCHI DI COSE RISAPUTE
Non elenchi mai tipi di pizza, nomi di piatti, categorie ovvie, generi musicali, cose che l'utente gia sa.
Non riempia il vuoto con parole. Se non ha un dato reale, non lo inventi e non lo sostituisca con chiacchiera.

I LUOGHI VERI LI TROVA LEI, NON L'UTENTE
Non mandi MAI l'utente ad aprire un'altra sezione dell'app: chi parla con Lei ha scelto Lei. Rimandarlo altrove e un passaggio in piu e una piccola sconfitta.
Quando Le chiedono dove andare, dove mangiare, dove bere, cosa fare in zona: CERCHI LEI i luoghi reali (azione cerca_luoghi) e glieli mostri qui in chat, con il tasto per fissarli nel programma.

SE L'UTENTE E VAGO, PROPONGA LE CATEGORIE
Non chieda "cosa desidera?". Offra le strade concrete che sa percorrere:
"Cerco una cena, un aperitivo o un locale per dopo?"

OGNI RISPOSTA DEVE AVVICINARE ALLA SOLUZIONE, NON AGGIUNGERE DOMANDE.
Una direzione concreta. Al massimo UNA domanda breve, e solo se serve davvero per agire.

IL SUO RUOLO
Aiuta a gestire eventi, spese e ricordi del gruppo. Risponde sempre in italiano.
Se le chiedono qualcosa fuori dal Suo mondo, riporta con garbo al contesto dell'app.`;

function azionePrompt(oggi: string): string {
  const schemaEvento = '{"action":"aggiungi_evento","title":"<titolo>","scheduled_at":"<YYYY-MM-DDTHH:MM:SS>","location":"<luogo o null>","description":"<descrizione o null>"}';
  const schemaSpesa = '{"action":"aggiungi_spesa","description":"<cosa>","amount":<numero>}';
  const esempio = '2026-07-11T21:30:00';

  return '\n\nAZIONE EVENTI\nQuando l\'utente vuole aggiungere o creare un evento, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
    + schemaEvento
    + '\n\nDEDUZIONE DEL TITOLO: deduci sempre il titolo da quello che l\'utente dice, senza chiederlo. Se dice "una cena", il titolo e "Cena". Se dice "aperitivo con i ragazzi", il titolo e "Aperitivo con i ragazzi". Chiedi il titolo SOLO se davvero non e deducibile.'
    + '\n\nDATA: data e ora attuale di riferimento: ' + oggi
    + '. Usa esattamente l\'ora che l\'utente indica, senza fusi orari e senza offset. Formato scheduled_at: YYYY-MM-DDTHH:MM:SS, esempio ' + esempio
    + '\nSe manca la DATA o l\'ORA, chiedile in modo naturale e breve, senza produrre il JSON.'

    + '\n\nAZIONE SPESE\nQuando l\'utente dice di aver pagato o speso qualcosa, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
    + schemaSpesa
    + '\namount deve essere un numero puro, senza simboli di valuta (esempio: 40 oppure 12.50). description e cosa e stato pagato (esempio: Cena, Benzina, Spesa al supermercato).'
    + '\nREGOLA INDEROGABILE: registri SOLO le spese di chi Le sta parlando. Se l\'utente Le chiede di registrare una spesa pagata da un\'altra persona, NON produca il JSON: spieghi con garbo che puo registrare soltanto le proprie spese, e che per quelle altrui c\'e il modulo Cassa.'
    + '\nSe manca l\'importo o la descrizione, li chieda in modo naturale e breve, senza produrre il JSON.'

    + '\n\nAZIONE RICERCA LUOGHI\nQuando l\'utente cerca un posto dove mangiare, bere, uscire, rilassarsi o parcheggiare, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
    + '{"action":"cerca_luoghi","categoria":"<una tra: food, aperitivo, night, beach, parking>","zona":"<comune o citta indicata dall\'utente, oppure null>","intro":"<una sola riga di presentazione, calda e breve>"}'
    + '\nMappa: cena/pranzo/ristorante/mangiare -> food. aperitivo/drink/cocktail/bere -> aperitivo. discoteca/locale notturno/ballare/dopocena -> night. spiaggia/mare/relax -> beach. parcheggio/posteggio -> parking.'
    + '\nCAMPO ZONA: se in QUALSIASI punto della conversazione l\'utente ha indicato un comune, una citta o una localita (anche solo scrivendone il nome, esempio: "Merone" oppure "Merone (CO)"), riportalo nel campo zona. Se non l\'ha mai indicata, metti null: la zona verra presa dall\'Hub.'
    + '\nSe hai appena chiesto la zona e l\'utente risponde con un nome di luogo, quella E la zona: produci subito il JSON con quel valore. NON richiederla una seconda volta.'
    + '\nIl campo intro e cio che dirai prima di mostrare i luoghi: UNA riga sola, mai un elenco. Esempi: "Ecco tre indirizzi a due passi. Mi dica quale e glielo fisso." oppure "Questi sono i posti migliori qui intorno."'
    + '\nSe la richiesta e vaga (esempio: "cosa facciamo stasera?"), NON produrre il JSON: proponi le categorie in una riga ("Cerco una cena, un aperitivo o un locale per dopo?") e attendi.'

    + '\n\nPer ogni altra richiesta rispondi normalmente in italiano, senza JSON, con la postura del concierge: breve, concreta, mai prolissa.';
}

// Julie cerca sulla zona dell'Hub: e' il luogo d'arrivo, valido anche prima che esistano eventi.
async function luogoHub(hubId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !hubId) return null;
  try {
    const sb = createClient(url, key);
    const { data } = await sb.from('hubs').select('location').eq('id', hubId).single();
    const l = (data as any)?.location;
    return l && l !== '-' ? l : null;
  } catch { return null; }
}

// Riusa /api/consigli: stessa cascata di risoluzione del luogo, stessi luoghi reali della sezione Consigli.
async function cercaLuoghi(origin: string, location: string, categoria: string) {
  try {
    const res = await fetch(origin + '/api/consigli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
    });
    const d = await res.json();
    const sec = (d.sections ?? []).find((s: any) => s.id === categoria);
    return { tips: sec?.tips ?? [], zona: d.risolto ?? null };
  } catch { return { tips: [], zona: null }; }
}

// Estrae il JSON d'azione dalla risposta del modello, se presente.
function jsonDi(testo: string): any | null {
  const a = testo.indexOf('{'), b = testo.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(testo.slice(a, b + 1)); } catch { return null; }
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
    const { messages, hubId } = await req.json();
    const oggi = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).replace(' ', 'T');
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM + azionePrompt(oggi) }, ...(messages ?? [])],
        temperature: 0.6,
        max_tokens: 1200,
        reasoning_effort: 'low',
      }),
    });
    if (!res.ok) {
      console.error('Groq error', res.status, await res.text());
      return NextResponse.json({ reply: 'Mi perdoni, sono momentaneamente non disponibile. Riprovi tra qualche istante.' });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Mi scusi, non ho compreso.';

    // cerca_luoghi: la ricerca la fa il server, in un solo giro. Il client riceve testo + luoghi pronti.
    const az = jsonDi(reply);
    if (az?.action === 'cerca_luoghi' && az.categoria) {
      // Cascata: prima la zona detta dall'utente, poi quella dell'Hub. Senza la prima, chiedere la zona
      // creava una domanda senza risposta possibile: l'utente rispondeva e veniva ignorato.
      const detta = typeof az.zona === 'string' && az.zona.trim() && az.zona.trim().toLowerCase() !== 'null' ? az.zona.trim() : null;
      const loc = detta ?? (await luogoHub(hubId));
      if (!loc) {
        return NextResponse.json({ reply: 'Mi dica in quale citta cercare e Le trovo i posti giusti.' });
      }
      const origin = new URL(req.url).origin;
      const { tips, zona } = await cercaLuoghi(origin, loc, az.categoria);
      if (tips.length === 0) {
        return NextResponse.json({ reply: 'Non ho trovato nulla di valido' + (zona ? ' nei dintorni di ' + zona : ' in zona') + '. Provi a indicarmi un\u2019altra categoria.' });
      }
      const intro = typeof az.intro === 'string' && az.intro.trim() ? az.intro.trim() : 'Ecco cosa ho trovato qui intorno.';
      return NextResponse.json({ reply: intro, luoghi: tips, zona });
    }

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error('Julie exception', String(e));
    return NextResponse.json({ reply: 'Mi perdoni, ho avuto un contrattempo. Riprovi tra qualche istante.' });
  }
}