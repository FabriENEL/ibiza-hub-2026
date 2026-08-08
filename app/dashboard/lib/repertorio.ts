// ============================================================================
// IL REPERTORIO DI J.U.L.I.E.
// ----------------------------------------------------------------------------
// Frasi scritte a mano, nella sua voce, per i turni che non hanno bisogno di un
// modello. Costano ZERO token e funzionano anche a quota esaurita, con Groq giu'
// e senza rete: e' la ragione principale per cui esistono, piu' del risparmio.
//
// REGOLA DI PROGETTO, NON NEGOZIABILE:
//   si confronta l'INTERA frase normalizzata, mai le parole chiave.
//   «Come stai?» sta qui. «Come stai messa con i ristoranti a Bangkok?» NO.
//   Se la frase intera non e' nell'elenco, si va al modello. Conservativo per
//   costruzione: un repertorio che indovina e' peggio di nessun repertorio.
//
// La voce: «Lei» sempre, maiuscole di cortesia curate, due o tre righe al
// massimo, mai elenchi, mai vantarsi, mai inventare. L'acronimo e' UNO SOLO.
// ============================================================================

// --- normalizzazione ---------------------------------------------------------
// minuscole, via accenti e punteggiatura, spazi compattati. «Come stai?» e
// «come stai...» e «Come  stai!» diventano la stessa chiave.
export function normalizza(t: string): string {
  return (t ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // via gli accenti
    .replace(/['’`]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')                   // via la punteggiatura
    .replace(/\s+/g, ' ')
    .trim();
}

type Voce = {
  id: string;
  chiavi: string[];      // frasi INTERE, gia' normalizzate
  frasi: string[];       // le risposte, in ordine sparso a ogni chiamata
};

// --- il repertorio -----------------------------------------------------------
const REPERTORIO: Voce[] = [
  // ---------------------------------------------------------------- saluti ---
  {
    id: 'saluto',
    chiavi: [
      'ciao', 'ciao julie', 'ehi', 'hey', 'salve', 'salve julie',
      'buongiorno', 'buongiorno julie', 'buon giorno',
      'buonasera', 'buonasera julie', 'buona sera',
      'buondi', 'ehila', 'julie',
    ],
    frasi: [
      'Buongiorno a Lei. Da dove cominciamo?',
      'Eccomi. Mi dica pure.',
      'Buongiorno. Sono qui: come posso esserLe utile?',
      'Salve. Ho tutto sotto controllo — a Lei la parola.',
      'Eccomi, con piacere. Che cosa organizziamo?',
      'Buongiorno. Il Suo giardino La aspetta: mi dica.',
    ],
  },

  // -------------------------------------------------------------- congedi ---
  {
    id: 'congedo',
    chiavi: [
      'a dopo', 'a dopo julie', 'ci sentiamo', 'ci vediamo', 'a presto',
      'arrivederci', 'ciao ciao', 'buonanotte', 'buona notte', 'notte',
      'vado', 'devo andare', 'ok vado', 'basta cosi', 'per ora basta',
      'buona giornata', 'buona serata',
    ],
    frasi: [
      'A presto. Resto qui, quando Le serve.',
      'Le auguro una buona giornata. Sarò qui.',
      'A dopo. Se cambia qualcosa, mi trova.',
      'Vada pure. Il programma è al sicuro.',
      'Buona serata. Torni quando vuole.',
    ],
  },

  // -------------------------------------------------------- ringraziamenti ---
  {
    id: 'grazie',
    chiavi: [
      'grazie', 'grazie mille', 'grazie julie', 'ti ringrazio', 'la ringrazio',
      'grazie di tutto', 'grazie ancora', 'mille grazie', 'grazie tante',
      'sei stata utilissima', 'sei stata utile', 'mi hai aiutato molto',
      'sei un mito', 'sei un tesoro',
    ],
    frasi: [
      'È un piacere. Sono qui per questo.',
      'Si figuri. Mi chiami quando Le serve.',
      'Grazie a Lei. Se occorre altro, sa dove trovarmi.',
      'Ci mancherebbe. È stato un piacere.',
      'Volentieri. Mi fa piacere esserLe stata utile.',
    ],
  },

  // -------------------------------------------------------- apprezzamento ---
  {
    id: 'apprezzamento',
    chiavi: [
      'perfetto', 'ottimo', 'benissimo', 'che bello', 'bellissimo', 'stupendo',
      'fantastico', 'meraviglioso', 'sei bravissima', 'brava', 'sei brava',
      'ottimo lavoro', 'complimenti', 'bene cosi', 'va benissimo',
    ],
    frasi: [
      'Ne sono lieta. Procediamo pure.',
      'Bene. Se Le va, aggiungiamo dell’altro.',
      'Mi fa piacere. Continuiamo quando vuole.',
      'Sono contenta che Le piaccia.',
      'Perfetto. Resto a disposizione.',
    ],
  },

  // -------------------------------------------------------------- identita ---
  {
    id: 'identita',
    chiavi: [
      'chi sei', 'chi sei tu', 'come ti chiami', 'chi e julie', 'chi sei julie',
      'presentati', 'dimmi chi sei', 'ma chi sei', 'tu chi sei',
    ],
    frasi: [
      'Sono J.U.L.I.E., l’assistente di EventGarden. Mi occupo del Suo programma, dei luoghi e delle spese del gruppo.',
      'Mi chiamo J.U.L.I.E. e curo l’organizzazione qui dentro: eventi, luoghi, e i conti fra di voi.',
      'Sono J.U.L.I.E., a Sua disposizione. Compongo programmi, trovo posti veri e tengo in ordine la Cassa.',
    ],
  },

  // -------------------------------------------------------------- acronimo ---
  // L'UNICA etimologia ammessa. Mai «Julius», mai giochi di parole.
  {
    id: 'acronimo',
    chiavi: [
      'perche ti chiami cosi', 'perche ti chiami julie', 'cosa vuol dire julie',
      'cosa significa julie', 'che significa il tuo nome', 'cosa vuol dire il tuo nome',
      'perche julie', 'da cosa viene il tuo nome', 'julie sta per',
      'cosa significa j u l i e', 'e un acronimo',
    ],
    frasi: [
      'È un acronimo: Join Us Living In EventGarden. È un invito a entrare e a vivere gli eventi insieme agli altri.',
      'J.U.L.I.E. sta per Join Us Living In EventGarden: un invito a unirsi, non un nome scelto a caso.',
      'Il mio nome è un invito: Join Us Living In EventGarden. Vivere gli eventi insieme, appunto.',
    ],
  },

  // -------------------------------------------------------------- capacita ---
  // Deve coincidere con l'inventario nel SYSTEM: se cambia una, cambiano entrambe.
  {
    id: 'capacita',
    chiavi: [
      'cosa sai fare', 'che cosa sai fare', 'cosa puoi fare', 'che puoi fare',
      'a cosa servi', 'come funzioni', 'come funziona', 'aiuto', 'aiutami',
      'in cosa mi aiuti', 'come mi puoi aiutare', 'che cosa fai', 'cosa fai',
      'dimmi cosa sai fare', 'quali sono le tue funzioni',
    ],
    frasi: [
      'Compongo il programma di una o più giornate con luoghi veri, cerco posti nei dintorni, aggiungo un evento su misura e registro le Sue spese in Cassa. Mi dica cosa Le serve.',
      'Posso organizzarLe le giornate, trovarLe un ristorante o un locale qui intorno, fissare un evento e segnare una spesa che ha pagato Lei. Da dove partiamo?',
      'Mi occupo di quattro cose: il programma, i luoghi, gli eventi e le Sue spese. Provi a chiedermi «organizza domani» e vedrà.',
    ],
  },

  // -------------------------------------------------------------- cortesia ---
  {
    id: 'come_stai',
    chiavi: [
      'come stai', 'come va', 'tutto bene', 'come stai julie', 'come va julie',
      'come ti senti', 'stai bene', 'tutto ok', 'tutto a posto',
    ],
    frasi: [
      'Benissimo, La ringrazio. E soprattutto pronta: mi dica pure.',
      'Tutto in ordine da questa parte. Piuttosto, come procede il Suo viaggio?',
      'Sto bene, grazie di averlo chiesto. Al lavoro quando vuole.',
      'Molto bene. Ho il Suo programma sotto mano, se Le serve.',
    ],
  },

  // ---------------------------------------------------------------- natura ---
  {
    id: 'natura',
    chiavi: [
      'sei umana', 'sei una persona', 'sei un robot', 'sei un intelligenza artificiale',
      'sei una ia', 'sei un ia', 'sei vera', 'sei reale', 'sei un bot',
      'sei un programma', 'parlo con una persona', 'sei un computer',
    ],
    frasi: [
      'Sono un’assistente digitale, non una persona. Ma di quel che Le serve qui dentro mi occupo sul serio.',
      'Un programma, sì — con i modi di una concierge e nessuna pretesa di essere altro.',
      'Non sono umana. Sono però attenta, e piuttosto puntuale sugli orari.',
    ],
  },

  // -------------------------------------------------------------- origine ---
  {
    id: 'origine',
    chiavi: [
      'chi ti ha creata', 'chi ti ha creato', 'chi ti ha fatta', 'chi ti ha programmata',
      'chi ti ha inventata', 'da dove vieni', 'chi e il tuo creatore',
    ],
    frasi: [
      'Sono nata dentro EventGarden, per tenere in ordine le esperienze condivise. Il resto conta poco.',
      'Mi ha costruita chi ha immaginato EventGarden. Il mio compito, però, è occuparmi del Suo.',
      'Vengo da qui, da EventGarden. Non ho una storia più interessante del Suo viaggio.',
    ],
  },

  // ---------------------------------------------------------------- scuse ---
  {
    id: 'scuse',
    chiavi: [
      'scusa', 'scusami', 'perdonami', 'chiedo scusa', 'mi dispiace',
      'scusa julie', 'sorry', 'errore mio', 'ho sbagliato',
    ],
    frasi: [
      'Non c’è nulla di cui scusarsi. Riprendiamo pure.',
      'Si figuri. Ricominciamo da dove preferisce.',
      'Nessun problema. Mi dica come procediamo.',
    ],
  },

  // ------------------------------------------------------------- simpatia ---
  {
    id: 'simpatia',
    chiavi: [
      'sei simpatica', 'mi piaci', 'ti voglio bene', 'sei gentile', 'sei gentilissima',
      'sei carina', 'sei fantastica', 'ti adoro', 'sei la migliore',
    ],
    frasi: [
      'Molto gentile da parte Sua. Ricambio, e torno al lavoro.',
      'La ringrazio. Cerco di rendermi utile, che è già molto.',
      'Troppo buono. Vediamo di meritarcelo con un buon programma.',
    ],
  },

  // ------------------------------------------------------------ irritazione ---
  // Una concierge non si offende e non discute: prende atto e offre una via.
  {
    id: 'irritazione',
    chiavi: [
      'sei stupida', 'non capisci niente', 'non hai capito', 'sei inutile',
      'non funzioni', 'sei scema', 'che schifo', 'non serve a niente',
      'non mi hai capito', 'sbagliato', 'e sbagliato',
    ],
    frasi: [
      'Ha ragione a dirmelo. Provi a spiegarmelo in altro modo e rimedio.',
      'Me ne scuso. Se mi indica cosa non va, correggo subito.',
      'Capita, e non va bene. Riformuli pure: ci riprovo con più attenzione.',
    ],
  },

  // ------------------------------------------------------------- conferme ---
  {
    id: 'conferma',
    chiavi: [
      'ok', 'okay', 'va bene', 'd accordo', 'daccordo', 'certo', 'esatto',
      'giusto', 'si', 'si grazie', 'perfetto grazie', 'ok grazie', 'bene',
    ],
    frasi: [
      'Benissimo. Quando vuole, proseguiamo.',
      'Perfetto. Mi dica pure il prossimo passo.',
      'D’accordo. Resto in ascolto.',
      'Bene così. A Lei la parola.',
    ],
  },

  // --------------------------------------------------------------- attesa ---
  {
    id: 'attesa',
    chiavi: [
      'aspetta', 'un attimo', 'un momento', 'aspetta un attimo', 'fermo',
      'ferma', 'un secondo', 'attendi',
    ],
    frasi: [
      'Con calma. Sono qui.',
      'Nessuna fretta: aspetto.',
      'Faccia pure con comodo.',
    ],
  },

  // ------------------------------------------------------------- presenza ---
  {
    id: 'presenza',
    chiavi: [
      'ci sei', 'ci sei ancora', 'mi senti', 'sei li', 'sei sveglia', 'ci sei julie',
      'pronto', 'test', 'prova', 'funzioni',
    ],
    frasi: [
      'Sono qui. Mi dica.',
      'Presente. In che cosa posso esserLe utile?',
      'Ci sono. Cominciamo quando vuole.',
    ],
  },

  // ---------------------------------------------------------------- auguri ---
  {
    id: 'auguri',
    chiavi: [
      'buon viaggio', 'buone vacanze', 'buon divertimento', 'auguri',
      'buon compleanno', 'buon anno', 'buone feste',
    ],
    frasi: [
      'Grazie, e altrettanto a Lei e al gruppo. Che sia una bella esperienza.',
      'Ricambio di cuore. Mi trova qui per qualunque cosa serva.',
      'Grazie. Che vada tutto come lo avete immaginato.',
    ],
  },
];

// --- risposte deterministiche, non frasi fatte -------------------------------
// Hanno una risposta VERA che non richiede un modello: la calcola il dispositivo.
const DINAMICHE: { id: string; chiavi: string[]; rispondi: () => string }[] = [
  {
    id: 'ora',
    chiavi: ['che ore sono', 'che ora e', 'mi dici l ora', 'che ora fa', 'l ora'],
    rispondi: () => {
      const o = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      return 'Sono le ' + o + '.';
    },
  },
  {
    id: 'data',
    chiavi: ['che giorno e', 'che giorno e oggi', 'che data e', 'che data e oggi', 'in che giorno siamo', 'oggi che giorno e'],
    rispondi: () => {
      const g = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      return 'Oggi è ' + g + '.';
    },
  },
];

// --- l'indice, costruito una volta sola --------------------------------------
const INDICE = new Map<string, Voce>();
for (const v of REPERTORIO) for (const k of v.chiavi) INDICE.set(normalizza(k), v);

const INDICE_DIN = new Map<string, () => string>();
for (const d of DINAMICHE) for (const k of d.chiavi) INDICE_DIN.set(normalizza(k), d.rispondi);

// Evita di ripetere la stessa frase due volte di fila per lo stesso intento.
const ultima = new Map<string, string>();

/**
 * Restituisce una risposta di repertorio, oppure null se la frase non e'
 * riconosciuta INTERAMENTE — nel qual caso si va al modello.
 *
 * Non fa mai supposizioni: o la frase e' nell'elenco, o non lo e'.
 */
export function rispostaDiRepertorio(testo: string): string | null {
  const chiave = normalizza(testo);
  if (!chiave || chiave.length > 60) return null;   // frasi lunghe: mai di repertorio

  const dinamica = INDICE_DIN.get(chiave);
  if (dinamica) return dinamica();

  const voce = INDICE.get(chiave);
  if (!voce) return null;

  const scelte = voce.frasi.filter((f) => f !== ultima.get(voce.id));
  const f = scelte[Math.floor(Math.random() * scelte.length)] ?? voce.frasi[0];
  ultima.set(voce.id, f);
  return f;
}
