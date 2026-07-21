'use client'
import AuthGuard from './AuthGuard';
import { HubProvider, useHub } from './lib/HubContext';
import { useState, useEffect } from 'react';
import CreateHub from './CreateHub';
import JoinHub from './JoinHub';
import Shell from './Shell';
import JulieDock from './JulieDock';
import PushInvito from './PushInvito';
import Garden from './Garden';
import { logEvent } from './lib/logEvent';

const THEME: Record<string, { text: string; gradient: string; border: string }> = {
  travel:    { text: 'text-[#7FA8B0]', gradient: 'from-[#7FA8B0] to-[#5F8189]', border: 'border-[#7FA8B04D]' },
  party:     { text: 'text-[#D9A441]', gradient: 'from-[#D9A441] to-[#B7842B]', border: 'border-[#D9A4414D]' },
  social:    { text: 'text-[#A3B585]', gradient: 'from-[#A3B585] to-[#7C8E60]', border: 'border-[#A3B5854D]' },
  corporate: { text: 'text-[#8892B0]', gradient: 'from-[#8892B0] to-[#67718F]', border: 'border-[#8892B04D]' },
};

const VISUAL: Record<string, { image: string; icon: string }> = {
  travel:    { image: '/events/boat.webp',        icon: '\u{1F30D}' },
  party:     { image: '/events/club.webp',        icon: '\u{1F389}' },
  social:    { image: '/events/cocktails.webp',   icon: '\u{1F942}' },
  corporate: { image: '/events/groupdinner.webp', icon: '\u{1F4BC}' },
};

const CAT_LABEL: Record<string, string> = { travel: 'Viaggio', party: 'Festa', social: 'Ritrovo', corporate: 'Lavoro' };
const IconDots = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[16px] h-[16px]">
    <circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" />
  </svg>
);
const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
    <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8" />
    <path d="M9.4 5.3A9.7 9.7 0 0 1 12 5c5 0 9 4.5 9 7a12 12 0 0 1-2.4 3.3M6.2 6.4C3.9 7.9 3 10.2 3 12c0 2.5 4 7 9 7a9.6 9.6 0 0 0 3.5-.7" />
  </svg>
);
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" /><circle cx="12" cy="12" r="2.6" />
  </svg>
);

