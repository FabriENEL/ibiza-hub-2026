'use client'
import { useState, useEffect, useRef, type ReactElement } from 'react';
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

// Swipe: soglia orizzontale minima e dominanza sull'asse verticale (per non rubare lo scroll).
const SWIPE_MIN = 55;
const H_DOMINANCE = 1.4;

export default function Shell() {
  const { memberships, activeHubId, setActiveHubId, username, email, postAction, immersive } = useHub();
  const [tab, setTab] = useState<ModuleId>('calendar');
  const [nudgeX, setNudgeX] = useState(0);
  const [profiloAperto, setProfiloAperto] = useState(false);            // rimbalzo economico agli estremi (strato removibile)
  const swipe = useRef<{ x: number; y: number; lx: number; ly: number } | null>(null);
  const active = memberships.find((m) => m.hub_id === activeHubId);
  if (!active) return null;

  const { persona: p, blueprint: bp } = getConfig(active.hub.category);
  const t = p.theme;
  const w = bp.words;
  const isOwner = active.role === 'OWNER';
  const archived = active.hub.status === 'archived';
  const voteLabel = active.hub.vote_label ?? bp.defaults.voteLabel;
  const votesEnabled = active.hub.votes_enabled ?? bp.defaults.votesEnabled;

  // I Voti escono dalla barra in basso (sei icone non ci stavano) e salgono nell'intestazione:
  // si entra, non ci si passa sopra sfogliando.
  const mods: ModuleId[] = bp.modules.filter((m) => m !== 'votes');
  const currentTab: ModuleId = (mods.includes(tab) || (tab === 'votes' && votesEnabled)) ? tab : 'calendar'; useEffect(() => { if (postAction && mods.includes(postAction.module as ModuleId)) setTab(postAction.module as ModuleId); }, [postAction]);
  const greeting = w.greeting(username ?? '') + (isOwner ? w.ownerTag : '');

  // Rimbalzo: micro-scatto di 12px nella direzione tentata, poi ritorno. Nessun keyframe globale.
  const bump = (dir: number) => { setNudgeX(dir * 12); window.setTimeout(() => setNudgeX(0), 160); };

  // Touch nativi, non pointer: Chrome Android emette pointercancel appena decide che il gesto e' uno scroll,
  // e da quel momento pointermove non arriva piu'. I touchmove invece continuano sempre.
  const onSwipeStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement)?.closest?.('[data-hscroll]')) { swipe.current = null; return; }
    const p = e.touches[0]; swipe.current = { x: p.clientX, y: p.clientY, lx: p.clientX, ly: p.clientY };
  };
  // Android/Chrome chiude lo swipe con pointercancel e a volte azzera le coordinate: tengo l'ultima nota nel move.
  const onSwipeMove = (e: React.TouchEvent) => { const s = swipe.current; const p = e.touches[0]; if (s && p) { s.lx = p.clientX; s.ly = p.clientY; } };
  const onSwipeEnd = () => {
    const s = swipe.current; swipe.current = null; if (!s) return;
    const dx = s.lx - s.x, dy = s.ly - s.y;
    // Non abbastanza orizzontale: lascio vivere lo scroll verticale.
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * H_DOMINANCE) return;
    const idx = mods.indexOf(currentTab);
    // Metafora dello sfogliare: il dito trascina la pagina. Dito a SINISTRA = pagina successiva.
    if (dx < 0) {
      if (idx < mods.length - 1) { navigator.vibrate?.(8); setTab(mods[idx + 1]); } else bump(-1);
    } else {
      if (idx > 0) { navigator.vibrate?.(8); setTab(mods[idx - 1]); } else bump(1);
    }
  };

  const render: Record<ModuleId, ReactElement> = {
    calendar: <Calendar hubId={active.hub_id} theme={t} isOwner={isOwner} archived={archived} words={w} rounded={p.vibe.rounded} />,
    cassa:    <Cassa hubId={active.hub_id} theme={t} archived={archived} />,
    votes:    <Votes hubId={active.hub_id} theme={t} archived={archived} isOwner={isOwner} voteLabel={voteLabel} />,
    gallery:  <Gallery hubId={active.hub_id} theme={t} archived={archived} />,
    consigli: <Consigli hubId={active.hub_id} theme={t} category={active.hub.category} rounded={p.vibe.rounded} />,
    group:    <Group hubId={active.hub_id} theme={t} isOwner={isOwner} archived={archived} votesEnabled={votesEnabled} words={w} rounded={p.vibe.rounded} />,
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-28" style={{ overscrollBehavior: 'none' }}>
      {/* Glow ambientale: la categoria colora l'atmosfera dell'intera pagina */}
      <div aria-hidden className={'pointer-events-none fixed inset-x-0 top-0 h-96 bg-gradient-to-b ' + t.gradient + ' opacity-[0.08] blur-3xl'} />

      {/* immersive: il backdrop-blur crea un contesto d'impilamento, nessuno z-index dell'overlay potrebbe coprire header e nav. Vanno nascosti. */}
      {/* Intestazione snella: il saluto diventa un'icona. Lo spazio recuperato va alle card. */}
      <header className={'px-4 py-2.5 border-b border-white/5 bg-slate-950/80 sticky top-0 backdrop-blur-xl z-50 flex justify-between items-center gap-3' + (immersive ? ' hidden' : '')}>
        <h2 className={'min-w-0 truncate text-transparent bg-clip-text bg-gradient-to-r ' + t.gradient + ' text-[13px] font-black uppercase tracking-widest'}>{active.hub.name}{archived ? ' \u00B7 RICORDO' : ''}</h2>

        <div className="flex items-center gap-2 shrink-0">
          {votesEnabled && (
            <button onClick={() => { navigator.vibrate?.(8); setTab('votes'); }} title={w.tabs.votes} aria-label={w.tabs.votes}
              className={'w-9 h-9 bg-slate-900 border-2 flex items-center justify-center active:scale-95 transition-all ' + (currentTab === 'votes' ? 'bg-white/10 ' : '') + t.border + ' ' + t.text + ' ' + p.vibe.rounded}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>
            </button>
          )}
          <button onClick={() => setProfiloAperto(true)} title="Il tuo profilo" aria-label="Il tuo profilo"
            className={'w-9 h-9 bg-slate-900 border-2 flex items-center justify-center active:scale-95 transition-all ' + t.border + ' ' + t.text + ' ' + p.vibe.rounded}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
          </button>
          <button onClick={() => setActiveHubId(null)} title="Torna alla lobby" aria-label="Torna alla lobby"
            className={'w-9 h-9 bg-slate-900 border-2 flex items-center justify-center active:scale-95 transition-all ' + t.border + ' ' + t.text + ' ' + p.vibe.rounded}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
          </button>
        </div>
      </header>

      {profiloAperto && (
        <div onClick={() => setProfiloAperto(false)} className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-6" style={{ background: 'rgba(10,12,14,0.72)', backdropFilter: 'blur(6px)' }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-5 animate-[eg-fade-in_.22s_ease]"
            style={{ background: '#1C1F22', border: '1px solid rgba(163,181,133,0.28)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0" style={{ background: '#A3B585', color: '#1C1F22' }}>
                {(username ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-base truncate">{username ?? 'Ospite'}</p>
                <p className="text-[11px] font-bold" style={{ color: '#A3B585' }}>{isOwner ? 'Organizzatore' : 'Partecipante'}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-[12px]">
              {email && (
                <div className="flex items-start gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A3B585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
                  <span className="text-slate-300 break-all">{email}</span>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A3B585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                <span className="text-slate-300">{active.hub.name}</span>
              </div>
            </div>
            <button onClick={() => setProfiloAperto(false)} className="mt-5 w-full rounded-xl py-2.5 text-[12px] font-black active:scale-[0.98] transition-all" style={{ background: 'rgba(163,181,133,0.14)', color: '#A3B585' }}>
              Chiudi
            </button>
          </div>
        </div>
      )}
      {/* Swipe orizzontale = cambio tab. Il wrapper esterno porta il rimbalzo; l'interno l'animazione moduleIn. */}
      <div onTouchStart={onSwipeStart} onTouchMove={onSwipeMove} onTouchEnd={onSwipeEnd} onTouchCancel={onSwipeEnd} className="min-h-[calc(100vh-9rem)]" style={{ touchAction: 'pan-y', transform: 'translateX(' + nudgeX + 'px)', transition: 'transform .16s ease-out' }}>
        {/* key={currentTab}: rimonta il contenitore al cambio tab e fa ripartire l'animazione */}
        <div key={currentTab} className="relative p-4 animate-[moduleIn_.34s_cubic-bezier(.22,.61,.36,1)]">{render[currentTab]}</div>
      </div>

      <nav className={'fixed bottom-0 left-0 right-0 bg-slate-950/70 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around z-50' + (immersive ? ' hidden' : '')}>
        {mods.map((id) => (
          <button key={id} onClick={() => { navigator.vibrate?.(8); setTab(id); }} className={'flex-1 min-w-0 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-150 active:scale-95 ' + (currentTab === id ? t.text + ' bg-white/5' : 'text-slate-500')}>
            <span className="text-xl">{ICONS[id]}</span>
            <span className="text-[9px] font-black uppercase">{w.tabs[id]}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
