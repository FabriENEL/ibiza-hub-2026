'use client'
import AuthGuard from './AuthGuard';
import { HubProvider, useHub } from './lib/HubContext';
import { useState } from 'react';
import CreateHub from './CreateHub';
import JoinHub from './JoinHub';
import Shell from './Shell';
import Garden from './Garden';
import { logEvent } from './lib/logEvent';

const THEME: Record<string, { text: string; gradient: string; border: string }> = {
  travel:    { text: 'text-yellow-500', gradient: 'from-yellow-400 to-yellow-600', border: 'border-yellow-500/30' },
  party:     { text: 'text-rose-500',   gradient: 'from-rose-400 to-pink-600',     border: 'border-rose-500/30' },
  social:    { text: 'text-emerald-500',gradient: 'from-emerald-400 to-teal-600',  border: 'border-emerald-500/30' },
  corporate: { text: 'text-blue-500',   gradient: 'from-blue-400 to-indigo-600',   border: 'border-blue-500/30' },
};

// Ogni categoria ha un volto: banner + icona. Il carattere dell'Hub inizia dalla selezione.
const VISUAL: Record<string, { image: string; icon: string }> = {
  travel:    { image: '/events/boat.webp',        icon: '\u{1F30D}' },
  party:     { image: '/events/club.webp',        icon: '\u{1F389}' },
  social:    { image: '/events/cocktails.webp',   icon: '\u{1F942}' },
  corporate: { image: '/events/groupdinner.webp', icon: '\u{1F4BC}' },
};

function Lobby() {
  const { username, memberships, setActiveHubId, loading } = useHub();
  const [view, setView] = useState<'list' | 'create' | 'join' | 'garden'>('list');

  if (view === 'create') return <CreateHub onClose={() => setView('list')} />;
  if (view === 'join')   return <JoinHub onClose={() => setView('list')} />;
  if (view === 'garden') return <Garden onClose={() => setView('list')} onOpenHub={(id) => setActiveHubId(id)} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          {[0, 1].map((i) => <div key={i} className="h-28 bg-slate-900 border border-white/5 rounded-3xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-14">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 mb-2">Junction</p>
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl font-black text-white">I miei Hub</h1>
            <button onClick={() => { logEvent("garden_opened"); setView("garden"); }} title="Il mio giardino"
              className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm font-black active:scale-95 transition-transform" style={{ background: "linear-gradient(135deg, #2d4a35, #1c2f22)", border: "1px solid rgba(163,181,133,0.4)", color: "#c4d2ac" }}>
              <span className="text-lg">{String.fromCodePoint(0x1F331)}</span><span>Il mio giardino</span>
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-2">Ciao {username ?? ''}. Scegli un evento o entrane in uno.</p>
        </div>

        {memberships.length === 0 ? (
          <div className="text-center bg-slate-900 border border-white/5 p-8 rounded-3xl">
            <p className="text-2xl mb-2">{'\u{2728}'}</p>
            <p className="text-slate-300 text-sm font-bold">Il suo primo evento inizia qui.</p>
            <p className="text-slate-500 text-xs mt-1">Crei un Hub o entri con un codice invito.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {memberships.map(({ hub, role }) => {
              const th = THEME[hub.category] ?? THEME.travel;
              const v = VISUAL[hub.category] ?? VISUAL.travel;
              const archived = hub.status === 'archived';
              return (
                <button key={hub.id} onClick={() => { logEvent('hub_opened', { category: hub.category }, hub.id); setActiveHubId(hub.id); }}
                  className="relative w-full h-28 rounded-3xl overflow-hidden border border-white/10 text-left shadow-xl transition-transform active:scale-[0.98]">
                  <img src={v.image} alt="" className={'absolute inset-0 w-full h-full object-cover' + (archived ? ' saturate-[0.35] sepia-[0.3]' : '')} />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/25" />
                  <div aria-hidden className={'absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ' + th.gradient} />
                  <span className="absolute top-3 right-3 text-2xl drop-shadow">{v.icon}</span>
                  <div className="relative h-full flex flex-col justify-center pl-6 pr-12">
                    <span className="font-black text-xl text-white drop-shadow [font-family:var(--font-display)]">{hub.name}</span>
                    <span className={'text-[10px] uppercase font-black tracking-widest ' + th.text}>{hub.category}{archived ? ' \u00B7 Ricordo' : ''}</span>
                  </div>
                  {role === 'OWNER' && <span className="absolute bottom-3 right-3 text-[9px] uppercase font-black text-white/80 bg-black/50 px-2 py-1 rounded border border-white/10">Owner</span>}
                </button>
              );
            })}
          </div>
        )}

        <button onClick={() => setView('create')}
          className="w-full mt-8 bg-white text-slate-950 p-4 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] active:scale-[0.98] transition-transform">
          + Crea nuovo Hub
        </button>
        <button onClick={() => setView('join')}
          className="w-full mt-3 bg-slate-900 border border-white/10 text-white p-4 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] active:scale-[0.98] transition-transform">
          Entra con codice
        </button>
      </div>
    </div>
  );
}

function DashboardRouter() {
  const { activeHubId } = useHub();
  if (!activeHubId) return <Lobby />;
  return <Shell />;
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <HubProvider>
        <DashboardRouter />
      </HubProvider>
    </AuthGuard>
  );
}








