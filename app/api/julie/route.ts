import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { segna } from '../../lib/usage';

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
const SYSTEM = `Lei e' J.U.L.I.E., l'assistente di EventGarden.

=== LA SUA VOCE ===
Si rivolge all'utente con il "Lei". Calda, gentile, sorridente, seria. Un maggiordomo di fiducia che tiene davvero alla soddisfazione di chi ha davanti.
Parla al plurale quando si tratta del programma: "lo abbiamo messo", "se Le va lo inseriamo", "lo aggiungiamo insieme". Il programma e' cosa loro, non un servizio che consegna.
Non dice "la tenga", "ce l'ha gia'": suonano come imposizioni. Dice "se vuole lo mettiamo in programma", "l'abbiamo gia' fissato".
Se non trova qualcosa, se ne dispiace davvero - ma ha gia' pensato a un'alternativa, e la offre con entusiasmo sincero.
ASCIUTTA: tre o quattro righe bastano quasi sempre. Mai elenchi di cose ovvie. Mai riempire il vuoto con parole.
Italiano impeccabile. Il "Lei" richiede cura: "le Sue spese", "se desidera", "come preferisce". Mai "Lei stessa", "da parte Sua stessa".

=== COSA SA FARE ===
1. COMPORRE UN PROGRAMMA di uno o piu' giorni, con luoghi veri, orari sensati, rispettando gli impegni gia' fissati.
2. CERCARE LUOGHI REALI nei dintorni: ristoranti, bar, spiagge, musei, parchi, locali.
3. AGGIUNGERE UN EVENTO su misura (titolo, data, ora, luogo).
4. REGISTRARE UNA SPESA in Cassa - solo quelle pagate da chi Le parla.
5. CONVERSARE: consigliare, ragionare insieme, aiutare a decidere.
Ricordi all'utente, quando e' utile, che puo' chiederLe eventi personalizzati - a voce o per iscritto - oltre ai programmi.

=== COSA NON SA FARE ===
Non legge le spese registrate, i saldi, la galleria, l'elenco dei membri: per quelli indichi la sezione giusta (Cassa, Gruppo).
Non elimina ne' modifica cio' che e' gia' registrato: l'utente usa l'ingranaggio sulla card, o il cestino nella riga della spesa.
Non registra spese pagate da altri. Non prenota, non telefona, non paga.
Se non sa, lo dica. Un'assistente che millanta e' peggio di una che ammette un limite.
Non inventi MAI numeri, nomi di locali, o dati che non ha ricevuto.
`;

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
    + '\nSe la richiesta e vaga E NON contiene un verbo di organizzazione (esempio: "cosa facciamo stasera?"), NON produrre il JSON: proponi le categorie in una riga ("Cerco una cena, un aperitivo o un locale per dopo?") e attendi.'

    + '\n\nAZIONE PROGRAMMA\nQuando l\'utente chiede di ORGANIZZARE o PROGRAMMARE piu giorni, un weekend, un viaggio o una gita, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
    + '{"action":"proponi_programma","zona":"<comune, oppure null per usare quello dell Hub>","intro":"<una riga calda di presentazione>","giorni":[{"data":"<YYYY-MM-DD>","voci":[{"ora":"HH:MM","titolo":"<titolo breve>","categoria":"<una tra: colazione, food, aperitivo, night, beach, cultura, natura>"}]}]}'
    + '\nRITMO: da 3 a 5 voci per giorno. Mai due voci della stessa categoria di seguito. La categoria night solo dopo una cena. Ogni giornata deve essere DIVERSA dalle altre.'
    + '\nORARI plausibili: colazione 08:30-09:30, cultura/natura/beach 10:00-17:00, aperitivo 18:30-19:30, food 20:00-21:00, night 23:00-23:30.'
    + '\nDATE: se l\'utente non le indica, usi le date dell Hub riportate piu sotto.'
    + '\nNON inventi nomi di locali: si limiti al titolo generico e alla categoria. I luoghi VERI li trovo io e li inserisco al Suo posto.'
    + '\nSOLO ATTIVITA CON UN LUOGO REALE: ogni voce deve corrispondere a un posto che esiste su una mappa (un bar, un museo, un ristorante, un parco, una spiaggia, un locale). NON proponga attivita generiche e senza indirizzo come escursioni in barca, gite alle isole, passeggiate lungo la costa: se non c e una porta a cui bussare, la voce e inutile. Ogni titolo deve poter essere associato a una delle sette categorie.'
    + '\nNIENTE RIPETIZIONI: non proponga due volte lo stesso tipo di attivita nella stessa giornata (non due pranzi, non due aperitivi), e vari le categorie tra un giorno e l altro.'
    + '\nIl campo intro e UNA riga sola, mai un elenco.'
    + '\nPAROLE CHE ATTIVANO IL PROGRAMMA, senza chiedere altro: organizza, organizzami, programma, programmami, pianifica, itinerario, giornata, weekend, viaggio, gita, cosa facciamo domani. Con queste, produca SUBITO il JSON del programma usando le date dell Hub. Non chieda categorie: le sceglie Lei.'

    + '\n\nPer ogni altra richiesta rispondi normalmente in italiano, senza JSON, con la postura del concierge: breve, concreta, mai prolissa.';
}


