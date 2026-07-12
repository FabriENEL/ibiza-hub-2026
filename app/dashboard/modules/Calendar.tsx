'use client'
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '../lib/logEvent';
import { useHub } from '../lib/HubContext';
import { eventVisual, ruleSignature } from '../lib/eventVisuals';
import DateTimePicker from '../lib/DateTimePicker';
import type { Words } from '../lib/blueprints';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string | null; scheduled_at: string; location: string | null; created_by: string | null; reveal_at: string | null; revealed_override: boolean | null; revealed: boolean; cover_url: string | null };
type Comment = { id: string; event_id: string; user_id: string; content: string; author: string };
type Member = { user_id: string; username: string };

// Icone auto-esplicative: dicono cosa fanno senza bisogno di una scritta accanto.
const IconGear = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
    <path d="M21 12a8 8 0 0 1-8 8H8l-4 3v-4.5A8 8 0 1 1 21 12Z" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.6v.6" />
  </svg>
);

export default function Calendar({ hubId, theme, isOwner, archived, words, rounded }: { hubId: string; theme: Theme; isOwner: boolean; archived: boolean; words: Words; rounded: string }) {
  // NB: non si tocca il contesto da qui. Aggiornarlo rimonta la Shell, Calendar rinasce e perde lo stato del flip.
  const { userId, postAction } = useHub();
  const w = words;
  const r = rounded;
  const [events, setEvents] = useState<EventRow[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string>('MEMBER');
  const [ownerIds, setOwnerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [now, setNow] = useState(Date.now());

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [surprise, setSurprise] = useState(false);
  const [revealAt, setRevealAt] = useState('');
  const [audience, setAudience] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eWhen, setEWhen] = useState('');
  const [eWhere, setEWhere] = useState('');
  const [eSurprise, setESurprise] = useState(false);
  const [eRevealAt, setERevealAt] = useState('');
  const [eAudience, setEAudience] = useState<Set<string>>(new Set());

  // Il dettaglio non e' piu' un overlay a schermo pieno: la card GIRA e mostra il retro.
  // Niente schermo mezzo vuoto, niente intestazione da coprire: il dettaglio ha la misura del suo contenuto.
  const [flipped, setFlipped] = useState<string | null>(null);
  // I commenti vivono in un pannello che fluttua SOPRA la card, fuori dal 3D:
  // dentro una trasformazione 3D i campi di testo non ricevono il fuoco. Cosi' il flip resta puro.
  const [commentiFor, setCommentiFor] = useState<string | null>(null);
  const [panelShown, setPanelShown] = useState(false);
  const [backH, setBackH] = useState<Record<string, number>>({});
  const backRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [draft, setDraft] = useState('');
  const [editingC, setEditingC] = useState<string | null>(null);
  const [editCText, setEditCText] = useState('');
  // Menu impostazioni della card: raccoglie Modifica ed Elimina sotto una sola icona.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Evento appena creato: il calendario ci salta sopra e lo illumina. Nessuna caccia al tesoro dopo un'azione di Julie.
  const [freshId, setFreshId] = useState<string | null>(null);
  const freshRef = useRef<HTMLDivElement | null>(null);
  const idsRef = useRef<Set<string>>(new Set());

  const dayOf = (iso: string) => iso.split('T')[0];

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);

  const load = async (cercaNuovo = false) => {
    setLoading(true);
    const noti = new Set(idsRef.current);
    const { data: ev } = await supabase.from('events_view').select('id, title, scheduled_at, location, created_by, reveal_at, revealed_override, revealed, cover_url').eq('hub_id', hubId).order('scheduled_at', { ascending: true });
    const { data: cm } = await supabase.from('event_comments').select('id, event_id, user_id, content, profiles ( username )').eq('hub_id', hubId).order('created_at', { ascending: true });
    const { data: mem } = await supabase.from('hub_members').select('user_id, role, profiles ( username )').eq('hub_id', hubId);
    const evs = ev ?? [];
    setEvents(evs);
    idsRef.current = new Set(evs.map((e) => e.id));
    setComments((cm ?? []).map((c: any) => ({ id: c.id, event_id: c.event_id, user_id: c.user_id, content: c.content, author: c.profiles?.username ?? '???' })));
    const owners = new Set<string>((mem ?? []).filter((m: any) => m.role === 'OWNER').map((m: any) => m.user_id));
    setOwnerIds(owners);
    setMembers((mem ?? []).map((m: any) => ({ user_id: m.user_id, username: m.profiles?.username ?? '???' })));
    const me = (mem ?? []).find((m: any) => m.user_id === userId);
    setMyRole(me?.role ?? 'MEMBER');

    // Chi c'e ora e non c'era prima e' l'evento appena creato: ci si posiziona sopra e lo si illumina.
    const nuovo = cercaNuovo && noti.size > 0 ? evs.find((e) => !noti.has(e.id)) : undefined;
    if (nuovo) {
      setSelectedDay(dayOf(nuovo.scheduled_at));
      setFreshId(nuovo.id);
    } else {
      const days = Array.from(new Set(evs.map((e) => dayOf(e.scheduled_at)))).sort();
      if (days.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDay(days.includes(today) ? today : days[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);
  useEffect(() => { if (postAction?.module === 'calendar' && Date.now() - postAction.ts < 4000) load(true); }, [postAction]);

  // Porta in vista la card appena creata e lascia svanire l'evidenza: conferma visiva senza chiasso.
  useEffect(() => {
    if (!freshId) return;
    const t1 = setTimeout(() => freshRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    const t2 = setTimeout(() => setFreshId(null), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [freshId]);

// Misura i retri appena disegnati: la card nasce gia' della misura giusta, non cresce al tocco.
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      const m: Record<string, number> = {};
      Object.entries(backRefs.current).forEach(([id, el]) => {
        if (el) m[id] = el.scrollHeight;
      });
      setBackH((prev) => {
        const cambiato = Object.keys(m).some((k) => prev[k] !== m[k]);
        return cambiato ? { ...prev, ...m } : prev;
      });
    }, 60);
    return () => clearTimeout(t);
  }, [events, comments, selectedDay, loading]);

  const canManageEvent = (ev: EventRow) => {
    if (myRole === 'OWNER') return true;
    if (myRole === 'COOWNER') return !!ev.created_by && !ownerIds.has(ev.created_by);
    return false;
  };
  const canCreate = myRole === 'OWNER' || myRole === 'COOWNER';

  const toggleAudience = (set: Set<string>, setter: (s: Set<string>) => void, uid: string) => {
    const next = new Set(set); next.has(uid) ? next.delete(uid) : next.add(uid); setter(next);
  };

  const resetAdd = () => { setTitle(''); setWhen(''); setWhere(''); setSurprise(false); setRevealAt(''); setAudience(new Set()); setAdding(false); };

  const handleAddEvent = async () => {
    if (!title.trim() || !when || busy) return;
    if (surprise && revealAt && when && new Date(revealAt) > new Date(when)) { alert('Lo svelamento deve precedere l\'evento.'); return; }
    setBusy(true);
    // Copertina on-demand come Julie: solo se il titolo non ha gia' un'immagine-regola locale.
    let cover_url: string | null = null;
    if (ruleSignature(title.trim()) === '__none__') {
      try {
        const cr = await fetch('/api/cover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: title.trim() }) });
        const cd = await cr.json(); cover_url = cd.url ?? null;
      } catch { cover_url = null; }
    }
    const { error } = await supabase.from('events').insert({
      hub_id: hubId, title: title.trim(), scheduled_at: when, location: where.trim() || null, created_by: userId, cover_url,
      reveal_at: surprise ? (revealAt || null) : null,
      reveal_visible_to: surprise ? Array.from(audience) : [],
      revealed_override: null,
    });
    setBusy(false);
    if (!error) { logEvent('event_created', { surprise }, hubId); resetAdd(); load(); }
  };

  const startEdit = async (ev: EventRow) => {
    const { data } = await supabase.from('events').select('title, location, reveal_at, reveal_visible_to').eq('id', ev.id).single();
    setMenuFor(null);
    setEditId(ev.id);
    setETitle(data?.title ?? '');
    setEWhen(ev.scheduled_at.slice(0, 16));
    setEWhere(data?.location ?? '');
    setESurprise(!!ev.reveal_at);
    setERevealAt(ev.reveal_at ? ev.reveal_at.slice(0, 16) : '');
    setEAudience(new Set(data?.reveal_visible_to ?? []));
  };
  const saveEdit = async () => {
    if (!eTitle.trim() || !eWhen) return;
    if (eSurprise && eRevealAt && new Date(eRevealAt) > new Date(eWhen)) { alert('Lo svelamento deve precedere l\'evento.'); return; }
    const { error } = await supabase.from('events').update({
      title: eTitle.trim(), scheduled_at: eWhen, location: eWhere.trim() || null,
      reveal_at: eSurprise ? (eRevealAt || null) : null,
      reveal_visible_to: eSurprise ? Array.from(eAudience) : [],
      revealed_override: eSurprise ? undefined : null,
    }).eq('id', editId);
    if (!error) { setEditId(null); load(); }
  };
  const deleteEvent = async (id: string) => {
    setMenuFor(null);
    if (!confirm('Eliminare questo evento?')) return;
    await supabase.from('events').delete().eq('id', id);
    load();
  };

  const setOverride = async (id: string, val: boolean | null) => {
    await supabase.from('events').update({ revealed_override: val }).eq('id', id);
    if (val === true) logEvent('event_revealed', {}, hubId);
    load();
  };

  const navigateTo = (place: string) => window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(place), '_blank');
  // Scheda dell'attivita': nome + indirizzo insieme portano alla pagina del locale, con orari, telefono e recensioni.
  const schedaLocale = (titolo: string | null, place: string) => {
    const q = [titolo ?? '', place].filter(Boolean).join(' ');
    window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q), '_blank');
  };
  const myCommentOn = (eventId: string) => comments.find((c) => c.event_id === eventId && c.user_id === userId);
  const handlePostComment = async (eventId: string) => {
    if (!draft.trim() || !userId) return;
    const { error } = await supabase.from('event_comments').insert({ hub_id: hubId, event_id: eventId, user_id: userId, content: draft.trim() });
    if (!error) { setDraft(''); load(); }
  };
  const handleUpdateComment = async (id: string) => {
    if (!editCText.trim()) return;
    const { error } = await supabase.from('event_comments').update({ content: editCText.trim() }).eq('id', id);
    if (!error) { setEditingC(null); setEditCText(''); load(); }
  };
  const handleDeleteComment = async (id: string) => { await supabase.from('event_comments').delete().eq('id', id); load(); };

  const timeOf = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
  const dayLabel = (day: string) => { const d = new Date(day); const p = (n: number) => String(n).padStart(2, '0'); const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']; return p(d.getUTCDate()) + ' ' + mesi[d.getUTCMonth()]; };

  const countdown = (iso: string) => {
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return 'in svelamento...';
    const m = Math.floor(diff / 60000);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    if (h < 48) return h + 'h ' + (m % 60) + 'min';
    return Math.floor(h / 24) + ' giorni';
  };

  // Countdown all'inizio evento (distinto da quello di svelamento).
  const eventCountdown = (iso: string) => {
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return null;
    const m = Math.floor(diff / 60000);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    if (h < 48) return h + 'h ' + (m % 60) + 'min';
    return Math.floor(h / 24) + ' giorni';
  };

  if (loading) return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => <div key={i} className={'h-36 bg-slate-900 border border-white/5 animate-pulse ' + r} />)}
    </div>
  );

  const days = Array.from(new Set(events.map((e) => dayOf(e.scheduled_at)))).sort();
  const dayEvents = events.filter((e) => dayOf(e.scheduled_at) === selectedDay);

  // variantMap: per ogni evento, indice progressivo della sua firma-regola nel giorno => sfondi distinti a parita' di contesto.
  const variantMap = new Map<string, number>();
  {
    const seen = new Map<string, number>();
    dayEvents.forEach((e) => {
      const sig = (e.revealed && e.title) ? ruleSignature(e.title) : '__hidden__';
      const idx = seen.get(sig) ?? 0;
      variantMap.set(e.id, idx);
      seen.set(sig, idx + 1);
    });
  }

  // Altezza minima adattiva: pochi eventi -> cartoline scenografiche; molti -> piu' compatte.
  // Il retro puo' chiedere di piu': allora la card cresce, ma resta uguale su entrambe le facce.
  const n = dayEvents.length;
  const minH = 0;
  const titleSize = 'text-2xl';


  const gira = (id: string) => {
    setMenuFor(null);
    setFlipped(flipped === id ? null : id);
  };

  // Il pannello commenti sale dal basso come la chat di Julie: stesso velo, stessa dissolvenza.
  const apriCommenti = (id: string) => { setCommentiFor(id); setPanelShown(false); requestAnimationFrame(() => setPanelShown(true)); };
  const chiudiCommenti = () => { setPanelShown(false); setTimeout(() => { setCommentiFor(null); setDraft(''); setEditingC(null); }, 280); };


  const AudiencePicker = ({ selected, onToggle }: { selected: Set<string>; onToggle: (uid: string) => void }) => (
    <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
      <p className="text-[9px] uppercase text-slate-500 font-black">Chi puo' vedere in anticipo (oltre a te)</p>
      {members.filter((m) => m.user_id !== userId).map((m) => (
        <label key={m.user_id} className="flex items-center gap-2 text-xs text-white cursor-pointer">
          <input type="checkbox" checked={selected.has(m.user_id)} onChange={() => onToggle(m.user_id)} />
          {m.username}
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black uppercase text-white tracking-wider">{w.schedule}</h3>
        {canCreate && !archived && (
          <button onClick={() => setAdding(!adding)} className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase'}>{adding ? 'Annulla' : '+ Evento'}</button>
        )}
      </div>

      {days.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
          {days.map((d) => <button key={d} onClick={() => setSelectedDay(d)} className={'shrink-0 snap-start px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wide transition-all active:scale-95 ' + (selectedDay === d ? 'bg-gradient-to-r ' + theme.gradient + ' text-slate-950' : 'bg-slate-900 text-slate-400 border border-white/10')}>{dayLabel(d)}</button>)}
        </div>
      )}

      {canCreate && !archived && adding && (
        <div className={'eg-card-n p-4 space-y-3 ' + r}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo evento" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <DateTimePicker value={when} onChange={setWhen} />
          <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Luogo (opzionale)" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
            <input type="checkbox" checked={surprise} onChange={(e) => setSurprise(e.target.checked)} />
            <span className="font-black uppercase tracking-wide">Sorpresa</span>
          </label>
          {surprise && (
            <div className="space-y-2 pl-2 border-l-2 border-slate-700">
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-black mb-1">Svelamento automatico (opzionale)</p>
                <DateTimePicker value={revealAt} onChange={setRevealAt} />
              </div>
              <AudiencePicker selected={audience} onToggle={(u) => toggleAudience(audience, setAudience, u)} />
            </div>
          )}
          <button onClick={handleAddEvent} disabled={busy || !title.trim() || !when} className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase disabled:opacity-40'}>{busy ? 'Salvo...' : 'Salva'}</button>
        </div>
      )}

      {dayEvents.length === 0 ? (
        <p className="text-slate-500 text-center py-10 text-sm">{canCreate ? w.emptyEvents : 'Nessun evento in questa giornata.'}</p>
      ) : (
        <div className="space-y-3 overflow-y-auto snap-y snap-mandatory" style={{ height: 'calc(100dvh - 15.5rem)', scrollbarWidth: 'none' }}>
          {dayEvents.map((ev) => {
            const evComments = comments.filter((c) => c.event_id === ev.id);
            const editable = canManageEvent(ev) && !archived;
            const vis = ev.revealed && ev.title ? (ev.cover_url ? { image: ev.cover_url, gradient: 'from-slate-800 to-slate-900', icon: '', matched: true } : eventVisual(ev.title, variantMap.get(ev.id) ?? 0)) : { image: undefined, gradient: 'from-slate-700 to-slate-900', icon: '\u{1F512}', matched: true };
            const isSurprise = !!ev.reveal_at || ev.revealed_override !== null;
            const isFlip = flipped === ev.id;
            const evCd = eventCountdown(ev.scheduled_at);
            // Una misura sola per fronte e retro: la card non cresce quando gira.
            const cardH = Math.max(backH[ev.id] ?? 0, minH);

            // Il contenuto del retro, usato sia nella faccia 3D (durante la rotazione) sia da fermo (piatto).
            const retro = (
              <div ref={(el) => { backRefs.current[ev.id] = el; }} className="relative h-full overflow-y-auto">
                {vis.image && <img src={vis.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-[0.28] pointer-events-none" />}
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(20,22,26,0.70), rgba(20,22,26,0.88))' }} />

                <div className="relative z-10 p-4 space-y-3">
                  <div className="min-w-0 cursor-pointer active:opacity-70 transition-opacity" onClick={() => gira(ev.id)}>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500 font-black">{dayLabel(dayOf(ev.scheduled_at))} &middot; {timeOf(ev.scheduled_at)}</p>
                    <h4 className="text-lg font-black text-white uppercase leading-tight truncate">{ev.revealed ? ev.title : 'DATI OSCURATI'}</h4>
                  </div>

                  {ev.revealed && evCd && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Inizia tra</span>
                      <span className="text-xl font-black" style={{ color: '#A3B585' }}>{evCd}</span>
                    </div>
                  )}
                  {ev.revealed && !evCd && <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Evento iniziato</p>}
                  {!ev.revealed && <p className="text-[11px] text-slate-400">{ev.reveal_at ? 'Sblocco tra ' + countdown(ev.reveal_at) : 'In attesa di svelamento'}</p>}

                  {ev.revealed && (
                    <div className="space-y-2">
                      {ev.location && (
                        <button onClick={() => navigateTo(ev.location!)}
                          className="w-full py-3 rounded-xl font-black text-[12px] uppercase tracking-wide active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                          style={{ background: '#A3B585', color: '#14161A' }}>
                          <IconPin /> Portami l&igrave;
                        </button>
                      )}
                      {ev.location && (
                        <button onClick={() => schedaLocale(ev.title, ev.location!)}
                          className="w-full py-2.5 rounded-xl text-[11px] font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 border border-white/10 text-slate-400">
                          <IconInfo /> Orari, telefono e recensioni
                        </button>
                      )}
                      <button onClick={() => apriCommenti(ev.id)}
                        className="w-full py-2.5 rounded-xl text-[11px] font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 border border-white/10 text-slate-300">
                        <IconChat /> Commenti ({evComments.length})
                      </button>
                      {ev.location && <p className="text-[10px] text-slate-500 text-center truncate">{ev.location}</p>}
                    </div>
                  )}



                  {isOwner && isSurprise && !archived && (
                    <div className="flex gap-2 pt-1">
                      {ev.revealed_override !== true && <button onClick={() => setOverride(ev.id, true)} className={'text-[9px] uppercase font-black px-3 py-1.5 rounded bg-gradient-to-r ' + theme.gradient + ' text-slate-950'}>Svela ora</button>}
                      {ev.revealed_override !== false && <button onClick={() => setOverride(ev.id, false)} className="text-[9px] uppercase font-black px-3 py-1.5 rounded bg-slate-800 text-slate-300 border border-slate-600">Rinascondi</button>}
                      {ev.revealed_override !== null && <button onClick={() => setOverride(ev.id, null)} className="text-[9px] uppercase font-black px-3 py-1.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Auto</button>}
                    </div>
                  )}
                </div>

                <button onClick={() => gira(ev.id)} aria-label="Torna alla copertina" title="Torna alla copertina"
                  className="absolute bottom-0 right-0 w-11 h-11 active:opacity-60 transition-opacity">
                  <span aria-hidden className="absolute bottom-0 right-0"
                    style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 22px 22px', borderColor: 'transparent transparent rgba(163,181,133,0.55) transparent' }} />
                </button>
              </div>
            );

            return (
              <div key={ev.id} ref={ev.id === freshId ? freshRef : null}
                className={'eg-card border overflow-hidden transition-all duration-700 ' + (ev.id === freshId ? '' : theme.border) + ' ' + r}
                style={ev.id === freshId ? { borderColor: 'rgba(163,181,133,0.85)', boxShadow: '0 0 0 3px rgba(163,181,133,0.22), 0 14px 30px -10px rgba(0,0,0,0.8)' } : { boxShadow: '0 1px 2px rgba(0,0,0,0.45), 0 14px 30px -10px rgba(0,0,0,0.8)' }}>
                {editId === ev.id ? (
                  <div className="space-y-2 p-4">
                    <input value={eTitle} onChange={(e) => setETitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
                    <DateTimePicker value={eWhen} onChange={setEWhen} />
                    <input value={eWhere} onChange={(e) => setEWhere(e.target.value)} placeholder="Luogo" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input type="checkbox" checked={eSurprise} onChange={(e) => setESurprise(e.target.checked)} />
                      <span className="font-black uppercase">Sorpresa</span>
                    </label>
                    {eSurprise && (
                      <div className="space-y-2 pl-2 border-l-2 border-slate-700">
                        <DateTimePicker value={eRevealAt} onChange={setERevealAt} />
                        <AudiencePicker selected={eAudience} onToggle={(u) => toggleAudience(eAudience, setEAudience, u)} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className={'flex-1 bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2 rounded-lg font-black text-xs uppercase'}>Salva</button>
                      <button onClick={() => setEditId(null)} className="flex-1 bg-slate-800 text-white py-2 rounded-lg font-black text-xs uppercase">Annulla</button>
                    </div>
                  </div>
                ) : (
                  <div className="[perspective:1400px]">
                    <div className="relative w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
                      style={{ height: backH[ev.id] ? cardH + 'px' : 'calc(50% - 0.4rem)', transform: isFlip ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

                      {/* FRONTE: la copertina riempie tutta l'altezza. Nessun salto quando la card gira. */}
                      <div className={'absolute inset-0 [backface-visibility:hidden] overflow-hidden rounded-[inherit] ' + (isFlip ? 'pointer-events-none' : '')}>
                        <div onClick={() => gira(ev.id)} className="relative h-full flex flex-col justify-end p-4 bg-slate-800 cursor-pointer">
                          {vis.image && <img src={vis.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                          {!ev.revealed && <div aria-hidden className="absolute inset-0 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2.4s_ease-in-out_infinite]" /></div>}

                          {!ev.revealed && <span className={'absolute top-3 text-3xl drop-shadow-lg opacity-90 z-10 ' + (editable ? 'right-14' : 'right-3')}>{'\u{1F512}'}</span>}
                          <span className="absolute top-3 left-3 bg-black/50 text-white text-xs font-black px-2 py-1 rounded-lg z-10">{timeOf(ev.scheduled_at)}</span>

                          {editable && (
                            <div className="absolute top-3 right-3 z-20">
                              <button onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === ev.id ? null : ev.id); }}
                                aria-label="Impostazioni evento" title="Impostazioni evento"
                                className="w-9 h-9 rounded-full flex items-center justify-center bg-black/55 text-white/90 border border-white/15 backdrop-blur active:scale-90 transition-transform">
                                <IconGear />
                              </button>
                              {menuFor === ev.id && (
                                <div onClick={(e) => e.stopPropagation()} className="absolute top-11 right-0 w-36 rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#1C1F22' }}>
                                  <button onClick={(e) => { e.stopPropagation(); startEdit(ev); }} className="w-full text-left px-3 py-2.5 text-[11px] font-bold text-slate-200 active:bg-white/5">Modifica</button>
                                  <div className="h-px bg-white/10" />
                                  <button onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }} className="w-full text-left px-3 py-2.5 text-[11px] font-bold text-red-400 active:bg-red-500/10">Elimina</button>
                                </div>
                              )}
                            </div>
                          )}

                          <span aria-hidden className="absolute bottom-0 right-0 z-10"
                            style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 22px 22px', borderColor: 'transparent transparent rgba(163,181,133,0.55) transparent' }} />

                          <div className="relative z-10 pb-9">
                            <h4 className={'font-black text-white uppercase drop-shadow-lg leading-tight ' + titleSize}>{ev.revealed ? ev.title : 'DATI OSCURATI'}</h4>
                            {!ev.revealed && ev.reveal_at && <p className="text-[11px] text-white/90 font-bold mt-1 drop-shadow">Sblocco tra: {countdown(ev.reveal_at)}</p>}
                            {!ev.revealed && !ev.reveal_at && <p className="text-[11px] text-white/90 font-bold mt-1 drop-shadow">In attesa di svelamento</p>}
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 flex items-center px-4 py-2 bg-slate-900/80 border-t border-white/5 backdrop-blur-sm">
                            <span className="flex items-center gap-2.5 text-[11px] font-bold text-slate-300">
                              <span>{'\u{1F4AC}'} {evComments.length}</span>
                              {ev.revealed && ev.location && (
                                <button onClick={(e) => { e.stopPropagation(); navigateTo(ev.location!); }}
                                  aria-label="Naviga fin qui" title="Naviga fin qui"
                                  className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                                  style={{ background: '#A3B585', color: '#14161A' }}>
                                  <IconPin />
                                </button>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* RETRO durante la rotazione: solo visivo. A rotazione finita si atterra sul ramo piatto. */}
                      <div className={'absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden rounded-[inherit] ' + (isFlip ? '' : 'pointer-events-none')}>
                        {retro}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PANNELLO COMMENTI - fluttua sopra la card, fuori dal 3D. Stesso linguaggio della chat di Julie:
          velo scuro sfocato, superficie che sale dal basso, bolle salvia trasparenti. */}
      {commentiFor && (() => {
        const ev = events.find((e) => e.id === commentiFor);
        if (!ev) return null;
        const cs = comments.filter((c) => c.event_id === ev.id);
        const mine = myCommentOn(ev.id);
        return (
          <div onClick={chiudiCommenti}
            className={'fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ' + (panelShown ? 'opacity-100' : 'opacity-0')}>
            <div onClick={(e) => e.stopPropagation()}
              className={'w-full max-w-md max-h-[75vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 ease-out ' + (panelShown ? 'opacity-100' : 'opacity-0 translate-y-4 sm:scale-95')}
              style={{ background: 'rgba(20,22,26,0.82)', border: '1px solid rgba(163,181,133,0.22)' }}>

              <div className="flex items-center justify-between gap-3 p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500 font-black">Commenti</p>
                  <p className="text-white font-black text-sm truncate">{ev.title}</p>
                </div>
                <button onClick={chiudiCommenti} aria-label="Chiudi" className="text-slate-400 hover:text-white text-2xl leading-none shrink-0">&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {cs.length === 0 && <p className="text-[12px] text-slate-500 text-center py-6">Nessun commento. Rompa il ghiaccio.</p>}
                {cs.map((c) => {
                  const io = c.user_id === userId;
                  return (
                    <div key={c.id} className={'flex ' + (io ? 'justify-end' : 'justify-start')}>
                      <div className={'max-w-[82%] px-3.5 py-2.5 rounded-2xl ' + (io ? 'rounded-br-sm' : 'rounded-bl-sm')}
                        style={io
                          ? { background: 'rgba(163,181,133,0.16)', border: '1px solid rgba(163,181,133,0.3)' }
                          : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {!io && <p className={'text-[10px] font-black mb-0.5 ' + theme.text}>{c.author}</p>}
                        {editingC === c.id ? (
                          <div className="flex gap-2 items-center">
                            <input value={editCText} onChange={(e) => setEditCText(e.target.value)} autoFocus
                              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-[13px] text-white outline-none" />
                            <button onClick={() => handleUpdateComment(c.id)} className="text-[12px] font-black" style={{ color: '#A3B585' }}>OK</button>
                            <button onClick={() => { setEditingC(null); setEditCText(''); }} className="text-[12px] text-slate-500">Annulla</button>
                          </div>
                        ) : (
                          <>
                            <p className="text-[13px] text-slate-100 leading-relaxed">{c.content}</p>
                            {io && !archived && (
                              <div className="flex gap-3 mt-1.5 justify-end">
                                <button onClick={() => { setEditingC(c.id); setEditCText(c.content); }} className="text-[10px] text-slate-400 active:opacity-60">Modifica</button>
                                <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-red-400/80 active:opacity-60">Elimina</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!mine && !archived && (
                <div className="p-3 border-t flex gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) handlePostComment(ev.id); }}
                    placeholder="Scriva un commento..." autoFocus
                    className="flex-1 bg-slate-950/70 border border-slate-700 rounded-xl p-3 text-[13px] text-white outline-none" />
                  <button onClick={() => handlePostComment(ev.id)} disabled={!draft.trim()}
                    className="px-4 rounded-xl font-black text-[12px] disabled:opacity-40 active:scale-95 transition-transform"
                    style={{ background: '#A3B585', color: '#14161A' }}>Invia</button>
                </div>
              )}
              {mine && !archived && <p className="text-[10px] text-slate-500 text-center py-3">Ha gi&agrave; commentato questo evento.</p>}
              {archived && <p className="text-[10px] text-slate-500 text-center py-3">Archiviato - sola lettura</p>}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
