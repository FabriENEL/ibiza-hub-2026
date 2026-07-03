'use client'
import { useState, type ReactElement } from 'react';
import { useHub } from './lib/HubContext';
import { getConfig } from './lib/blueprints';
import type { ModuleId } from './lib/blueprints';
import Calendar from './modules/Calendar';
import Cassa from './modules/Cassa';
import Group from './modules/Group';
import Votes from './modules/Votes';
import Gallery from './modules/Gallery';
import Consigli from './modules/Consigli';

const ICONS: Record<ModuleId, string> = {
  calendar: '\u{1F4C5}', cassa: '\u{1F4B0}', votes: '\u{1F3C6}',
  gallery: '\u{1F4F8}', consigli: '\u{1F4A1}', group: '\u{1F465}',
};

export default function Shell() {
  const { memberships, activeHubId, setActiveHubId, username } = useHub();
  const [tab, setTab] = useState<ModuleId>('calendar');
  const active = memberships.find((m) => m.hub_id === activeHubId);
  if (!active) return null;

  const { persona: p, blueprint: bp } = getConfig(active.hub.category);
  const t = p.theme;
  const w = bp.words;
  const isOwner = active.role === 'OWNER';
  const archived = active.hub.status === 'archived';
  const voteLabel = active.hub.vote_label ?? bp.defaults.voteLabel;
  const votesEnabled = active.hub.votes_enabled ?? bp.defaults.votesEnabled;

  const mods = bp.modules.filter((m) => m !== 'votes' || votesEnabled);
  const currentTab: ModuleId = mods.includes(tab) ? tab : 'calendar';
  const greeting = w.greeting(username ?? '') + (isOwner ? w.ownerTag : '');

  const render: Record<ModuleId, ReactElement> = {
    calendar: <Calendar hubId={active.hub_id} theme={t} isOwner={isOwner} archived={archived} words={w} rounded={p.vibe.rounded} />,
    cassa:    <Cassa hubId={active.hub_id} theme={t} archived={archived} />,
    votes:    <Votes hubId={active.hub_id} theme={t} archived={archived} isOwner={isOwner} voteLabel={voteLabel} />,
    gallery:  <Gallery hubId={active.hub_id} theme={t} archived={archived} />,
    consigli: <Consigli hubId={active.hub_id} theme={t} category={active.hub.category} rounded={p.vibe.rounded} />,
    group:    <Group hubId={active.hub_id} theme={t} isOwner={isOwner} archived={archived} votesEnabled={votesEnabled} words={w} rounded={p.vibe.rounded} />,
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Glow ambientale: la categoria colora l'atmosfera dell'intera pagina */}
      <div aria-hidden className={'pointer-events-none fixed inset-x-0 top-0 h-96 bg-gradient-to-b ' + t.gradient + ' opacity-[0.08] blur-3xl'} />

      <header className="p-4 border-b border-white/5 bg-slate-950/80 sticky top-0 backdrop-blur-xl z-50 flex justify-between items-center">
        <div>
          <h2 className={'text-transparent bg-clip-text bg-gradient-to-r ' + t.gradient + ' text-[10px] font-black uppercase tracking-widest'}>{active.hub.name}{archived ? ' - RICORDO' : ''}</h2>
          <p className="font-bold text-white text-sm">{greeting}</p>
        </div>
        <button onClick={() => setActiveHubId(null)} className={'w-10 h-10 bg-slate-900 border border-white/5 text-sm active:scale-95 transition-transform ' + p.vibe.rounded}>X</button>
      </header>

      {/* key={currentTab}: rimonta il contenitore al cambio tab e fa ripartire l'animazione */}
      <div key={currentTab} className="relative p-4 animate-[moduleIn_.25s_ease-out]">{render[currentTab]}</div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/70 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around z-50">
        {mods.map((id) => (
          <button key={id} onClick={() => setTab(id)} className={'flex flex-col items-center gap-1 shrink-0 px-3 py-1.5 rounded-xl transition-all duration-150 active:scale-95 ' + (currentTab === id ? t.text + ' bg-white/5' : 'text-slate-500')}>
            <span className="text-xl">{ICONS[id]}</span>
            <span className="text-[9px] font-black uppercase">{w.tabs[id]}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
