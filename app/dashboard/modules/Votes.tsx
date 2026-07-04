'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Member = { user_id: string; username: string; avatar: string | null };
type Vote = { voter_id: string; candidate_id: string };

export default function Votes({ hubId, theme, archived, isOwner, voteLabel }: { hubId: string; theme: Theme; archived: boolean; isOwner: boolean; voteLabel: string }) {
  const { userId, refresh } = useHub();
  const [members, setMembers] = useState<Member[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(voteLabel);
  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    const { data: mem } = await supabase.from('hub_members').select('user_id, profiles ( username, avatar_url )').eq('hub_id', hubId);
    const { data: vts } = await supabase.from('daily_votes').select('voter_id, candidate_id').eq('hub_id', hubId).eq('vote_date', today);
    setMembers((mem ?? []).map((m: any) => ({ user_id: m.user_id, username: m.profiles?.username ?? '???', avatar: m.profiles?.avatar_url ?? null })));
    setVotes((vts ?? []) as Vote[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  const myVote = votes.find((v) => v.voter_id === userId);

  const handleVote = async (candidateId: string) => {
    if (busy || !userId || archived) return;
    setBusy(true);
    const { error } = await supabase.from('daily_votes')
      .upsert({ hub_id: hubId, voter_id: userId, candidate_id: candidateId, vote_date: today }, { onConflict: 'voter_id,vote_date' });
    setBusy(false);
    if (!error) load();
  };

  const saveLabel = async () => {
    if (!labelDraft.trim()) return;
    const { error } = await supabase.from('hubs').update({ vote_label: labelDraft.trim() }).eq('id', hubId);
    if (!error) { setEditingLabel(false); await refresh(); }
  };

  const tally: Record<string, number> = {};
  votes.forEach((v) => { tally[v.candidate_id] = (tally[v.candidate_id] ?? 0) + 1; });
  const maxVotes = Math.max(0, ...Object.values(tally));
  if (loading) return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-slate-900 border border-white/5 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        {editingLabel ? (
          <div className="flex gap-2 justify-center items-center">
            <input value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} maxLength={40}
              className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white text-center outline-none" />
            <button onClick={saveLabel} className={'text-xs font-black ' + theme.text}>OK</button>
            <button onClick={() => { setEditingLabel(false); setLabelDraft(voteLabel); }} className="text-xs text-slate-500">Annulla</button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-black uppercase text-white tracking-wider">{voteLabel}</h3>
            {isOwner && !archived && <button onClick={() => setEditingLabel(true)} className="text-[9px] text-slate-500 uppercase">modifica</button>}
          </div>
        )}
        <p className="text-slate-400 text-xs mt-1">{archived ? 'Hub archiviato - votazioni chiuse' : 'Un voto al giorno. Puoi cambiarlo.'}</p>
      </div>
      <div className="space-y-2">
        {members.map((m) => {
          const count = tally[m.user_id] ?? 0;
          const isLeader = count > 0 && count === maxVotes;
          const iVotedThis = myVote?.candidate_id === m.user_id;
          const isMe = m.user_id === userId;
          return (
            <button key={m.user_id} onClick={() => !isMe && handleVote(m.user_id)} disabled={isMe || busy || archived}
              className={'relative overflow-hidden w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ' +
                (iVotedThis ? theme.border + ' bg-slate-800' : 'border-white/5 bg-slate-900') + ((isMe || archived) ? ' opacity-40' : '')}>
              <div aria-hidden className={'absolute left-0 top-0 bottom-0 bg-gradient-to-r ' + theme.gradient + ' opacity-[0.12] transition-all duration-500'} style={{ width: maxVotes > 0 ? (count / maxVotes) * 100 + '%' : '0%' }} />
              <div className="relative flex items-center gap-3">
                <div className={'w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden font-black ' + theme.text}>
                  {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" alt="" /> : m.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-white text-sm">{m.username}{isMe && <span className="text-slate-500 text-xs"> (tu)</span>}{iVotedThis && <span className={'text-xs ' + theme.text}> votato</span>}</span>
              </div>
              <div className="relative flex items-center gap-2">
                {isLeader && <span className="text-sm">{'\u{1F3C6}'}</span>}
                <span className={'font-black text-lg ' + (count > 0 ? theme.text : 'text-slate-600')}>{count}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}



