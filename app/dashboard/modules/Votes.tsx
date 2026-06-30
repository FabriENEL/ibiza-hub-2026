'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Member = { user_id: string; username: string };
type Vote = { voter_id: string; candidate_id: string };

export default function Votes({ hubId, theme }: { hubId: string; theme: Theme }) {
  const { userId } = useHub();
  const [members, setMembers] = useState<Member[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    const { data: mem } = await supabase
      .from('hub_members').select('user_id, profiles ( username )').eq('hub_id', hubId);
    const { data: vts } = await supabase
      .from('daily_votes').select('voter_id, candidate_id').eq('hub_id', hubId).eq('vote_date', today);
    setMembers((mem ?? []).map((m: any) => ({ user_id: m.user_id, username: m.profiles?.username ?? '???' })));
    setVotes((vts ?? []) as Vote[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  // Il mio voto di oggi, se c'e'.
  const myVote = votes.find((v) => v.voter_id === userId);

  const handleVote = async (candidateId: string) => {
    if (busy || !userId) return;
    setBusy(true);
    // "Cambio idea": inserisci, e se ho gia' votato oggi, aggiorna la riga esistente.
    // onConflict sulla coppia (voter_id, vote_date) = il vincolo di un-voto-al-giorno.
    const { error } = await supabase.from('daily_votes')
      .upsert(
        { hub_id: hubId, voter_id: userId, candidate_id: candidateId, vote_date: today },
        { onConflict: 'voter_id,vote_date' }
      );
    setBusy(false);
    if (!error) load();
  };

  // Conteggio voti per candidato.
  const tally: Record<string, number> = {};
  votes.forEach((v) => { tally[v.candidate_id] = (tally[v.candidate_id] ?? 0) + 1; });
  const maxVotes = Math.max(0, ...Object.values(tally));

  const nameOf = (uid: string) => members.find((m) => m.user_id === uid)?.username ?? '???';

  if (loading) return <p className="text-slate-500 text-center py-10">Carico...</p>;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-black uppercase text-white tracking-wider">Voto del giorno</h3>
        <p className="text-slate-400 text-xs mt-1">Un voto al giorno. Puoi cambiarlo finche la giornata e aperta.</p>
      </div>

      <div className="space-y-2">
        {members.map((m) => {
          const count = tally[m.user_id] ?? 0;
          const isLeader = count > 0 && count === maxVotes;
          const iVotedThis = myVote?.candidate_id === m.user_id;
          const isMe = m.user_id === userId;
          return (
            <button key={m.user_id} onClick={() => !isMe && handleVote(m.user_id)} disabled={isMe || busy}
              className={'w-full flex items-center justify-between p-4 rounded-2xl border transition-all ' +
                (iVotedThis ? theme.border + ' bg-slate-800' : 'border-white/5 bg-slate-900') +
                (isMe ? ' opacity-40' : '')}>
              <div className="flex items-center gap-3">
                <div className={'w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-black ' + theme.text}>
                  {m.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-white text-sm">
                  {m.username}{isMe && <span className="text-slate-500 text-xs"> (tu)</span>}
                  {iVotedThis && <span className={'text-xs ' + theme.text}> votato</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
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
