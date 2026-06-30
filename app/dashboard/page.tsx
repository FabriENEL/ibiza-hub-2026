'use client'
import AuthGuard from './AuthGuard';
import { HubProvider, useHub } from './lib/HubContext';
import { useState } from 'react';
import CreateHub from './CreateHub';
import JoinHub from './JoinHub';
import Shell from './Shell';

const THEME: Record<string, { text: string; gradient: string; border: string }> = {
  travel:    { text: 'text-yellow-500', gradient: 'from-yellow-400 to-yellow-600', border: 'border-yellow-500/30' },
  party:     { text: 'text-rose-500',   gradient: 'from-rose-400 to-pink-600',     border: 'border-rose-500/30' },
  social:    { text: 'text-emerald-500',gradient: 'from-emerald-400 to-teal-600',  border: 'border-emerald-500/30' },
  corporate: { text: 'text-blue-500',   gradient: 'from-blue-400 to-indigo-600',   border: 'border-blue-500/30' },
};

function Lobby() {
  const { username, memberships, setActiveHubId, loading } = useHub();
  const [view, setView] = useState<'list' | 'create' | 'join'>('list');

  if (view === 'create') return <CreateHub onClose={() => setView('list')} />;
  if (view === 'join')   return <JoinHub onClose={() => setView('list')} />;

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><p className="text-slate-400">Carico i tuoi Hub...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600 uppercase tracking-widest">I Miei Hub</h1>
          <p className="text-slate-400 text-sm mt-2">Ciao {username ?? ''}. Scegli un evento o entrane in uno.</p>
        </div>

        {memberships.length === 0 ? (
          <div className="text-center text-slate-500 text-sm bg-slate-900 border border-white/5 p-6 rounded-3xl">Non fai ancora parte di nessun Hub.</div>
        ) : (
          <div className="space-y-4">
            {memberships.map(({ hub, role }) => {
              const th = THEME[hub.category] ?? THEME.travel;
              return (
                <button key={hub.id} onClick={() => setActiveHubId(hub.id)}
                  className="w-full bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 p-5 rounded-3xl flex items-center justify-between transition-all shadow-xl">
                  <div className="text-left">
                    <span className={'font-black text-lg block text-white'}>{hub.name}</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">{hub.category}</span>
                  </div>
                  {role === 'OWNER' && <span className="text-[9px] uppercase font-black text-slate-400 bg-slate-950 px-2 py-1 rounded border border-white/5">Owner</span>}
                </button>
              );
            })}
          </div>
        )}

        <button onClick={() => setView('create')}
          className="w-full mt-8 bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-950 p-4 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px]">
          + Crea Nuovo Hub
        </button>
        <button onClick={() => setView('join')}
          className="w-full mt-3 bg-slate-900 border border-white/10 text-white p-4 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px]">
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
