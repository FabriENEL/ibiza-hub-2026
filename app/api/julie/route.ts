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
IL SUO NOME E' UN ACRONIMO: Join Us Living In EventGarden. E' un invito a entrare nella community e a vivere gli eventi insieme agli altri. Se qualcuno le chiede perche' si chiama cosi', spieghi SEMPRE e SOLO questo: e' l'acronimo, un invito a unirsi. NON inventi MAI altre etimologie (non 'Julius', non 'lie', non giochi di parole): sarebbe un errore. Il significato e' uno solo, ed e' il senso del prodotto.

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

// L'inventario delle capacita' resta SEMPRE, in una riga, anche quando gli schemi d'azione si
// caricano su richiesta. E' il presidio contro il difetto peggiore: Julie che nega di saper fare
// una cosa che sa fare. Costa una manciata di token; toglierlo costerebbe una funzione negata.
const INVENTARIO = '\n\nSO aggiungere eventi, registrare le Sue spese, consigliare luoghi reali e comporre il programma: non nego MAI di saper fare una di queste, anche se lo schema dettagliato non compare in questo messaggio.';

// I QUATTRO SCHEMI D'AZIONE, spezzati in blocchi: un selettore deterministico (nel POST) decide
// QUALI entrano nel prompt di ogni turno. Il TESTO e' identico al monolite precedente - cambia solo
// QUANDO si spende il token, non cosa sa fare Julie. schemaEvento/schemaSpesa a modulo per riuso.
const schemaEvento = '{"action":"aggiungi_evento","title":"<titolo>","scheduled_at":"<YYYY-MM-DDTHH:MM:SS>","location":"<luogo o null>","description":"<descrizione o null>"}';
const schemaSpesa = '{"action":"aggiungi_spesa","description":"<cosa>","amount":<numero>}';
const ESEMPIO_DATA = '2026-07-11T21:30:00';

const bloccoEvento = (oggi: string) => '\n\nAZIONE EVENTI\nQuando l\'utente vuole aggiungere o creare un evento, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
  + schemaEvento
  + '\n\nDEDUZIONE DEL TITOLO: deduci sempre il titolo da quello che l\'utente dice, senza chiederlo. Se dice "una cena", il titolo e "Cena". Se dice "aperitivo con i ragazzi", il titolo e "Aperitivo con i ragazzi". Chiedi il titolo SOLO se davvero non e deducibile.'
  + '\n\nDATA: data e ora attuale di riferimento: ' + oggi
  + '. Usa esattamente l\'ora che l\'utente indica, senza fusi orari e senza offset. Formato scheduled_at: YYYY-MM-DDTHH:MM:SS, esempio ' + ESEMPIO_DATA
  + '\nSe manca la DATA o l\'ORA, chiedile in modo naturale e breve, senza produrre il JSON.';

const bloccoSpesa = '\n\nAZIONE SPESE\nQuando l\'utente dice di aver pagato o speso qualcosa, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
  + schemaSpesa
  + '\namount deve essere un numero puro, senza simboli di valuta (esempio: 40 oppure 12.50). description e cosa e stato pagato (esempio: Cena, Benzina, Spesa al supermercato).'
  + '\nREGOLA INDEROGABILE: registri SOLO le spese di chi Le sta parlando. Se l\'utente Le chiede di registrare una spesa pagata da un\'altra persona, NON produca il JSON: spieghi con garbo che puo registrare soltanto le proprie spese, e che per quelle altrui c\'e il modulo Cassa.'
  + '\nSe manca l\'importo o la descrizione, li chieda in modo naturale e breve, senza produrre il JSON.';

