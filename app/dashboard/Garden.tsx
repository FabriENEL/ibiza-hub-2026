'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type LeafData = { key: string; hubId: string | null; name: string; category: string; count: number; duration: number; isOwner: boolean; mature: boolean };

// Palette dentro il marchio (antracite, salvia, oro): quattro tinte terrose ben
// distinguibili, senza il neon di prima. L'oro e' la firma: 14 Hub su 17 sono travel.
const FLOWER: Record<string, string> = {
  travel: '#e6b34e', party: '#d98a5c', social: '#c98aa0', corporate: '#8aa6b4',
};
const STEM = '#5a4a3a', STEM_DK = '#3a3028';

export default function Garden({ onClose, onOpenHub }: { onClose: () => void; onOpenHub: (id: string) => void }) {
  const { userId, memberships } = useHub();
  const [leaves, setLeaves] = useState<LeafData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeafData | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

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
        // Difesa NaN: HubContext tipizza le date nullable. Se una manca o e' invalida,
        // la durata sarebbe NaN, si propagherebbe a twigLen e alle coordinate, e la
        // foglia sparirebbe dal path SVG. In quel caso, un giorno.
        const ini = h?.start_date ? +new Date(h.start_date) : NaN;
        const fin = h?.end_date ? +new Date(h.end_date) : NaN;
        const dur = Number.isFinite(ini) && Number.isFinite(fin) ? Math.max(1, Math.round((fin - ini) / 86400000) + 1) : 1;
        return { key: 'live-' + m.hub_id, hubId: m.hub_id, name: m.hub.name, category: m.hub.category, count: count ?? 1, duration: dur, isOwner: m.role === 'OWNER', mature: false };
      }));
      const { data: mat } = await supabase.from('garden_leaves').select('hub_id, hub_name, category, participant_count, duration_days').eq('owner_id', userId);
      const matured: LeafData[] = (mat ?? []).map((l: any, i: number) => ({ key: 'mat-' + i, hubId: l.hub_id, name: l.hub_name, category: l.category, count: l.participant_count, duration: l.duration_days ?? 1, isOwner: true, mature: true }));
      setLeaves([...live, ...matured]);
      setLoading(false);
    };
    build();
  }, [userId, memberships]);

  // Rumore deterministico [0,1). jit resta per le particelle-atmosfera; per le
  // foglie si semina dalla chiave (seedOf), cosi' il caso di una foglia e' stabile
  // e non si rimescola quando se ne nasconde un'altra e gli indici scorrono.
  const jit = (i: number, k: number) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const seedOf = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 100000); };

  // === I TRE SEGNALI: deterministici, puliti, nessun caso, nessuna contaminazione ===
  // Foglia grande secondo i partecipanti; escursione 1->3p del 33% (la radice comprimeva).
  const leafLen = (persone: number) => 16 + 22 * (1 - Math.exp(-persone / 3.5));
  // Ramoscello lungo secondo la durata; UN solo argomento (via il + leaf che incrociava
  // gli assi), monotona e mai satura: 16 giorni piu' lungo di 11, non appiattito.
  const twigLen = (giorni: number) => 30 + 46 * (1 - Math.exp(-giorni / 7));

  // === LA STRUTTURA: ramo che si biforca, con nastri di spessore che degrada ===
  type Pt = { x: number; y: number };
  type Br = { p0: Pt; p1: Pt; p2: Pt; p3: Pt; wBase: number; wTip: number };
  const UP = -Math.PI / 2;
  const cubic = (b: Br, t: number): Pt => { const u = 1 - t; return {
    x: u*u*u*b.p0.x + 3*u*u*t*b.p1.x + 3*u*t*t*b.p2.x + t*t*t*b.p3.x,
    y: u*u*u*b.p0.y + 3*u*u*t*b.p1.y + 3*u*t*t*b.p2.y + t*t*t*b.p3.y }; };
  const cubicTan = (b: Br, t: number): number => { const u = 1 - t;
    const dx = 3*u*u*(b.p1.x-b.p0.x) + 6*u*t*(b.p2.x-b.p1.x) + 3*t*t*(b.p3.x-b.p2.x);
    const dy = 3*u*u*(b.p1.y-b.p0.y) + 6*u*t*(b.p2.y-b.p1.y) + 3*t*t*(b.p3.y-b.p2.y);
    return Math.atan2(dy, dx); };
  // Ramo da (sx,sy): parte all'angolo ang0, arriva a ang1, lungo len, spessore wBase->wTip.
  const branchFrom = (sx: number, sy: number, ang0: number, len: number, ang1: number, wBase: number, wTip: number): Br => {
    const mid = (ang0 + ang1) / 2;
    const p3 = { x: sx + Math.cos(mid) * len, y: sy + Math.sin(mid) * len };
    return { p0: { x: sx, y: sy },
      p1: { x: sx + Math.cos(ang0) * len / 3, y: sy + Math.sin(ang0) * len / 3 },
      p2: { x: p3.x - Math.cos(ang1) * len / 3, y: p3.y - Math.sin(ang1) * len / 3 }, p3, wBase, wTip }; };
  // Nastro rastremato: la linea media offset di meta-spessore, che degrada base->punta.
  const ribbon = (b: Br, grow = 0, steps = 18): string => {
    const lft: Pt[] = [], rgt: Pt[] = [];
    for (let i = 0; i <= steps; i++) { const t = i / steps, p = cubic(b, t), a = cubicTan(b, t);
      const w = (b.wBase + (b.wTip - b.wBase) * t) / 2 + grow;
      const nx = Math.cos(a + Math.PI/2), ny = Math.sin(a + Math.PI/2);
      lft.push({ x: p.x + nx*w, y: p.y + ny*w }); rgt.push({ x: p.x - nx*w, y: p.y - ny*w }); }
    return 'M' + [...lft, ...rgt.reverse()].map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L') + ' Z'; };

  // Biforcazione deterministica sul numero di foglie: germoglio semplice se poche,
  // due o tre rami primari se molte. Un giardino giovane non deve sembrare un albero mancato.
  const buildTree = (n: number) => {
    const base = { x: 205, y: 740 };
    const jr = (k: number, a: number, c: number) => a + (c - a) * jit(n + 7, k); // variazione stabile per taglia
    const nB = n <= 3 ? 1 : n <= 7 ? 2 : 3;
    if (nB === 1) {
      const stalk = branchFrom(base.x, base.y, UP + jr(1,-0.06,0.06), 300, UP + jr(2,-0.18,0.06), 10, 3);
      return { branches: [stalk], leaf: [stalk], range: [[0.32, 0.97]] as [number,number][] };
    }
    const trunk = branchFrom(base.x, base.y, UP + jr(1,-0.05,0.05), nB === 2 ? 175 : 155, UP + jr(2,-0.1,0.06), 11, 6);
    const F = cubic(trunk, 1), fa = cubicTan(trunk, 1), sp = 0.5;
    const left = branchFrom(F.x, F.y, fa + sp, 175, fa + sp*1.5, 6, 2.6);
    const right = branchFrom(F.x, F.y, fa - sp*0.9, 190, fa - sp*1.3, 6, 2.6);
    if (nB === 2) return { branches: [trunk, left, right], leaf: [left, right], range: [[0.28,0.98],[0.28,0.98]] as [number,number][] };
    const G = cubic(right, 0.4), ga = cubicTan(right, 0.4);
    const third = branchFrom(G.x, G.y, ga - sp*1.2, 140, ga - sp*1.6, 3.2, 2);
    return { branches: [trunk, left, right, third], leaf: [left, right, third], range: [[0.3,0.98],[0.45,0.98],[0.3,0.97]] as [number,number][] };
  };
  // Foglie a grappoli, non a passo costante: gaps al quadrato -> tratti fitti e tratti spogli.
  const clusterPos = (m: number, seed: number, lo: number, hi: number): number[] => {
    if (m <= 0) return [];
    if (m === 1) return [lo + (hi - lo) * 0.62];
    const gaps: number[] = []; for (let j = 0; j < m; j++) gaps.push(0.12 + Math.pow(jit(seed, j + 3), 2) * 1.7);
    let s = 0; const cum: number[] = []; for (const g of gaps) { s += g; cum.push(s - g/2); }
    return cum.map((c) => lo + (hi - lo) * (c / s));
  };
  // Verde di famiglia, ma mai due foglie identiche: tono e luminosita' variano per seme.
  const leafHSL = (mature: boolean, isOwner: boolean) =>
    mature ? { h: 44, s: 42, l: 56 } : isOwner ? { h: 138, s: 58, l: 54 } : { h: 134, s: 34, l: 46 };

  // Foglia: base stretta, pancia, punta (arricciata da curl); scorcio via scale(sx) sull'asse
  // lungo; nervatura curva. Gradiente orientato dalla luce (coordinate passate da fuori).
  const LeafShape = ({ x, y, ang, sx, len, curl, grad, hi, mid, edge, gid, op }: any) => {
    const w = len * 0.44, tip = curl * w * 0.5;
    return (
      <g transform={'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (ang * 180 / Math.PI).toFixed(1) + ') scale(' + sx.toFixed(2) + ' 1)'} opacity={op}>
        <defs>
          <linearGradient id={gid} x1={grad.x1.toFixed(3)} y1={grad.y1.toFixed(3)} x2={grad.x2.toFixed(3)} y2={grad.y2.toFixed(3)}>
            <stop offset="0%" stopColor={hi} />
            <stop offset="52%" stopColor={mid} />
            <stop offset="100%" stopColor={edge} />
          </linearGradient>
        </defs>
        <path d={'M0 0 C ' + (len*0.22).toFixed(1) + ' ' + (-w).toFixed(1) + ' ' + (len*0.72).toFixed(1) + ' ' + (-w*0.65).toFixed(1) + ' ' + len.toFixed(1) + ' ' + tip.toFixed(1) + ' C ' + (len*0.72).toFixed(1) + ' ' + (w*0.65).toFixed(1) + ' ' + (len*0.22).toFixed(1) + ' ' + w.toFixed(1) + ' 0 0 Z'} fill={'url(#' + gid + ')'} />
        <path d={'M ' + (len*0.08).toFixed(1) + ' 0 Q ' + (len*0.5).toFixed(1) + ' ' + (w*0.12).toFixed(1) + ' ' + (len*0.9).toFixed(1) + ' ' + (tip*0.8).toFixed(1)} stroke={edge} strokeWidth="0.7" fill="none" opacity="0.5" />
      </g>
    );
  };
  // Fiore: cinque petali di dimensione e angolo leggermente diversi, bordi curvi, centro morbido.
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

  const visible = leaves.filter((l) => !hidden.has(l.key)); // niente cap: si mostra tutto

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center p-6 pt-10"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 30%, #1a2e1f 0%, #0f1a14 40%, #0a0f0c 100%)' }}>
      {/* Atmosfera: particelle-luce sospese, danno profondita allo sfondo del ramo. */}
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
        <p className="text-center text-emerald-200/50 text-xs mb-2">{leaves.length === 0 ? 'Ancora da coltivare' : leaves.length + (leaves.length === 1 ? ' momento fiorito' : ' momenti fioriti')}</p>

        {loading ? <div className="flex-1 min-h-[70vh] rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} /> :
          leaves.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">{String.fromCodePoint(0x1F331)}</p>
            <p className="text-emerald-100 text-base font-bold">Il tuo ramo attende.</p>
            <p className="text-emerald-200/50 text-xs mt-2 max-w-[220px] mx-auto">Ogni evento che vivrà farà sbocciare una foglia. Lo guardi crescere.</p>
          </div>
        ) : (
          (() => {
            const tree = buildTree(visible.length);
            const nLB = tree.leaf.length;
            // Foglie ai rami a rotazione, per tenerli bilanciati.
            const perBranch: number[][] = Array.from({ length: nLB }, () => []);
            visible.forEach((_, idx) => perBranch[idx % nLB].push(idx));
            type Placed = { lf: LeafData; bi: number; t: number; plane: number; seed: number; order: number };
            const placed: Placed[] = [];
            perBranch.forEach((idxs, bi) => {
              const ts = clusterPos(idxs.length, 100 + bi * 17, tree.range[bi][0], tree.range[bi][1]);
              idxs.forEach((leafIdx, j) => {
                const lf = visible[leafIdx], seed = seedOf(lf.key);
                const r = jit(seed, 50), plane = r < 0.28 ? 0 : r < 0.72 ? 1 : 2;
                placed.push({ lf, bi, t: ts[j], plane, seed, order: leafIdx });
              });
            });
            // Profondita': i piani posteriori disegnati per primi.
            placed.sort((a, b) => a.plane - b.plane || a.order - b.order);
            return (
              <svg viewBox="-60 -20 540 810" className="w-full flex-1" preserveAspectRatio="xMidYMid meet">
                {/* Il ramo: nastri rastremati, cresce dalla base */}
                <g style={{ transformOrigin: '205px 740px', animation: 'grow2 1.2s cubic-bezier(.2,.8,.2,1) forwards' }}>
                  {tree.branches.map((b, i) => (
                    <g key={'br' + i}>
                      <path d={ribbon(b, 2)} fill={STEM_DK} opacity="0.45" />
                      <path d={ribbon(b)} fill={STEM} />
                    </g>
                  ))}
                  {tree.leaf.map((b, i) => { const p = cubic(b, 1); return <circle key={'tip' + i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2.6" fill="#6b8f5a" opacity="0.5" />; })}
                </g>
                {placed.map(({ lf, bi, t, plane, seed, order }) => {
                  const br = tree.leaf[bi], at = cubic(br, t), bAng = cubicTan(br, t);
                  const side = jit(seed, 10) < 0.5 ? -1 : 1;
                  const spread = 0.5 + jit(seed, 1) * 0.95;          // angolo d'attacco allargato + caso
                  const twAng = bAng + side * spread;
                  const twl = twigLen(lf.duration);                  // SEGNALE pulito
                  const ex = at.x + Math.cos(twAng) * twl, ey = at.y + Math.sin(twAng) * twl;
                  const bend = (jit(seed, 4) - 0.5) * twl * 0.7;     // curvatura: alcuni dritti, altri arcuati
                  const mx = (at.x + ex) / 2 + Math.cos(twAng + Math.PI/2) * bend;
                  const my = (at.y + ey) / 2 + Math.sin(twAng + Math.PI/2) * bend;
                  const fx = 0.25*at.x + 0.5*mx + 0.25*ex, fy = 0.25*at.y + 0.5*my + 0.25*ey; // fiore a meta' (punto quadratica)
                  const tilt = (jit(seed, 5) - 0.5) * 0.87;          // inclinazione lamina +-25 gradi
                  const ang = twAng + tilt;
                  const sx = 0.55 + jit(seed, 6) * 0.45;             // scorcio fuori piano 0.55..1.0
                  const curl = (jit(seed, 8) - 0.5) * 1.4;           // arricciatura della punta
                  const pScale = plane === 0 ? 0.8 : plane === 1 ? 0.92 : 1;
                  const pOp = plane === 0 ? 0.62 : plane === 1 ? 0.85 : 1;
                  const len = leafLen(lf.count) * pScale;            // SEGNALE pulito (solo la profondita' scala)
                  const hs = leafHSL(lf.mature, lf.isOwner);
                  const hue = hs.h + (jit(seed,11)-0.5)*18, sat = hs.s + (jit(seed,12)-0.5)*16, lum = hs.l + (jit(seed,13)-0.5)*16;
                  const hi = 'hsl(' + hue.toFixed(0) + ' ' + Math.min(90, sat+8).toFixed(0) + '% ' + Math.min(88, lum+16).toFixed(0) + '%)';
                  const mid = 'hsl(' + hue.toFixed(0) + ' ' + sat.toFixed(0) + '% ' + lum.toFixed(0) + '%)';
                  const edge = 'hsl(' + hue.toFixed(0) + ' ' + sat.toFixed(0) + '% ' + Math.max(18, lum-16).toFixed(0) + '%)';
                  // Luce da alto-sinistra: direzione del gradiente in locale = luceWorld - ang
                  const gA = 0.9 - ang, gx = Math.cos(gA)*0.5, gy = Math.sin(gA)*0.5;
                  const grad = { x1: 0.5-gx, y1: 0.5-gy, x2: 0.5+gx, y2: 0.5+gy };
                  const swayDur = 3 + jit(seed, 20) * 3.2, phase = jit(seed, 21) * 4; // periodo e fase distinti
                  const delay = 1.1 + order * 0.07;
                  return (
                    <g key={lf.key} onClick={() => setSelected(lf)} className="cursor-pointer"
                       style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay.toFixed(2) + 's forwards, sway ' + swayDur.toFixed(2) + 's ease-in-out ' + phase.toFixed(2) + 's infinite', transformOrigin: at.x.toFixed(1) + 'px ' + at.y.toFixed(1) + 'px' }}>
                      <path d={'M' + at.x.toFixed(1) + ' ' + at.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)} stroke={STEM} strokeWidth={(1.4 + pScale*1.2).toFixed(1)} fill="none" strokeLinecap="round" opacity={pOp} />
                      <FlowerShape x={fx} y={fy} color={FLOWER[lf.category] ?? FLOWER.travel} r={2.6 + Math.sqrt(lf.count) * 0.5} seed={seed} />
                      <LeafShape x={ex} y={ey} ang={ang} sx={sx} len={len} curl={curl} grad={grad} hi={hi} mid={mid} edge={edge} gid={'lg' + order} op={pOp} />
                    </g>
                  );
                })}
              </svg>
            );
          })()
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
                <p className="text-[10px] uppercase tracking-widest font-black mb-1" style={{ color: col }}>{CAT[selected.category] ?? selected.category}{selected.mature ? ' \u00B7 Ricordo' : selected.isOwner ? ' \u00B7 Il tuo evento' : ' \u00B7 Sei ospite'}</p>
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
      <style>{'@keyframes grow2 { from { opacity:0; transform: scale(0.6) } to { opacity:1; transform: scale(1) } } @keyframes pop { from { opacity:0; transform: scale(0) } to { opacity:1; transform: scale(1) } } @keyframes float { 0%,100% { transform: translateY(0); opacity: 0.3 } 50% { transform: translateY(-12px); opacity: 0.7 } } @keyframes sway { 0%,100% { transform: rotate(-1.8deg) } 50% { transform: rotate(1.8deg) } } @media (prefers-reduced-motion: reduce) { g, circle, path { animation-iteration-count: 1 !important } }'}</style>
    </div>
  );
}




