'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Member = { user_id: string; username: string; role: string; avatar: string | null };

export default function Group({ hubId, theme, isOwner, archived, votesEnabled }: { hubId: string; theme: Theme; isOwner: boolean; archived: boolean; votesEnabled: boolean }) {
  const { userId, refresh, avatarUrl } = useHub();
  const [members, setMembers] = useState<Member[]>([]);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({ comments: 0, votesGiven: 0, votesReceived: 0 });
  const [locBusy, setLocBusy] = useState(false);

  const load = async () => {
    const { data: mem } = await supabase
      .from('hub_members').select('user_id, role, profiles ( username, avatar_url )').eq('hub_id', hubId);
    const list = (mem ?? []).map((m: any) => ({ user_id: m.user_id, role: m.role, username: m.profiles?.username ?? '???', avatar: m.profiles?.avatar_url ?? null }));
    setMembers(list);
    const me = list.find((m) => m.user_id === userId);
    if (me?.role === 'OWNER') {
      const { data: hub } = await supabase.from('hubs').select('passcode').eq('id', hubId).single();
      setPasscode(hub?.passcode ?? null);
    }
    if (userId) loadStats();
  };

  const loadStats = async () => {
    const [{ count: comments }, { count: given }, { count: received }] = await Promise.all([
      supabase.from('event_comments').select('*', { count: 'exact', head: true }).eq('hub_id', hubId).eq('user_id', userId),
      supabase.from('daily_votes').select('*', { count: 'exact', head: true }).eq('hub_id', hubId).eq('voter_id', userId),
      supabase.from('daily_votes').select('*', { count: 'exact', head: true }).eq('hub_id', hubId).eq('candidate_id', userId),
    ]);
    setStats({ comments: comments ?? 0, votesGiven: given ?? 0, votesReceived: received ?? 0 });
  };

  useEffect(() => { load(); }, [hubId, userId]);

  // Invia posizione: prende le coordinate GPS e apre WhatsApp col link mappa.
  const shareLocation = () => {
    if (!navigator.geolocation) { alert('Geolocalizzazione non disponibile su questo dispositivo.'); return; }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const maps = 'https://www.google.com/maps?q=' + latitude + ',' + longitude;
        const text = encodeURIComponent('La mia posizione: ' + maps);
        window.open('https://wa.me/?text=' + text, '_blank');
        setLocBusy(false);
      },
      () => { alert('Non ho ottenuto la posizione. Controlla di aver dato il permesso.'); setLocBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || uploadingAvatar) return;
    setUploadingAvatar(true);
    const path = userId + '/avatar.' + (file.name.split('.').pop() || 'jpg');
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { setUploadingAvatar(false); alert('Errore: ' + upErr.message); return; }
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
    setUploadingAvatar(false);
    await refresh(); load();
  };

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
    setMsg('Unito!'); setJoinCode(''); await refresh(); load();
  };

  const toggleArchive = async () => {
    const next = archived ? 'active' : 'archived';
    const label = archived ? 'Riaprire questo Hub?' : 'Concludere questo Hub? Diventera un ricordo in sola lettura.';
    if (!confirm(label)) return;
    const { error } = await supabase.from('hubs').update({ status: next }).eq('id', hubId);
    if (!error) await refresh();
  };

  const toggleVotes = async () => {
    const { error } = await supabase.from('hubs').update({ votes_enabled: !votesEnabled }).eq('id', hubId);
    if (!error) await refresh();
  };

  const Avatar = ({ url, name, size }: { url: string | null; name: string; size: string }) => (
    <div className={size + ' rounded-full bg-slate-800 flex items-center justify-center overflow-hidden font-black ' + theme.text}>
      {url ? <img src={url} className="w-full h-full object-cover" alt="" /> : name.charAt(0).toUpperCase()}
    </div>
  );

  const StatBox = ({ n, label }: { n: number; label: string }) => (
    <div className="flex-1 text-center">
      <p className={'text-xl font-black ' + theme.text}>{n}</p>
      <p className="text-[8px] uppercase text-slate-500 font-black tracking-wider">{label}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {archived && (
        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-black text-slate-300 tracking-widest">Hub archiviato - sola lettura</span>
        </div>
      )}

      <div className={'bg-slate-900 border ' + theme.border + ' rounded-2xl p-4'}>
        <div className="flex items-center gap-4">
          <Avatar url={avatarUrl} name="?" size="w-14 h-14" />
          <div className="flex-1">
            <p className="text-[10px] uppercase text-slate-400 font-black mb-1">La mia foto profilo</p>
            {!archived && (
              <label className={'inline-block bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold cursor-pointer ' + theme.text}>
                {uploadingAvatar ? 'Carico...' : 'Cambia foto'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatar} />
              </label>
            )}
          </div>
        </div>
        <div className="flex mt-4 pt-4 border-t border-slate-800">
          <StatBox n={stats.comments} label="Commenti" />
          <StatBox n={stats.votesGiven} label="Voti dati" />
          <StatBox n={stats.votesReceived} label="Voti ricevuti" />
        </div>
        <button onClick={shareLocation} disabled={locBusy}
          className="w-full mt-4 bg-slate-800 border border-slate-600 text-white py-2.5 rounded-xl font-black text-[11px] uppercase disabled:opacity-40">
          {locBusy ? 'Individuo...' : '\u{1F4CD} Invia la mia posizione'}
        </button>
      </div>

      <div>
        <h3 className="font-black uppercase text-white tracking-wider mb-3">Membri</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.user_id} className={'bg-slate-900 border ' + theme.border + ' rounded-2xl p-4 flex items-center justify-between'}>
              <div className="flex items-center gap-3">
                <Avatar url={m.avatar} name={m.username} size="w-9 h-9" />
                <span className="font-bold text-white text-sm">{m.username}{m.user_id === userId && <span className="text-slate-500 text-xs"> (tu)</span>}</span>
              </div>
              {m.role === 'OWNER' && <span className="text-[9px] uppercase font-black text-slate-400 bg-slate-950 px-2 py-1 rounded border border-white/5">Owner</span>}
            </div>
          ))}
        </div>
      </div>

      {isOwner && passcode && !archived && (
        <div className={'bg-slate-900 border ' + theme.border + ' rounded-2xl p-4'}>
          <p className="text-[10px] uppercase text-slate-400 font-black mb-2">Codice invito</p>
          <div className="bg-slate-950 rounded-xl p-3 text-center">
            <span className={'text-2xl font-black tracking-[0.3em] ' + theme.text}>{passcode}</span>
          </div>
        </div>
      )}

      {isOwner && !archived && (
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase text-slate-400 font-black">Modulo Voto</p>
            <p className="text-[10px] text-slate-500">{votesEnabled ? 'Attivo per questo Hub' : 'Disattivato'}</p>
          </div>
          <button onClick={toggleVotes}
            className={'text-[10px] uppercase font-black px-3 py-2 rounded-lg ' + (votesEnabled ? 'bg-slate-800 text-slate-300 border border-slate-600' : 'bg-gradient-to-r ' + theme.gradient + ' text-slate-950')}>
            {votesEnabled ? 'Disattiva' : 'Attiva'}
          </button>
        </div>
      )}

      {!archived && (
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] uppercase text-slate-400 font-black">Unisciti a un altro Hub</p>
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Codice invito"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none" />
          <button onClick={handleJoin} disabled={busy || !joinCode.trim()}
            className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase disabled:opacity-40'}>
            {busy ? 'Entro...' : 'Unisciti'}
          </button>
          {msg && <p className="text-center text-xs text-slate-300">{msg}</p>}
        </div>
      )}

      {isOwner && (
        <button onClick={toggleArchive}
          className={'w-full py-3 rounded-2xl font-black text-xs uppercase ' + (archived ? 'bg-gradient-to-r ' + theme.gradient + ' text-slate-950' : 'bg-slate-900 border border-red-500/30 text-red-400')}>
          {archived ? 'Riapri Hub' : 'Concludi Hub (archivia)'}
        </button>
      )}
    </div>
  );
}