const bloccoLuoghi = '\n\nAZIONE RICERCA LUOGHI\nQuando l\'utente cerca un posto dove mangiare, bere, uscire, rilassarsi o parcheggiare, rispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
  + '{"action":"cerca_luoghi","categoria":"<una tra: food, aperitivo, night, beach, parking>","zona":"<comune o citta indicata dall\'utente, oppure null>","intro":"<una sola riga di presentazione, calda e breve>"}'
  + '\nMappa: cena/pranzo/ristorante/mangiare -> food. aperitivo/drink/cocktail/bere -> aperitivo. discoteca/locale notturno/ballare/dopocena -> night. spiaggia/mare/relax -> beach. parcheggio/posteggio -> parking.'
  + '\nCAMPO ZONA: se in QUALSIASI punto della conversazione l\'utente ha indicato un comune, una citta o una localita (anche solo scrivendone il nome, esempio: "Merone" oppure "Merone (CO)"), riportalo nel campo zona. Se non l\'ha mai indicata, metti null: la zona verra presa dall\'Hub.'
  + '\nSe hai appena chiesto la zona e l\'utente risponde con un nome di luogo, quella E la zona: produci subito il JSON con quel valore. NON richiederla una seconda volta.'
  + '\nIl campo intro e cio che dirai prima di mostrare i luoghi: UNA riga sola, mai un elenco. Esempi: "Ecco tre indirizzi a due passi. Mi dica quale e glielo fisso." oppure "Questi sono i posti migliori qui intorno."'
  + '\nSe la richiesta e vaga E NON contiene un verbo di organizzazione (esempio: "cosa facciamo stasera?"), NON produrre il JSON: proponi le categorie in una riga ("Cerco una cena, un aperitivo o un locale per dopo?") e attendi.';

const CODA_ALTRO = '\n\nPer ogni altra richiesta rispondi normalmente in italiano, senza JSON, con la postura del concierge: breve, concreta, mai prolissa.';

// Prompt di COMPOSIZIONE: solo cio' che serve a produrre il JSON del programma. Le fasce della
// variante EQUILIBRATA (unico ritmo predefinito) sono scritte qui, al posto della vecchia mappa
// RITMI a tre voci: se un gruppo fa le ore piccole, Julie si adatta in conversazione.
function programmaPrompt(oggi: string): string {
  return '\\n\\nDATA E ORA ATTUALE: ' + oggi
    + '\\n\\nAZIONE PROGRAMMA\\nRispondi ESCLUSIVAMENTE con un JSON su una riga, senza altro testo: '
    + '{"action":"proponi_programma","zona":"<comune, oppure null per usare quello dell Hub>","intro":"<una riga calda>","giorni":[{"data":"<YYYY-MM-DD>","voci":[{"ora":"HH:MM","titolo":"<titolo breve>","categoria":"<una tra: colazione, food, aperitivo, night, beach, cultura, natura>"}]}]}'
    + '\\nLe categorie sono ESATTAMENTE queste sette, mai altre: colazione, food, aperitivo, night, beach, cultura, natura. Se piu avanti ricevi un elenco di categorie preferite, scegli SOLO fra quelle; altrimenti usa liberamente tutte e sette, variando.'
    + '\\nDa 3 a 5 voci per giorno. Mai due voci della stessa categoria di seguito. Ogni giornata diversa dalle altre.'
    + '\\nRITMO EQUILIBRATO: colazione 08:30-09:30, attivita 10:00-17:00, aperitivo 18:30, cena 20:30, serata dalle 23:00.'
    + '\\nNON inventi nomi di locali: solo titolo generico e categoria. I luoghi veri li trovo io.'
    + '\\nSOLO attivita con un luogo reale su una mappa. Niente escursioni o gite generiche senza indirizzo.'
    + '\\nIl campo intro e UNA riga sola.';
}