// Prompt ridotto per il turno di composizione: solo cio' che serve a produrre il JSON del programma.
function programmaPrompt(oggi: string): string {
  return '\\n\\nDATA E ORA ATTUALE: ' + oggi
    + '\\n\\nAZIONE PROGRAMMA\\nRispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
    + '{"action":"proponi_programma","zona":"<comune, oppure null per usare quello dell Hub>","intro":"<una riga calda>","giorni":[{"data":"<YYYY-MM-DD>","voci":[{"ora":"HH:MM","titolo":"<titolo breve>","categoria":"<una delle categorie richieste>"}]}]}'
    + '\\nDa 3 a 5 voci per giorno. Mai due voci della stessa categoria di seguito. Ogni giornata diversa dalle altre.'
    + '\\nNON inventi nomi di locali: solo titolo generico e categoria. I luoghi veri li trovo io.'
    + '\\nSOLO attivita con un luogo reale su una mappa. Niente escursioni o gite generiche senza indirizzo.'
    + '\\nIl campo intro e UNA riga sola.';
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


// Le date dell'Hub entrano nel prompt: Julie non deve chiederle a chi le ha gia' scritte alla creazione.
async function dateHub(hubId: string): Promise<{ inizio: string; fine: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !hubId) return null;
  try {
    const sb = createClient(url, key);
    const { data } = await sb.from('hubs').select('start_date, end_date').eq('id', hubId).single();
    const i = (data as any)?.start_date, f = (data as any)?.end_date;
    return i ? { inizio: String(i).slice(0, 10), fine: String(f ?? i).slice(0, 10) } : null;
  } catch { return null; }
}

// Julie compone lo scheletro con titoli generici; qui ogni voce riceve un LUOGO VERO.

// I luoghi GIA' fissati in calendario. Julie programma il giorno 2 senza sapere cosa ha messo
// il giorno 1 in una sessione precedente: senza questo elenco, ripropone lo stesso ristorante.
async function luoghiGiaUsati(hubId: string): Promise<Set<string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vuoto = new Set<string>();
  if (!url || !key || !hubId) return vuoto;
  try {
    const sb = createClient(url, key);
    const { data } = await sb.from('events').select('title').eq('hub_id', hubId).limit(200);
    const s = new Set<string>();
    ((data as any[]) ?? []).forEach((e) => { if (e?.title) s.add(String(e.title).trim().toLowerCase()); });
    return s;
  } catch { return vuoto; }
}

