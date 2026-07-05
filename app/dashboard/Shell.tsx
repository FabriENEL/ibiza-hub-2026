'use client'

import { useState } from 'react';
import { useHub } from './lib/HubContext';
import { getBlueprint } from './lib/blueprints';
import Calendar from './modules/Calendar';
import Cassa from './modules/Cassa';
import { EGMonogram } from '@/components/brand/EGMonogram';

const THEME: Record<string, { text: string; gradient: string; border: string }> = {
  travel:    { text: 'text-yellow-500', gradient: 'from-yellow-400 to-yellow-600', border: 'border-yellow-500/30' },
  party:     { text: 'text-rose-500',   gradient: 'from-rose-400 to-pink-600',     border: 'border-rose-500/30' },
  social:    { text: 'text-emerald-500',gradient: 'from-emerald-400 to-teal-600',  border: 'border-emerald-500/30' },
  corporate: { text: 'text-blue-500',   gradient: 'from-blue-400 to-indigo-600',   border: 'border-blue-500/30' },
};

const ROUNDED = 'rounded-3xl';

const TABS = [
  { id: 'calendar', icon: '\u{1F4C5}', label: 'Eventi' },
  { id: 'cassa',    icon: '\u{1F4B0}', label: 'Cassa' },
  { id: 'gallery',  icon: '\u{1F4F8}', label: 'Foto' },
  { id: 'group',    icon: '\u{1F465}', label: 'Gruppo' },
];

export default function Shell() {
  const { memberships, activeHubId, setActiveHubId, username } = useHub();
  const [tab, setTab] = useState('calendar');

  const active = memberships.find((m) => m.hub_id === activeHubId);
  const cat = active?.hub.category ?? 'travel';
  const t = THEME[cat] ?? THEME.travel;

  if (!active) return null;

  const isOwner = active.role === 'OWNER';
  const archived = active.hub.status === 'archived';
  const words = getBlueprint(cat).words;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <header className="p-4 border-b border-white/5 bg-slate-950/80 sticky top-0 backdrop-blur-xl z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <EGMonogram className="h-9 w-auto shrink-0" />
          <div>
          <h2 className={`text-transparent bg-clip-text bg-gradient-to-r ${t.gradient} text-[10px] font-black uppercase tracking-widest`}>
            {active.hub.name}
          </h2>
          <p className="font-bold text-white text-sm">Ciao {username ?? ''}</p>
          </div>
        </div>
        <button onClick={() => setActiveHubId(null)}
          className="w-10 h-10 bg-slate-900 border border-white/5 rounded-full text-sm">🚪</button>
      </header>

      <div className="p-4">
        {tab === 'calendar' && <Calendar hubId={active.hub_id} theme={t} isOwner={isOwner} archived={archived} words={words} rounded={ROUNDED} />}
        {tab === 'cassa' && <Cassa hubId={active.hub_id} theme={t} archived={archived} />}
        {tab === 'gallery'  && <Placeholder label="Galleria — prossimo modulo" />}
        {tab === 'group'    && <Placeholder label="Gruppo — prossimo modulo" />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur border-t border-slate-800 p-3 flex justify-around">
        {TABS.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${tab === tb.id ? t.text : 'text-slate-500'}`}>
            <span className="text-xl">{tb.icon}</span>
            <span className="text-[9px] font-black uppercase">{tb.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function Placeholder({ label }: { label: string }) {
  return <div className="text-center text-slate-500 text-sm py-20">{label}</div>;
}

