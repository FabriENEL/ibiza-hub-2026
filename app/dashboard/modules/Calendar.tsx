'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string; description: string | null; scheduled_at: string; location: string | null };
type Comment = { id: string; event_id: string; user_id: string; content: string; author: string };

export default function Calendar({ hubId, theme, isOwner, archived }: { hubId: string; theme: Theme; isOwner: boolean; archived: boolean }) {
  const { userId } = useHub();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: ev } = await supabase
      .from('events').select('id, title, description, scheduled_at, location')
      .eq('hub_id', hubId).order('scheduled_at', { ascending: true });
    const { data: cm } = await supabase
      .from('event_comments').select('id, event_id, user_id, content, profiles ( username )')
      .eq('hub_id', hubId).order('created_at', { ascending: true });
    setEvents(ev ?? []);
    setComments((cm ?? []).map((c: any) => ({ id: c.id, event_id: c.event_id, user_id: c.user_id, content: c.content, author: c.profiles?.username ?? '???' })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  const handleAddEvent = async () => {
    if (!title.trim() || !when || busy) return;
    setBusy(true);
    const { error } = await supabase.from('events').insert({ hub_id: hubId, title: title.trim(), scheduled_at: when, location: where.trim() || null });
    setBusy(false);
    if (!error) { setTitle(''); setWhen(''); setWhere(''); setAdding(false); load(); }
  };

  // Naviga: apre le mappe verso il luogo dell'evento (link universale Android/iOS).
  const navigateTo = (place: string) => {
    const url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(place);
    window.open(url, '_blank');
  };

  const myCommentOn = (eventId: string) => comments.find((c) => c.event_id === eventId && c.user_id === userId);

  const handlePostComment = async (eventId: string) => {
    if (!draft.trim() || !userId) return;
    const { error } = await supabase.from('event_comments').insert({ hub_id: hubId, event_id: eventId, user_id: userId, content: draft.trim() });
    if (!error) { setDraft(''); load(); }
  };

  const handleUpdateComment = async (id: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from('event_comments').update({ content: editText.trim() }).eq('id', id);
    if (!error) { setEditing(null); setEditText(''); load(); }
  };

  const handleDeleteComment = async (id: string) => { await supabase.from('event_comments').delete().eq('id', id); load(); };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    return { day: pad(d.getUTCDate()) + ' ' + mesi[d.getUTCMonth()], time: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) };
  };

  if (loading) return <p className="text-slate-500 text-center py-10">Carico gli eventi...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black uppercase text-white tracking-wider">Palinsesto</h3>
        {isOwner && !archived && (
          <button onClick={() => setAdding(!adding)}
            className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase'}>
            {adding ? 'Annulla' : '+ Evento'}
          </button>
        )}
      </div>

      {isOwner && !archived && adding && (
        <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo evento"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Luogo (opzionale)"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <button onClick={handleAddEvent} disabled={busy || !title.trim() || !when}
            className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase disabled:opacity-40'}>
            {busy ? 'Salvo...' : 'Salva evento'}
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-slate-500 text-center py-10 text-sm">{isOwner ? 'Nessun evento ancora.' : 'L organizzatore non ha ancora inserito eventi.'}</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const f = fmt(ev.scheduled_at);
            const evComments = comments.filter((c) => c.event_id === ev.id);
            const mine = myCommentOn(ev.id);
            const isOpen = openEvent === ev.id;
            return (
              <div key={ev.id} className={'bg-slate-900 border ' + theme.border + ' rounded-2xl p-4'}>
                <div className="flex gap-4 items-center">
                  <div className="text-center shrink-0">
                    <div className={'text-lg font-black ' + theme.text}>{f.time}</div>
                    <div className="text-[10px] uppercase text-slate-500 font-bold">{f.day}</div>
                  </div>
                  <div className="border-l border-slate-700 pl-4 flex-1">
                    <h4 className="font-black text-white uppercase text-sm">{ev.title}</h4>
                    {ev.location && (
                      <button onClick={() => navigateTo(ev.location!)}
                        className={'inline-flex items-center gap-1 mt-1 text-[11px] ' + theme.text + ' hover:underline'}>
                        {'\u{1F4CD}'} {ev.location} <span className="text-[9px] opacity-70">(naviga)</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800">
                  <button onClick={() => { setOpenEvent(isOpen ? null : ev.id); setDraft(''); }}
                    className="text-[10px] uppercase font-black text-slate-400">
                    Commenti ({evComments.length}) {isOpen ? '\u25B2' : '\u25BC'}
                  </button>

                  {isOpen && (
                    <div className="mt-3 space-y-2">
                      {evComments.map((c) => (
                        <div key={c.id} className="bg-slate-950 rounded-lg p-2.5 border border-white/5">
                          <div className="flex justify-between items-center">
                            <span className={'text-[10px] font-black ' + theme.text}>{c.author}</span>
                            {c.user_id === userId && !archived && editing !== c.id && (
                              <div className="flex gap-2">
                                <button onClick={() => { setEditing(c.id); setEditText(c.content); }} className="text-[9px] text-slate-400">Modifica</button>
                                <button onClick={() => handleDeleteComment(c.id)} className="text-[9px] text-red-500">Elimina</button>
                              </div>
                            )}
                          </div>
                          {editing === c.id ? (
                            <div className="flex gap-2 mt-1">
                              <input value={editText} onChange={(e) => setEditText(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white outline-none" />
                              <button onClick={() => handleUpdateComment(c.id)} className={'text-xs font-black ' + theme.text}>OK</button>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-200 mt-1">{c.content}</p>
                          )}
                        </div>
                      ))}

                      {!mine && !archived && (
                        <div className="flex gap-2 mt-2">
                          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Il tuo commento..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none" />
                          <button onClick={() => handlePostComment(ev.id)} disabled={!draft.trim()}
                            className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 px-4 rounded-lg font-black text-xs disabled:opacity-40'}>Invia</button>
                        </div>
                      )}

                      {archived && <p className="text-[10px] text-slate-500 text-center pt-1">Hub archiviato - sola lettura</p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
