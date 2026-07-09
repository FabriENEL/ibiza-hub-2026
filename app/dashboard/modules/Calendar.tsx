'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '../lib/logEvent';
import { useHub } from '../lib/HubContext';
import { eventVisual, ruleSignature } from '../lib/eventVisuals';
import DateTimePicker from '../lib/DateTimePicker';
import type { Words } from '../lib/blueprints';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string | null; scheduled_at: string; location: string | null; created_by: string | null; reveal_at: string | null; revealed_override: boolean | null; revealed: boolean };
type Comment = { id: string; event_id: string; user_id: string; content: string; author: string };
type Member = { user_id: string; username: string };

export default function Calendar({ hubId, theme, isOwner, archived, words, rounded }: { hubId: string; theme: Theme; isOwner: boolean; archived: boolean; words: Words; rounded: string }) {
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

  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editingC, setEditingC] = useState<string | null>(null);
  const [editCText, setEditCText] = useState('');

  const dayOf = (iso: string) => iso.split('T')[0];

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);

  const load = async () => {
    setLoading(true);
    const { data: ev } = await supabase.from('events_view').select('id, title, scheduled_at, location, created_by, reveal_at, revealed_override, revealed').eq('hub_id', hubId).order('scheduled_at', { ascending: true });
    const { data: cm } = await supabase.from('event_comments').select('id, event_id, user_id, content, profiles ( username )').eq('hub_id', hubId).order('created_at', { ascending: true });
    const { data: mem } = await supabase.from('hub_members').select('user_id, role, profiles ( username )').eq('hub_id', hubId);
    const evs = ev ?? [];
    setEvents(evs);
    setComments((cm ?? []).map((c: any) => ({ id: c.id, event_id: c.event_id, user_id: c.user_id, content: c.content, author: c.profiles?.username ?? '???' })));
    const owners = new Set<string>((mem ?? []).filter((m: any) => m.role === 'OWNER').map((m: any) => m.user_id));
    setOwnerIds(owners);
    setMembers((mem ?? []).map((m: any) => ({ user_id: m.user_id, username: m.profiles?.username ?? '???' })));
    const me = (mem ?? []).find((m: any) => m.user_id === userId);
    setMyRole(me?.role ?? 'MEMBER');
    const days = Array.from(new Set(evs.map((e) => dayOf(e.scheduled_at)))).sort();
    if (days.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDay(days.includes(today) ? today : days[0]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);
  useEffect(() => { if (postAction?.module === 'calendar' && Date.now() - postAction.ts < 4000) load(); }, [postAction]);

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
    const { error } = await supabase.from('events').insert({
      hub_id: hubId, title: title.trim(), scheduled_at: when, location: where.trim() || null, created_by: userId,
      reveal_at: surprise ? (revealAt || null) : null,
      reveal_visible_to: surprise ? Array.from(audience) : [],
      revealed_override: null,
    });
    setBusy(false);
    if (!error) { logEvent('event_created', { surprise }, hubId); resetAdd(); load(); }
  };

  const startEdit = async (ev: EventRow) => {
    const { data } = await supabase.from('events').select('title, location, reveal_at, reveal_visible_to').eq('id', ev.id).single();
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

  // Altezza cartolina adattiva: pochi eventi -> scenografici; molti -> compatti (min 4 in viewport).
  const n = dayEvents.length;
  const bannerH = n <= 1 ? 'h-56' : n === 2 ? 'h-44' : n === 3 ? 'h-36' : 'h-24';
  const titleSize = n <= 2 ? 'text-2xl' : n === 3 ? 'text-xl' : 'text-base';

  // Evento espanso (overlay). vis ricalcolato qui perche' fuori dal map.
  const xp = openEvent ? events.find((e) => e.id === openEvent) ?? null : null;
  const xpVis = xp ? (xp.revealed && xp.title ? eventVisual(xp.title, variantMap.get(xp.id) ?? 0) : { image: undefined, gradient: 'from-slate-700 to-slate-900', icon: '\u{1F512}', matched: true }) : null;
  const xpComments = xp ? comments.filter((c) => c.event_id === xp.id) : [];
  const xpMine = xp ? myCommentOn(xp.id) : undefined;
  const xpCd = xp ? eventCountdown(xp.scheduled_at) : null;

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
        <div className="space-y-3">
          {dayEvents.map((ev) => {
            const evComments = comments.filter((c) => c.event_id === ev.id);
            const editable = canManageEvent(ev) && !archived;
            const vis = ev.revealed && ev.title ? eventVisual(ev.title, variantMap.get(ev.id) ?? 0) : { image: undefined, gradient: 'from-slate-700 to-slate-900', icon: '\u{1F512}', matched: true };
            const isSurprise = !!ev.reveal_at || ev.revealed_override !== null;

            return (
              <div key={ev.id} className={'eg-card border ' + theme.border + ' overflow-hidden ' + r}>
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
                  <>
                    <div onClick={() => setOpenEvent(ev.id)} className={'relative flex flex-col justify-end p-4 bg-slate-800 cursor-pointer active:scale-[0.99] transition-transform ' + bannerH}>
                      {vis.image && <img src={vis.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      {!ev.revealed && <div aria-hidden className="absolute inset-0 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2.4s_ease-in-out_infinite]" /></div>}
                      <span className="absolute top-3 right-3 text-4xl drop-shadow-lg opacity-90 z-10">{vis.icon}</span>
                      <span className="absolute top-3 left-3 bg-black/50 text-white text-xs font-black px-2 py-1 rounded-lg z-10">{timeOf(ev.scheduled_at)}</span>
                      <div className="relative z-10">
                        <h4 className={'font-black text-white uppercase drop-shadow-lg leading-tight ' + titleSize}>{ev.revealed ? ev.title : 'DATI OSCURATI'}</h4>
                        {!ev.revealed && ev.reveal_at && (
                          <p className="text-[11px] text-white/90 font-bold mt-1 drop-shadow">Sblocco tra: {countdown(ev.reveal_at)}</p>
                        )}
                        {!ev.revealed && !ev.reveal_at && (
                          <p className="text-[11px] text-white/90 font-bold mt-1 drop-shadow">In attesa di svelamento</p>
                        )}
                        <p className="text-[10px] text-white/80 font-bold mt-1 drop-shadow">{'\u{1F4AC}'} {evComments.length} {evComments.length === 1 ? 'commento' : 'commenti'}</p>
                      </div>
                      {editable && (
                        <div className="absolute bottom-3 right-3 flex gap-2 z-10">
                          <button onClick={(e) => { e.stopPropagation(); startEdit(ev); }} className="text-[9px] uppercase text-white font-black bg-black/50 px-2 py-1 rounded drop-shadow">Modifica</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }} className="text-[9px] uppercase text-white font-black bg-red-600/70 px-2 py-1 rounded">Elimina</button>
                        </div>
                      )}
                    </div>

                    {isOwner && isSurprise && !archived && (
                      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex gap-2">
                        {ev.revealed_override !== true && (
                          <button onClick={() => setOverride(ev.id, true)} className={'text-[9px] uppercase font-black px-3 py-1.5 rounded bg-gradient-to-r ' + theme.gradient + ' text-slate-950'}>Svela ora</button>
                        )}
                        {ev.revealed_override !== false && (
                          <button onClick={() => setOverride(ev.id, false)} className="text-[9px] uppercase font-black px-3 py-1.5 rounded bg-slate-800 text-slate-300 border border-slate-600">Rinascondi</button>
                        )}
                        {ev.revealed_override !== null && (
                          <button onClick={() => setOverride(ev.id, null)} className="text-[9px] uppercase font-black px-3 py-1.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Auto</button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SCHERMATA EVENTO ESPANSA - stile post social */}
      {xp && xpVis && (
        <div className="fixed inset-0 bg-slate-950 z-[100] overflow-y-auto" onClick={() => { setOpenEvent(null); setDraft(''); setEditingC(null); }}>
          <div onClick={(e) => e.stopPropagation()}>
            <div className="relative h-72">
              {xpVis.image && <img src={xpVis.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              {!xpVis.image && <div className={'absolute inset-0 bg-gradient-to-br ' + ('gradient' in xpVis ? xpVis.gradient : '')} />}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/30 to-black/20" />
              {!xp.revealed && <div aria-hidden className="absolute inset-0 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2.4s_ease-in-out_infinite]" /></div>}
              <button onClick={() => { setOpenEvent(null); setDraft(''); setEditingC(null); }} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 text-white font-black text-sm backdrop-blur z-10 active:scale-95 transition-transform">{'\u2190'}</button>
              <span className="absolute top-4 right-4 text-5xl drop-shadow-lg z-10">{xpVis.icon}</span>
              <div className="absolute bottom-4 left-5 right-5 z-10">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-black">{dayLabel(dayOf(xp.scheduled_at))} \u00B7 {timeOf(xp.scheduled_at)}</p>
                <h2 className="text-3xl font-black text-white uppercase leading-tight drop-shadow-lg [font-family:var(--font-display)]">{xp.revealed ? xp.title : 'DATI OSCURATI'}</h2>
              </div>
            </div>

            <div className="p-5 space-y-4 pb-16">
              {xpCd && xp.revealed && (
                <div className={'eg-card border ' + theme.border + ' p-4 text-center ' + r}>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Inizia tra</p>
                  <p className={'text-3xl font-black ' + theme.text}>{xpCd}</p>
                </div>
              )}
              {!xpCd && xp.revealed && (
                <div className={'eg-card-n p-3 text-center ' + r}>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Evento iniziato</p>
                </div>
              )}
              {!xp.revealed && (
                <div className={'eg-card-n p-4 text-center ' + r}>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">{xp.reveal_at ? 'Sblocco tra' : 'In attesa di svelamento'}</p>
                  {xp.reveal_at && <p className="text-2xl font-black text-white">{countdown(xp.reveal_at)}</p>}
                </div>
              )}

              {xp.revealed && xp.location && (
                <button onClick={() => navigateTo(xp.location!)} className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-4 rounded-2xl font-black text-sm uppercase tracking-wide active:scale-[0.98] transition-transform'}>
                  {'\u{1F4CD}'} Portami a {xp.location}
                </button>
              )}

              {xp.revealed && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-3">Commenti ({xpComments.length})</h3>
                  <div className="space-y-2">
                    {xpComments.length === 0 && <p className="text-xs text-slate-500">Nessun commento. Rompa il ghiaccio.</p>}
                    {xpComments.map((c) => (
                      <div key={c.id} className="eg-card-n rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className={'text-[10px] font-black ' + theme.text}>{c.author}</span>
                          {c.user_id === userId && !archived && editingC !== c.id && (
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingC(c.id); setEditCText(c.content); }} className="text-[9px] text-slate-400">Modifica</button>
                              <button onClick={() => handleDeleteComment(c.id)} className="text-[9px] text-red-500">Elimina</button>
                            </div>
                          )}
                        </div>
                        {editingC === c.id ? (
                          <div className="flex gap-2 mt-1">
                            <input value={editCText} onChange={(e) => setEditCText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white outline-none" />
                            <button onClick={() => handleUpdateComment(c.id)} className={'text-xs font-black ' + theme.text}>OK</button>
                          </div>
                        ) : <p className="text-xs text-slate-200 mt-1">{c.content}</p>}
                      </div>
                    ))}
                    {!xpMine && !archived && (
                      <div className="flex gap-2 mt-2">
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Il tuo commento..." className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
                        <button onClick={() => handlePostComment(xp.id)} disabled={!draft.trim()} className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 px-4 rounded-lg font-black text-xs disabled:opacity-40'}>Invia</button>
                      </div>
                    )}
                    {archived && <p className="text-[10px] text-slate-500 text-center pt-1">Archiviato - sola lettura</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