function Lobby() {
  const { username, memberships, setActiveHubId, loading, setHubHidden } = useHub();
  const [view, setView] = useState<'list' | 'create' | 'join' | 'garden'>('list');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [mostraNascosti, setMostraNascosti] = useState(false);

  if (view === 'create') return <CreateHub onClose={() => setView('list')} />;
  if (view === 'join')   return <JoinHub onClose={() => setView('list')} />;
  if (view === 'garden') return <Garden onClose={() => setView('list')} onOpenHub={(id: string) => setActiveHubId(id)} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          {[0, 1].map((i) => <div key={i} className="h-28 bg-slate-900 border border-white/5 rounded-3xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  // Il flag 'hidden' vive su hub_members: e' personale. Non tocca gli altri membri, non tocca il Garden.
  const visibili = memberships.filter((m: any) => !m.hidden);
  const nascosti = memberships.filter((m: any) => m.hidden);

  // Scala adattiva: il countdown al minuto ha valore perche' e' raro. Oltre le 24 ore diventa rumore.
  const quando = (iso: string | null, fine: string | null) => {
    if (!iso) return null;
    const t = new Date(iso).getTime(); const now = Date.now();
    // end_date e' una data senza ora: 'fine' e' la MEZZANOTTE di quel giorno, non la sua sera.
    // Aggiungo 24h cosi' l'Hub resta vivo per tutto il suo ultimo giorno, non 'Ricordo' dall'alba.
    const tf = fine ? new Date(fine).getTime() + 86400000 : t + 86400000;
    if (now > tf) return { testo: 'Ricordo', vivo: false };
    if (now >= t) return { testo: 'In corso', vivo: true };
    const ms = t - now, gg = Math.floor(ms / 86400000);
    if (gg > 7) return { testo: new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }), vivo: false };
    if (gg >= 1) return { testo: 'tra ' + gg + (gg === 1 ? ' giorno' : ' giorni'), vivo: false };
    const h = Math.floor(ms / 3600000), mi = Math.floor((ms % 3600000) / 60000);
    return { testo: 'tra ' + h + 'h ' + mi + 'm', vivo: true };
  };

  // Card dell'Hub. E' un div, non un button: dentro deve poterci stare il menu, e un bottone
  // dentro un bottone e' HTML non valido (il tocco impazzisce).
  const CardHub = ({ m, spenta }: { m: any; spenta?: boolean }) => {
    const { hub, role, hidden } = m;
    const th = THEME[hub.category] ?? THEME.travel;
    const v = VISUAL[hub.category] ?? VISUAL.travel;
    const archived = hub.status === 'archived';
    return (
      <div className={'relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-xl ' + (spenta ? 'h-20 opacity-60' : 'h-28')}>
        <div onClick={() => { setMenuFor(null); logEvent('hub_opened', { category: hub.category }, hub.id); setActiveHubId(hub.id); }}
          role="button" tabIndex={0}
          className="absolute inset-0 text-left cursor-pointer active:scale-[0.98] transition-transform">
          <img src={v.image} alt="" className={'absolute inset-0 w-full h-full object-cover' + (archived || spenta ? ' saturate-[0.35] sepia-[0.3]' : '')} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/25" />
          <div aria-hidden className={'absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ' + th.gradient} />
          <div className="relative h-full flex flex-col justify-center pl-6 pr-14">
            <span className={'font-black text-white drop-shadow [font-family:var(--font-display)] ' + (spenta ? 'text-base' : 'text-xl')}>{hub.name}</span>
            <span className={'text-[10px] uppercase font-black tracking-widest ' + th.text}>{CAT_LABEL[hub.category] ?? hub.category}{archived ? ' \u00B7 Ricordo' : ''}</span>
            {!spenta && (() => { const q = quando(hub.start_date, hub.end_date); return q ? (
              <span className={'mt-1 text-[10px] font-bold tracking-wide ' + (q.vivo ? 'text-[#A3B585]' : 'text-white/45')}>{q.testo}</span>
            ) : null; })()}
          </div>
          {role === 'OWNER' && !spenta && <span className="absolute bottom-3 right-3 text-[9px] uppercase font-black text-white/80 bg-black/50 px-2 py-1 rounded border border-white/10">Owner</span>}
        </div>

        <div className="absolute top-2.5 right-2.5 z-20">
          <button onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === hub.id ? null : hub.id); }}
            aria-label="Opzioni Hub" title="Opzioni Hub"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/55 text-white/85 border border-white/15 backdrop-blur active:scale-90 transition-transform">
            <IconDots />
          </button>
          {menuFor === hub.id && (
            <div onClick={(e) => e.stopPropagation()} className="absolute top-10 right-0 w-40 rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#1C1F22' }}>
              <button onClick={() => { setHubHidden(hub.id, !hidden); setMenuFor(null); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-slate-200 active:bg-white/5">
                {hidden ? <IconEye /> : <IconEyeOff />}
                {hidden ? 'Mostra in home' : 'Nascondi dalla home'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-14" onClick={() => setMenuFor(null)}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 mb-2">EventGarden</p>
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl font-black text-white">I tuoi Hub</h1>
            <button onClick={() => { logEvent("garden_opened"); setView("garden"); }} title="Il mio giardino"
              className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm font-black active:scale-95 transition-transform" style={{ background: "linear-gradient(135deg, #2d4a35, #1c2f22)", border: "1px solid rgba(163,181,133,0.4)", color: "#c4d2ac" }}>
              <span className="text-lg">{String.fromCodePoint(0x1F331)}</span><span>Il mio giardino</span>
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-2">Salve {username ?? ''}. Scelga un Hub, o ne crei uno nuovo.</p>
        </div>

        {memberships.length === 0 ? (
          <div className="text-center bg-slate-900 border border-white/5 p-8 rounded-3xl">
            <p className="text-2xl mb-2">{'\u{2728}'}</p>
            <p className="text-slate-300 text-sm font-bold">Il suo primo evento inizia qui.</p>
            <p className="text-slate-500 text-xs mt-1">Crei un Hub o entri con un codice invito.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibili.map((m: any) => <CardHub key={m.hub.id} m={m} />)}
            {visibili.length === 0 && (
              <div className="text-center bg-slate-900 border border-white/5 p-6 rounded-3xl">
                <p className="text-slate-400 text-sm">Ha nascosto tutti i Suoi Hub.</p>
              </div>
            )}
          </div>
        )}

        {/* Gli Hub nascosti restano a portata: una riga sobria, non un cimitero. */}
        {nascosti.length > 0 && (
          <div className="mt-6">
            <button onClick={() => setMostraNascosti(!mostraNascosti)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold text-slate-500 active:text-slate-300 transition-colors">
              <IconEyeOff />
              {nascosti.length} {nascosti.length === 1 ? 'Hub nascosto' : 'Hub nascosti'}
              <span className="text-[10px]">{mostraNascosti ? '\u2303' : '\u2304'}</span>
            </button>
            {mostraNascosti && (
              <div className="space-y-2.5 mt-2">
                {nascosti.map((m: any) => <CardHub key={m.hub.id} m={m} spenta />)}
              </div>
            )}
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
  const { activeHubId, setActiveHubId } = useHub();
  // Tasto Indietro di Android: torna alla lobby invece di uscire dall'app.
  useEffect(() => {
    history.pushState(null, '', location.href);
    const onPop = () => {
      if (activeHubId) setActiveHubId(null);
      history.pushState(null, '', location.href);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [activeHubId, setActiveHubId]);
  if (!activeHubId) return <Lobby />;
  return <><Shell /><JulieDock /><PushInvito /></>;
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