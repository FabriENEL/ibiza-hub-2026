'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// DATASET COMPLETO IBIZA 2026 - CABLATO CON 32 ASSET LOCALI WEBP
const IBIZA_SCHEDULE = [
  { id: '1', date: '2026-06-02', time: '06:10', title: 'Decollo', location: 'Milano Malpensa', group: 'initial', imageUrl: '/images/01.webp' },
  { id: '2', date: '2026-06-02', time: '08:30', title: 'Atterraggio', location: 'Aeroporto Ibiza', group: 'initial', imageUrl: '/images/02.webp' },
  { id: '3', date: '2026-06-02', time: '10:00', title: 'Spesa cena e Weed', location: 'Indifferente', group: 'initial', imageUrl: '/images/03.webp' },
  { id: '4', date: '2026-06-02', time: '11:30', title: 'Aperitivo/Pranzo', location: 'Cala Jondal', group: 'initial', imageUrl: '/images/04.webp' },
  { id: '5', date: '2026-06-02', time: '14:00', title: 'Imbarco verso Formentera', location: 'Cala Jondal', group: 'initial', imageUrl: '/images/05.webp' },
  { id: '6', date: '2026-06-02', time: '15:30', title: 'Arrivo e giro spiagge', location: 'Formentera', group: 'initial', imageUrl: '/images/06.webp' },
  { id: '7', date: '2026-06-02', time: '20:00', title: 'Cena in Barca', location: 'Costa Nord Formentera', group: 'initial', imageUrl: '/images/07.webp' },
  { id: '8', date: '2026-06-02', time: '23:00', title: 'Sbarco e giro locali', location: 'Formentera', group: 'initial', imageUrl: '/images/08.webp' },
  
  { id: '9', date: '2026-06-03', time: '03:00', title: 'Rientro in barca e sbraco', location: 'El Beso', group: 'initial', imageUrl: '/images/09.webp' },
  { id: '10', date: '2026-06-03', time: '07:00', title: 'Decollo Secondo Gruppo', location: 'Milano Malpensa', group: 'second', imageUrl: '/images/10.webp' },
  { id: '11', date: '2026-06-03', time: '09:30', title: 'Atterraggio Secondo Gruppo', location: 'Aeroporto Ibiza', group: 'second', imageUrl: '/images/11.webp' },
  { id: '12', date: '2026-06-03', time: '09:30', title: 'Partenza verso Ibiza', location: 'Spiaggia El Beso', group: 'initial', imageUrl: '/images/12.webp' },
  { id: '13', date: '2026-06-03', time: '11:00', title: 'Arrivo a Ibiza', location: 'Cala Jondal', group: 'initial', imageUrl: '/images/13.webp' },
  { id: '14', date: '2026-06-03', time: '13:00', title: 'Check-in Villa', location: 'Zona Cala d\'Hort', group: 'second', imageUrl: '/images/14.webp' },
  { id: '15', date: '2026-06-03', time: '13:00', title: 'Partenza verso Villa', location: 'Cala Jondal', group: 'initial', imageUrl: '/images/15.webp' },
  { id: '16', date: '2026-06-03', time: '13:30', title: 'Arrivo in Villa', location: 'Zona Cala d\'Hort', group: 'initial', imageUrl: '/images/16.webp' },
  { id: '17', date: '2026-06-03', time: '14:00', title: 'REUNION E PRANZO', location: 'Cala d\'Hort', group: 'all', imageUrl: '/images/17.webp' },
  { id: '18', date: '2026-06-03', time: '17:00', title: 'Spesa per Grigliata', location: 'Zona Cala d\'Hort', group: 'all', imageUrl: '/images/18.webp' },
  { id: '19', date: '2026-06-03', time: '18:00', title: 'Rientro Villa e Doccia', location: 'Zona Cala d\'Hort', group: 'all', imageUrl: '/images/19.webp' },
  { id: '20', date: '2026-06-03', time: '20:00', title: 'Aperitivo + Cena Leuci', location: 'Playa d\'en Bossa', group: 'all', imageUrl: '/images/20.webp' },
  
  { id: '21', date: '2026-06-04', time: '00:00', title: 'SERATA DC10', location: 'DC 10', group: 'all', imageUrl: '/images/21.webp' },
  { id: '22', date: '2026-06-04', time: '04:00', title: 'Rientro Villa e Sbraco', location: 'Zona Cala d\'Hort', group: 'all', imageUrl: '/images/22.webp' },
  { id: '23', date: '2026-06-04', time: '15:00', title: 'Grigliata Lunga e Piscina', location: 'Villa', group: 'all', imageUrl: '/images/23.webp' },
  { id: '24', date: '2026-06-04', time: '20:00', title: 'Preserata', location: 'Villa', group: 'all', imageUrl: '/images/24.webp' },
  { id: '25', date: '2026-06-04', time: '23:00', title: 'Da Decidersi', location: 'Ibiza', group: 'all', imageUrl: '/images/25.webp' },
  
  { id: '26', date: '2026-06-05', time: '03:00', title: 'Rientro Villa e Sbraco', location: 'Zona Cala d\'Hort', group: 'all', imageUrl: '/images/26.webp' },
  { id: '27', date: '2026-06-05', time: '12:00', title: 'Colazione Hangover', location: 'Villa', group: 'all', imageUrl: '/images/27.webp' },
  { id: '28', date: '2026-06-05', time: '15:00', title: 'Spiaggia e Mare', location: 'Cala Tarida', group: 'all', imageUrl: '/images/28.webp' },
  { id: '29', date: '2026-06-05', time: '17:00', title: 'Aperitivo Finale', location: 'Cala Tarida', group: 'all', imageUrl: '/images/29.webp' },
  { id: '30', date: '2026-06-05', time: '20:30', title: 'Partenza Aeroporto', location: 'Cala Tarida', group: 'all', imageUrl: '/images/30.webp' },
  { id: '31', date: '2026-06-05', time: '21:15', title: 'Arrivo Aeroporto', location: 'Ibiza', group: 'all', imageUrl: '/images/31.webp' },
  { id: '32', date: '2026-06-05', time: '22:55', title: 'Decollo', location: 'Aeroporto Ibiza', group: 'all', imageUrl: '/images/32.webp' }
];