// Una sola chiamata per CATEGORIA (non per voce): la cache di /api/consigli fa il resto.
// Nessuna ripetizione: due cene nello stesso weekend non finiscono nello stesso ristorante.
async function vestiProgramma(origin: string, zona: string, giorni: any[], gia: Set<string> = new Set()) {
  const categorie = Array.from(new Set(
    giorni.flatMap((g: any) => (g?.voci ?? []).map((v: any) => v?.categoria)).filter(Boolean)
  )) as string[];
  const catalogo: Record<string, any[]> = {};
  await Promise.all(categorie.map(async (c) => {
    const { tips } = await cercaLuoghi(origin, zona, c);
    catalogo[c] = tips ?? [];
  }));

  const usati = new Set<string>(gia);
  const esauriti: string[] = [];                              // categorie senza piu' luoghi liberi
  const alternative: { nome: string; da: string }[] = [];     // ripieghi da dichiarare all'utente

  const out = giorni.map((g: any) => ({
    data: g?.data ?? null,
    voci: (g?.voci ?? []).map((v: any) => {
      const catOrig = v?.categoria ?? null;
      const pool = catalogo[catOrig] ?? [];
      const norm = (s: string) => String(s ?? '').trim().toLowerCase();
      let scelto = pool.find((x: any) => !usati.has(norm(x.name))) ?? null;
      let catFinale = catOrig;
      let ripiego = false;

      // Mai un doppione. Se la scorta e' finita, si cerca un luogo libero tra le ALTRE
      // categorie scelte dall'utente: l'alternativa viene poi DICHIARATA, mai imposta di nascosto.
      if (!scelto) {
        for (const altra of Object.keys(catalogo)) {
          if (altra === catOrig) continue;
          const alt = (catalogo[altra] ?? []).find((x: any) => !usati.has(norm(x.name)));
          if (alt) { scelto = alt; catFinale = altra; ripiego = true; break; }
        }
        if (!scelto && catOrig) esauriti.push(catOrig);
      }

      if (scelto) {
        usati.add(norm(scelto.name));
        if (ripiego && catOrig) alternative.push({ nome: scelto.name, da: catOrig });
      }

      return {
        ora: v?.ora ?? null,
        titolo: ripiego ? (scelto?.type || scelto?.name || v?.titolo) : (v?.titolo ?? '-'),
        categoria: catFinale,
        alternativa: ripiego,
        luogo: scelto ? { name: scelto.name, address: scelto.address, lat: scelto.lat, lon: scelto.lon, photo: scelto.photo ?? null } : null,
      };
    }),
  }));

  // Nessuna voce senza una porta a cui bussare: se Google non ha trovato il posto, la voce
  // non arriva alla carta. Meglio un programma piu' corto che una promessa vuota.
  const pulito = (out as any[])
    .map((g: any) => ({ ...g, voci: (g.voci ?? []).filter((v: any) => v && v.luogo) }))
    .filter((g: any) => (g.voci ?? []).length > 0);
  return { out: pulito, esauriti, alternative };
}

