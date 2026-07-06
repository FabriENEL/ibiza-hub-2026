'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type Leaf = { key: string; hubId: string | null; name: string; category: string; count: number; duration: number; mature: boolean };

const FLOWER: Record<string, string> = {
  travel: '#f59e0b', party: '#a855f7', social: '#ec4899', corporate: '#3b82f6',
};
const STEM = '#4a3f35', STEM_DK = '#3a3028';

export default function Garden({ onClose, onOpenHub }: { onClose: () => void; onOpenHub: (id: string) => void }) {
  const { userId, memberships } = useHub();
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Leaf | null>(null);
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
      const owned = memberships.filter((m) => m.role === 'OWNER' && m.hub.status === 'active');
      const live = await Promise.all(owned.map(async (m) => {
        const { count } = await supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', m.hub_id);
        const { data: h } = await supabase.from('hubs').select('start_date, end_date').eq('id', m.hub_id).single();
        const dur = h ? Math.max(1, Math.round((+new Date(h.end_date) - +new Date(h.start_date)) / 86400000) + 1) : 1;
        return { key: 'live-' + m.hub_id, hubId: m.hub_id, name: m.hub.name, category: m.hub.category, count: count ?? 1, duration: dur, mature: false };
      }));
      const { data: mat } = await supabase.from('garden_leaves').select('hub_id, hub_name, category, participant_count, duration_days').eq('owner_id', userId);
      const matured: Leaf[] = (mat ?? []).map((l: any, i: number) => ({ key: 'mat-' + i, hubId: l.hub_id, name: l.hub_name, category: l.category, count: l.participant_count, duration: l.duration_days ?? 1, mature: true }));
      setLeaves([...live, ...matured]);
      setLoading(false);
    };
    build();
  }, [userId, memberships]);

  // Ramo principale: Bezier che sale da sinistra-basso a destra-alto.
  const A = { x: 40, y: 440 }, B = { x: 180, y: 300 }, C = { x: 370, y: 120 };
  const bez = (t: number) => { const u = 1 - t; return { x: u*u*A.x + 2*u*t*B.x + t*t*C.x, y: u*u*A.y + 2*u*t*B.y + t*t*C.y }; };
  const tan = (t: number) => { const u = 1 - t; const dx = 2*u*(B.x-A.x)+2*t*(C.x-B.x), dy = 2*u*(B.y-A.y)+2*t*(C.y-B.y); return Math.atan2(dy, dx); };

  // Durata -> luminosita verde: breve = salvia scuro, lungo = verde acceso.
  const leafColor = (dur: number) => {
    const k = Math.min(1, dur / 10);
    const l = 28 + k * 30;   // 28%..58%
    const s = 22 + k * 30;   // desaturato -> saturo
    return 'hsl(135 ' + s.toFixed(0) + '% ' + l.toFixed(0) + '%)';
  };
  const leafLen = (c: number) => 16 + Math.sqrt(c) * 6;

  const visible = leaves.filter((l) => !hidden.has(l.key));
  const clustered = visible.length > 14;
  const shown = clustered ? visible.slice(0, 14) : visible;
  const stemPath = 'M' + A.x + ' ' + A.y + ' Q' + B.x + ' ' + B.y + ' ' + C.x + ' ' + C.y;

  // Foglia a path (arco doppio + nervatura), origine (0,0), punta lungo +x.
  const Leaf = ({ x, y, ang, len, fill, op }: any) => {
    const w = len * 0.55;
    return (
      <g transform={'translate(' + x + ' ' + y + ') rotate(' + (ang * 180 / Math.PI) + ')'} opacity={op}>
        <path d={'M0 0 Q' + (len*0.5) + ' ' + (-w) + ' ' + len + ' 0 Q' + (len*0.5) + ' ' + w + ' 0 0 Z'} fill={fill} />
        <path d={'M' + (len*0.12) + ' 0 L' + (len*0.9) + ' 0'} stroke={STEM_DK} strokeWidth="0.7" opacity="0.5" />
      </g>
    );
  };
  const Flower = ({ x, y, color, r }: any) => (
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
            {/* Rametti secondari: nascono lungo il ramo, uno per evento, alternati. */}
            {shown.map((lf, i) => {
              const t = 0.12 + (0.8 * i) / Math.max(1, shown.length - 1);
              const b = bez(t);
              const side = i % 2 === 0 ? -1 : 1;
              const perp = tan(t) + side * (Math.PI / 2.4);
              const twLen = 30 + leafLen(lf.count) * 0.6;
              const tx = b.x + Math.cos(perp) * twLen, ty = b.y + Math.sin(perp) * twLen;
              const delay = 1.3 + i * 0.14;
              return (
                <g key={lf.key} onClick={() => setSelected(lf)} className="cursor-pointer"
                   style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay + 's forwards', transformOrigin: b.x + 'px ' + b.y + 'px' }}>
                  <line x1={b.x} y1={b.y} x2={tx} y2={ty} stroke={STEM} strokeWidth="2.5" strokeLinecap="round" />
                  <Leaf x={tx} y={ty} ang={perp} len={leafLen(lf.count)} fill={lf.mature ? '#a8935a' : leafColor(lf.duration)} op={lf.mature ? 0.8 : 1} />
                  <Flower x={b.x} y={b.y} color={FLOWER[lf.category] ?? '#f59e0b'} r={3.5 + Math.sqrt(lf.count) * 0.5} />
                </g>
              );
            })}
            {/* Ramo principale sopra i rametti per continuita visiva. */}
            <path d={stemPath} fill="none" stroke={STEM} strokeWidth="9" strokeLinecap="round"
              style={{ strokeDasharray: 640, strokeDashoffset: 640, animation: 'grow 1.5s ease-out forwards' }} />
            {/* Micro-fogliame decorativo anti-spoglio: gemme lungo il ramo, non interattive. */}
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
                <p className="text-[10px] uppercase tracking-widest font-black mb-1" style={{ color: col }}>{CAT[selected.category] ?? selected.category}{selected.mature ? ' \u00B7 Ricordo' : ' \u00B7 Attivo'}</p>
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
