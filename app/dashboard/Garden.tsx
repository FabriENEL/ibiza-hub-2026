'use client'
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

// date: chiave temporale (started_on per le mature, start_date per le vive).
// start/end: date dell'Hub vivo, per lo stato della gemma; null per le mature.
type LeafData = { key: string; hubId: string | null; name: string; category: string; count: number; duration: number; isOwner: boolean; mature: boolean; date: string; start: string | null; end: string | null };

// Palette dentro il marchio: quattro tinte per categoria (l'oro e' la firma), ma con
// SATURAZIONE sotto quella della lamina - il fiore e' un accento, non un soggetto: non deve
// essere piu' acceso della foglia. La categoria resta il segnale, nella tinta.
const FLOWER: Record<string, string> = {
  travel: 'hsl(43 46% 57%)', party: 'hsl(20 44% 58%)', social: 'hsl(338 36% 60%)', corporate: 'hsl(205 34% 60%)',
};
const STEM = '#5a4a3a', STEM_DK = '#3a3028';
const DAY = 86400000;
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

// === LE FIGURINE DIPINTE ===
// Si sostituiscono ai tracciati vettoriali: STESSE posizioni, STESSI angoli, STESSE misure.
// Cambia il pennello, non il modello. Dimensioni native dal manifest (le foglie sono larghe 200,
// l'altezza varia per forma; ancora: base del picciolo sul bordo sinistro, punta a destra).
const ASSET = '/giardino/';
const FOGLIA_W = 200;
const FOGLIA: Record<string, Record<number, { file: string; h: number }>> = {
  viva:    { 1: { file: 'foglia-viva-1.webp', h: 89 },  2: { file: 'foglia-viva-2.webp', h: 131 }, 3: { file: 'foglia-viva-3.webp', h: 118 } },
  ospite:  { 1: { file: 'foglia-ospite-1.webp', h: 131 }, 2: { file: 'foglia-ospite-2.webp', h: 87 },  3: { file: 'foglia-ospite-3.webp', h: 116 } },
  ricordo: { 1: { file: 'foglia-ricordo-1.webp', h: 87 },  2: { file: 'foglia-ricordo-2.webp', h: 131 }, 3: { file: 'foglia-ricordo-3.webp', h: 116 } },
};
const FIORE: Record<string, { file: string; w: number; h: number }> = {
  travel: { file: 'fiore-travel.webp', w: 130, h: 114 }, party: { file: 'fiore-party.webp', w: 130, h: 114 },
  social: { file: 'fiore-social.webp', w: 130, h: 110 }, corporate: { file: 'fiore-corporate.webp', w: 130, h: 112 },
};
const GEMMA_SPR = { file: 'gemma-chiusa.webp', w: 63, h: 93 };
const CORTECCIA = [
  { file: 'corteccia-1.webp', w: 217, h: 305 }, { file: 'corteccia-2.webp', w: 192, h: 150 },
  { file: 'corteccia-3.webp', w: 190, h: 133 }, { file: 'corteccia-4.webp', w: 123, h: 62 }, { file: 'corteccia-5.webp', w: 160, h: 80 },
];
const FONDALE = ASSET + 'fondale-chioma.webp', BOKEH = ASSET + 'primopiano-bokeh.webp';
const LEAF_K = 1.7;    // larghezza figurina = leafLen(persone) x pScale x LEAF_K. 1.7: la foglia e' il ricordo,
                       // deve dominare il ramo (misura a schermo, lunghezza VERA dell'asse: mediana ~38 px)
// Lo SCORCIO comprime solo l'asse lungo della foglia (una lamina piatta girata fuori piano si
// accorcia in lunghezza, non in larghezza). Intervallo [0.64, 1.0] giusto; la DISTRIBUZIONE va
// spostata in alto: in un ramo vero la maggioranza si vede quasi di piatto, poche voltate via.
// u^0.65 porta la mediana a ~0.87 (non 0.67 di un sorteggio uniforme). Seminato dalla chiave.
const sxOf = (u: number) => 0.64 + 0.36 * Math.pow(u, 0.77);
// Il fiore prende il 50% della lunghezza VERA (gia' scorciata) della sua foglia, ed e' fissato per
// costruzione: nessun sorteggio potra' piu' spostarlo. Un grappolo e' un volume ~sferico: scala si',
// schiacciamento no (non entra nella trasformazione anisotropa della lamina).
const FIORE_SU_FOGLIA = 0.50;
// tono della foglia dallo stato: ricordo (matura), viva (evento suo), ospite (era ospite)
const tonoDi = (mature: boolean, isOwner: boolean) => mature ? 'ricordo' : isOwner ? 'viva' : 'ospite';

// Il ramo di pino e' un ARCO: esce quasi orizzontale (PHI0 sopra l'orizzontale) e curva fino
// alla verticale in punta (PHI1). L'ascissa curvilinea s e' identica; cambia la CURVA. Base =
// passato (in basso, esterno), punta = presente (in alto, verso il cielo). La tangente ruota
// monotona dalla base alla punta; una leggera sinuosita' si sovrappone senza invertirla.
const CX = 180, VW = 360, VH = 500;
const PHI0 = 38 * Math.PI / 180, PHI1 = 89 * Math.PI / 180;
const arcPhi = (s: number, sTot: number) => PHI0 + (PHI1 - PHI0) * Math.min(1, Math.max(0, s / Math.max(1, sTot)));
const axisPoint = (s: number, baseY: number, sTot: number) => {
  const k = (PHI1 - PHI0) / Math.max(1, sTot), sc = Math.min(sTot, Math.max(0, s));
  let x = CX + (Math.sin(PHI0 + k * sc) - Math.sin(PHI0)) / k;
  let y = baseY + (Math.cos(PHI0 + k * sc) - Math.cos(PHI0)) / k;      // clothoide: integrale di (cos, -sin)
  if (s !== sc) { const pe = arcPhi(sc, sTot), ds = s - sc; x += Math.cos(pe) * ds; y -= Math.sin(pe) * ds; } // oltre l'arco: dritto
  const perp = arcPhi(sc, sTot) + Math.PI / 2, w = 5 * Math.sin(sc / 55); // leggera sinuosita' perpendicolare
  return { x: x + Math.cos(perp) * w, y: y - Math.sin(perp) * w };
};
const axisTangent = (s: number, sTot: number) => -arcPhi(Math.min(sTot, Math.max(0, s)), sTot); // angolo dell'arco (monotono)

// Spaziatura: il ritmo, compresso. Nessun caso qui — e' una grandezza che porta significato.
const distanza = (giorni: number) => 40 + 55 * Math.log(1 + Math.max(0, giorni) / 14);

