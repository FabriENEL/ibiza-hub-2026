'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type Leaf = { key: string; hubId: string | null; name: string; category: string; count: number; mature: boolean };

const CAT_COLOR: Record<string, string> = {
  travel: '#eab308', party: '#f43f5e', social: '#10b981', corporate: '#3b82f6',
};

export default function Garden({ onClose, onOpenHub }: { onClose: () => void; onOpenHub: (id: string) => void }) {
  const { userId, memberships } = useHub();
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const build = async () => {
      setLoading(true);
      // Foglie vive: Hub attivi di cui sono OWNER, conteggio partecipanti real-time.
      const owned = memberships.filter((m) => m.role === 'OWNER' && m.hub.status === 'active');
      const liveCounts = await Promise.all(owned.map(async (m) => {
        const { count } = await supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', m.hub_id);
        return { key: 'live-' + m.hub_id, hubId: m.hub_id, name: m.hub.name, category: m.hub.category, count: count ?? 1, mature: false };
      }));
      // Foglie mature: orme immutabili, sopravvivono alla cancellazione Free.
      const { data: mat } = await supabase.from('garden_leaves').select('hub_id, hub_name, category, participant_count').eq('owner_id', userId);
      const matureLeaves: Leaf[] = (mat ?? []).map((l: any, i: number) => ({ key: 'mat-' + i, hubId: l.hub_id, name: l.hub_name, category: l.category, count: l.participant_count, mature: true }));
      setLeaves([...liveCounts, ...matureLeaves]);
      setLoading(false);
    };
    build();
  }, [userId, memberships]);

  // Posizione deterministica su arco: angolo per indice, raggio alternato per non sovrapporre.
  const leafPos = (i: number, total: number) => {
    const spread = 150; // gradi totali dell'arco della chioma
    const angle = total > 1 ? (-spread / 2 + (spread * i) / (total - 1)) : 0;
    const rad = (angle - 90) * (Math.PI / 180);
    const dist = 90 + (i % 2 === 0 ? 0 : 28); // raggio alternato
    return { x: 200 + Math.cos(rad) * dist, y: 210 + Math.sin(rad) * dist };
  };
  // Dimensione compressa: radice quadrata evita che Hub grandi dominino.
  const leafSize = (count: number) => 14 + Math.sqrt(count) * 6;

  const clustered = leaves.length > 15;
  const shown = clustered ? leaves.slice(0, 14) : leaves;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Il mio giardino</p>
        </div>
        <p className="text-center text-slate-400 text-xs mb-4">{leaves.length} {leaves.length === 1 ? 'foglia' : 'foglie'} \u00B7 un evento, un ricordo</p>

        {loading ? (
          <div className="h-96 bg-slate-900/50 rounded-3xl animate-pulse" />
        ) : leaves.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{'\u{1F331}'}</p>
            <p className="text-slate-300 text-sm font-bold">Il Suo giardino e ancora spoglio.</p>
            <p className="text-slate-500 text-xs mt-1">Ogni evento che organizza fa crescere una foglia.</p>
          </div>
        ) : (
          <svg viewBox="0 0 400 440" className="w-full">
            <defs>
              <linearGradient id="trunk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#57534e" /><stop offset="100%" stopColor="#292524" />
              </linearGradient>
            </defs>
            {/* fusto + terreno */}
            <path d="M195 430 Q190 320 200 250 Q205 320 205 430 Z" fill="url(#trunk)" />
            <ellipse cx="200" cy="432" rx="70" ry="8" fill="#1c1917" />
            {/* rami sottili verso ogni foglia */}
            {shown.map((lf, i) => {
              const p = leafPos(i, shown.length);
              return <line key={'br-' + lf.key} x1="200" y1="255" x2={p.x} y2={p.y} stroke="#44403c" strokeWidth="2" />;
            })}
            {/* foglie */}
            {shown.map((lf, i) => {
              const p = leafPos(i, shown.length);
              const s = leafSize(lf.count);
              const col = lf.mature ? '#d4a017' : (CAT_COLOR[lf.category] ?? '#10b981');
              return (
                <g key={lf.key} onClick={() => lf.hubId && onOpenHub(lf.hubId)} className="cursor-pointer" style={{ transformOrigin: p.x + 'px ' + p.y + 'px', animation: 'leafIn .5s ease-out ' + (i * 0.08) + 's both' }}>
                  <ellipse cx={p.x} cy={p.y} rx={s} ry={s * 1.4} fill={col} opacity={lf.mature ? 0.75 : 0.9} transform={'rotate(' + (i % 2 === 0 ? -25 : 25) + ' ' + p.x + ' ' + p.y + ')'} />
                  <title>{lf.name} \u00B7 {lf.count} {lf.count === 1 ? 'persona' : 'persone'}{lf.mature ? ' (ricordo)' : ''}</title>
                </g>
              );
            })}
          </svg>
        )}

        {clustered && <p className="text-center text-[10px] text-slate-500 mt-2">+{leaves.length - 14} foglie non mostrate</p>}
      </div>
      <style>{'@keyframes leafIn { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }'}</style>
    </div>
  );
}
