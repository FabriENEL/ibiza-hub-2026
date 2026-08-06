'use client'
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

// date: chiave temporale (started_on per le mature, start_date per le vive).
// start/end: date dell'Hub vivo, per lo stato della gemma; null per le mature.
type LeafData = { key: string; hubId: string | null; name: string; category: string; count: number; duration: number; isOwner: boolean; mature: boolean; date: string; start: string | null; end: string | null };

// Palette dentro il marchio (antracite, salvia, oro): quattro tinte terrose ben
// distinguibili, senza il neon di prima. L'oro e' la firma: 14 Hub su 17 sono travel.
const FLOWER: Record<string, string> = {
  travel: '#e6b34e', party: '#d98a5c', social: '#c98aa0', corporate: '#8aa6b4',
};
const STEM = '#5a4a3a', STEM_DK = '#3a3028';
const DAY = 86400000;
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

// L'asse del ramo serpeggia mentre sale. La posizione lungo il tempo e' l'ascissa
// curvilinea s: la vista si centra su axisPoint(s). Base = passato (s piccolo, in basso),
// punta = presente (s grande, in alto).
const CX = 180, AMP = 70, WL = 200, VW = 360, VH = 500;
const axisPoint = (s: number, baseY: number) => ({ x: CX + AMP * Math.sin(s / WL), y: baseY - s });
const axisTangent = (s: number) => Math.atan2(-1, (AMP / WL) * Math.cos(s / WL));

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
const leafHSL = (mature: boolean, isOwner: boolean) =>
  mature ? { h: 44, s: 42, l: 56 } : isOwner ? { h: 138, s: 58, l: 54 } : { h: 134, s: 34, l: 46 };

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

