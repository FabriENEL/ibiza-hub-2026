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
// Verde di famiglia, ma mai due foglie identiche: tono e luminosita' variano per seme.
// Il ricordo e' un sempreverde, non una foglia d'autunno: verde profondo e stabile.
// La distinzione dal presente la porta la SATURAZIONE (il presente e' piu' acceso), non la stagione.
const leafHSL = (mature: boolean, isOwner: boolean) =>
  mature ? { h: 150, s: 30, l: 40 } : isOwner ? { h: 138, s: 58, l: 54 } : { h: 134, s: 34, l: 46 };

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

// Foglia: base stretta, pancia, punta (arricciata da curl); scorcio via scale(sx) sull'asse
// lungo; gradiente orientato dalla luce (coordinate passate da fuori).
const LeafShape = ({ x, y, ang, sx, len, curl, grad, hi, mid, edge, gid, op }: any) => {
  const w = len * 0.44, tip = curl * w * 0.5;
  return (
    <g transform={'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (ang * 180 / Math.PI).toFixed(1) + ') scale(' + sx.toFixed(2) + ' 1)'} opacity={op}>
      <defs>
        <linearGradient id={gid} x1={grad.x1.toFixed(3)} y1={grad.y1.toFixed(3)} x2={grad.x2.toFixed(3)} y2={grad.y2.toFixed(3)}>
          <stop offset="0%" stopColor={hi} /><stop offset="52%" stopColor={mid} /><stop offset="100%" stopColor={edge} />
        </linearGradient>
      </defs>
      <path d={'M0 0 C ' + (len*0.22).toFixed(1) + ' ' + (-w).toFixed(1) + ' ' + (len*0.72).toFixed(1) + ' ' + (-w*0.65).toFixed(1) + ' ' + len.toFixed(1) + ' ' + tip.toFixed(1) + ' C ' + (len*0.72).toFixed(1) + ' ' + (w*0.65).toFixed(1) + ' ' + (len*0.22).toFixed(1) + ' ' + w.toFixed(1) + ' 0 0 Z'} fill={'url(#' + gid + ')'} />
      <path d={'M ' + (len*0.08).toFixed(1) + ' 0 Q ' + (len*0.5).toFixed(1) + ' ' + (w*0.12).toFixed(1) + ' ' + (len*0.9).toFixed(1) + ' ' + (tip*0.8).toFixed(1)} stroke={edge} strokeWidth="0.7" fill="none" opacity="0.5" />
    </g>
  );
};
// Fiore: cinque petali diseguali, bordi curvi, centro morbido.
const FlowerShape = ({ x, y, color, r, seed }: any) => (
  <g transform={'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'} opacity="0.9">
    {[0,1,2,3,4].map((k) => {
      const a = k*72 + (jit(seed, 20+k)-0.5)*26, rad = a*Math.PI/180;
      const cx = Math.cos(rad)*r*0.6, cy = Math.sin(rad)*r*0.6, pr = r*(0.85 + jit(seed,30+k)*0.4);
      return <ellipse key={k} cx={cx} cy={cy} rx={pr} ry={pr*0.52} transform={'rotate(' + a.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')'} fill={color} />;
    })}
    <circle r={(r*0.42).toFixed(1)} fill="#f2e3b0" opacity="0.9" />
  </g>
);
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
// Stipole: due foglioline alla base del picciolo, angolate all'indietro. Decorazione,
// non ricordo: piccole (un quinto della foglia), stessa famiglia di verde ma piu' scure,
// MAI toccabili (vivono nello strato di fondo, senza gestore). Si tocca solo cio' che e' un ricordo.
const Stipole = ({ x, y, ang, len, color }: any) => {
  const w = len * 0.5;
  const blade = 'M0 0 Q ' + (len*0.5).toFixed(1) + ' ' + (-w).toFixed(1) + ' ' + len.toFixed(1) + ' 0 Q ' + (len*0.5).toFixed(1) + ' ' + w.toFixed(1) + ' 0 0 Z';
  return (
    <g transform={'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'} opacity="0.85">
      <path d={blade} transform={'rotate(' + ((ang + Math.PI + 0.5) * 180 / Math.PI).toFixed(1) + ')'} fill={color} />
      <path d={blade} transform={'rotate(' + ((ang + Math.PI - 0.5) * 180 / Math.PI).toFixed(1) + ')'} fill={color} />
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
  const trunkYBot = model.baseY + TRUNK_REVEAL + eVH / 2 + 45; // la base del fusto sempre oltre il bordo inferiore
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
                <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" style={{ position: 'sticky', top: 0, width: '100%', height: '62vh', display: 'block', touchAction: 'manipulation' }}>
                  {/* LA SOMMITA' DEL FUSTO, vista da DENTRO la chioma: la cima verso cui il ramo converge.
                      NON si taglia mai al bordo del contenitore: la sua opacita' va a ZERO qualche decina di
                      unita' PRIMA del ritaglio - si perde nel buio, come un tronco visto verso il fondo della
                      chioma. E' una PRESENZA, non un'asticella: largo ~un quinto della colonna, si stringe
                      appena scendendo. Il collare copre la giunzione ("e' cresciuto da li'"). */}
                  {(() => {
                    const half = eVW * 0.10;                                 // ~20% della larghezza della colonna: una presenza
                    const yTopS = model.baseY - 15, yBotS = trunkYBot;
                    const persp = (y: number) => 1 - 0.24 * Math.min(1, Math.max(0, (y - yTopS) / 320)); // si stringe appena scendendo
                    const cxT = (y: number) => CX + 5 * Math.sin((y - model.baseY) / 150);
                    const L: number[][] = [], Rr: number[][] = [], N = 40;
                    for (let i = 0; i <= N; i++) { const y = yTopS + (yBotS - yTopS) * i / N, c = cxT(y), r = half * persp(y); L.push([c - r, y]); Rr.push([c + r, y]); }
                    const path = 'M' + [...L, ...Rr.reverse()].map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z';
                    const bark = [-0.5, 0, 0.45].map((f, i) => { const P: number[][] = []; for (let j = 0; j <= 18; j++) { const y = yTopS + (yBotS - yTopS) * j / 18, c = cxT(y), r = half * persp(y); P.push([c + f * r + 3 * Math.sin(y / 80 + i * 1.7), y]); } return 'M' + P.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L'); });
                    // La dissolvenza insegue il bordo inferiore dell'inquadratura (varia con lo scroll):
                    // opacita' 0 a yFadeEnd, 18 unita' SOPRA il ritaglio -> nessuna linea dura, mai.
                    const frameBottom = cam.y + eVH / 2, yFadeEnd = frameBottom - 18, yFadeStart = frameBottom - 42;
                    const bw = LAW_SCALE * model.branchRad;                  // semilarghezza del ramo alla base
                    const collarR = bw * 1.75;                              // collare 1.75x il ramo: copre l'intera giunzione
                    return (
                      <g>
                        <defs>
                          <linearGradient id="fusto" gradientUnits="userSpaceOnUse" x1={(CX - half).toFixed(1)} y1="0" x2={(CX + half).toFixed(1)} y2="0">
                            <stop offset="0%" stopColor="#6b5743" /><stop offset="46%" stopColor="#453728" /><stop offset="100%" stopColor="#271e16" />
                          </linearGradient>
                          <linearGradient id="fustoFade" gradientUnits="userSpaceOnUse" x1="0" y1={yFadeStart.toFixed(1)} x2="0" y2={yFadeEnd.toFixed(1)}>
                            <stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#000" />
                          </linearGradient>
                          <mask id="fustoMask">
                            <rect x={(CX - half - 20).toFixed(1)} y={(yTopS - 40).toFixed(1)} width={(half * 2 + 40).toFixed(1)} height={(yFadeStart - (yTopS - 40)).toFixed(1)} fill="#fff" />
                            <rect x={(CX - half - 20).toFixed(1)} y={yFadeStart.toFixed(1)} width={(half * 2 + 40).toFixed(1)} height={Math.max(1, yFadeEnd - yFadeStart).toFixed(1)} fill="url(#fustoFade)" />
                          </mask>
                          <radialGradient id="collare"><stop offset="0%" stopColor="#5a4634" /><stop offset="55%" stopColor="#4a3a2b" /><stop offset="100%" stopColor="#4a3a2b" stopOpacity="0" /></radialGradient>
                        </defs>
                        {/* Colonna tonda che recede, dissolta in basso dalla maschera: fondo, non muro. */}
                        <g mask="url(#fustoMask)">
                          <path d={path} fill="url(#fusto)" opacity="0.72" />
                          {bark.map((d, i) => <path key={i} d={d} stroke="#1c150e" strokeWidth={(0.9 + i * 0.2).toFixed(1)} fill="none" opacity="0.18" />)}
                        </g>
                        {/* IL COLLARE: copre l'intera giunzione ramo-fusto e sfuma in ogni direzione. */}
                        <ellipse cx={CX} cy={model.baseY.toFixed(1)} rx={collarR.toFixed(1)} ry={(collarR * 0.7).toFixed(1)} fill="url(#collare)" opacity="0.85" />
                        {/* Gli ALTRI INNESTI: 2 collari visibili attorno alla sommita', SENZA rami. Attacchi,
                            non utenti: nessun dato di nessuno, dicono solo "qui ne arrivano altri". */}
                        {[-1, 1].map((s, i) => { const y = model.baseY - 5 - i * 15, r = half * persp(y); return (
                          <ellipse key={'coll' + i} cx={(cxT(y) + s * r * 0.62).toFixed(1)} cy={y.toFixed(1)} rx={(collarR * 0.62).toFixed(1)} ry={(collarR * 0.44).toFixed(1)} fill="url(#collare)" opacity="0.5" />
                        ); })}
                      </g>
                    );
                  })()}
                  {/* Il ramo si STACCA dal tronco a 40 gradi e poi curva su - una Y, non una H. Un collare
                      all'innesto (piu' raggio agli ultimi punti) dice "e' cresciuto da li'", non "appoggiato".
                      Il tronco passa dietro, la base vi si fonde. Sotto il primo grappolo (nessuna foglia) c'e'
                      il connettore; l'asse serpeggiante - LARGHEZZA dalla legge - riprende dal primo grappolo. */}
                  {(() => {
                    const branchW = (s: number) => LAW_SCALE * raggioGenitore([R_TWIG, ...model.clusters.filter((c) => c.s >= s).map((c) => c.cRad)]);
                    const s0 = model.clusters.length ? model.clusters[0].s : 0;
                    const p0 = { x: CX, y: model.baseY }, p3 = axisPoint(s0, model.baseY, model.sTot);
                    const angLeave = axisTangent(0, model.sTot);          // il ramo lascia il tronco nella direzione dell'arco (~38 sopra l'orizzontale)
                    const angMeet = axisTangent(s0, model.sTot), len = Math.hypot(p3.x - p0.x, p3.y - p0.y) || 1;
                    const p1 = { x: p0.x + Math.cos(angLeave) * len * 0.5, y: p0.y + Math.sin(angLeave) * len * 0.5 };
                    const p2 = { x: p3.x - Math.cos(angMeet) * len * 0.4, y: p3.y - Math.sin(angMeet) * len * 0.4 };
                    const wTip = branchW(s0);
                    const conn = ribbon({ p0, p1, p2, p3, wBase: wTip * 1.5, wTip }, 0, 20); // collare (wBase piu' largo)
                    return (<>
                      <path d={conn} fill={STEM} />
                      <path d={axisRibbon(Math.max(s0, winLo), Math.min(model.sTot, winHi), model.baseY, model.sTot, branchW)} fill={STEM} />
                    </>);
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
                    model.clusters.forEach((c, ci) => {
                      if (c.s <= winLo || c.s >= winHi) return;
                      const P = axisPoint(c.s, model.baseY, model.sTot), T = axisTangent(c.s, model.sTot), m = c.leaves.length, side = ci % 2 ? 1 : -1;
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
                          const size = 7 + swell * 11;
                          fg.push({ plane: 3, el: (
                            <g key={key} onClick={onClick} className="cursor-pointer" style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay.toFixed(2) + 's forwards, sway ' + swayDur.toFixed(2) + 's ease-in-out ' + phase.toFixed(2) + 's infinite', transformOrigin: base.x.toFixed(1) + 'px ' + base.y.toFixed(1) + 'px' }}>
                              <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke="transparent" strokeWidth={(44 / zoom).toFixed(1)} strokeLinecap="round" fill="none" />
                              <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke={STEM} strokeWidth="1.6" fill="none" strokeLinecap="round" />
                              <BudShape x={ex} y={ey} ang={leafAng} size={size} gid={'bd' + ci + '-' + j} op={1} />
                            </g>
                          ) });
                          return;
                        }
                        const tilt = (jit(seed, 5) - 0.5) * 0.87;
                        let ang = leafAng + tilt;
                        if (Math.sin(ang) > 0.06) ang = leafAng;                  // se il tilt la butta giu', la lamina resta sulla tangente (su)
                        const sx = 0.55 + jit(seed, 6) * 0.45;
                        const curl = (jit(seed, 8) - 0.5) * 1.4;
                        const len = leafLen(lf.count) * pScale;                   // SEGNALE pulito (solo profondita' scala)
                        const hs = leafHSL(st === 'matura', lf.isOwner);
                        const lift = st === 'tenera' ? 12 : 0;                     // foglia tenera: verde piu' chiaro
                        const hue = hs.h + (jit(seed,11)-0.5)*18, sat = hs.s + (jit(seed,12)-0.5)*16, lum = hs.l + lift + (jit(seed,13)-0.5)*16;
                        const hi = 'hsl(' + hue.toFixed(0) + ' ' + Math.min(90, sat+8).toFixed(0) + '% ' + Math.min(90, lum+16).toFixed(0) + '%)';
                        const mid = 'hsl(' + hue.toFixed(0) + ' ' + sat.toFixed(0) + '% ' + lum.toFixed(0) + '%)';
                        const edge = 'hsl(' + hue.toFixed(0) + ' ' + sat.toFixed(0) + '% ' + Math.max(18, lum-16).toFixed(0) + '%)';
                        bg.push(<Stipole key={'st' + ci + '-' + j} x={base.x} y={base.y} ang={leafAng} len={leafLen(lf.count) * 0.2} color={edge} />);
                        const gA = 0.9 - ang, gx = Math.cos(gA)*0.5, gy = Math.sin(gA)*0.5;    // luce da alto-sinistra
                        const grad = { x1: 0.5-gx, y1: 0.5-gy, x2: 0.5+gx, y2: 0.5+gy };
                        fg.push({ plane, el: (
                          <g key={key} onClick={onClick} className="cursor-pointer" style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay.toFixed(2) + 's forwards, sway ' + swayDur.toFixed(2) + 's ease-in-out ' + phase.toFixed(2) + 's infinite', transformOrigin: base.x.toFixed(1) + 'px ' + base.y.toFixed(1) + 'px' }}>
                            {/* Capsula invisibile del tocco: 44px reali (36 sul piano posteriore), dall'innesto
                                alla punta della lamina. transparent (non none) riceve gli eventi; /zoom la tiene a 44px reali. */}
                            <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' L ' + (ex + Math.cos(ang) * len).toFixed(1) + ' ' + (ey + Math.sin(ang) * len).toFixed(1)} stroke="transparent" strokeWidth={(44 / zoom).toFixed(1)} strokeLinecap="round" fill="none" />
                            <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke={STEM} strokeWidth={(1.4 + pScale*1.2).toFixed(1)} fill="none" strokeLinecap="round" opacity={pOp} />
                            {/* Fiore all'attacco fra ramoscello e lamina. Diametro complessivo ~60% della
                                lunghezza foglia (l'inviluppo e' ~3.4x il raggio nominale): un accento, non un soggetto. */}
                            <FlowerShape x={ex} y={ey} color={FLOWER[lf.category] ?? FLOWER.travel} r={leafLen(lf.count) * 0.17} seed={seed} />
                            <LeafShape x={ex} y={ey} ang={ang} sx={sx} len={len} curl={curl} grad={grad} hi={hi} mid={mid} edge={edge} gid={'lg' + ci + '-' + j} op={pOp} />
                          </g>
                        ) });
                      });
                    });
                    fg.sort((a, b) => a.plane - b.plane);   // piani posteriori disegnati per primi
                    return <>{bg}{fg.map((f) => f.el)}</>;
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
