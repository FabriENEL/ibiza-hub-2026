'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Member = { user_id: string; username: string; role: string; avatar: string | null };

export default function Group({ hubId, theme, isOwner, archived }: { hubId: string; theme: Theme; isOwner: boolean; archived: boolean }) {
  const { userId, refresh, avatarUrl } = useHub();
  const [members, setMembers] = useState<Member[]>([]);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
  };

  useEffect(() => { load(); }, [hubId, userId]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || uploadingAvatar) return;
    setUploadingAvatar(true);
    const path = userId + '/avatar.' + (file.name.split('.').pop() || 'jpg');
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { setUploadingAvatar(false); alert('Errore: ' + upErr.message); return; }
    // Cache-busting: aggiungo un timestamp cosi il browser ricarica la nuova foto.
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
    setUploadingAvatar(false);
    await refresh();
    load();
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

  const Avatar = ({ url, name, size }: { url: string | null; name: string; size: string }) => (
    <div className={size + ' rounded-full bg-slate-800 flex items-center justify-center overflow-hidden font-black ' + theme.text}>
      {url ? <img src={url} className="w-full h-full object-cover" alt="" /> : name.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div className="space-y-5">
      {archived && (
        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-black text-slate-300 tracking-widest">Hub archiviato - sola lettura</span>
        </div>
      )}

      {!archived && (
        <div className={'bg-slate-900 border ' + theme.border + ' rounded-2xl p-4 flex items-center gap-4'}>
          <Avatar url={avatarUrl} name="?" size="w-14 h-14" />
          <div className="flex-1">
            <p className="text-[10px] uppercase text-slate-400 font-black mb-1">La mia foto profilo</p>
            <label className={'inline-block bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold cursor-pointer ' + theme.text}>
              {uploadingAvatar ? 'Carico...' : 'Cambia foto'}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatar} />
            </label>
          </div>
        </div>
      )}

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
