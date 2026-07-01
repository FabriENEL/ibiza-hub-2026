'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';
import type { Persona } from '../lib/personas';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string; scheduled_at: string; location: string | null; created_by: string | null };
type Comment = { id: string; event_id: string; user_id: string; content: string; author: string };

export default function Calendar({ hubId, theme, isOwner, archived, persona }: { hubId: string; theme: Theme; isOwner: boolean; archived: boolean; persona: Persona }) {
  const { userId } = useHub();
  const w = persona.words;
  const r = persona.vibe.rounded;
  const [events, setEvents] = useState<EventRow[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [myRole, setMyRole] = useState<string>('MEMBER');
  const [ownerIds, setOwnerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('');

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eWhen, setEWhen] = useState('');
  const [eWhere, setEWhere] = useState('');

  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editingC, setEditingC] = useState<string | null>(null);
  const [editCText, setEditCText] = useState('');

  const dayOf = (iso: string) => iso.split('T')[0];

  const load = async () => {
    setLoading(true);
    const { data: ev } = await supabase.from('events').select('id, title, scheduled_at, location, created_by').eq('hub_id', hubId).order('scheduled_at', { ascending: true });
    const { data: cm } = await supabase.from('event_comments').select('id, event_id, user_id, content, profiles ( username )').eq('hub_id', hubId).order('created_at', { ascending: true });
    const { data: mem } = await supabase.from('hub_members').select('user_id, role').eq('hub_id', hubId);
    const evs = ev ?? [];
    setEvents(evs);
    setComments((cm ?? []).map((c: any) => ({ id: c.id, event_id: c.event_id, user_id: c.user_id, content: c.content, author: c.profiles?.username ?? '???' })));
    const owners = new Set<string>((mem ?? []).filter((m: any) => m.role === 'OWNER').map((m: any) => m.user_id));
    setOwnerIds(owners);
    const me = (mem ?? []).find((m: any) => m.user_id === userId);
    setMyRole(me?.role ?? 'MEMBER');

    // Giornate uniche dell'Hub.
    const days = Array.from(new Set(evs.map((e) => dayOf(e.scheduled_at)))).sort();
    if (days.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDay(days.includes(today) ? today : days[0]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  const canManageEvent = (ev: EventRow) => {
    if (myRole === 'OWNER') return true;
    if (myRole === 'COOWNER') return !(ev.created_by && ownerIds.has(ev.created_by)); // non tocca eventi del fondatore
    return false;
  };
  const canCreate = myRole === 'OWNER' || myRole === 'COOWNER';

  const handleAddEvent = async () => {
    if (!title.trim() || !when || busy) return;
    setBusy(true);
    const { error } = await supabase.from('events').insert({ hub_id: hubId, title: title.trim(), scheduled_at: when, location: where.trim() || null, created_by: userId });
    setBusy(false);
    if (!error) { setTitle(''); setWhen(''); setWhere(''); setAdding(false); load(); }
  };

  const startEdit = (ev: EventRow) => {
    setEditId(ev.id); setETitle(ev.title);
    setEWhen(ev.scheduled_at.slice(0, 16)); setEWhere(ev.location ?? '');
  };
  const saveEdit = async () => {
    if (!eTitle.trim() || !eWhen) return;
    const { error } = await supabase.from('events').update({ title: eTitle.trim(), scheduled_at: eWhen, location: eWhere.trim() || null }).eq('id', editId);
    if (!error) { setEditId(null); load(); }
  };
  const deleteEvent = async (id: string) => {
    if (!confirm('Eliminare questo evento?')) return;
    await supabase.from('events').delete().eq('id', id);
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

  if (loading) return <p className="text-slate-500 text-center py-10">Carico...</p>;

  const days = Array.from(new Set(events.map((e) => dayOf(e.scheduled_at)))).sort();
  const dayEvents = events.filter((e) => dayOf(e.scheduled_at) === selectedDay);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black uppercase text-white tracking-wider">{w.schedule}</h3>
        {canCreate && !archived && (
          <button onClick={() => setAdding(!adding)} className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase'}>{adding ? 'Annulla' : '+ Evento'}</button>
        )}
      </div>

      {days.length > 1 && (
        <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full bg-slate-900 text-white border border-white/10 p-3 rounded-xl font-bold uppercase text-xs outline-none">
          {days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
        </select>
      )}

      {canCreate && !archived && adding && (
        <div className={'bg-slate-900 border border-white/5 p-4 space-y-3 ' + r}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo evento" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Luogo (opzionale)" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <button onClick={handleAddEvent} disabled={busy || !title.trim() || !when} className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase disabled:opacity-40'}>{busy ? 'Salvo...' : 'Salva'}</button>
        </div>
      )}

      {dayEvents.length === 0 ? (
        <p className="text-slate-500 text-center py-10 text-sm">{canCreate ? w.emptyEvents : 'Nessun evento in questa giornata.'}</p>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((ev) => {
            const evComments = comments.filter((c) => c.event_id === ev.id);
            const mine = myCommentOn(ev.id);
            const isOpen = openEvent === ev.id;
            const editable = canManageEvent(ev) && !archived;
            return (
              <div key={ev.id} className={'bg-slate-900 border ' + theme.border + ' p-4 ' + r}>
                {editId === ev.id ? (
                  <div className="space-y-2">
                    <input value={eTitle} onChange={(e) => setETitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
                    <input type="datetime-local" value={eWhen} onChange={(e) => setEWhen(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
                    <input value={eWhere} onChange={(e) => setEWhere(e.target.value)} placeholder="Luogo" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className={'flex-1 bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2 rounded-lg font-black text-xs uppercase'}>Salva</button>
                      <button onClick={() => setEditId(null)} className="flex-1 bg-slate-800 text-white py-2 rounded-lg font-black text-xs uppercase">Annulla</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-4 items-center">
                      <div className="text-center shrink-0"><div className={'text-lg font-black ' + theme.text}>{timeOf(ev.scheduled_at)}</div></div>
                      <div className="border-l border-slate-700 pl-4 flex-1">
                        <h4 className="font-black text-white uppercase text-sm">{ev.title}</h4>
                        {ev.location && <button onClick={() => navigateTo(ev.location!)} className={'inline-flex items-center gap-1 mt-1 text-[11px] ' + theme.text + ' hover:underline'}>{'\u{1F4CD}'} {ev.location} <span className="text-[9px] opacity-70">(naviga)</span></button>}
                      </div>
                      {editable && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => startEdit(ev)} className="text-[9px] uppercase text-slate-400 font-black">Modifica</button>
                          <button onClick={() => deleteEvent(ev.id)} className="text-[9px] uppercase text-red-500 font-black">Elimina</button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <button onClick={() => { setOpenEvent(isOpen ? null : ev.id); setDraft(''); }} className="text-[10px] uppercase font-black text-slate-400">Commenti ({evComments.length}) {isOpen ? '\u25B2' : '\u25BC'}</button>
                      {isOpen && (
                        <div className="mt-3 space-y-2">
                          {evComments.map((c) => (
                            <div key={c.id} className="bg-slate-950 rounded-lg p-2.5 border border-white/5">
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
                                  <input value={editCText} onChange={(e) => setEditCText(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white outline-none" />
                                  <button onClick={() => handleUpdateComment(c.id)} className={'text-xs font-black ' + theme.text}>OK</button>
                                </div>
                              ) : <p className="text-xs text-slate-200 mt-1">{c.content}</p>}
                            </div>
                          ))}
                          {!mine && !archived && (
                            <div className="flex gap-2 mt-2">
                              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Il tuo commento..." className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
                              <button onClick={() => handlePostComment(ev.id)} disabled={!draft.trim()} className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 px-4 rounded-lg font-black text-xs disabled:opacity-40'}>Invia</button>
                            </div>
                          )}
                          {archived && <p className="text-[10px] text-slate-500 text-center pt-1">Archiviato - sola lettura</p>}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
