'use client'
import { useState } from 'react';
import { useHub } from './lib/HubContext';
import { getPersona } from './lib/personas';
import Calendar from './modules/Calendar';
import Cassa from './modules/Cassa';
import Group from './modules/Group';
import Votes from './modules/Votes';
import Gallery from './modules/Gallery';
import Consigli from './modules/Consigli';

export default function Shell() {
  const { memberships, activeHubId, setActiveHubId, username } = useHub();
  const [tab, setTab] = useState('calendar');
  const active = memberships.find((m) => m.hub_id === activeHubId);
  if (!active) return null;

  const p = getPersona(active.hub.category);
  const t = p.theme;
  const w = p.words;
  const isOwner = active.role === 'OWNER';
  const archived = active.hub.status === 'archived';
  const voteLabel = active.hub.vote_label ?? w.tabs.votes;
  const votesEnabled = active.hub.votes_enabled ?? true;

  const currentTab = (tab === 'votes' && !votesEnabled) ? 'calendar' : tab;

  const TABS = [
    { id: 'calendar', icon: '\u{1F4C5}', label: w.tabs.calendar },
    { id: 'cassa',    icon: '\u{1F4B0}', label: w.tabs.cassa },
    ...(votesEnabled ? [{ id: 'votes', icon: '\u{1F3C6}', label: w.tabs.votes }] : []),
    { id: 'gallery',  icon: '\u{1F4F8}', label: w.tabs.gallery },
    { id: 'consigli', icon: '\u{1F4A1}', label: 'Consigli' },
    { id: 'group',    icon: '\u{1F465}', label: w.tabs.group },
  ];

  const greeting = w.tone === 'formal' ? (username ?? '') : 'Ciao ' + (username ?? '') + (w.tone === 'warm' ? ' \u{1F389}' : '');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <header className="p-4 border-b border-white/5 bg-slate-950/80 sticky top-0 backdrop-blur-xl z-50 flex justify-between items-center">
        <div>
          <h2 className={'text-transparent bg-clip-text bg-gradient-to-r ' + t.gradient + ' text-[10px] font-black uppercase tracking-widest'}>{active.hub.name}{archived ? ' - RICORDO' : ''}</h2>
          <p className="font-bold text-white text-sm">{greeting}{isOwner ? (w.tone === 'formal' ? ' - Organizzatore' : ' (organizzatore)') : ''}</p>
        </div>
        <button onClick={() => setActiveHubId(null)} className={'w-10 h-10 bg-slate-900 border border-white/5 text-sm ' + p.vibe.rounded}>X</button>
      </header>

      <div className="p-4">
        {currentTab === 'calendar' && <Calendar hubId={active.hub_id} theme={t} isOwner={isOwner} archived={archived} persona={p} />}
        {currentTab === 'cassa'    && <Cassa hubId={active.hub_id} theme={t} archived={archived} />}
        {currentTab === 'votes'    && <Votes hubId={active.hub_id} theme={t} archived={archived} isOwner={isOwner} voteLabel={voteLabel} />}
        {currentTab === 'gallery'  && <Gallery hubId={active.hub_id} theme={t} archived={archived} />}
        {currentTab === 'consigli' && <Consigli hubId={active.hub_id} theme={t} category={active.hub.category} persona={p} />}
        {currentTab === 'group'    && <Group hubId={active.hub_id} theme={t} isOwner={isOwner} archived={archived} votesEnabled={votesEnabled} persona={p} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur border-t border-slate-800 p-2 flex justify-around overflow-x-auto">
        {TABS.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={'flex flex-col items-center gap-1 transition-colors shrink-0 px-2 ' + (currentTab === tb.id ? t.text : 'text-slate-500')}>
            <span className="text-xl">{tb.icon}</span>
            <span className="text-[9px] font-black uppercase">{tb.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
