'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type Leaf = { key: string; hubId: string | null; name: string; category: string; count: number; mature: boolean };

const FLOWER: Record<string, string> = {
  travel: '#f59e0b', party: '#a855f7', social: '#ec4899', corporate: '#3b82f6',
};
const SAGE = '#84a98c';
const SAGE_DK = '#52796f';

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

  const P0 = { x: 200, y: 470 }, P1 = { x: 95, y: 250 }, P2 = { x: 250, y: 55 };
  const bezier = (t: number) => {
    const u = 1 - t;
    return { x: u*u*P0.x + 2*u*t*P1.x + t*t*P2.x, y: u*u*P0.y + 2*u*t*P1.y + t*t*P2.y };
  };
  const tangentAngle = (t: number) => {
    const u = 1 - t;
    const dx = 2*u*(P1.x-P0.x) + 2*t*(P2.x-P1.x);
    const dy = 2*u*(P1.y-P0.y) + 2*t*(P2.y-P1.y);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };
  const leafScale = (c: number) => 0.7 + Math.sqrt(c) * 0.13;

  const clustered = leaves.length > 12;
  const shown = clustered ? leaves.slice(0, 12) : leaves;
  const stem = 'M' + P0.x + ' ' + P0.y + ' Q' + P1.x + ' ' + P1.y + ' ' + P2.x + ' ' + P2.y;

  // Foglia come path: due archi speculari + nervatura centrale. Disegnata a origine (0,0), orientata via transform.
  const LeafShape = ({ x, y, angle, scale, fill, op }: { x: number; y: number; angle: number; scale: number; fill: string; op: number }) => (
    <g transform={'translate(' + x + ' ' + y + ') rotate(' + angle + ') scale(' + scale + ')'}>
      <path d="M0 0 Q14 -10 26 0 Q14 10 0 0 Z" fill={fill} opacity={op} />
      <path d="M2 0 L24 0" stroke={SAGE_DK} strokeWidth="0.8" opacity={op * 0.6} />
    </g>
  );

  // Fiore: 5 petali (cerchi in cerchio) + pistillo. Origine al centro.
  const FlowerShape = ({ x, y, color, r }: { x: number; y: number; color: string; r: number }) => (
    <g transform={'translate(' + x + ' ' + y + ')'}>
      {[0, 72, 144, 216, 288].map((a) => {
        const rad = a * Math.PI / 180;
        return <circle key={a} cx={Math.cos(rad) * r} cy={Math.sin(rad) * r} r={r * 0.7} fill={color} opacity={0.9} />;
      })}
      <circle cx={0} cy={0} r={r * 0.55} fill="#fde68a" />
    </g>
  );

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
            <path d={stem} fill="none" stroke={SAGE_DK} strokeWidth="8" strokeLinecap="round"
              style={{ strokeDasharray: 720, strokeDashoffset: 720, animation: 'grow 1.4s ease-out forwards' }} />
            {shown.map((lf, i) => {
              const t = 0.16 + (0.76 * i) / Math.max(1, shown.length - 1);
              const b = bezier(t);
              const side = i % 2 === 0 ? 1 : -1;
              const ang = tangentAngle(t) + (side === 1 ? -42 : 42);
              const sc = leafScale(lf.count);
              const delay = 1.2 + i * 0.13;
              return (
                <g key={lf.key} onClick={() => lf.hubId && onOpenHub(lf.hubId)} className="cursor-pointer"
                   style={{ opacity: 0, animation: 'pop .5s ease-out ' + delay + 's forwards', transformOrigin: b.x + 'px ' + b.y + 'px' }}>
                  <LeafShape x={b.x} y={b.y} angle={ang} scale={sc} fill={lf.mature ? '#b8a049' : SAGE} op={lf.mature ? 0.7 : 0.95} />
                  <FlowerShape x={b.x} y={b.y} color={FLOWER[lf.category] ?? '#f59e0b'} r={3 + sc * 1.6} />
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
