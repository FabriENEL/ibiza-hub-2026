'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type LeafData = { key: string; hubId: string | null; name: string; category: string; count: number; duration: number; isOwner: boolean; mature: boolean };

const FLOWER: Record<string, string> = {
  travel: '#f59e0b', party: '#a855f7', social: '#ec4899', corporate: '#3b82f6',
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
        const dur = h ? Math.max(1, Math.round((+new Date(h.end_date) - +new Date(h.start_date)) / 86400000) + 1) : 1;
        return { key: 'live-' + m.hub_id, hubId: m.hub_id, name: m.hub.name, category: m.hub.category, count: count ?? 1, duration: dur, isOwner: m.role === 'OWNER', mature: false };
      }));
      const { data: mat } = await supabase.from('garden_leaves').select('hub_id, hub_name, category, participant_count, duration_days').eq('owner_id', userId);
      const matured: LeafData[] = (mat ?? []).map((l: any, i: number) => ({ key: 'mat-' + i, hubId: l.hub_id, name: l.hub_name, category: l.category, count: l.participant_count, duration: l.duration_days ?? 1, isOwner: true, mature: true }));
      setLeaves([...live, ...matured]);
      setLoading(false);
    };
    build();
  }, [userId, memberships]);

  const A = { x: 60, y: 470 }, B = { x: 150, y: 240 }, C = { x: 300, y: 280 }, D = { x: 380, y: 90 };
  const bez = (t: number) => {
    const u = 1 - t;
    return {
      x: u*u*u*A.x + 3*u*u*t*B.x + 3*u*t*t*C.x + t*t*t*D.x,
      y: u*u*u*A.y + 3*u*u*t*B.y + 3*u*t*t*C.y + t*t*t*D.y,
    };
  };
  const tan = (t: number) => {
    const u = 1 - t;
    const dx = 3*u*u*(B.x-A.x) + 6*u*t*(C.x-B.x) + 3*t*t*(D.x-C.x);
    const dy = 3*u*u*(B.y-A.y) + 6*u*t*(C.y-B.y) + 3*t*t*(D.y-C.y);
    return Math.atan2(dy, dx);
  };
  const jit = (i: number, k: number) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };

  // Foglia sempre viva: owner verde brillante saturo, non-owner verde medio (NON scuro-secco). Luminosita distingue, saturazione resta alta.
  const leafColor = (isOwner: boolean) => isOwner
    ? { base: '#4ade80', edge: '#22c55e' }
    : { base: '#5b9d6b', edge: '#3f7a52' };
  const leafLen = (c: number) => 20 + Math.sqrt(c) * 6.5;
  const twigLen = (days: number, leaf: number) => Math.max(34, Math.min(80, 26 + days * 5)) + leaf * 0.35;

  const visible = leaves.filter((l) => !hidden.has(l.key));
  const clustered = visible.length > 14;
  const shown = clustered ? visible.slice(0, 14) : visible;
  const stemPath = 'M' + A.x + ' ' + A.y + ' C' + B.x + ' ' + B.y + ' ' + C.x + ' ' + C.y + ' ' + D.x + ' ' + D.y;

  // Foglia realistica: path con base stretta, pancia larga, punta affusolata + nervatura centrale curva. Gradiente base->edge per volume.
  const LeafShape = ({ x, y, ang, len, colors, op, gid }: any) => {
    const w = len * 0.42;
    return (
      <g transform={'translate(' + x + ' ' + y + ') rotate(' + (ang * 180 / Math.PI) + ')'} opacity={op}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.edge} />
            <stop offset="55%" stopColor={colors.base} />
            <stop offset="100%" stopColor={colors.edge} />
          </linearGradient>
        </defs>
        <path d={'M0 0 C' + (len*0.25) + ' ' + (-w) + ' ' + (len*0.7) + ' ' + (-w*0.7) + ' ' + len + ' 0 C' + (len*0.7) + ' ' + (w*0.7) + ' ' + (len*0.25) + ' ' + w + ' 0 0 Z'} fill={'url(#' + gid + ')'} />
        <path d={'M' + (len*0.08) + ' 0 Q' + (len*0.5) + ' ' + (w*0.15) + ' ' + (len*0.92) + ' 0'} stroke={colors.edge} strokeWidth="0.8" fill="none" opacity="0.6" />
      </g>
    );
  };
  // Fiore sul ramoscello (non sul ramo madre): posizione a meta twig, cluster di 5 petali ovali + centro.
  const FlowerShape = ({ x, y, color, r }: any) => (
    <g transform={'translate(' + x + ' ' + y + ')'}>
      {[0,72,144,216,288].map((a) => { const rad = a*Math.PI/180; return <ellipse key={a} cx={Math.cos(rad)*r} cy={Math.sin(rad)*r} rx={r*0.85} ry={r*0.55} transform={'rotate(' + a + ' ' + Math.cos(rad)*r + ' ' + Math.sin(rad)*r + ')'} fill={color} opacity="0.95" />; })}
      <circle r={r*0.5} fill="#fef3c7" />
    </g>
  );

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
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-200/60 font-black">Il mio giardino</p>
        </div>
        <h2 className="text-center text-2xl font-black text-white [font-family:var(--font-display)] mt-3">Il Suo ramo</h2>
        <p className="text-center text-emerald-200/50 text-xs mb-2">{leaves.length === 0 ? 'Ancora da coltivare' : leaves.length + (leaves.length === 1 ? ' momento fiorito' : ' momenti fioriti')}</p>

        {loading ? <div className="h-[480px] rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} /> :
          leaves.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">{String.fromCodePoint(0x1F331)}</p>
            <p className="text-emerald-100 text-base font-bold">Il Suo ramo attende.</p>
            <p className="text-emerald-200/50 text-xs mt-2 max-w-[220px] mx-auto">Ogni evento che vivrà farà sbocciare una foglia. Lo guardi crescere.</p>
          </div>
        ) : (
          <svg viewBox="0 0 440 500" className="w-full">
            {shown.map((lf, i) => {
              const t = 0.1 + (0.82 * i) / Math.max(1, shown.length - 1);
              const b = bez(t);
              const side = i % 2 === 0 ? -1 : 1;
              // Angolo con forte jitter -> asimmetria: rametti non a coppie regolari.
              const spread = (Math.PI / 3.2) + jit(i, 1) * 0.85;
              const perp = tan(t) + side * spread;
              const tw = twigLen(lf.duration, leafLen(lf.count)) * (0.8 + jit(i, 2) * 0.45);
              const tx = b.x + Math.cos(perp) * tw, ty = b.y + Math.sin(perp) * tw;
              const curl = jit(i, 3);
              const ctrlX = b.x + Math.cos(perp) * tw * 0.5 - side * (6 + jit(i, 4) * 10);
              const ctrlY = b.y + Math.sin(perp) * tw * 0.5;
              // Fiore a meta ramoscello (sullo stelo dell'hub, non sul ramo madre).
              const fx = b.x + Math.cos(perp) * tw * 0.55, fy = b.y + Math.sin(perp) * tw * 0.55;
              const colors = lf.mature ? { base: '#c9b458', edge: '#a8935a' } : leafColor(lf.isOwner);
              const delay = 1.3 + i * 0.13;
              return (
                <g key={lf.key} onClick={() => setSelected(lf)} className="cursor-pointer"
                   style={{ opacity: 0, animation: 'pop .55s ease-out ' + delay + 's forwards', transformOrigin: b.x + 'px ' + b.y + 'px' }}>
                  <path d={'M' + b.x + ' ' + b.y + ' Q' + ctrlX + ' ' + ctrlY + ' ' + tx + ' ' + ty} stroke={STEM} strokeWidth="2.6" fill="none" strokeLinecap="round" />
                  <FlowerShape x={fx} y={fy} color={FLOWER[lf.category] ?? '#f59e0b'} r={3 + Math.sqrt(lf.count) * 0.45} />
                  <LeafShape x={tx} y={ty} ang={perp} len={leafLen(lf.count)} colors={colors} op={lf.mature ? 0.82 : 1} gid={'lg' + i} />
                </g>
              );
            })}
            <path d={stemPath} fill="none" stroke={STEM_DK} strokeWidth="11" strokeLinecap="round" opacity="0.4" />
            <path d={stemPath} fill="none" stroke={STEM} strokeWidth="8" strokeLinecap="round"
              style={{ strokeDasharray: 780, strokeDashoffset: 780, animation: 'grow 1.6s ease-out forwards' }} />
            {[0.3, 0.52, 0.72, 0.88].map((t, i) => { const b = bez(t); return <circle key={'bud'+i} cx={b.x} cy={b.y} r="3.5" fill="#6b8f5a" opacity="0.6" style={{ animation: 'pop .4s ease-out ' + (0.7 + i*0.14) + 's forwards' }} />; })}
          </svg>
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
        const CAT: Record<string, string> = { travel: 'Viaggio', party: 'Festa', social: 'Sociale', corporate: 'Corporate' };
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
      <style>{'@keyframes grow { to { stroke-dashoffset: 0 } } @keyframes pop { from { opacity:0; transform: scale(0) } to { opacity:1; transform: scale(1) } } @keyframes float { 0%,100% { transform: translateY(0); opacity: 0.3 } 50% { transform: translateY(-12px); opacity: 0.7 } }'}</style>
    </div>
  );
}
