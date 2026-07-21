'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

export default function JoinHub({ onClose }: { onClose: () => void }) {
  const { refresh, setActiveHubId } = useHub();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleJoin = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setErr('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setErr('Sessione scaduta. Rientri.'); setBusy(false); return; }
    const res = await fetch('/api/hubs/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ passcode: code.trim() }),
    });
    const out = await res.json();
    if (!res.ok) { setErr(out.error ?? 'Codice non valido.'); setBusy(false); return; }
    await refresh();
    setActiveHubId(out.hub_id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-sm space-y-5">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
        <h1 className="text-2xl font-black text-white uppercase tracking-widest">Entra con codice</h1>
        <p className="text-slate-400 text-sm">Inserisca il codice invito che Le ha dato l'organizzatore.</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Codice invito"
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-xl tracking-[0.3em] outline-none" />
        <button onClick={handleJoin} disabled={busy || !code.trim()}
          className="w-full p-4 rounded-3xl font-black uppercase text-xs disabled:opacity-40"
          style={{ background: '#A3B585', color: '#14161A' }}>
          {busy ? 'Entro...' : 'Si unisca'}
        </button>
        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
      </div>
    </div>
  );
}