const parseDay = (s: string | null) => { const t = s ? Date.parse(s) : NaN; return Number.isFinite(t) ? t : NaN; };
const daysBetween = (a: string, b: string) => { const ta = parseDay(a), tb = parseDay(b); return Number.isFinite(ta) && Number.isFinite(tb) ? Math.round((tb - ta) / DAY) : 0; };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Rumore deterministico [0,1). jit per l'atmosfera; per le foglie si semina dalla chiave
// (seedOf), cosi' il caso di una foglia resta stabile quando se ne nasconde un'altra.
const jit = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
const seedOf = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 100000); };

// === I TRE SEGNALI: deterministici, puliti, nessun caso, nessuna contaminazione ===
const leafLen = (persone: number) => 16 + 22 * (1 - Math.exp(-persone / 3.5));   // foglia sulle persone
const twigLen = (giorni: number) => 30 + 46 * (1 - Math.exp(-giorni / 7));       // ramoscello sui giorni
// Il tono della foglia (viva / ospite / ricordo) ora lo porta la FIGURINA, non un HSL: la riga
// del ricordo e' un sempreverde profondo, mai autunno. Vedi tonoDi e la tavola FOGLIA in alto.

// === LA LEGGE DELLO SPESSORE (Leonardo/da Vinci) ===
// R_genitore^ALFA = somma(R_figlio^ALFA). Negli alberi DIPINTI che l'occhio accetta come
// alberi, ALFA misurato: Klimt 1.7-1.9, Mondrian 2.8; nei veri 1.8-3.0. Uso 2.2. E' il
// rapporto di spessore - piu' della ramificazione - che fa leggere un albero come tale.
const ALFA = 2.2;
const raggioGenitore = (figli: number[]) => figli.length ? Math.pow(figli.reduce((s, r) => s + Math.pow(r, ALFA), 0), 1 / ALFA) : 0;
const R_TWIG = 0.8;                 // raggio-legge del ramoscello di una foglia
const LAW_SCALE = 2.2;              // da raggio-legge a semilarghezza in unita' di disegno
const raggioGrappolo = (k: number) => R_TWIG * Math.pow(Math.max(1, k), 1 / ALFA);  // = raggioGenitore([R_TWIG x k])

// Innesto dell'utente sul tronco: deterministico e stabile. Angolo aureo 137.5 gradi: la
// spaziatura che non ripete mai un allineamento (il sole dei girasoli). In vista Ramo il
// ramo si guarda di taglio (si ignora l'angolo, si disegna nel piano); quota e angolo
// restano calcolati, stabili, per il collaudo e per lo zoom-albero del cantiere successivo.
// Tutti i rami si innestano NELLA CHIOMA - l'ultimo 12-15% del fusto - non sparsi sul fusto:
// li' convergono sulla sommita', ed e' esattamente R_fusto^2.2 = somma R_rami^2.2. Piccole
// differenze di quota bastano a non farli toccare; l'angolo attorno al fusto resta l'aureo.
const innestoDi = (id: string) => { const i = seedOf(id || 'eg'); return { idx: i, ang: (i * 137.5) % 360, quota: 0.85 + 0.13 * jit(i, 99) }; };

// Rametti (brachiblasti, stub d'anno): curve di Bezier con nastro rastremato.
type Pt = { x: number; y: number };
type Br = { p0: Pt; p1: Pt; p2: Pt; p3: Pt; wBase: number; wTip: number };
const cubic = (b: Br, t: number): Pt => { const u = 1 - t; return {
  x: u*u*u*b.p0.x + 3*u*u*t*b.p1.x + 3*u*t*t*b.p2.x + t*t*t*b.p3.x,
  y: u*u*u*b.p0.y + 3*u*u*t*b.p1.y + 3*u*t*t*b.p2.y + t*t*t*b.p3.y }; };
const branchFrom = (sx: number, sy: number, ang0: number, len: number, ang1: number, wBase: number, wTip: number): Br => {
  const mid = (ang0 + ang1) / 2;
  const p3 = { x: sx + Math.cos(mid) * len, y: sy + Math.sin(mid) * len };
  return { p0: { x: sx, y: sy }, p1: { x: sx + Math.cos(ang0) * len / 3, y: sy + Math.sin(ang0) * len / 3 },
    p2: { x: p3.x - Math.cos(ang1) * len / 3, y: p3.y - Math.sin(ang1) * len / 3 }, p3, wBase, wTip }; };
const cubicTanBr = (b: Br, t: number): number => { const u = 1 - t;
  const dx = 3*u*u*(b.p1.x-b.p0.x) + 6*u*t*(b.p2.x-b.p1.x) + 3*t*t*(b.p3.x-b.p2.x);
  const dy = 3*u*u*(b.p1.y-b.p0.y) + 6*u*t*(b.p2.y-b.p1.y) + 3*t*t*(b.p3.y-b.p2.y);
  return Math.atan2(dy, dx); };
