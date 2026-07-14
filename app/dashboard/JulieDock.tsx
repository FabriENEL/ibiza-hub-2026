'use client'
import { useEffect, useRef, useState } from 'react';
import { useHub } from './lib/HubContext';
import { getConfig } from './lib/blueprints';
import Julie from './Julie';
// Presenza persistente di J.U.L.I.E. dentro un Hub. Montata a livello pagina: galleggia SOPRA
// l'app, e' UNA sola, quindi la sua posizione sopravvive gia' al cambio sezione.
// Trascinabile ovunque (posizione salvata su localStorage globale); tap secco = apre; buttata
// oltre il bordo = si nasconde, e si richiama dal tasto Julie nella sezione Gruppo (openJulie).

const SIZE = 56;          // w-14/h-14
const TAP_SLOP = 8;       // sotto questa soglia di movimento e' un tap, non un drag
const M = 8;              // margine dai bordi quando resta in campo
const TOP_MIN = 72;       // sotto l'header
const BOT_GAP = 72;       // sopra la navbar
const POS_KEY = 'junction_julie_pos';   // preferenza di DISPOSITIVO: globale, non per-Hub
const HINT_KEY = 'junction_julie_hint'; // avviso una-volta-per-sessione

type Pos = { x: number; y: number };

export default function JulieDock() {
  const { activeHubId, memberships, julieOpen, openJulie, closeJulie } = useHub();
  const julieOn = process.env.NEXT_PUBLIC_JULIE_ENABLED === 'true';

  const [pos, setPos] = useState<Pos | null>(null);
  const [hidden, setHidden] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Sessione di drag: puntatore iniziale + origine della J + se ha superato la soglia di tap.
  const drag = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null);

  const clamp = (p: Pos): Pos => ({
    x: Math.min(Math.max(p.x, M), window.innerWidth - SIZE - M),
    y: Math.min(Math.max(p.y, TOP_MIN), window.innerHeight - SIZE - BOT_GAP),
  });
  const defaultPos = (): Pos => clamp({ x: window.innerWidth - SIZE - 16, y: window.innerHeight - SIZE - 96 });
  const readSaved = (): Pos => {
    try { const r = localStorage.getItem(POS_KEY); if (r) return clamp(JSON.parse(r)); } catch {}
    return defaultPos();
  };

  // Montaggio: posizione iniziale dal disco (o default). E clamp su rotazione/resize.
  useEffect(() => {
    setPos(readSaved());
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Scopribilita': l'avviso appare alla PRIMA comparsa della J nella sessione, non al primo drag,
  // cosi' l'utente sa subito che la puo' spostare e buttare fuori. Una sola volta per sessione.
  useEffect(() => {
    if (!activeHubId || !julieOn) return;
    try { if (!sessionStorage.getItem(HINT_KEY)) { sessionStorage.setItem(HINT_KEY, '1'); setShowHint(true); const t = setTimeout(() => setShowHint(false), 4600); return () => clearTimeout(t); } } catch {}
  }, [activeHubId, julieOn]);

  // Aprire Julie (anche dal tasto in Gruppo) la fa sempre riapparire: e' il richiamo, senza toccare altri file.
  useEffect(() => { if (julieOpen) setHidden(false); }, [julieOpen]);

  if (!activeHubId || !julieOn) return null;

  const active = memberships.find((m) => m.hub_id === activeHubId);
  const groupLabel = active ? getConfig(active.hub.category).blueprint.words.tabs.group : 'Gruppo';

  const endDrag = (): void => {
    const d = drag.current; drag.current = null; setDragging(false);
    if (!d) return;
    if (!d.moved) { openJulie(); return; }          // tap secco = apre
    setPos((p) => {
      if (!p) return p;
      const cx = p.x + SIZE / 2, cy = p.y + SIZE / 2;
      const out = cx < 0 || cx > window.innerWidth || cy < 0 || cy > window.innerHeight;
      if (out) { setHidden(true); return readSaved(); } // scuola A: torna all'ultimo posto comodo salvato
      const c = clamp(p);
      try { localStorage.setItem(POS_KEY, JSON.stringify(c)); } catch {}
      return c;
    });
  };

  const onDown = (e: React.PointerEvent) => {
    if (!pos) return;
    // Cattura sul BOTTONE (currentTarget), non sul figlio toccato: il puntatore resta agganciato
    // alla J per tutta la durata, cosi' nessun bordo e' sordo allo scroll (fix nascondimento a destra).
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP) return; // ancora dentro la soglia: potrebbe essere un tap
    if (!d.moved) { d.moved = true; setDragging(true); navigator.vibrate?.(6); }
    setPos({ x: d.ox + dx, y: d.oy + dy }); // durante il drag NON si clampa: si puo' uscire per nascondere
  };

  return (
    <>
      {!julieOpen && !hidden && pos && (
        <button
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
          aria-label="J.U.L.I.E. - tocca per aprire, trascina per spostare" title="Tocca per aprire - trascina per spostare - buttala fuori per nascondere"
          style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 90, touchAction: 'none' }}
          className={'w-14 h-14 rounded-full flex items-center justify-center select-none ' + (dragging ? 'cursor-grabbing scale-105' : 'cursor-grab active:scale-90 transition-transform')}>
          {!dragging && <>
            <span aria-hidden className="eg-ripple-ring absolute inset-0 rounded-full animate-[eg-ripple_2.2s_ease-out_infinite]" style={{ border: '2px solid rgba(34,197,94,0.85)' }} />
            <span aria-hidden className="eg-ripple-ring absolute inset-0 rounded-full animate-[eg-ripple_2.2s_ease-out_infinite]" style={{ border: '2px solid rgba(34,197,94,0.6)', animationDelay: '1.1s' }} />
          </>}
          <span className="relative w-full h-full rounded-full flex items-center justify-center"
            style={{ boxShadow: '0 0 18px -2px rgba(34,197,94,0.5), 0 6px 18px -6px rgba(0,0,0,0.6)', borderRadius: '9999px' }}>
            <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden>
              <circle cx="28" cy="28" r="26.7" fill="#1C1F23" stroke="#22C55E" strokeWidth="2.6" />
              <circle cx="28" cy="28" r="23.2" fill="#2E4030" />
              <g transform="translate(4,4) scale(2)" fill="none" stroke="#F2F4EF" strokeWidth="2.6" strokeLinecap="round">
                <path d="M11 6.8 H18.8" />
                <path d="M15.2 6.8 V13.6 C15.2 18.4 11 20.6 7.4 18.4" />
              </g>
              <path transform="translate(4,4) scale(2)" d="M15.2 10.6 C17.4 9.4 19.6 10 20.4 12 C18.2 13.2 16 12.6 15.2 10.6 Z" fill="#22C55E" />
            </svg>
          </span>
        </button>
      )}

      {showHint && !julieOpen && !hidden && (
        <div role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[86vw] px-3.5 py-2 rounded-xl text-[12px] leading-snug text-center animate-[eg-fade-in_.25s_ease]"
          style={{ zIndex: 91, background: '#262b2e', color: '#e9e7e1', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 6px 20px -8px rgba(0,0,0,0.6)' }}>
          Trascina la J per spostarla &middot; buttala fuori per nascondere &middot; la richiami da <b>{groupLabel}</b>
        </div>
      )}

      {julieOpen && <Julie onClose={closeJulie} hubId={activeHubId} />}
    </>
  );
}