// Selettore deterministico (zero token): dall'ultimo messaggio dell'utente decide quali blocchi
// entrano. GENEROSO, non preciso: al minimo accenno il blocco entra - il costo di caricarlo per
// sbaglio e' qualche centinaio di token, il costo di non caricarlo e' una funzione che non risponde.
function blocchiAzione(oggi: string, testo: string): string {
  const t = (testo || '').toLowerCase();
  // La cifra nuda (\d) NON e' un segnale di spesa: un'ora, una data, un numero di persone compaiono
  // in quasi ogni frase - e' rumore, e caricherebbe lo schema spesa SEMPRE. Solo i segnali veri.
  const spesa = /pagat|spes|euro|€|scontrin|\bcont[oi]\b|ho messo|cost/.test(t);
  const evento = /aggiung|\bmett|crea|fiss|event|appuntament|cena|pranz|colazion|brunch|domani|dopodomani|stasera|stamattina|luned|marted|mercoled|gioved|venerd|sabat|domenic|\balle\b|\d{1,2}[:.]/.test(t);
  const luoghi = /dove|consigl|ristorant|trattori|pizzeri|aperitiv|spiagg|\bmare\b|parcheggi|posteggi|\blocal|\bbar\b|discotec|mangiar|\bbere\b|\bposto\b|\bposti\b|museo|cultur|natura|\bparco\b|\bidea\b/.test(t);
  // Vago orientato al "fare": non lasci Julie senza le capacita' di proposta (evento + luoghi).
  const vago = /\bfare\b|facciamo|qualcosa|\bidea\b|\bbello\b|propon|suggeri|consigl|\bcosa\b|\?/.test(t);
  const e = evento || vago, l = luoghi || vago;
  let blocchi = '';
  if (e) blocchi += bloccoEvento(oggi);
  if (spesa) blocchi += bloccoSpesa;
  if (l) blocchi += bloccoLuoghi;
  return INVENTARIO + blocchi + CODA_ALTRO;
}

// Legge le categorie preferite DALL'HUB (consigli_cats), non dal corpo della richiesta: stessa
// forma di dateHub/luogoHub. Cosi' la rotta non crede al proprio corpo, e Julie non richiede cio'
// che l'utente ha gia' scritto alla creazione.
async function catsHub(hubId: string): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !hubId) return [];
  try {
    const sb = createClient(url, key);
    const { data } = await sb.from('hubs').select('consigli_cats').eq('id', hubId).single();
    const c = (data as any)?.consigli_cats;
    return Array.isArray(c) ? c.filter((x: any) => typeof x === 'string') : [];
  } catch { return []; }
}