const ribbon = (b: Br, grow = 0, steps = 14): string => {
  const lft: Pt[] = [], rgt: Pt[] = [];
  for (let i = 0; i <= steps; i++) { const t = i / steps, p = cubic(b, t), a = cubicTanBr(b, t);
    const w = (b.wBase + (b.wTip - b.wBase) * t) / 2 + grow;
    const nx = Math.cos(a + Math.PI/2), ny = Math.sin(a + Math.PI/2);
    lft.push({ x: p.x + nx*w, y: p.y + ny*w }); rgt.push({ x: p.x - nx*w, y: p.y - ny*w }); }
  return 'M' + [...lft, ...rgt.reverse()].map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L') + ' Z'; };

// L'asse principale: nastro rastremato lungo l'ARCO, spesso alla base, sottile in punta.
const axisRibbon = (sLo: number, sHi: number, baseY: number, sTot: number, widthAt: (s: number) => number, steps = 44): string => {
  const lft: Pt[] = [], rgt: Pt[] = [];
  for (let i = 0; i <= steps; i++) { const s = lerp(sLo, sHi, i / steps), p = axisPoint(s, baseY, sTot), a = axisTangent(s, sTot);
    const w = widthAt(s) / 2;
    const nx = Math.cos(a + Math.PI/2), ny = Math.sin(a + Math.PI/2);
    lft.push({ x: p.x + nx*w, y: p.y + ny*w }); rgt.push({ x: p.x - nx*w, y: p.y - ny*w }); }
  return 'M' + [...lft, ...rgt.reverse()].map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L') + ' Z'; };

// Gemma chiusa: un fuso appuntito, verde salvia, che si gonfia (size) all'avvicinarsi della data.
// outline: gemma DORMIENTE (potenziale, non ricordo) -> solo CONTORNO, corteccia
// schiarita. Il pieno e' cio' che esiste; il contorno e' cio' che potrebbe esistere:
// distinzione di natura, non di grado - regge a metà della gemma vera e a qualunque luce.
const BudShape = ({ x, y, ang, size, gid, op, outline }: any) => {
  const w = size * 0.58;
  const path = 'M0 0 Q ' + (size*0.55).toFixed(1) + ' ' + (-w).toFixed(1) + ' ' + size.toFixed(1) + ' 0 Q ' + (size*0.55).toFixed(1) + ' ' + w.toFixed(1) + ' 0 0 Z';
  const tf = 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (ang * 180 / Math.PI).toFixed(1) + ')';
  if (outline) {
    // Solo contorno, tondo e chiuso (mandorla): niente nervatura interna e niente punta acuta,
    // che a schermo la facevano sembrare un uncino. Una gemma in attesa, non un gancio.
    const o = 'M0 0 C ' + (size*0.3).toFixed(1) + ' ' + (-w).toFixed(1) + ' ' + (size*0.7).toFixed(1) + ' ' + (-w).toFixed(1) + ' ' + size.toFixed(1) + ' 0 C ' + (size*0.7).toFixed(1) + ' ' + w.toFixed(1) + ' ' + (size*0.3).toFixed(1) + ' ' + w.toFixed(1) + ' 0 0 Z';
    return <g transform={tf} opacity={op}><path d={o} fill="none" stroke="#9a8f78" strokeWidth="0.9" strokeLinejoin="round" /></g>;
  }
  return (
    <g transform={tf} opacity={op}>
      <defs><linearGradient id={gid} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0%" stopColor="#a7c4a0" /><stop offset="60%" stopColor="#7ba374" /><stop offset="100%" stopColor="#4f7a4c" />
      </linearGradient></defs>
      <path d={path} fill={'url(#' + gid + ')'} />
      <path d={'M ' + (size*0.12).toFixed(1) + ' 0 L ' + (size*0.86).toFixed(1) + ' 0'} stroke="#3f6b40" strokeWidth="0.6" opacity="0.5" />
    </g>
  );
};
export default function Garden({ onClose, onOpenHub, onCreateHub }: { onClose: () => void; onOpenHub: (id: string) => void; onCreateHub?: () => void }) {
  const { userId, memberships } = useHub();
  const [leaves, setLeaves] = useState<LeafData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeafData | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [frac, setFrac] = useState(0);             // scorrimento 0..1 (0 = apertura sulla punta)
  const [active, setActive] = useState(false);     // scorrimento in corso -> etichetta del tempo piu' visibile
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const fadeRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { setHidden(new Set(JSON.parse(localStorage.getItem('eg_hidden_leaves') ?? '[]'))); } catch {}
  }, []);
  const toggleHide = (key: string) => setHidden((prev) => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key);
    localStorage.setItem('eg_hidden_leaves', JSON.stringify([...n])); return n;
  });

  useEffect(() => {
    const build = async () => {
      setLoading(true);
      const active = memberships.filter((m) => m.hub.status === 'active');
      const live = await Promise.all(active.map(async (m) => {
        const { count } = await supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', m.hub_id);
        const { data: h } = await supabase.from('hubs').select('start_date, end_date').eq('id', m.hub_id).single();
        // Difesa NaN: se una data manca la durata sarebbe NaN e la foglia sparirebbe dal path.
        const ini = h?.start_date ? +new Date(h.start_date) : NaN;
        const fin = h?.end_date ? +new Date(h.end_date) : NaN;
        const dur = Number.isFinite(ini) && Number.isFinite(fin) ? Math.max(1, Math.round((fin - ini) / 86400000) + 1) : 1;
        return { key: 'live-' + m.hub_id, hubId: m.hub_id, name: m.hub.name, category: m.hub.category, count: count ?? 1, duration: dur, isOwner: m.role === 'OWNER', mature: false, date: h?.start_date ?? '', start: h?.start_date ?? null, end: h?.end_date ?? null } as LeafData;
      }));
      const { data: mat } = await supabase.from('garden_leaves').select('hub_id, hub_name, category, participant_count, duration_days, started_on').eq('owner_id', userId);
      const matured: LeafData[] = (mat ?? []).map((l: any, i: number) => ({ key: 'mat-' + i, hubId: l.hub_id, name: l.hub_name, category: l.category, count: l.participant_count, duration: l.duration_days ?? 1, isOwner: true, mature: true, date: l.started_on ?? '', start: null, end: null }));
      setLeaves([...live, ...matured]);
      setLoading(false);
    };
    build();
  }, [userId, memberships]);

  const today = new Date().toLocaleDateString('sv-SE');

  // === IL MODELLO: ordine per data, grappoli, ascissa curvilinea, forcelle d'anno ===
  const model = useMemo(() => {
    const vis = leaves.filter((l) => !hidden.has(l.key));
    const ordered = [...vis].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); // base=passato, punta=presente
    // Grappolo (brachiblasto): foglie consecutive a <=4 giorni, ma al massimo quattro per rametto.
    type Cl = { date: string; year: string; leaves: LeafData[]; s: number; rel: number; cRad: number };
    const clusters: Cl[] = [];
    let prev = '';
    for (const lf of ordered) {
      const last = clusters[clusters.length - 1];
      if (last && daysBetween(prev, lf.date) <= 4 && last.leaves.length < 4) last.leaves.push(lf);
      else clusters.push({ date: lf.date, year: (lf.date || '').slice(0, 4), leaves: [lf], s: 0, rel: 0, cRad: 0 });
      prev = lf.date;
    }
    // Posizioni relative (primo grappolo a 0), poi i due tratti vuoti PROPORZIONATI al
    // contenuto, non costanti: la cornice deve combaciare col fogliame, non con un asse
    // spoglio fisso. leadOut resta il maggiore, perche' la punta ospita le dormienti.
    let rel = 0;
    clusters.forEach((c, i) => { if (i > 0) rel += distanza(daysBetween(clusters[i - 1].date, c.date)); c.rel = rel; });
    const span = clusters.length ? clusters[clusters.length - 1].rel : 0;
    const leadIn = Math.min(60, Math.max(18, span * 0.12));
    let leadOut = Math.min(110, Math.max(46, span * 0.22));
    clusters.forEach((c) => { c.s = leadIn + c.rel; });
    let sTot = leadIn + span + leadOut;
    // Pavimento: sotto VH*0.92/2.8 la cornice non riempie al tetto di zoom e un germoglio
    // solo tornerebbe un puntino in campo nero (la regressione del banco a una foglia).
    // Si estende SOLO la punta - dove crescono le dormienti, il vuoto e' gia' invito -,
    // mai i grappoli. Fabri (sTot alto) non e' toccato.
    const FLOOR = (VH * 0.92) / 2.8;
    if (sTot < FLOOR) { leadOut += FLOOR - sTot; sTot = FLOOR; }
    const baseY = sTot + 90;
    // Raggio massimo del fogliame dall'asse (brachiblasto + ramoscello + lamina): serve a
    // non stringere lo zoom oltre quanto la foglia piu' estesa puo' stare in LARGHEZZA.
    let maxReach = 40;
    clusters.forEach((c) => { const Lb = c.leaves.length > 1 ? 10 + c.leaves.length * 4 : 0;
      c.leaves.forEach((lf) => { maxReach = Math.max(maxReach, Lb + twigLen(lf.duration) + leafLen(lf.count)); }); });
    const forks: number[] = [];
    for (let i = 1; i < clusters.length; i++) if (clusters[i].year !== clusters[i - 1].year) forks.push((clusters[i - 1].s + clusters[i].s) / 2);
    // Legge dello spessore, dal basso in alto: raggio di ogni grappolo, poi del ramo alla base.
    clusters.forEach((c) => { c.cRad = raggioGrappolo(c.leaves.length); });
    const branchRad = raggioGenitore([R_TWIG, ...clusters.map((c) => c.cRad)]);
    // Tronco = EventGarden. PROVVISORIO: finche' non ci sono i rami degli altri, chiamo la
    // funzione VERA con un insieme provvisorio (il mio ramo + la cima + 4 rami di riferimento);
    // nel cantiere successivo cambia SOLO questo argomento. Il tronco viene ~2.2x il ramo per
    // LEGGE, e cresce come radice del numero di rami: mai per l'inattivita' del singolo.
    const trunkRad = raggioGenitore([branchRad, branchRad * 0.6, branchRad, branchRad, branchRad, branchRad]);
    // Innesto stabile dell'utente sul tronco (quota + angolo aureo). In vista Ramo il ramo si
    // guarda di taglio, quindi l'angolo non ruota il disegno; quota e angolo restano calcolati,
    // stabili, per lo zoom-albero del cantiere successivo.
    const innesto = innestoDi(userId ?? '');
    return { clusters, sTot, baseY, forks, maxReach, branchRad, trunkRad, innesto };
  }, [leaves, hidden, userId]);

  // Apertura sulla punta a ogni cambio di modello.
  useEffect(() => { setFrac(0); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [model.sTot]);

  const onScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current; if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      setFrac(max > 0 ? el.scrollTop / max : 0); // 0 = apertura, 1 = giu' al tronco
    });
    setActive(true);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => setActive(false), 900);
  };

  // La TELECAMERA SEGUE L'ASSE, non contiene l'arco: nulla si perde, si raggiunge scorrendo (come
  // il fusto, come la linea del tempo). L'arco esce dai bordi a monte e a valle, e va bene. Lo zoom
  // e' governato dal fogliame LOCALE - il tetto sulla larghezza da maxReach calcolato solo sulle
  // foglie DENTRO la finestra corrente, non su tutte - col pavimento e il tetto 2.8.
  const TRUNK_REVEAL = 95;
  const zoomFill = Math.max(1, (VH * 0.92) / Math.max(model.sTot, 1)); // pavimento: mai sotto 1
  // Prima passata (maxReach globale) per sapere DOVE guardiamo, poi il reach locale governa lo zoom.
  const zoom0 = Math.min(2.8, zoomFill, (VW * 0.5) / (model.maxReach + 10));
  const openS = zoom0 > 1 ? model.sTot / 2 : model.sTot;  // giovane -> fogliame centrato; cresciuto -> punta
  const camS = openS - frac * (openS + TRUNK_REVEAL);      // si scorre verso l'alto = verso il passato, poi il fusto
  const win0 = (VH / zoom0) * 1.4;
  let localReach = 40;
  model.clusters.forEach((c) => { if (Math.abs(c.s - camS) <= win0) { const Lb = c.leaves.length > 1 ? 10 + c.leaves.length * 4 : 0; c.leaves.forEach((lf) => { localReach = Math.max(localReach, Lb + twigLen(lf.duration) + leafLen(lf.count)); }); } });
  const zoom = Math.min(2.8, zoomFill, (VW * 0.5) / (localReach + 10));
  const fit = zoom > 1 ? 1.08 : 1;
  const eVW = (VW / zoom) * fit, eVH = (VH / zoom) * fit;
  // Sopra l'innesto la camera segue l'ARCO; sotto (camS<0) scende lungo il fusto verticale a CX (il capolinea).
  const cam = camS >= 0 ? axisPoint(camS, model.baseY, model.sTot) : { x: CX, y: model.baseY - camS };
  const winLo = camS - eVH * 1.6, winHi = camS + eVH * 1.6;
  const sv = camS;
  const vb = (cam.x - eVW / 2).toFixed(1) + ' ' + (cam.y - eVH / 2).toFixed(1) + ' ' + eVW.toFixed(1) + ' ' + eVH.toFixed(1);
  // Etichetta del tempo: periodo del grappolo piu' vicino alla vista.
  const near = model.clusters.reduce<any>((best, c) => (!best || Math.abs(c.s - sv) < Math.abs(best.s - sv) ? c : best), null);
  const periodo = near && near.date ? MESI[Math.max(0, Math.min(11, parseInt(near.date.slice(5, 7)) - 1))] + ' ' + near.date.slice(0, 4) : '';

  const stateOf = (lf: LeafData): 'gemma' | 'tenera' | 'adulta' | 'matura' => {
    if (lf.mature) return 'matura';
    if (lf.start && lf.start > today) return 'gemma';
    if (lf.start && lf.end && lf.start <= today && today <= lf.end) return 'tenera';
    return 'adulta';
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center p-6 pt-10"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 30%, #1a2e1f 0%, #0f1a14 40%, #0a0f0c 100%)' }}>
      {/* NIENTE piu' strati di sfondo: c'e' UN albero, guardato da vicino. Tronco, innesto,
          ramo, foglie vivono in un solo spazio (l'SVG sotto). La camera e' l'unica cosa che si muove. */}
      {/* Atmosfera: particelle-luce sospese. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: (2 + jit(i, 5) * 3) + 'px', height: (2 + jit(i, 5) * 3) + 'px',
            left: (jit(i, 6) * 100) + '%', top: (jit(i, 7) * 100) + '%',
            background: 'rgba(134,169,140,0.4)',
            animation: 'float ' + (4 + jit(i, 8) * 4) + 's ease-in-out infinite', animationDelay: (jit(i, 9) * 3) + 's',
          }} />
        ))}
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-200/60 font-black">Il tuo giardino</p>
        </div>
        <h2 className="text-center text-2xl font-black text-white [font-family:var(--font-display)] mt-3">Il tuo ramo</h2>
        <p className="text-center text-emerald-200/50 text-xs">{leaves.length === 0 ? 'Ancora da coltivare' : leaves.length + (leaves.length === 1 ? ' momento fiorito' : ' momenti fioriti')}</p>
        {/* La cornice che rende il conteggio un inizio, non un bilancio. Nessuna soglia da raggiungere. */}
        {leaves.length >= 1 && leaves.length <= 5 && (
          <p className="text-center text-emerald-200/40 text-[11px] mb-2">{leaves.length === 1 ? 'Il ramo è giovane. Ogni evento lo allunga.' : 'Il ramo sta prendendo forma.'}</p>
        )}
        {(leaves.length === 0 || leaves.length > 5) && <div className="mb-2" />}

        {loading ? <div className="flex-1 min-h-[62vh] rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} /> :
          leaves.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">{String.fromCodePoint(0x1F331)}</p>
            <p className="text-emerald-100 text-base font-bold">Il tuo ramo attende.</p>
            <p className="text-emerald-200/50 text-xs mt-2 max-w-[220px] mx-auto">Ogni evento che vivrà farà sbocciare una foglia. Lo guardi crescere.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Contenitore scorrevole: lo scroll e' un'ascissa sul tracciato; l'SVG appiccicato segue la curva. */}
            <div ref={scrollRef} onScroll={onScroll} className="rounded-3xl" style={{ height: '62vh', overflowY: 'auto', overflowX: 'hidden' }}>
              <div style={{ height: Math.max(openS + TRUNK_REVEAL, 340) + 200 + 'px', position: 'relative' }}>
                {/* Wrapper appiccicato: tre strati sovrapposti, l'ordine conta. Il fondale sotto tutto, l'SVG
                    in mezzo (la camera pana), il bokeh sopra tutto. I fondali NON pananno: sono scenografia,
                    non dati di nessuno. La camera e' l'unica cosa che si muove. */}
                <div style={{ position: 'sticky', top: 0, height: '62vh' }}>
                  {/* Fondale: chioma sfocata su piu' piani, luce da alto-sinistra. Sotto tutto. */}
                  <img src={FONDALE} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'manipulation' }}>
                  {/* Ombre CONDIVISE (una per le foglie, una per il ramo): mai una per elemento - i filtri
                      costano sul telefono. */}
                  <defs>
                    <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="2" stdDeviation="1.2" floodColor="#0a140d" floodOpacity="0.38" /></filter>
                    <filter id="branchShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.5" dy="3" stdDeviation="2" floodColor="#0a140d" floodOpacity="0.45" /></filter>
                  </defs>
                  {/* Il ramo si STACCA dal tronco a 40 gradi e poi curva su - una Y, non una H. Un collare
                      all'innesto (piu' raggio agli ultimi punti) dice "e' cresciuto da li'", non "appoggiato".
                      Il tronco passa dietro, la base vi si fonde. Sotto il primo grappolo (nessuna foglia) c'e'
                      il connettore; l'asse serpeggiante - LARGHEZZA dalla legge - riprende dal primo grappolo. */}
                  {(() => {
                    const branchW = (s: number) => LAW_SCALE * raggioGenitore([R_TWIG, ...model.clusters.filter((c) => c.s >= s).map((c) => c.cRad)]);
                    const s0 = model.clusters.length ? model.clusters[0].s : 0;
                    const p0 = { x: CX, y: model.baseY }, p3 = axisPoint(s0, model.baseY, model.sTot);
                    const angLeave = axisTangent(0, model.sTot);          // il ramo lascia il tronco nella direzione dell'arco (~38 sopra l'orizzontale)
                    const angMeet = axisTangent(s0, model.sTot), lenC = Math.hypot(p3.x - p0.x, p3.y - p0.y) || 1;
                    const p1 = { x: p0.x + Math.cos(angLeave) * lenC * 0.5, y: p0.y + Math.sin(angLeave) * lenC * 0.5 };
                    const p2 = { x: p3.x - Math.cos(angMeet) * lenC * 0.4, y: p3.y - Math.sin(angMeet) * lenC * 0.4 };
                    const wTip = branchW(s0);
                    const connBr = { p0, p1, p2, p3, wBase: wTip * 1.5, wTip };   // collare (wBase piu' largo)
                    const conn = ribbon(connBr, 0, 20);
                    // La sagoma del ramo (LARGHEZZA dalla legge) e' UNA sola: connettore + asse. Serve da clipPath.
                    const axisClip = axisRibbon(Math.max(s0, winLo), Math.min(model.sTot, winHi), model.baseY, model.sTot, branchW);
                    // Linea centrale campionata (punto, tangente, larghezza): connettore [0..12], poi asse visibile.
                    const samples: { x: number; y: number; a: number; w: number }[] = [];
                    for (let i = 0; i <= 12; i++) { const t = i / 12, p = cubic(connBr, t); samples.push({ x: p.x, y: p.y, a: cubicTanBr(connBr, t), w: lerp(connBr.wBase, connBr.wTip, t) }); }
                    const sLoB = Math.max(s0, camS - eVH * 0.7), sHiB = Math.min(model.sTot, camS + eVH * 0.7);
                    for (let i = 1; i <= 30; i++) { const s = lerp(sLoB, sHiB, i / 30), p = axisPoint(s, model.baseY, model.sTot); samples.push({ x: p.x, y: p.y, a: axisTangent(s, model.sTot), w: branchW(s) }); }
                    const cum = [0]; for (let i = 1; i < samples.length; i++) cum.push(cum[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
                    const total = cum[cum.length - 1];
                    const at = (dd: number) => { let k = 0; while (k < cum.length - 2 && cum[k + 1] < dd) k++; const seg = Math.max(1e-3, cum[k + 1] - cum[k]), t = Math.min(1, Math.max(0, (dd - cum[k]) / seg)); const A = samples[k], B = samples[k + 1] ?? A; return { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t), a: A.a, w: lerp(A.w, B.w, t) }; };
                    // Corteccia MOLTO sovrapposta (avanzamento ~1/3 della piastrella), ruotata +-7 gradi, scala
                    // variabile: dentro la sagoma non si riconosce alcun ritmo. Un fondo scuro sotto copre i vuoti.
                    const bark: any[] = []; let dd = 0, gi = 0;
                    while (dd <= total && gi < 70) {
                      const q = at(dd), sd = seedOf('cort' + gi);
                      const c = CORTECCIA[Math.floor(jit(sd, 2) * CORTECCIA.length) % CORTECCIA.length];
                      const across = Math.max(6, q.w * 3.0), scale = across / c.h, along = c.w * scale;
                      const rot = q.a * 180 / Math.PI + (jit(sd, 5) - 0.5) * 14, sc = 0.92 + jit(sd, 6) * 0.28;
                      bark.push(<image key={'ck' + gi} href={ASSET + c.file} x={(-along / 2).toFixed(1)} y={(-across / 2).toFixed(1)} width={along.toFixed(1)} height={across.toFixed(1)} preserveAspectRatio="none"
                        transform={'translate(' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ') rotate(' + rot.toFixed(1) + ') scale(' + sc.toFixed(2) + ')'} />);
                      dd += Math.max(6, along * 0.35); gi++;
                    }
                    // Linea di luce continua sul lato in ALTO a SINISTRA (lato scelto per campione), e bordo scuro:
                    // sono queste due linee continue a far leggere il ramo come un corpo solo, non tessere.
                    const lightOff = (sp: { x: number; y: number; a: number; w: number }) => { const nx = Math.cos(sp.a + Math.PI / 2), ny = Math.sin(sp.a + Math.PI / 2), sign = (nx + ny) < 0 ? 1 : -1; return (sp.x + sign * nx * sp.w * 0.42).toFixed(1) + ' ' + (sp.y + sign * ny * sp.w * 0.42).toFixed(1); };
                    const lightConn = 'M' + samples.slice(0, 13).map(lightOff).join(' L');
                    const lightAxis = 'M' + samples.slice(13).map(lightOff).join(' L');
                    return (
                      <g filter="url(#branchShadow)">
                        <defs><clipPath id="branchClip"><path d={conn} /><path d={axisClip} /></clipPath></defs>
                        <path d={conn} fill={STEM_DK} />
                        <path d={axisClip} fill={STEM_DK} />
                        <g clipPath="url(#branchClip)">{bark}</g>
                        <path d={conn} fill="none" stroke="#17110b" strokeWidth="1.5" opacity="0.6" strokeLinejoin="round" />
                        <path d={axisClip} fill="none" stroke="#17110b" strokeWidth="1.5" opacity="0.6" strokeLinejoin="round" />
                        <path d={lightConn} fill="none" stroke="#cdbb9a" strokeWidth="1.1" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={lightAxis} fill="none" stroke="#cdbb9a" strokeWidth="1.1" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
                      </g>
                    );
                  })()}
                  {/* Forcelle d'anno: stub laterale che si assottiglia (non scatta finche' e' tutto un anno). */}
                  {model.forks.filter((s) => s > winLo && s < winHi).map((s, i) => {
                    const P = axisPoint(s, model.baseY, model.sTot), a = axisTangent(s, model.sTot), side = i % 2 ? 1 : -1;
                    const br = branchFrom(P.x, P.y, a + side * 1.5, 120, a + side * 1.9, 6, 1);
                    return <g key={'fork' + i}><path d={ribbon(br, 1.5)} fill={STEM_DK} opacity="0.5" /><path d={ribbon(br)} fill={STEM} /></g>;
                  })}
                  {/* Grappoli nella finestra: brachiblasto + foglie. */}
                  {(() => {
                    const bg: any[] = [], fg: any[] = [];
                    // Lato IRREGOLARE (non ci%2): l'alternanza perfetta faceva sembrare il ramo una scala.
                    // Seminato dall'identita', con la sola regola di non ripetersi tre volte di fila.
                    const sides: number[] = []; let run = 1, prev = 0;
                    model.clusters.forEach((c, ci) => {
                      let s = jit(seedOf((userId ?? '') + 'lato' + ci), 3) < 0.5 ? -1 : 1;
                      if (ci > 0 && s === prev) { if (run >= 2) { s = -s; run = 1; } else run++; } else run = 1;
                      prev = s; sides.push(s);
                    });
                    // La gemma segue la LEGGE della foglia: 0.80 x la lunghezza mediana di una foglia adulta
                    // RENDERIZZATA (leafLen x pScale x LEAF_K x scorcio), non una costante propria. Cosi' quando
                    // la foglia cresce la gemma la segue da sola, per sempre, senza tornarci sopra.
                    const adultLens: number[] = [];
                    model.clusters.forEach((c) => c.leaves.forEach((lf) => {
                      if (stateOf(lf) === 'gemma') return;
                      const sd = seedOf(lf.key), pl = jit(sd, 50) < 0.28 ? 0.8 : jit(sd, 50) < 0.72 ? 0.92 : 1;
                      adultLens.push(leafLen(lf.count) * pl * LEAF_K * sxOf(jit(sd, 6)));
                    }));
                    adultLens.sort((a, b) => a - b);
                    const medLeafLen = adultLens.length ? adultLens[adultLens.length >> 1] : leafLen(3) * LEAF_K * 0.87;
                    model.clusters.forEach((c, ci) => {
                      if (c.s <= winLo || c.s >= winHi) return;
                      const P = axisPoint(c.s, model.baseY, model.sTot), T = axisTangent(c.s, model.sTot), m = c.leaves.length, side = sides[ci];
                      // Foglie orientate sulla TANGENTE locale (che ora ruota molto). Dove la tangente e'
                      // quasi orizzontale (base dell'arco) si tira il ventaglio verso l'alto, cosi' nessuna
                      // foglia punta in basso. In alto (tangente verticale) resta come prima.
                      const UP = -Math.PI / 2, lean = Math.min(1, Math.abs(T - UP) / (Math.PI / 2) * 1.6);
                      const spr = 1.05 * (1 - 0.55 * lean);              // ventaglio piu' stretto dove la tangente e' orizzontale
                      const bAng = T + (UP - T) * lean + side * spr;     // il brachiblasto si stacca dall'asse, verso l'alto
                      const Lb = m > 1 ? 10 + m * 4 : 0;
                      const Q = { x: P.x + Math.cos(bAng) * Lb, y: P.y + Math.sin(bAng) * Lb };
                      if (Lb > 0) bg.push(<path key={'bb' + ci} d={ribbon(branchFrom(P.x, P.y, bAng, Lb, bAng, 3, 1.4))} fill={STEM} />);
                      c.leaves.forEach((lf, j) => {
                        const seed = seedOf(lf.key);
                        const base = m > 1 ? { x: lerp(P.x, Q.x, (j + 0.7) / m), y: lerp(P.y, Q.y, (j + 0.7) / m) } : P;
                        const fan = m > 1 ? (j - (m - 1) / 2) * (1.3 / m) : 0;
                        let leafAng = bAng + fan + (jit(seed, 1) - 0.5) * 0.5;     // fan attorno al rametto + caso
                        if (Math.sin(leafAng) > 0.06) leafAng = -leafAng;         // il ramoscello non punta mai in basso
                        const st = stateOf(lf);
                        const plane = jit(seed, 50) < 0.28 ? 0 : jit(seed, 50) < 0.72 ? 1 : 2;
                        const pScale = plane === 0 ? 0.8 : plane === 1 ? 0.92 : 1;
                        const pOp = plane === 0 ? 0.62 : plane === 1 ? 0.85 : 1;
                        const twl = twigLen(lf.duration);                        // SEGNALE pulito
                        const ex = base.x + Math.cos(leafAng) * twl, ey = base.y + Math.sin(leafAng) * twl;
                        const bend = (jit(seed, 4) - 0.5) * twl * 0.6;
                        const mx = (base.x + ex) / 2 + Math.cos(leafAng + Math.PI/2) * bend, my = (base.y + ey) / 2 + Math.sin(leafAng + Math.PI/2) * bend;
                        const swayBase = st === 'tenera' ? 2.2 : 3.4;             // la tenera ondeggia di piu'
                        const swayDur = swayBase + jit(seed, 20) * 2.6, phase = jit(seed, 21) * 4;
                        const delay = 1.0 + (ci * 0.12 + j * 0.05);
                        const key = lf.key;
                        const onClick = () => setSelected(lf);
                        if (st === 'gemma') {
                          // Gemma chiusa che si gonfia: piena a <=30 giorni, minima a >=90.
                          const du = daysBetween(today, lf.start ?? today);
                          const swell = Math.max(0, Math.min(1, (90 - du) / 60));
                          // 0.76-0.85 x la foglia mediana (gonfia salendo verso la data): segue la foglia, non
                          // una costante propria. Una gemma e' piu' piccola di una foglia adulta.
                          const gh = medLeafLen * (0.76 + 0.09 * swell), gw = gh * (GEMMA_SPR.w / GEMMA_SPR.h);
                          fg.push({ plane: 3, el: (
                            <g key={key} onClick={onClick} className="cursor-pointer" style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay.toFixed(2) + 's forwards, sway ' + swayDur.toFixed(2) + 's ease-in-out ' + phase.toFixed(2) + 's infinite', transformOrigin: base.x.toFixed(1) + 'px ' + base.y.toFixed(1) + 'px' }}>
                              <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke="transparent" strokeWidth={(44 / zoom).toFixed(1)} strokeLinecap="round" fill="none" />
                              <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke={STEM} strokeWidth="1.6" fill="none" strokeLinecap="round" />
                              <image href={ASSET + GEMMA_SPR.file} x={(ex - gw / 2).toFixed(1)} y={(ey - gh).toFixed(1)} width={gw.toFixed(1)} height={gh.toFixed(1)} preserveAspectRatio="none" />
                            </g>
                          ) });
                          return;
                        }
                        const tilt = (jit(seed, 5) - 0.5) * 0.87;
                        let ang = leafAng + tilt;
                        if (Math.sin(ang) > 0.06) ang = leafAng;                  // se il tilt la butta giu', la lamina resta sulla tangente (su)
                        const sx = sxOf(jit(seed, 6));                            // scorcio: comprime SOLO l'asse lungo, sorteggio spostato in alto
                        const len = leafLen(lf.count) * pScale;                   // SEGNALE pulito (solo profondita' scala)
                        // La FIGURINA: tono dallo stato (viva/ospite/ricordo), forma 1-3 dal seme (tre sagome).
                        const tono = tonoDi(st === 'matura', lf.isOwner);
                        const forma = 1 + (seed % 3);
                        const spr = FOGLIA[tono][forma];
                        const lw = len * LEAF_K, lh = lw * (spr.h / FOGLIA_W);    // larghezza = len (la vecchia lunghezza), altezza per aspetto
                        // Il fiore appartiene alla foglia: all'attacco della lamina, arretrato verso la base
                        // e verso l'interno (verso il ramoscello); la foglia gli passa SOPRA -> cresciuto li'.
                        const fx = ex + (base.x - ex) * 0.12, fy = ey + (base.y - ey) * 0.12;
                        const fspr = FIORE[lf.category] ?? FIORE.travel;
                        // Il diametro sulla lunghezza VERA (gia' scorciata) della SUA foglia = lw * sx. Il fiore
                        // NON si comprime (resta rotondo): scala uniforme, fuori dalla trasformazione della lamina.
                        const fw = FIORE_SU_FOGLIA * lw * sx, fh = fw * (fspr.h / fspr.w);
                        fg.push({ plane, el: (
                          <g key={key} onClick={onClick} className="cursor-pointer" style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay.toFixed(2) + 's forwards, sway ' + swayDur.toFixed(2) + 's ease-in-out ' + phase.toFixed(2) + 's infinite', transformOrigin: base.x.toFixed(1) + 'px ' + base.y.toFixed(1) + 'px' }}>
                            {/* Capsula invisibile del tocco: 44px reali, dall'innesto alla punta della lamina.
                                transparent (non none) riceve gli eventi; /zoom la tiene a 44px reali. INVARIATA. */}
                            <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' L ' + (ex + Math.cos(ang) * len).toFixed(1) + ' ' + (ey + Math.sin(ang) * len).toFixed(1)} stroke="transparent" strokeWidth={(44 / zoom).toFixed(1)} strokeLinecap="round" fill="none" />
                            <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke={STEM} strokeWidth={(1.4 + pScale*1.2).toFixed(1)} fill="none" strokeLinecap="round" opacity={pOp} />
                            {/* Il fiore PRIMA della foglia: la lamina lo copre in parte. Uno solo per Hub. */}
                            <image href={ASSET + fspr.file} x={(fx - fw / 2).toFixed(1)} y={(fy - fh / 2).toFixed(1)} width={fw.toFixed(1)} height={fh.toFixed(1)} preserveAspectRatio="none" opacity={pOp} />
                            {/* La foglia: base sul bordo sinistro (x=0), scalata a lw, ruotata di ang, scorcio sx. */}
                            <g transform={'translate(' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ') rotate(' + (ang * 180 / Math.PI).toFixed(1) + ') scale(' + sx.toFixed(2) + ' 1)'} opacity={pOp}>
                              <image href={ASSET + spr.file} x="0" y={(-lh / 2).toFixed(1)} width={lw.toFixed(1)} height={lh.toFixed(1)} preserveAspectRatio="none" />
                            </g>
                          </g>
                        ) });
                      });
                    });
                    fg.sort((a, b) => a.plane - b.plane);   // piani posteriori disegnati per primi
                    return <>{bg}<g filter="url(#leafShadow)">{fg.map((f) => f.el)}</g></>;
                  })()}
                  {/* Gemme dormienti: potenziale puro sul tratto terminale. Numero COSTANTE dal seme
                      dell'identita' (mai dal tempo o dal comportamento: il vuoto non si conta). Toccabili
                      solo se la creazione e' collegata; altrimenti inerti, senza segno di esserlo. */}
                  {(() => {
                    if (!model.clusters.length) return null;
                    const lastS = model.clusters[model.clusters.length - 1].s;
                    const nDorm = 2 + (seedOf(userId ?? 'seme') % 2);   // 2 o 3, sempre
                    const lo = lastS + 26, hi = model.sTot - 6;
                    const out: any[] = [];
                    for (let i = 0; i < nDorm; i++) {
                      const s = nDorm > 1 ? lerp(lo, hi, i / (nDorm - 1)) : (lo + hi) / 2;
                      if (s <= winLo || s >= winHi) continue;
                      const P = axisPoint(s, model.baseY, model.sTot), a = axisTangent(s, model.sTot), sd = seedOf((userId ?? '') + 'dorm' + i), side = i % 2 ? 1 : -1;
                      // Taglia 8-10 = ~45-55% della gemma vera a gonfiore pieno (18), non della
                      // sua minima. Opacita' 0.75, e solo contorno: cosi' esiste otticamente.
                      const ang = a + side * (0.5 + jit(sd, 1) * 0.4), size = 8 + jit(sd, 2) * 2;
                      const bdur = 5.5 + jit(sd, 3) * 2.5, bph = jit(sd, 4) * 4, clickable = !!onCreateHub;
                      out.push(
                        <g key={'dorm' + i} onClick={clickable ? onCreateHub : undefined} className={clickable ? 'cursor-pointer' : undefined}
                           style={{ opacity: 0, animation: 'pop .5s ease-out ' + (1.5 + i * 0.15).toFixed(2) + 's forwards, breathe ' + bdur.toFixed(2) + 's ease-in-out ' + bph.toFixed(2) + 's infinite', transformOrigin: P.x.toFixed(1) + 'px ' + P.y.toFixed(1) + 'px' }}>
                          <circle cx={P.x.toFixed(1)} cy={P.y.toFixed(1)} r={(22 / zoom).toFixed(1)} fill="transparent" />
                          <BudShape x={P.x} y={P.y} ang={ang} size={size} gid={'dbud' + i} op={0.75} outline />
                        </g>
                      );
                    }
                    return out;
                  })()}
                </svg>
                  {/* Primo piano: foglie enormi e fuori fuoco davanti all'osservatore - "ho la testa dentro
                      il fogliame". Sopra tutto, non toccabile (gli eventi passano al fogliame vero sotto). */}
                  <img src={BOKEH} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>
            {/* Indicazione discreta del tempo, in dissolvenza. */}
            {/* La bussola: se non si vede piu' tutto l'arco, l'etichetta del periodo e' l'unico orientamento.
                Sempre chiaramente visibile durante lo scorrimento (0.9), presente anche da fermi (0.45). */}
            {periodo && <div className="absolute top-3 right-4 pointer-events-none text-[10px] uppercase tracking-[0.25em] font-black text-emerald-200 transition-opacity duration-500" style={{ opacity: active ? 0.9 : 0.45 }}>{periodo}</div>}
          </div>
        )}

        {leaves.length > 0 && (
          <div className="mt-2">
            <button onClick={() => setShowHidden((s) => !s)} className="w-full text-[10px] uppercase tracking-wider text-emerald-200/50 font-black py-2">
              {showHidden ? 'Chiudi' : 'Cura il tuo ramo' + (hidden.size ? ' (' + hidden.size + ' nascoste)' : '')}
            </button>
            {showHidden && (
              <div className="space-y-1 mt-2">
                {leaves.map((lf) => (
                  <div key={lf.key} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className={'text-xs ' + (hidden.has(lf.key) ? 'text-slate-600 line-through' : 'text-emerald-100')}>{lf.name}</span>
                    <button onClick={() => toggleHide(lf.key)} className="text-[9px] uppercase font-black text-emerald-200/60">{hidden.has(lf.key) ? 'Fai rifiorire' : 'Riposa'}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (() => {
        const CAT: Record<string, string> = { travel: 'Viaggio', party: 'Festa', social: 'Ritrovo', corporate: 'Lavoro' };
        const col = FLOWER[selected.category] ?? '#f59e0b';
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setSelected(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(160deg, #16241a, #0f1a14)' }}>
              <div className="h-2" style={{ background: col }} />
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-widest font-black mb-1" style={{ color: col }}>{CAT[selected.category] ?? selected.category}{selected.mature ? ' · Ricordo' : selected.isOwner ? ' · Il tuo evento' : ' · Sei ospite'}</p>
                <h3 className="text-2xl font-black text-white leading-tight [font-family:var(--font-display)]">{selected.name}</h3>
                <div className="flex gap-5 mt-4">
                  <div><span className="text-2xl font-black text-white">{selected.count}</span><p className="text-[9px] uppercase text-emerald-200/50 font-bold">{selected.count === 1 ? 'persona' : 'persone'}</p></div>
                  <div><span className="text-2xl font-black text-white">{selected.duration}</span><p className="text-[9px] uppercase text-emerald-200/50 font-bold">{selected.duration === 1 ? 'giorno' : 'giorni'}</p></div>
                </div>
                {/* L'Hub esiste ancora (anche archiviato) -> il tasto porta. Non esiste piu' -> una
                    riga onesta al suo posto: un tasto che non risponde e' peggio di un tasto assente. */}
                {selected.hubId ? (
                  <button onClick={() => { onOpenHub(selected.hubId!); setSelected(null); }}
                    className="w-full mt-5 bg-emerald-400 text-slate-950 py-3 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-transform">Vai all'Hub</button>
                ) : (
                  <p className="w-full mt-5 text-center text-emerald-200/45 text-xs italic py-3">Di questo resta il ricordo.</p>
                )}
                <button onClick={() => setSelected(null)} className="w-full mt-2 text-emerald-200/40 text-xs py-2">Chiudi</button>
              </div>
            </div>
          </div>
        );
      })()}
      <style>{'@keyframes pop { from { opacity:0; transform: scale(0) } to { opacity:1; transform: scale(1) } } @keyframes float { 0%,100% { transform: translateY(0); opacity: 0.3 } 50% { transform: translateY(-12px); opacity: 0.7 } } @keyframes sway { 0%,100% { transform: rotate(-1.8deg) } 50% { transform: rotate(1.8deg) } } @keyframes breathe { 0%,100% { transform: scale(0.94) } 50% { transform: scale(1.05) } } @media (prefers-reduced-motion: reduce) { g, circle, path { animation-iteration-count: 1 !important } }'}</style>
    </div>
  );
}