const GROUP_1 = ["Fabri", "Alessandro", "Teo", "Edo", "Cimmi", "Lori"];
const GROUP_2 = ["Chri", "Maicol", "Nello", "Bibi", "Fiore", "Corra"];
const ALL_PARTICIPANTS = [...GROUP_1, ...GROUP_2];

export default function Dashboard() {
  const [user, setUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [now, setNow] = useState(new Date());
  
  const [activeCommentEvent, setActiveCommentEvent] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [allComments, setAllComments] = useState<any[]>([]);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Nuovi stati per la logica Sballato del Giorno
  const [todayVotes, setTodayVotes] = useState<any[]>([]);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [votedCandidate, setVotedCandidate] = useState<string | null>(null);

  const router = useRouter();

  const fetchData = async () => {
    // Recupero Recensioni
    const { data: comments } = await supabase.from('event_comments').select('*').order('created_at', { ascending: true });
    if (comments) setAllComments(comments);

    // Recupero Voti Odierni
    const todayISO = new Date().toISOString().split('T')[0];
    const { data: votes } = await supabase.from('daily_sballato_votes').select('*').eq('vote_date', todayISO);
    
    if (votes) {
      setTodayVotes(votes);
      
      const userLogged = localStorage.getItem('ibiza_user');
      const userVote = votes.find(v => v.voter_name === userLogged);
      
      if (userVote) {
        setHasVotedToday(true);
        setVotedCandidate(userVote.candidate_name);
      } else {
        setHasVotedToday(false);
        setVotedCandidate(null);
      }
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('ibiza_user');
    if (!savedUser) router.push('/');
    else setUser(savedUser);

    fetchData();

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [router]);

  if (!user) return <div className="bg-slate-950 min-h-screen" />;

  const isGroup1 = GROUP_1.includes(user);
  const isAle = user === 'Alessandro';

  const handlePostComment = async (eventId: string) => {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from('event_comments').insert([{ event_id: eventId, author_name: user, content: commentText }]);
    if (error) {
      if (error.code === '23505') alert("Violazione protocollo: Hai già inserito una recensione per questo evento.");
      else alert("Errore di comunicazione con il database.");
      return;
    }
    setCommentText(''); setActiveCommentEvent(null); fetchData();
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('event_comments').delete().eq('id', commentId);
    fetchData();
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    await supabase.from('event_comments').update({ content: editCommentText }).eq('id', commentId);
    setEditingCommentId(null); setEditCommentText(''); fetchData();
  };

  const handleVoteSballato = async (candidateName: string) => {
    if (!user || hasVotedToday) return;
    const todayISO = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('daily_sballato_votes')
      .insert([{ voter_name: user, candidate_name: candidateName, vote_date: todayISO }]);

    if (!error) fetchData();
  };

  // Funzione di rimozione voto (Reset)
  const handleRemoveVote = async () => {
    if (!user) return;
    const todayISO = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('daily_sballato_votes')
      .delete()
      .match({ voter_name: user, vote_date: todayISO });

    if (!error) fetchData();
  };

  const ibizaDays = ['2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];

  const calculateDailyLeaders = () => {
    if (todayVotes.length === 0) return [];
    const voteCounts: Record<string, number> = {};
    todayVotes.forEach(v => {
      voteCounts[v.candidate_name] = (voteCounts[v.candidate_name] || 0) + 1;
    });
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    return Object.keys(voteCounts).filter(k => voteCounts[k] === maxVotes);
  };
  const dailyLeaders = calculateDailyLeaders();

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24 font-sans">
      <header className="p-6 border-b border-slate-800 bg-slate-900/80 sticky top-0 backdrop-blur-xl z-50 flex justify-between items-center">
        <div>
          <h2 className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.3em]">Operazione Ibiza</h2>
          <p className="text-lg font-bold tracking-tight">Accesso: {user}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black">
          {user[0]}
        </div>
      </header>

      <div className="p-4 space-y-6">
        
        {/* VIEW: CALENDARIO */}
        {activeTab === 'calendar' && (
          <div className="space-y-8">
            {ibizaDays.map((dateString) => {
              const dayEvents = IBIZA_SCHEDULE.filter(e => e.date === dateString);
              const visibleEventsForDay = dayEvents.filter(event => {
                if (event.group === 'initial' && !isGroup1) return false;
                if (event.group === 'second' && isGroup1 && !isAle) return false; 
                return true;
              });

              if (visibleEventsForDay.length === 0) return null;

              const dayLabel = `${dateString.split('-')[2]} GIUGNO`;

              return (
                <div key={dateString} className="space-y-4">
                  <div className="pb-2 border-b border-slate-800 mt-2">
                    <h3 className="text-yellow-500 font-black uppercase tracking-[0.2em] text-sm">
                      {dayLabel}
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {visibleEventsForDay.map((event) => {
                      const eventDateTime = new Date(`${event.date}T${event.time}:00`);
                      const unlockTime = new Date(eventDateTime.getTime() + (60 * 60 * 1000));
                      const isHidden = isAle && now < unlockTime;
                      const eventComments = allComments.filter(c => c.event_id === event.id);

                      return (
                        <div key={event.id} className={`overflow-hidden rounded-2xl border transition-all ${isHidden ? 'border-slate-800 bg-slate-900/40' : 'border-slate-800 bg-slate-900 shadow-xl'}`}>
                          <div className="h-32 w-full bg-slate-800 relative">
                            {isHidden ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                                <span className="text-slate-700 font-mono text-4xl font-black">(???)</span>
                              </div>
                            ) : (
                              <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover opacity-60" />
                            )}
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md border border-white/10">
                              <span className="text-yellow-500 font-mono font-bold text-xs">{event.time}</span>
                            </div>
                          </div>

                          <div className="p-5">
                            <h3 className={`text-xl font-black uppercase tracking-tight ${isHidden ? 'text-slate-600' : 'text-white'}`}>
                              {isHidden ? 'Dati Oscurati' : event.title}
                            </h3>
                            <p className="text-sm text-slate-400 mt-1 font-medium">📍 {isHidden ? '(???)' : event.location}</p>

                            {isHidden && (
                              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex justify-between items-center">
                                <span className="text-xs uppercase font-bold text-yellow-600">Sblocco dati tra:</span>
                                <span className="font-mono font-black text-yellow-500">{Math.max(0, Math.ceil((unlockTime.getTime() - now.getTime()) / 60000))} min</span>
                              </div>
                            )}

                            {!isHidden && (
                              <div className="mt-5 pt-4 border-t border-slate-800/50">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Recensioni Evento</span>
                                  <button 
                                    onClick={() => setActiveCommentEvent(activeCommentEvent === event.id ? null : event.id)}
                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md text-white transition-colors"
                                  >
                                    {activeCommentEvent === event.id ? 'Annulla' : '+ Aggiungi'}
                                  </button>
                                </div>

                                {eventComments.length > 0 ? (
                                  <div className="mb-4 space-y-2">
                                    {eventComments.map(c => {
                                      const isMyComment = c.author_name === user;
                                      const isEditing = editingCommentId === c.id;

                                      return (
                                        <div key={c.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] text-yellow-500 uppercase font-bold tracking-wider">{c.author_name}</span>
                                            {isMyComment && !isEditing && (
                                              <div className="flex gap-2">
                                                <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }} className="text-[9px] text-slate-400 hover:text-yellow-500 uppercase font-bold">Modifica</button>
                                                <button onClick={() => handleDeleteComment(c.id)} className="text-[9px] text-slate-400 hover:text-red-500 uppercase font-bold">Elimina</button>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {isEditing ? (
                                            <div className="flex gap-2 mt-2">
                                              <input 
                                                type="text" 
                                                value={editCommentText}
                                                onChange={(e) => setEditCommentText(e.target.value)}
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-yellow-500 outline-none"
                                              />
                                              <button onClick={() => handleUpdateComment(c.id)} className="bg-yellow-500 text-black px-2 py-1 rounded font-bold text-[10px] uppercase">Salva</button>
                                              <button onClick={() => setEditingCommentId(null)} className="bg-slate-800 text-white px-2 py-1 rounded font-bold text-[10px] uppercase">Annulla</button>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-slate-300 mt-1">{c.content}</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-600 italic mb-4">Nessuna recensione registrata per questo evento.</div>
                                )}

                                {activeCommentEvent === event.id && (
                                  <div className="flex gap-2 animate-in fade-in">
                                    <input 
                                      type="text" 
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      placeholder="Scrivi una recensione..." 
                                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 outline-none"
                                    />
                                    <button onClick={() => handlePostComment(event.id)} className="bg-yellow-500 text-black px-4 rounded-lg font-bold text-xs uppercase">Invia</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW: COMPARI */}
        {activeTab === 'compari' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl mb-6">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-yellow-600 font-bold mb-2">Classifica Odierna: Sballato del Giorno</h4>
              {dailyLeaders.length > 0 ? (
                <p className="text-lg font-black text-yellow-500">{dailyLeaders.join(' & ')} <span className="text-sm text-slate-400 font-normal ml-2">in testa</span></p>
              ) : (
                <p className="text-sm text-slate-400 italic">Nessun voto registrato oggi.</p>
              )}
            </div>

            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-300 mb-6">Directory Compari</h3>
            
            {ALL_PARTICIPANTS.map(p => {
              const isMe = user === p;
              const isExpanded = expandedUser === p;
              const votesReceivedToday = todayVotes.filter(v => v.candidate_name === p).length;
              const isMyVotedCandidate = votedCandidate === p;

              return (
                <div key={p} className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden transition-all">
                  <div 
                    onClick={() => setExpandedUser(isExpanded ? null : p)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-800 border-2 border-slate-700 rounded-full flex items-center justify-center text-xl font-black text-slate-400 relative overflow-hidden group">
                        {p[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          {p} {isMe && <span className="text-[9px] bg-yellow-500 text-black px-2 py-0.5 rounded uppercase">Tu</span>}
                        </h4>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                          {GROUP_1.includes(p) ? 'Gruppo 1 - Testimoni/Sposo' : 'Gruppo 2 - Amici'}
                        </p>
                      </div>
                    </div>
                    <div className="text-slate-600 font-mono text-xl">{isExpanded ? '-' : '+'}</div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-slate-950/50 border-t border-slate-800 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase">Recensioni</p>
                          <p className="text-xl font-black">{allComments.filter(c => c.author_name === p).length}</p>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase">Voti Sballato (Oggi)</p>
                          <p className="text-xl font-black text-yellow-500">{votesReceivedToday}</p>
                        </div>
                      </div>

                      {isMe ? (
                        <label className="flex items-center justify-center w-full p-3 border border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-yellow-500 hover:text-yellow-500 transition-colors">
                          <span className="text-xs uppercase font-bold tracking-widest text-slate-400">Carica Nuova Foto Profilo</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => alert('Interfaccia upload pronta. Preparazione bucket Cloudinary in corso.')} />
                        </label>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleVoteSballato(p)}
                            disabled={hasVotedToday}
                            className={`flex-1 ${hasVotedToday ? 'bg-slate-800 opacity-30 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'} border border-slate-700 text-slate-400 text-xs font-bold py-3 rounded-xl uppercase transition-all`}
                          >
                            {hasVotedToday ? 'Voto Espresso' : 'Vota come Sballato'}
                          </button>
                          
                          {/* Pulsante Reset Voto: visibile solo se l'utente ha votato questo specifico candidato */}
                          {isMyVotedCandidate && (
                            <button 
                              onClick={handleRemoveVote}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold py-3 px-4 rounded-xl uppercase transition-all"
                            >
                              Ritira Voto
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 p-4 flex justify-around items-center z-50">
        {[
          { id: 'calendar', label: 'Missione' },
          { id: 'compari', label: 'Compari' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[10px] uppercase font-black tracking-widest transition-all px-4 py-2 rounded-full ${activeTab === tab.id ? 'bg-yellow-500 text-black scale-105' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </main>
  );
}