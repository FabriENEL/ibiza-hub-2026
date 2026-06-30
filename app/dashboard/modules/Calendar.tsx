'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string; description: string | null; scheduled_at: string; location: string | null };

export default function Calendar({ hubId, theme, isOwner }: { hubId: string; theme: Theme; isOwner: boolean }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events').select('id, title, description, scheduled_at, location')
      .eq('hub_id', hubId).order('scheduled_at', { ascending: true });
    setEvents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  const handleAdd = async () => {
    if (!title.trim() || !when || busy) return;
    setBusy(true);
    const { error } = await supabase.from('events').insert({
      hub_id: hubId, title: title.trim(), scheduled_at: when, location: where.trim() || null,
    });
    setBusy(false);
    if (!error) { setTitle(''); setWhen(''); setWhere(''); setAdding(false); load(); }
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
      time: d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (loading) return <p className="text-slate-500 text-center py-10">Carico gli eventi...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black uppercase text-white tracking-wider">Palinsesto</h3>
        {isOwner && (
          <button onClick={() => setAdding(!adding)}
            className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase'}>
            {adding ? 'Annulla' : '+ Evento'}
          </button>
        )}
      </div>

      {isOwner && adding && (
        <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo evento"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Luogo (opzionale)"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <button onClick={handleAdd} disabled={busy || !title.trim() || !when}
            className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase disabled:opacity-40'}>
            {busy ? 'Salvo...' : 'Salva evento'}
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-slate-500 text-center py-10 text-sm">{isOwner ? 'Nessun evento ancora. Aggiungine uno.' : 'L organizzatore non ha ancora inserito eventi.'}</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const f = fmt(ev.scheduled_at);
            return (
              <div key={ev.id} className={'bg-slate-900 border ' + theme.border + ' rounded-2xl p-4 flex gap-4 items-center'}>
                <div className="text-center shrink-0">
                  <div className={'text-lg font-black ' + theme.text}>{f.time}</div>
                  <div className="text-[10px] uppercase text-slate-500 font-bold">{f.day}</div>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <h4 className="font-black text-white uppercase text-sm">{ev.title}</h4>
                  {ev.location && <p className="text-[11px] text-slate-400">{ev.location}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
