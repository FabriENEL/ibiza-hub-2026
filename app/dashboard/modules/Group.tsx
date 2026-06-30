'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Member = { user_id: string; username: string; role: string };

export default function Group({ hubId, theme }: { hubId: string; theme: Theme }) {
  const { userId, refresh } = useHub();
  const [members, setMembers] = useState<Member[]>([]);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string>('MEMBER');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const { data: mem } = await supabase
      .from('hub_members').select('user_id, role, profiles ( username )').eq('hub_id', hubId);
    const list = (mem ?? []).map((m: any) => ({ user_id: m.user_id, role: m.role, username: m.profiles?.username ?? '???' }));
    setMembers(list);
    const me = list.find((m) => m.user_id === userId);
    setMyRole(me?.role ?? 'MEMBER');
    // Il passcode lo vede solo se serve mostrarlo (l'OWNER).
    if (me?.role === 'OWNER') {
      const { data: hub } = await supabase.from('hubs').select('passcode').eq('id', hubId).single();
      setPasscode(hub?.passcode ?? null);
    }
  };

  useEffect(() => { load(); }, [hubId, userId]);

  const handleJoin = async () => {
    if (!joinCode.trim() || busy) return;
    setBusy(true); setMsg('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setMsg('Sessione scaduta.'); setBusy(false); return; }
    const res = await fetch('/api/hubs/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ passcode: joinCode.trim() }),
    });
    const out = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(out.error ?? 'Errore.'); return; }
    setMsg('Unito! Aggiorno...');
    setJoinCode('');
    await refresh();
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-black uppercase text-white tracking-wider mb-3">Membri</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.user_id} className={'bg-slate-900 border ' + theme.border + ' rounded-2xl p-4 flex items-center justify-between'}>
              <div className="flex items-center gap-3">
                <div className={'w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-black ' + theme.text}>
                  {m.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-white text-sm">
                  {m.username}{m.user_id === userId && <span className="text-slate-500 text-xs"> (tu)</span>}
                </span>
              </div>
              {m.role === 'OWNER' && <span className="text-[9px] uppercase font-black text-slate-400 bg-slate-950 px-2 py-1 rounded border border-white/5">Owner</span>}
            </div>
          ))}
        </div>
      </div>

      {myRole === 'OWNER' && passcode && (
        <div className={'bg-slate-900 border ' + theme.border + ' rounded-2xl p-4'}>
          <p className="text-[10px] uppercase text-slate-400 font-black mb-2">Codice invito</p>
          <p className="text-slate-300 text-xs mb-3">Condividi questo codice con chi vuoi far entrare nell'Hub.</p>
          <div className="bg-slate-950 rounded-xl p-3 text-center">
            <span className={'text-2xl font-black tracking-[0.3em] ' + theme.text}>{passcode}</span>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] uppercase text-slate-400 font-black">Unisciti a un altro Hub</p>
        <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Inserisci codice invito"
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
        <button onClick={handleJoin} disabled={busy || !joinCode.trim()}
          className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase disabled:opacity-40'}>
          {busy ? 'Entro...' : 'Unisciti'}
        </button>
        {msg && <p className="text-center text-xs text-slate-300">{msg}</p>}
      </div>
    </div>
  );
}
