'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type LeafData = { key: string; hubId: string | null; name: string; category: string; count: number; duration: number; isOwner: boolean; mature: boolean };

const FLOWER: Record<string, string> = {
  travel: '#f59e0b', party: '#a855f7', social: '#ec4899', corporate: '#3b82f6',
};
const STEM = '#4a3f35', STEM_DK = '#3a3028';

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
      // Zero-state: TUTTE le membership attive diventano ramoscelli, non solo OWNER. Il ruolo determina la tinta.
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

  const A = { x: 55, y: 445 }, B = { x: 130, y: 250 }, C = { x: 300, y: 260 }, D = { x: 375, y: 95 };
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

  // Luminosita foglia = ruolo. Owner: verde brillante. Guest/Coowner: verde scuro.
  const leafColor = (isOwner: boolean) => isOwner ? 'hsl(130 45% 55%)' : 'hsl(140 30% 30%)';
  const leafLen = (c: number) => 16 + Math.sqrt(c) * 6;
  // Lunghezza ramoscello proporzionale ai giorni, con clamp: evita ramoscelli impercettibili o fuori-margine.
  const twigLen = (days: number, leaf: number) => Math.max(28, Math.min(72, 22 + days * 5)) + leaf * 0.4;

  const visible = leaves.filter((l) => !hidden.has(l.key));
  const clustered = visible.length > 14;
  const shown = clustered ? visible.slice(0, 14) : visible;
  const stemPath = 'M' + A.x + ' ' + A.y + ' C' + B.x + ' ' + B.y + ' ' + C.x + ' ' + C.y + ' ' + D.x + ' ' + D.y;

  const LeafShape = ({ x, y, ang, len, fill, op, curl }: any) => {
    const w = len * 0.5, w2 = len * 0.62, cx = len * 0.55, tip = len, dip = curl * len * 0.14;
    return (
      <g transform={'translate(' + x + ' ' + y + ') rotate(' + (ang * 180 / Math.PI) + ')'} opacity={op}>
        <path d={'M0 0 Q' + cx + ' ' + (-w) + ' ' + tip + ' ' + dip + ' Q' + cx + ' ' + w2 + ' 0 0 Z'} fill={fill} />
        <path d={'M' + (len*0.1) + ' ' + (dip*0.3) + ' Q' + cx + ' ' + (dip*0.5) + ' ' + (len*0.88) + ' ' + dip} stroke={STEM_DK} strokeWidth="0.7" fill="none" opacity="0.5" />
      </g>
    );
  };
  const FlowerShape = ({ x, y, color, r }: any) => (
    <g transform={'translate(' + x + ' ' + y + ')'}>
      {[0,72,144,216,288].map((a) => { const rad = a*Math.PI/180; return <circle key={a} cx={Math.cos(rad)*r} cy={Math.sin(rad)*r} r={r*0.75} fill={color} opacity="0.92" />; })}
      <circle r={r*0.6} fill="#fde68a" />
    </g>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Il mio ramo</p>
        </div>
        <p className="text-center text-slate-400 text-xs mb-4">{leaves.length} {leaves.length === 1 ? 'evento' : 'eventi'} {'\u00B7'} il Suo ramo in EventGarden</p>

        {loading ? <div className="h-[460px] bg-slate-900/40 rounded-3xl animate-pulse" /> :
          leaves.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{String.fromCodePoint(0x1F33F)}</p>
            <p className="text-slate-300 text-sm font-bold">Il Suo ramo e ancora spoglio.</p>
            <p className="text-slate-500 text-xs mt-1">Ogni evento fa nascere una foglia e un fiore.</p>
          </div>
        ) : (
          <svg viewBox="0 0 420 480" className="w-full">
            {shown.map((lf, i) => {
              const t = 0.12 + (0.8 * i) / Math.max(1, shown.length - 1);
              const b = bez(t);
              const side = i % 2 === 0 ? -1 : 1;
              const spread = (Math.PI / 2.6) + jit(i, 1) * 0.5;
              const perp = tan(t) + side * spread;
              const tw = twigLen(lf.duration, leafLen(lf.count)) * (0.85 + jit(i, 2) * 0.3);
              const tx = b.x + Math.cos(perp) * tw, ty = b.y + Math.sin(perp) * tw;
              const curl = jit(i, 3) * 2 - 1;
              const ctrlX = b.x + Math.cos(perp) * tw * 0.5 - side * 8;
              const ctrlY = b.y + Math.sin(perp) * tw * 0.5;
              const delay = 1.3 + i * 0.14;
              return (
                <g key={lf.key} onClick={() => setSelected(lf)} className="cursor-pointer"
                   style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay + 's forwards', transformOrigin: b.x + 'px ' + b.y + 'px' }}>
                  <path d={'M' + b.x + ' ' + b.y + ' Q' + ctrlX + ' ' + ctrlY + ' ' + tx + ' ' + ty} stroke={STEM} strokeWidth="2.4" fill="none" strokeLinecap="round" />
                  <LeafShape x={tx} y={ty} ang={perp} len={leafLen(lf.count)} fill={lf.mature ? '#a8935a' : leafColor(lf.isOwner)} op={lf.mature ? 0.8 : 1} curl={curl} />
                  <FlowerShape x={b.x} y={b.y} color={FLOWER[lf.category] ?? '#f59e0b'} r={3.5 + Math.sqrt(lf.count) * 0.5} />
                </g>
              );
            })}
            <path d={stemPath} fill="none" stroke={STEM} strokeWidth="9" strokeLinecap="round"
              style={{ strokeDasharray: 760, strokeDashoffset: 760, animation: 'grow 1.5s ease-out forwards' }} />
            {[0.28, 0.5, 0.68, 0.85].map((t, i) => { const b = bez(t); return <circle key={'bud'+i} cx={b.x} cy={b.y} r="3" fill="#5c7a4a" opacity="0.5" style={{ animation: 'pop .4s ease-out ' + (0.6 + i*0.15) + 's forwards' }} />; })}
          </svg>
        )}

        {leaves.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setShowHidden((s) => !s)} className="w-full text-[10px] uppercase tracking-wider text-slate-400 font-black py-2">
              {showHidden ? 'Nascondi gestione' : 'Gestisci foglie' + (hidden.size ? ' (' + hidden.size + ' nascoste)' : '')}
            </button>
            {showHidden && (
              <div className="space-y-1 mt-2">
                {leaves.map((lf) => (
                  <div key={lf.key} className="flex items-center justify-between bg-slate-900 border border-white/5 rounded-lg px-3 py-2">
                    <span className={'text-xs ' + (hidden.has(lf.key) ? 'text-slate-600 line-through' : 'text-slate-200')}>{lf.name}</span>
                    <button onClick={() => toggleHide(lf.key)} className="text-[9px] uppercase font-black text-slate-400">{hidden.has(lf.key) ? 'Ripristina' : 'Nascondi'}</button>
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setSelected(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-3xl overflow-hidden">
              <div className="h-2" style={{ background: col }} />
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-widest font-black mb-1" style={{ color: col }}>{CAT[selected.category] ?? selected.category}{selected.mature ? ' \u00B7 Ricordo' : selected.isOwner ? ' \u00B7 Owner' : ' \u00B7 Ospite'}</p>
                <h3 className="text-2xl font-black text-white leading-tight">{selected.name}</h3>
                <div className="flex gap-5 mt-4">
                  <div><span className="text-2xl font-black text-white">{selected.count}</span><p className="text-[9px] uppercase text-slate-500 font-bold">{selected.count === 1 ? 'persona' : 'persone'}</p></div>
                  <div><span className="text-2xl font-black text-white">{selected.duration}</span><p className="text-[9px] uppercase text-slate-500 font-bold">{selected.duration === 1 ? 'giorno' : 'giorni'}</p></div>
                </div>
                <button onClick={() => { if (selected.hubId) onOpenHub(selected.hubId); setSelected(null); }}
                  className="w-full mt-5 bg-white text-slate-950 py-3 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-transform">Vai all'Hub</button>
                <button onClick={() => setSelected(null)} className="w-full mt-2 text-slate-500 text-xs py-2">Chiudi</button>
              </div>
            </div>
          </div>
        );
      })()}
      <style>{'@keyframes grow { to { stroke-dashoffset: 0 } } @keyframes pop { from { opacity:0; transform: scale(0) } to { opacity:1; transform: scale(1) } }'}</style>
    </div>
  );
}