// L'asse principale: nastro rastremato lungo la serpentina, spesso alla base, sottile in punta.
const axisRibbon = (sLo: number, sHi: number, baseY: number, sTot: number, steps = 44): string => {
  const lft: Pt[] = [], rgt: Pt[] = [];
  for (let i = 0; i <= steps; i++) { const s = lerp(sLo, sHi, i / steps), p = axisPoint(s, baseY), a = axisTangent(s);
    const w = lerp(11, 3.5, sTot ? s / sTot : 0) / 2;
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
const BudShape = ({ x, y, ang, size, gid, op }: any) => {
  const w = size * 0.58;
  return (
    <g transform={'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (ang * 180 / Math.PI).toFixed(1) + ')'} opacity={op}>
      <defs><linearGradient id={gid} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0%" stopColor="#a7c4a0" /><stop offset="60%" stopColor="#7ba374" /><stop offset="100%" stopColor="#4f7a4c" />
      </linearGradient></defs>
      <path d={'M0 0 Q ' + (size*0.55).toFixed(1) + ' ' + (-w).toFixed(1) + ' ' + size.toFixed(1) + ' 0 Q ' + (size*0.55).toFixed(1) + ' ' + w.toFixed(1) + ' 0 0 Z'} fill={'url(#' + gid + ')'} />
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
  const [sView, setSView] = useState(-1);          // -1 = ancora alla punta (presente)
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
    type Cl = { date: string; year: string; leaves: LeafData[]; s: number };
    const clusters: Cl[] = [];
    let prev = '';
    for (const lf of ordered) {
      const last = clusters[clusters.length - 1];
      if (last && daysBetween(prev, lf.date) <= 4 && last.leaves.length < 4) last.leaves.push(lf);
      else clusters.push({ date: lf.date, year: (lf.date || '').slice(0, 4), leaves: [lf], s: 0 });
      prev = lf.date;
    }
    let acc = 70;
    clusters.forEach((c, i) => { if (i > 0) acc += distanza(daysBetween(clusters[i - 1].date, c.date)); c.s = acc; });
    const sTot = (clusters.length ? clusters[clusters.length - 1].s : 0) + 90;
    const baseY = sTot + 90;
    const forks: number[] = [];
    for (let i = 1; i < clusters.length; i++) if (clusters[i].year !== clusters[i - 1].year) forks.push((clusters[i - 1].s + clusters[i].s) / 2);
    return { clusters, sTot, baseY, forks };
  }, [leaves, hidden]);

  // Apertura sulla punta a ogni cambio di modello.
  useEffect(() => { setSView(-1); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [model.sTot]);

  const onScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current; if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      const frac = max > 0 ? el.scrollTop / max : 0;
      setSView(model.sTot * (1 - frac)); // punta in cima, passato scorrendo giu'
    });
    setActive(true);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => setActive(false), 900);
  };

  const sv = sView < 0 ? model.sTot : sView;
  // La cornice si adatta al ramo: se il tracciato e' piu' corto della vista, si stringe
  // l'inquadratura (tetto 2.8) finche' lo riempie. Nessuna formula cambia: cambia solo
  // quanto vicino si guarda. Oltre la soglia lo zoom torna a 1 e lo scorrimento entra.
  const zoom = Math.min(2.8, Math.max(1, (VH * 0.92) / Math.max(model.sTot, 1)));
  // Margine di sicurezza solo a inquadratura stretta: il fogliame non tocca mai il bordo.
  // A giardino cresciuto (zoom 1) la vista resta quella di prima.
  const fit = zoom > 1 ? 1.06 : 1;
  const eVW = (VW / zoom) * fit, eVH = (VH / zoom) * fit;
  // Se ci sta tutto, la camera inquadra il mezzo del ramo (base e punta insieme);
  // altrimenti segue lo scorrimento, aperta sulla punta.
  const camS = zoom > 1 ? model.sTot / 2 : sv;
  const cam = axisPoint(camS, model.baseY);
  const vb = (cam.x - eVW / 2).toFixed(1) + ' ' + (cam.y - eVH / 2).toFixed(1) + ' ' + eVW.toFixed(1) + ' ' + eVH.toFixed(1);
  const winLo = camS - eVH * 1.6, winHi = camS + eVH * 1.6;
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
              <div style={{ height: Math.max(model.sTot, 340) + 160 + 'px', position: 'relative' }}>
                <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" style={{ position: 'sticky', top: 0, width: '100%', height: '62vh', display: 'block' }}>
                  {/* Asse: solo il tratto entro la finestra della vista. */}
                  <path d={axisRibbon(Math.max(0, winLo), Math.min(model.sTot, winHi), model.baseY, model.sTot)} fill={STEM} />
                  {/* Forcelle d'anno: stub laterale che si assottiglia (non scatta finche' e' tutto un anno). */}
                  {model.forks.filter((s) => s > winLo && s < winHi).map((s, i) => {
                    const P = axisPoint(s, model.baseY), a = axisTangent(s), side = i % 2 ? 1 : -1;
                    const br = branchFrom(P.x, P.y, a + side * 1.5, 120, a + side * 1.9, 6, 1);
                    return <g key={'fork' + i}><path d={ribbon(br, 1.5)} fill={STEM_DK} opacity="0.5" /><path d={ribbon(br)} fill={STEM} /></g>;
                  })}
                  {/* Grappoli nella finestra: brachiblasto + foglie. */}
                  {(() => {
                    const bg: any[] = [], fg: any[] = [];
                    model.clusters.forEach((c, ci) => {
                      if (c.s <= winLo || c.s >= winHi) return;
                      const P = axisPoint(c.s, model.baseY), T = axisTangent(c.s), m = c.leaves.length, side = ci % 2 ? 1 : -1;
                      const bAng = T + side * 1.05;                       // il brachiblasto si stacca dall'asse
                      const Lb = m > 1 ? 10 + m * 4 : 0;
                      const Q = { x: P.x + Math.cos(bAng) * Lb, y: P.y + Math.sin(bAng) * Lb };
                      if (Lb > 0) bg.push(<path key={'bb' + ci} d={ribbon(branchFrom(P.x, P.y, bAng, Lb, bAng, 3, 1.4))} fill={STEM} />);
                      c.leaves.forEach((lf, j) => {
                        const seed = seedOf(lf.key);
                        const base = m > 1 ? { x: lerp(P.x, Q.x, (j + 0.7) / m), y: lerp(P.y, Q.y, (j + 0.7) / m) } : P;
                        const fan = m > 1 ? (j - (m - 1) / 2) * (1.3 / m) : 0;
                        const leafAng = bAng + fan + (jit(seed, 1) - 0.5) * 0.5;   // fan attorno al rametto + caso
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
                              <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke={STEM} strokeWidth="1.6" fill="none" strokeLinecap="round" />
                              <BudShape x={ex} y={ey} ang={leafAng} size={size} gid={'bd' + ci + '-' + j} op={1} />
                            </g>
                          ) });
                          return;
                        }
                        const tilt = (jit(seed, 5) - 0.5) * 0.87;
                        const ang = leafAng + tilt;
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
                        const fx = 0.25*base.x + 0.5*mx + 0.25*ex, fy = 0.25*base.y + 0.5*my + 0.25*ey;
                        fg.push({ plane, el: (
                          <g key={key} onClick={onClick} className="cursor-pointer" style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay.toFixed(2) + 's forwards, sway ' + swayDur.toFixed(2) + 's ease-in-out ' + phase.toFixed(2) + 's infinite', transformOrigin: base.x.toFixed(1) + 'px ' + base.y.toFixed(1) + 'px' }}>
                            <path d={'M' + base.x.toFixed(1) + ' ' + base.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke={STEM} strokeWidth={(1.4 + pScale*1.2).toFixed(1)} fill="none" strokeLinecap="round" opacity={pOp} />
                            <FlowerShape x={fx} y={fy} color={FLOWER[lf.category] ?? FLOWER.travel} r={2.6 + Math.sqrt(lf.count) * 0.5} seed={seed} />
                            <LeafShape x={ex} y={ey} ang={ang} sx={sx} len={len} curl={curl} grad={grad} hi={hi} mid={mid} edge={edge} gid={'lg' + ci + '-' + j} op={pOp} />
                          </g>
                        ) });
                      });
                    });
                    fg.sort((a, b) => a.plane - b.plane);   // piani posteriori disegnati per primi
                    return <>{bg}{fg.map((f) => f.el)}</>;
                  })()}
                </svg>
              </div>
            </div>
            {/* Indicazione discreta del tempo, in dissolvenza. */}
            {periodo && <div className="absolute top-3 right-4 pointer-events-none text-[10px] uppercase tracking-[0.25em] font-black text-emerald-200 transition-opacity duration-700" style={{ opacity: active ? 0.8 : 0.28 }}>{periodo}</div>}
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
                <button onClick={() => { if (selected.hubId) onOpenHub(selected.hubId); setSelected(null); }}
                  className="w-full mt-5 bg-emerald-400 text-slate-950 py-3 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-transform">Vai all'Hub</button>
                <button onClick={() => setSelected(null)} className="w-full mt-2 text-emerald-200/40 text-xs py-2">Chiudi</button>
              </div>
            </div>
          </div>
        );
      })()}
      <style>{'@keyframes pop { from { opacity:0; transform: scale(0) } to { opacity:1; transform: scale(1) } } @keyframes float { 0%,100% { transform: translateY(0); opacity: 0.3 } 50% { transform: translateY(-12px); opacity: 0.7 } } @keyframes sway { 0%,100% { transform: rotate(-1.8deg) } 50% { transform: rotate(1.8deg) } } @media (prefers-reduced-motion: reduce) { g, circle, path { animation-iteration-count: 1 !important } }'}</style>
    </div>
  );
}