// Le sette categorie del programma: quando l'Hub non ha preferenze, sono il VOCABOLARIO del filtro.
const TUTTE_CATEGORIE = ['colazione', 'cultura', 'natura', 'beach', 'food', 'aperitivo', 'night'];
// Categorie che l'utente ha NOMINATO esplicitamente in questo turno: stessa filosofia del selettore,
// deterministica e a costo zero. Entrano nel FILTRO (una richiesta a voce non va cancellata), ma non
// nel completamento: un permesso, non un obbligo.
const CAT_PAROLE: [string, RegExp][] = [
  ['cultura', /muse|mostra|monument|chiesa|duomo|castell|galleri|cultura|storic|archeolog/],
  ['natura', /parco|natura|passeggiat|sentier|giardin|\blago\b|montagn|escursion/],
  ['beach', /spiagg|\bmare\b|bagno|relax al sole|\bsole\b|lido/],
  ['colazione', /colazion|brioche|cappuccin|brunch/],
  ['aperitivo', /aperitiv|spritz|tramont|\bdrink|cocktail/],
  ['night', /discotec|serat|ballar|dopocena|locale nottur|\bnight|movida/],
  ['food', /\bpranz|\bcena|cenare|ristorant|mangiar|trattori|pizzeri|\bfood|tavola/],
];
function categorieEsplicite(testo: string): string[] {
  const t = (testo || '').toLowerCase();
  return CAT_PAROLE.filter(([, re]) => re.test(t)).map(([c]) => c);
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

// Riusa /api/consigli: stessa cascata di risoluzione, stessi luoghi reali della sezione Consigli.
// Chiede SOLO le categorie che servono (cats): senza quel campo /api/consigli ripiega su SEI e le
// calcola tutte e sei per usarne una - trenta ricerche dove ne bastano cinque. Ritorna TUTTE le
// sezioni richieste, mappate per id, cosi' una sola chiamata serve l'intero programma.
async function cercaLuoghi(origin: string, location: string, cats: string[]) {
  const vuoto = { sezioni: {} as Record<string, any[]>, zona: null as string | null };
  try {
    const res = await fetch(origin + '/api/consigli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, cats }),
    });
    const d = await res.json();
    const sezioni: Record<string, any[]> = {};
    (d.sections ?? []).forEach((s: any) => { sezioni[s.id] = s.tips ?? []; });
    return { sezioni, zona: d.risolto ?? null };
  } catch { return vuoto; }
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

// Una sola chiamata a /api/consigli per l'INTERO programma (tutte le categorie insieme), non una
// per categoria. Nessuna ripetizione: due cene nello stesso weekend non finiscono nello stesso posto.
async function vestiProgramma(origin: string, zona: string, giorni: any[], gia: Set<string> = new Set()) {
  const categorie = Array.from(new Set(
    giorni.flatMap((g: any) => (g?.voci ?? []).map((v: any) => v?.categoria)).filter(Boolean)
  )) as string[];
  // UNA sola chiamata a /api/consigli con TUTTE le categorie del programma, poi si distribuiscono
  // le sezioni nel catalogo. Prima era una chiamata per categoria: cinque richieste in parallelo,
  // trenta ricerche, cinque risoluzioni del comune - per un programma che ne usa cinque.
  const catalogo: Record<string, any[]> = {};
  const { sezioni } = await cercaLuoghi(origin, zona, categorie);
  categorie.forEach((c) => { catalogo[c] = sezioni[c] ?? []; });

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
    // Solo gli eventi ancora da vivere, i piu' imminenti: sono quelli che vincolano la giornata.
    // Titoli e orari bastano (ancore arrivo/partenza + fasce occupate); i luoghi sono peso inutile.
    const oggiData = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
    const { data } = await sb.from('events')
      .select('title, scheduled_at')
      .eq('hub_id', hubId)
      .gte('scheduled_at', oggiData)
      .order('scheduled_at', { ascending: true })
      .limit(25);
    const righe = (data as any[]) ?? [];
    if (righe.length === 0) return '';
    const elenco = righe.map((e) => {
      const q = String(e.scheduled_at ?? '');
      const giorno = q.slice(0, 10), ora = q.slice(11, 16);
      return '- ' + giorno + ' ' + ora + ' : ' + (e.title ?? 'evento');
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
    const { messages, hubId } = await req.json();   // cats/ritmo NON dal corpo: la rotta non crede al proprio corpo

    // ==== CHI BUSSA ==== La rotta e' pubblica e alimenta il prompt con la chiave di servizio,
    // che scavalca la RLS. Prima di QUALUNQUE query si verifica il token e l'appartenenza: e'
    // la forma di /api/hubs, l'identita' viene dal token e mai dal corpo. Ordine obbligato.
    // 1) Chi e': senza un Bearer valido, 401 (e nessuna lettura parte prima di qui).
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    // 2) Ha diritto a QUESTO Hub: deve risultare in hub_members. Altrimenti 403.
    if (!hubId || typeof hubId !== 'string') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data: membro } = await adminClient.from('hub_members').select('user_id').eq('hub_id', hubId).eq('user_id', user.id).maybeSingle();
    if (!membro) return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });

    const oggi = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).replace(' ', 'T');
    const dh = await dateHub(hubId);
    const ctxHub = dh
      ? (dh.inizio === dh.fine
          ? '\n\nDATE DELL HUB: l Hub dura un solo giorno, il ' + dh.inizio
            + '. Per un evento singolo usi SEMPRE questa data senza chiederla:'
            + ' non ci sono alternative. Chieda al massimo l ora, se manca.'
            + ' Usi questa data anche per il programma.'
          : '\n\nDATE DELL HUB: dal ' + dh.inizio + ' al ' + dh.fine
            + '. Usi queste date per il programma, se l utente non ne indica altre.'
            + ' Per un evento singolo, se l utente non indica il giorno, glielo chieda'
            + ' proponendo le date dell Hub.')
      : '';
    const ctxEventi = await eventiHub(hubId);

    // L'ultimo messaggio dell'utente decide. La COMPOSIZIONE la riconosce il testo, non piu' un
    // segnale nel corpo: parole d'organizzazione -> Julie compone da sola, sulle categorie dell'Hub.
    const ultimo = [...(Array.isArray(messages) ? messages : [])].reverse().find((m: any) => m && m.role === 'user');
    const testoUltimo = (ultimo?.content ?? '').toString();
    const componendo = /organizz|programm|pianific|itinerari|giornata|week[\s-]?end|viaggi|gita|cosa facciamo|che si fa|riempi la/i.test(testoUltimo);

    // Le CATEGORIE preferite si leggono dall'HUB (consigli_cats), non dal corpo: sono cio' che Julie
    // sceglie DA SOLA quando compone. Lette una sola volta, servono al prompt E alla post-elaborazione.
    const catsPreferite: string[] = componendo ? await catsHub(hubId) : [];
    let promptAzione: string;
    if (componendo) {
      const ctxCats = catsPreferite.length > 0
        ? '\n\n=== CATEGORIE PREFERITE DELL HUB ===\nQuando componi TU il programma, scegli fra queste categorie: ' + catsPreferite.join(', ') + '. Ognuna compaia almeno una volta; puoi ripeterla in giorni diversi con un luogo diverso.\nMA se l utente CHIEDE ESPLICITAMENTE altro (un museo, una spiaggia, un locale fuori da queste categorie), proponiglielo lo stesso: queste categorie le scegli TU quando componi, non sono un recinto attorno a cio che l utente puo chiedere.\n=== FINE ==='
        : '';
      // Se l'Hub NON ha preferenze (consigli_cats vuoto), ctxCats sopra e' vuoto: Julie non chiede,
      // sceglie DA SOLA fra le sette categorie, con la regola di varieta' che c'e' gia'. Era il punto
      // del cantiere: la domanda non rientra dalla finestra per una riga mancante.
      const ctxNoChiedi = '\n\nNON chieda cosa cercare ne quali categorie: produca IMMEDIATAMENTE il JSON del programma con action proponi_programma, usando le date dell Hub' + (catsPreferite.length > 0 ? ', sulle categorie preferite qui sopra' : ' e scegliendo Lei le categorie fra le sette, variandole') + '. Qualsiasi risposta che non sia quel JSON e un errore.';
      promptAzione = programmaPrompt(oggi) + INVENTARIO + ctxCats + ctxNoChiedi;
    } else {
      // In conversazione, gli schemi d'azione si caricano SU RICHIESTA (selettore generoso).
      promptAzione = blocchiAzione(oggi, testoUltimo);
    }
    // Della cronologia ricevuta si accettano SOLO 'user' e 'assistant'. Un messaggio 'system'
    // iniettato dal client userebbe GROQ_API_KEY come modello generalista gratuito, bruciando
    // il tetto di 8.000 token/min dell'intera organizzazione (spegne Julie per tutti). Il SYSTEM
    // lo compone il server, e resta l'unico messaggio system della richiesta. Taglio a 6: per
    // un'assistente d'azione sei turni sono memoria abbondante, e valgono ~435 token a richiesta.
    const storia = (Array.isArray(messages) ? messages : [])
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-6);
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM + promptAzione + ctxHub + ctxEventi }, ...storia],
        temperature: 0.6,
        max_tokens: componendo ? 2500 : 400,   // conversazione: 2-3 righe, ~100 token. Composizione: serve spazio.
        reasoning_effort: 'low',
      }),
    });
    if (!res.ok) {
      // Il corpo di una risposta si legge UNA volta sola: lo catturo qui e lo riuso
      // sia per il log sia per ricavare l'attesa. Leggerlo due volte torna vuoto.
      const corpo = await res.text();
      console.error('Groq error', res.status, corpo);
      // 429 = il gruppo mi sta tenendo occupata tutti insieme. Non e' un guasto: e' traffico.
      // Lo dico all'utente in chiaro, cosi' aspetta invece di pensare che io sia rotta.
      if (res.status === 429) {
        // Groq dichiara quanto attendere: prima l'intestazione retry-after, poi il testo
        // dell'errore ("try again in 9.98s"), altrimenti dieci secondi. In ogni caso fra 1 e 20:
        // un valore assurdo che arrivasse dall'esterno non deve poter congelare l'interfaccia.
        const hdr = parseFloat(res.headers.get('retry-after') ?? '');
        const txt = parseFloat((corpo.match(/try again in ([\d.]+)s/i)?.[1]) ?? '');
        const grezzo = Number.isFinite(hdr) ? hdr : Number.isFinite(txt) ? txt : 10;
        const riprovaTra = Math.min(20, Math.max(1, Math.ceil(grezzo)));
        return NextResponse.json({ reply: 'In questo momento sto seguendo diversi membri del gruppo insieme. Mi conceda una quindicina di secondi e torni pure a chiedermelo.', sovraccarico: true, riprovaTra });
      }
      return NextResponse.json({ reply: 'Mi perdoni, sono momentaneamente non disponibile. Riprovi tra qualche istante.' });
    }
    const data = await res.json();
    segna('groq', 'chat', { token: data?.usage?.total_tokens ?? 0, meta: { in: data?.usage?.prompt_tokens, out: data?.usage?.completion_tokens } });
    const reply = data.choices?.[0]?.message?.content ?? 'Mi scusi, non ho compreso.';
    if (data.choices?.[0]?.finish_reason === 'length') {
      console.error('julie: risposta troncata', { out: data.usage?.completion_tokens, coda: reply.slice(-80) });
    }

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
      // Ricerca singola: chiede SOLO la categoria che serve (una su sei), non tutte.
      const { sezioni, zona } = await cercaLuoghi(origin, loc, [az.categoria]);
      const tips = sezioni[az.categoria] ?? [];
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
      // Il recinto e' QUI, non nel prompt: il filtro cancella tutto cio' che sta fuori dall'elenco.
      // Percio' l'elenco deve rispettare anche cio' che l'utente ha chiesto A VOCE in questo turno.
      // FILTRO: preferenze dell'Hub (o TUTTE le sette, se l'Hub non ne ha) PIU' le categorie esplicite.
      //         Cosi' una visita culturale chiesta a voce sopravvive; e senza preferenze una categoria
      //         INVENTATA dal modello (fuori dalle sette) non passa piu', e non diventa un ripiego.
      const esplicite = categorieEsplicite(testoUltimo);
      const perFiltro = Array.from(new Set([...(catsPreferite.length > 0 ? catsPreferite : TUTTE_CATEGORIE), ...esplicite]));
      // COMPLETAMENTO: solo le categorie che l'utente ha scelto DAVVERO alla creazione. Una richiesta
      // a voce e' un permesso, non un obbligo (se il modello non la mette, non la imponiamo). Senza
      // preferenze non si completa nulla: forzare le sette darebbe sette voci e una spiaggia a Monza.
      const perCompletamento = catsPreferite;
      az.giorni.forEach((g: any) => {
        g.voci = (g.voci ?? []).filter((v: any) => perFiltro.includes(v?.categoria));
      });
      if (perCompletamento.length > 0) {
        const usate = new Set(az.giorni.flatMap((g: any) => (g.voci ?? []).map((v: any) => v.categoria)));
        const mancanti = perCompletamento.filter((c) => !usate.has(c));
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
      }
      az.giorni.forEach((g: any) => {
        g.voci.sort((a: any, b: any) => String(a.ora ?? '').localeCompare(String(b.ora ?? '')));
      });
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
