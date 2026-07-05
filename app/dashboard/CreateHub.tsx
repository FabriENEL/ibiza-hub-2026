'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';
export default function CreateHub({ onClose }: { onClose: () => void }) {
  const { refresh, setActiveHubId } = useHub();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('travel');
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    if (endDate < startDate) { setErr('La data di fine non puo precedere quella di inizio.'); return; }
    setBusy(true); setErr('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setErr('Sessione scaduta. Rientra.'); setBusy(false); return; }
    const res = await fetch('/api/hubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({
        name: name.trim(), category, location: '-', start_date: startDate, end_date: endDate,
        max_participants: 5, passcode: Math.random().toString(36).slice(2, 8), creator_name: name.trim(),
      }),
    });
    const out = await res.json();
    if (!res.ok) { setErr(out.error ?? 'Creazione non riuscita.'); setBusy(false); return; }
    await refresh();
    setActiveHubId(out.hub_id);
  };
  const cats = [['travel','Viaggi'],['party','Feste'],['social','Social'],['corporate','Corporate']];
  const fld = 'w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none';
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-sm space-y-5">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
        <h1 className="text-2xl font-black text-white uppercase tracking-widest [font-family:var(--font-display)]">Nuovo Hub</h1>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome evento" className={fld} />
        <div className="grid gap-2">
          {cats.map(([id, label]) => (
            <button key={id} onClick={() => setCategory(id)}
              className={'text-left px-4 py-3 rounded-xl border transition-colors ' + (category === id ? 'bg-white/10 border-white text-white' : 'bg-slate-900 border-white/5 text-slate-300')}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase text-slate-400 font-black block mb-1">Inizio</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} className={fld + ' min-w-0'} />
          </div>
          <div>
            <label className="text-[10px] uppercase text-slate-400 font-black block mb-1">Fine</label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={fld + ' min-w-0'} />
          </div>
        </div>
        <button onClick={handleCreate} disabled={busy || !name.trim()}
          className="w-full bg-white text-slate-950 p-4 rounded-3xl font-black uppercase text-xs disabled:opacity-40 active:scale-[0.98] transition-transform">
          {busy ? 'Creazione...' : 'Crea Hub'}
        </button>
        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
      </div>
    </div>
  );
}