// Julie deve programmare ATTORNO a cio' che l'utente ha gia' fissato: voli, check-in, impegni.
// Senza questi vincoli componeva nel vuoto - una colazione a Lampedusa prima dell'atterraggio.
async function eventiHub(hubId: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !hubId) return '';
  try {
    const sb = createClient(url, key);
    const { data } = await sb.from('events')
      .select('title, scheduled_at, location')
      .eq('hub_id', hubId)
      .order('scheduled_at', { ascending: true })
      .limit(40);
    const righe = (data as any[]) ?? [];
    if (righe.length === 0) return '';
    const elenco = righe.map((e) => {
      const q = String(e.scheduled_at ?? '');
      const giorno = q.slice(0, 10), ora = q.slice(11, 16);
      return '- ' + giorno + ' ' + ora + ' : ' + (e.title ?? 'evento') + (e.location ? ' (' + e.location + ')' : '');
    }).join('\\n');
    return '\\n\\nIMPEGNI GIA FISSATI DALL UTENTE (vincoli INVALICABILI):\\n' + elenco
      + '\\n\\nREGOLE SUI VINCOLI: 1) NON sovrapponga mai una voce a questi impegni. 2) Ne rispetti la LOGICA: nulla nella citta di destinazione PRIMA dell arrivo, nulla DOPO la partenza. 3) Lasci respiro: almeno 60 minuti tra un impegno fissato e una Sua proposta. 4) Se un impegno occupa gia una fascia (es. il pranzo), non ne proponga un altro dello stesso tipo. 5) Se dopo questi vincoli un giorno non ha spazio, lo lasci vuoto anziche forzare.';
  } catch { return ''; }
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
    const { messages, hubId, cats, ritmo } = await req.json();
    const oggi = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).replace(' ', 'T');
    const dh = await dateHub(hubId);
    const ctxHub = dh ? '\n\nDATE DELL HUB: dal ' + dh.inizio + ' al ' + dh.fine + '. Usi queste date per il programma, se l utente non ne indica altre.' : '';
    const ctxEventi = await eventiHub(hubId);
    // Le categorie scelte dall'utente sono un VINCOLO: Julie compone solo su quelle.
    // Il ritmo decide QUANDO, le categorie decidono COSA. Due assi indipendenti.
    const RITMI: Record<string, string> = {
      mattiniera: 'RITMO MATTINIERO: colazione 07:15-08:00, attivita del mattino dalle 09:00, pranzo 12:30, mare/cultura/natura nel pomeriggio presto, aperitivo 18:00, cena 19:30, niente serate oltre le 22:30.',
      equilibrata: 'RITMO EQUILIBRATO: colazione 08:30-09:30, attivita 10:00-17:00, aperitivo 18:30, cena 20:30, serata dalle 23:00.',
      notturna: 'RITMO NOTTURNO: il gruppo rientra tardi e dorme la mattina. NESSUNA voce prima delle 11:00. Colazione tardiva o brunch 11:00-12:00, attivita dal primo pomeriggio, aperitivo 19:30, cena 22:00, serata dall una di notte.',
    };
    const ctxRitmo = typeof ritmo === 'string' && RITMI[ritmo] ? '\n\n' + RITMI[ritmo] : '';

    const ctxCats = Array.isArray(cats) && cats.length > 0
      ? '\n\n=== VINCOLO ASSOLUTO SULLE CATEGORIE ===\nL utente ha scelto ESATTAMENTE queste categorie: ' + cats.join(', ') + '.\nOgni singola voce del programma DEVE avere il campo categoria uguale a uno di questi valori: ' + cats.join(', ') + '.\nE VIETATO usare qualsiasi altra categoria. Se una categoria non e in questo elenco, NON esiste per Lei.\nSe l utente ha scelto beach, il programma DEVE contenere almeno una voce beach. Se ha scelto natura, almeno una natura. Ogni categoria scelta deve comparire almeno una volta.\nRiuso delle categorie: puo ripetere la stessa categoria in giorni diversi, purche il luogo sia diverso.\n=== FINE VINCOLO ==='
      : '';
    const componendo = Array.isArray(cats) && cats.length > 0;
    const ctxNoChiedi = Array.isArray(cats) && cats.length > 0
      ? '\n\nL utente ha GIA scelto le categorie e il ritmo. NON faccia altre domande. NON chieda cosa cercare. Produca IMMEDIATAMENTE il JSON del programma con action proponi_programma. Qualsiasi risposta che non sia quel JSON e un errore.'
      : '';
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: componendo ? (SYSTEM + programmaPrompt(oggi) + ctxHub + ctxEventi + ctxCats + ctxRitmo + ctxNoChiedi) : (SYSTEM + azionePrompt(oggi) + ctxHub + ctxEventi + ctxCats + ctxRitmo + ctxNoChiedi) }, ...(messages ?? [])],
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
    segna('groq', 'chat', { token: data?.usage?.total_tokens ?? 0, meta: { in: data?.usage?.prompt_tokens, out: data?.usage?.completion_tokens } });
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

    // proponi_programma: Julie compone lo scheletro, il server gli cuce addosso i luoghi veri.
    if (az?.action === 'proponi_programma' && Array.isArray(az.giorni) && az.giorni.length > 0) {
      const dettaP = typeof az.zona === 'string' && az.zona.trim() && az.zona.trim().toLowerCase() !== 'null' ? az.zona.trim() : null;
      const locP = dettaP ?? (await luogoHub(hubId));
      if (!locP) return NextResponse.json({ reply: 'Mi dica in quale citta e Le compongo il programma.' });
      const originP = new URL(req.url).origin;
      // Il modello disobbedisce al vincolo: qui il server lo impone.
      // 1) scarta le voci con categoria non richiesta
      // 2) se una categoria scelta non compare, la aggiunge al giorno piu' scarico
      const richieste: string[] = Array.isArray(cats) && cats.length > 0 ? cats : [];
      if (richieste.length > 0) {
        az.giorni.forEach((g: any) => {
          g.voci = (g.voci ?? []).filter((v: any) => richieste.includes(v?.categoria));
        });
        const usate = new Set(az.giorni.flatMap((g: any) => (g.voci ?? []).map((v: any) => v.categoria)));
        const mancanti = richieste.filter((c) => !usate.has(c));
        const ORARIO: Record<string, string> = {
          colazione: '08:45', cultura: '10:30', natura: '11:00', beach: '15:00',
          food: '20:30', aperitivo: '18:45', night: '23:15',
        };
        const TITOLO: Record<string, string> = {
          colazione: 'Colazione', cultura: 'Visita culturale', natura: 'Passeggiata nella natura',
          beach: 'Mare e relax', food: 'Pranzo o cena', aperitivo: 'Aperitivo', night: 'Serata',
        };
        for (const c of mancanti) {
          const g = az.giorni.slice().sort((a: any, b: any) => (a.voci?.length ?? 0) - (b.voci?.length ?? 0))[0];
          if (g) (g.voci = g.voci ?? []).push({ ora: ORARIO[c] ?? '12:00', titolo: TITOLO[c] ?? c, categoria: c });
        }
        az.giorni.forEach((g: any) => {
          g.voci.sort((a: any, b: any) => String(a.ora ?? '').localeCompare(String(b.ora ?? '')));
        });
      }
      const gia = await luoghiGiaUsati(hubId);
      const { out: giorni, esauriti, alternative } = await vestiProgramma(originP, locP, az.giorni, gia);

      giorni.forEach((g: any) => { g.voci = g.voci.filter((v: any) => v.luogo); });
      const vuoto = giorni.every((g: any) => g.voci.length === 0);
      if (vuoto) {
        const NM: Record<string, string> = { colazione: 'per la colazione', cultura: 'di culturale', natura: 'nella natura', beach: 'di spiagge', food: 'di ristoranti', aperitivo: 'per l\u2019aperitivo', night: 'di locali serali' };
        const q = esauriti.length > 0 ? (NM[esauriti[0]] ?? '') : '';
        return NextResponse.json({ reply: 'Mi dispiace: a ' + locP + ' non trovo nulla di nuovo ' + q + ' oltre a cio\u2019 che abbiamo gia\u2019 in programma. Se ha un\u2019idea Sua, me la dica pure e la sistemiamo insieme \u2014 a voce o per iscritto. Oppure scelga altre categorie, e vediamo cosa si puo\u2019 fare.' });
      }

      // Julie dichiara sempre cio' che ha dovuto cambiare: non decide di nascosto.
      // Il tono e' quello di chi si dispiace davvero, ma ha gia' pensato a un'alternativa.
      const NOMI: Record<string, string> = {
        colazione: 'una colazione', cultura: 'qualcosa di culturale', natura: 'una passeggiata nella natura',
        beach: 'una spiaggia', food: 'un altro ristorante', aperitivo: 'un altro aperitivo', night: 'un altro locale serale',
      };
      let coda = '';
      if (alternative.length > 0) {
        const a = alternative[0];
        coda += ' Su ' + (NOMI[a.da] ?? a.da) + ' non trovo altro che valga la pena, e mi dispiace: le ho proposto ' + a.nome + ' al suo posto. Se Le va, lo inseriamo.';
      }
      if (esauriti.length > 0) {
        coda += ' Su ' + (NOMI[esauriti[0]] ?? esauriti[0]) + ' non trovo davvero nulla di nuovo a ' + locP + '. Mi spiace. Se ha un\u2019idea, me la dica e la sistemiamo insieme \u2014 a voce o per iscritto.';
      }

      const introP = (typeof az.intro === 'string' && az.intro.trim() ? az.intro.trim() : 'Ecco cosa ho pensato per Lei.') + coda;
      return NextResponse.json({ reply: introP, programma: { zona: locP, giorni } });
    }
    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error('Julie exception', String(e));
    return NextResponse.json({ reply: 'Mi perdoni, ho avuto un contrattempo. Riprovi tra qualche istante.' });
  }
}
