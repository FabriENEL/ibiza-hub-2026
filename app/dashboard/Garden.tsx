'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type Leaf = { key: string; hubId: string | null; name: string; category: string; count: number; mature: boolean };

// Fiore per categoria; foglia e stelo verde salvia (identita EventGarden).
const FLOWER: Record<string, string> = {
  travel: '#f59e0b', party: '#a855f7', social: '#ec4899', corporate: '#3b82f6',
};
const SAGE = '#84a98c';
const SAGE_DARK = '#52796f';

export default function Garden({ onClose, onOpenHub }: { onClose: () => void; onOpenHub: (id: string) => void }) {
  const { userId, memberships } = useHub();
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const build = async () => {
      setLoading(true);
      const owned = memberships.filter((m) => m.role === 'OWNER' && m.hub.status === 'active');
      const live = await Promise.all(owned.map(async (m) => {
        const { count } = await supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', m.hub_id);
        return { key: 'live-' + m.hub_id, hubId: m.hub_id, name: m.hub.name, category: m.hub.category, count: count ?? 1, mature: false };
      }));
      const { data: mat } = await supabase.from('garden_leaves').select('hub_id, hub_name, category, participant_count').eq('owner_id', userId);
      const matured: Leaf[] = (mat ?? []).map((l: any, i: number) => ({ key: 'mat-' + i, hubId: l.hub_id, name: l.hub_name, category: l.category, count: l.participant_count, mature: true }));
      setLeaves([...live, ...matured]);
      setLoading(false);
    };
    build();
  }, [userId, memberships]);

  // Punto su curva di Bezier quadratica: stelo del ramo. t in [0,1].
  const P0 = { x: 200, y: 470 }, P1 = { x: 90, y: 250 }, P2 = { x: 250, y: 60 };
  const bezier = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
      y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y,
    };
  };
  // Normale alla curva: direzione di uscita di foglia/fiore dallo stelo.
  const normal = (t: number) => {
    const u = 1 - t;
    const dx = 2 * u * (P1.x - P0.x) + 2 * t * (P2.x - P1.x);
    const dy = 2 * u * (P1.y - P0.y) + 2 * t * (P2.y - P1.y);
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  };
  const leafSize = (c: number) => 10 + Math.sqrt(c) * 5;

  const clustered = leaves.length > 12;
  const shown = clustered ? leaves.slice(0, 12) : leaves;
  const stemPath = 'M' + P0.x + ' ' + P0.y + ' Q' + P1.x + ' ' + P1.y + ' ' + P2.x + ' ' + P2.y;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Il mio ramo</p>
        </div>
        <p className="text-center text-slate-400 text-xs mb-4">{leaves.length} {leaves.length === 1 ? 'evento' : 'eventi'} \u00B7 il Suo ramo in EventGarden</p>

        {loading ? (
          <div className="h-[480px] bg-slate-900/40 rounded-3xl animate-pulse" />
        ) : leaves.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{String.fromCodePoint(0x1F33F)}</p>
            <p className="text-slate-300 text-sm font-bold">Il Suo ramo e ancora spoglio.</p>
            <p className="text-slate-500 text-xs mt-1">Ogni evento fa nascere una foglia e un fiore.</p>
          </div>
        ) : (
          <svg viewBox="0 0 400 500" className="w-full">
            {/* stelo: crescita animata via stroke-dasharray */}
            <path d={stemPath} fill="none" stroke={SAGE_DARK} strokeWidth="7" strokeLinecap="round"
              style={{ strokeDasharray: 700, strokeDashoffset: 700, animation: 'grow 1.4s ease-out forwards' }} />
            {shown.map((lf, i) => {
              const t = 0.18 + (0.72 * i) / Math.max(1, shown.length - 1);
              const base = bezier(t);
              const dir = normal(t);
              const side = i % 2 === 0 ? 1 : -1;
              const s = leafSize(lf.count);
              const lx = base.x + dir.x * side * (s + 6);
              const ly = base.y + dir.y * side * (s + 6);
              const ang = Math.atan2(ly - base.y, lx - base.x) * 180 / Math.PI;
              const delay = 1.2 + i * 0.12;
              return (
                <g key={lf.key} onClick={() => lf.hubId && onOpenHub(lf.hubId)} className="cursor-pointer"
                   style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay + 's forwards', transformOrigin: base.x + 'px ' + base.y + 'px' }}>
                  <line x1={base.x} y1={base.y} x2={lx} y2={ly} stroke={SAGE_DARK} strokeWidth="2" />
                  <ellipse cx={lx} cy={ly} rx={s} ry={s * 1.7} fill={lf.mature ? '#b8a049' : SAGE}
                    opacity={lf.mature ? 0.7 : 0.92} transform={'rotate(' + ang + ' ' + lx + ' ' + ly + ')'} />
                  <circle cx={base.x} cy={base.y} r={Math.max(4, s * 0.4)} fill={FLOWER[lf.category] ?? '#f59e0b'} />
                  <title>{lf.name} \u00B7 {lf.count} {lf.count === 1 ? 'persona' : 'persone'}{lf.mature ? ' (ricordo)' : ''}</title>
                </g>
              );
            })}
          </svg>
        )}
        {clustered && <p className="text-center text-[10px] text-slate-500 mt-2">+{leaves.length - 12} eventi non mostrati</p>}
      </div>
      <style>{'@keyframes grow { to { stroke-dashoffset: 0 } } @keyframes pop { from { opacity:0; transform: scale(0) } to { opacity:1; transform: scale(1) } }'}</style>
    </div>
  );
}
