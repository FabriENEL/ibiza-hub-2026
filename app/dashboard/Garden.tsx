'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type Leaf = { key: string; hubId: string | null; name: string; category: string; count: number; mature: boolean };

// Colore del FIORE per categoria; foglia e fusto restano verde salvia (tema).
const FLOWER: Record<string, string> = {
  travel: '#f59e0b', party: '#a855f7', social: '#ec4899', corporate: '#3b82f6',
};
const SAGE = '#84a98c';
const HIDDEN_KEY = 'eg_hidden_leaves';
const loadHidden = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]')); } catch { return new Set(); }
};

export default function Garden({ onClose, onOpenHub }: { onClose: () => void; onOpenHub: (id: string) => void }) {
  const { userId, memberships } = useHub();
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  useEffect(() => { setHidden(loadHidden()); }, []);
  const toggleHide = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
      return next;
    });
  };

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

  // Foglie visibili sull'albero: escluse le nascoste, salvo modalita 'mostra rimossi'.
  const visible = showHidden ? leaves : leaves.filter((l) => !hidden.has(l.key));
  const clustered = visible.length > 15;
  const shown = clustered ? visible.slice(0, 14) : visible;
  // Fusto cresce con il numero di foglie: piu eventi, tronco piu alto.
  const trunkTop = Math.max(180, 250 - shown.length * 6);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Il mio giardino</p>
        </div>
        <p className="text-center text-slate-400 text-xs mb-1">{leaves.length} {leaves.length === 1 ? 'foglia' : 'foglie'} \u00B7 un evento, un ricordo</p>
        {hidden.size > 0 && <button onClick={() => setShowHidden((s) => !s)} className="block mx-auto mb-3 text-[10px] uppercase tracking-wider text-slate-500 font-black">{showHidden ? 'Nascondi rimosse' : 'Mostra ' + hidden.size + ' rimosse'}</button>}

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
            <path d={"M195 430 Q190 " + (trunkTop + 90) + " 200 " + trunkTop + " Q205 " + (trunkTop + 90) + " 205 430 Z"} fill="url(#trunk)" />
            <ellipse cx="200" cy="432" rx="70" ry="8" fill="#1c1917" />
            {/* rami sottili verso ogni foglia */}
            {shown.map((lf, i) => {
              const p = leafPos(i, shown.length);
              return <line key={'br-' + lf.key} x1="200" y1={trunkTop + 5} x2={p.x} y2={p.y} stroke="#44403c" strokeWidth="2" />;
            })}
            {/* foglie */}
            {shown.map((lf, i) => {
              const p = leafPos(i, shown.length);
              const s = leafSize(lf.count);
              return (
                <g key={lf.key} onClick={() => lf.hubId && onOpenHub(lf.hubId)} className="cursor-pointer" style={{ transformOrigin: p.x + 'px ' + p.y + 'px', animation: 'leafIn .5s ease-out ' + (i * 0.08) + 's both' }}>
                  <ellipse cx={p.x} cy={p.y} rx={s} ry={s * 1.4} fill={lf.mature ? '#c9b458' : SAGE} opacity={lf.mature ? 0.7 : 0.92} transform={'rotate(' + (i % 2 === 0 ? -25 : 25) + ' ' + p.x + ' ' + p.y + ')'} />
                  {/* Fiore: colore = categoria, posizionato sulla punta della foglia. */}
                  <circle cx={p.x} cy={p.y - s * 1.1} r={Math.max(4, s * 0.32)} fill={FLOWER[lf.category] ?? '#f59e0b'} opacity={hidden.has(lf.key) ? 0.3 : 1} />
                  <title>{lf.name} \u00B7 {lf.count} {lf.count === 1 ? 'persona' : 'persone'}{lf.mature ? ' (ricordo)' : ''}{hidden.has(lf.key) ? ' - nascosta' : ''}</title>
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



