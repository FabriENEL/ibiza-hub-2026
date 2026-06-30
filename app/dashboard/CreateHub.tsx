'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

export default function CreateHub({ onClose }: { onClose: () => void }) {
  const { refresh, setActiveHubId } = useHub();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('travel');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setErr('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setErr('Sessione scaduta. Rientra.'); setBusy(false); return; }
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch('/api/hubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({
        name: name.trim(), category, location: '-', start_date: today, end_date: today,
        max_participants: 5, passcode: Math.random().toString(36).slice(2, 8), creator_name: name.trim(),
      }),
    });
    const out = await res.json();
    if (!res.ok) { setErr(out.error ?? 'Creazione non riuscita.'); setBusy(false); return; }
    await refresh();
    setActiveHubId(out.hub_id);
  };

  const cats = [['travel','Viaggi'],['party','Feste'],['social','Social'],['corporate','Corporate']];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-sm space-y-5">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
        <h1 className="text-2xl font-black text-yellow-500 uppercase tracking-widest">Nuovo Hub</h1>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome evento"
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
        <div className="grid gap-2">
          {cats.map(([id, label]) => (
            <button key={id} onClick={() => setCategory(id)}
              className={'text-left px-4 py-3 rounded-xl border ' + (category === id ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' : 'bg-slate-900 border-white/5 text-slate-300')}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={handleCreate} disabled={busy || !name.trim()}
          className="w-full bg-yellow-500 text-slate-950 p-4 rounded-3xl font-black uppercase text-xs disabled:opacity-40">
          {busy ? 'Creazione...' : 'Crea Hub'}
        </button>
        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
      </div>
    </div>
  );
}
