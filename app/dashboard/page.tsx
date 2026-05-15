'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// --- COSTANTI E DATI (ESTERNI) ---
const GROUP_1 = ["Fabri", "Alessandro", "Teo", "Edo", "Cimmi", "Lori"];
const GROUP_2 = ["Chri", "Maicol", "Nello", "Bibi", "Fiore", "Corra"];
const ALL_PARTICIPANTS = [...GROUP_1, ...GROUP_2];
const IBIZA_DAYS = ['2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];

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

const IBIZA_NEWS = [
  { date: '02 GIUGNO 2026', events: [{ club: 'Cafè Mambo', name: 'Sunset Sessions & Live DJ', details: 'Aperitivo al tramonto dalle 18:00.' }, { club: 'Pacha Ibiza', name: 'Chris Stussy presents USS', details: 'Ingresso dalle 23:00.' }] },
  { date: '03 GIUGNO 2026', events: [{ club: 'Las Dalias', name: 'Night Market & Acoustic Live', details: 'Dalle 19:00.' }, { club: 'Ushuaïa', name: 'Tomorrowland Pres. Dimitri Vegas', details: 'Dalle 17:00.' }, { club: 'Amnesia', name: 'Amnesia Trance Ibiza', details: 'Ingresso dalle 23:59.' }] },
  { date: '04 GIUGNO 2026', events: [{ club: 'Pikes Ibiza', name: 'Pikes House Party', details: 'Selezione rigorosa. Dalle 20:00.' }, { club: 'Ibiza Rocks', name: 'Live Performance', details: 'Dalle 14:00 alle 21:00.' }, { club: 'Amnesia', name: 'Do Not Sleep', details: 'Ingresso dalle 23:00.' }] },
  { date: '05 GIUGNO 2026', events: [{ club: 'O Beach', name: 'Pool Party', details: 'Dalle 13:00.' }, { club: 'Ushuaïa', name: 'Calvin Harris', details: 'Ingresso dalle 17:00.' }, { club: 'Lío Ibiza', name: 'Dinner & Cabaret', details: 'Marina Botafoch.' }] }
];

const DAYTIME_ACTIVITIES = [
  { name: 'Noleggio Gommoni', location: 'Sant Antoni', details: 'Fino a 15cv senza patente.' },
  { name: 'E-Bike Tour', location: 'Costa Nord', details: 'Percorsi sterrati panoramici.' },
  { name: 'Sa Trinxa', location: 'Las Salinas', details: 'Atmosfera festosa in spiaggia.' },
  { name: 'Blue Marlin', location: 'Cala Jondal', details: 'Esclusività e VIP targets.' }
];

const RECOMMENDED_RESTAURANTS = [
  { name: 'Es Boldadó', distance: '1.2 km', rating: '4.6', desc: 'Vista iconica su Es Vedrà. Specialità paella.' },
  { name: 'El Carmen', distance: '1.5 km', rating: '4.4', desc: 'Sulla spiaggia di Cala d\'Hort.' },
  { name: 'Jul\'s Ibiza', distance: '10.5 km', rating: '4.5', desc: 'Raffinato a Sa Caleta.' },
  { name: 'Es Xarcu', distance: '12.8 km', rating: '4.7', desc: 'Pesce al forno e crudi d\'eccellenza.' },
  { name: 'Can Pujol', distance: '15.2 km', rating: '4.6', desc: 'Qualità del pescato impareggiabile.' },
  { name: 'Sa Capella', distance: '19.5 km', rating: '4.8', desc: 'Antica chiesa sconsacrata.' },
  { name: 'Amante Ibiza', distance: '28.4 km', rating: '4.6', desc: 'Incastonato nella scogliera.' },
  { name: 'La Paloma', distance: '29.1 km', rating: '4.7', desc: 'Giardino di agrumi biologico.' },
  { name: 'Beso Beach', distance: '36.5 km', rating: '4.4', desc: 'Formentera (Spiaggia Ses Illetes).' }
];

// --- FUNZIONI PURE ---
function formatDateString(isoString: string) {
  const dateObj = new Date(isoString);
  const date = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

// --- COMPONENTE ---
export default function Dashboard() {
  const [user, setUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDay, setSelectedDay] = useState('2026-06-02');
  const [now, setNow] = useState(new Date());
  
  const [activeCommentEvent, setActiveCommentEvent] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [allComments, setAllComments] = useState<any[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const [compariSubTab, setCompariSubTab] = useState<'directory' | 'cassa'>('directory');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [todayVotes, setTodayVotes] = useState<any[]>([]);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [votedCandidate, setVotedCandidate] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [sharedExpenses, setSharedExpenses] = useState<any[]>([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const [galleryMedia, setGalleryMedia] = useState<any[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'mine' | 'others'>('mine');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const router = useRouter();

  const fetchData = async () => {
    const { data: comments } = await supabase.from('event_comments').select('*').order('created_at', { ascending: true });
    if (comments) setAllComments(comments);

    const todayISO = new Date().toISOString().split('T')[0];
    const { data: votes } = await supabase.from('daily_sballato_votes').select('*').eq('vote_date', todayISO);
    if (votes) {
      setTodayVotes(votes);
      const userLogged = localStorage.getItem('ibiza_user');
      const userVote = votes.find(v => v.voter_name === userLogged);
      if (userVote) { setHasVotedToday(true); setVotedCandidate(userVote.candidate_name); }
      else { setHasVotedToday(false); setVotedCandidate(null); }
    }

    const { data: avatarsData } = await supabase.from('user_avatars').select('*');
    if (avatarsData) {
      const avatarMap: Record<string, string> = {};
      avatarsData.forEach(av => { avatarMap[av.username] = av.avatar_url; });
      setAvatars(avatarMap);
    }

    const { data: mediaData } = await supabase.from('gallery_media').select('*').order('created_at', { ascending: false });
    if (mediaData) setGalleryMedia(mediaData);

    const { data: expensesData } = await supabase.from('shared_expenses').select('*').order('created_at', { ascending: false });
    if (expensesData) setSharedExpenses(expensesData);
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

  // --- LOGICA SBALLATO ---
  const calculateDailyLeaders = () => {
    if (todayVotes.length === 0) return [];
    const voteCounts: Record<string, number> = {};
    todayVotes.forEach(v => { voteCounts[v.candidate_name] = (voteCounts[v.candidate_name] || 0) + 1; });
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    return Object.keys(voteCounts).filter(k => voteCounts[k] === maxVotes);
  };
  const dailyLeaders = calculateDailyLeaders();

  const handleFlareSOS = () => {
    if (!navigator.geolocation) { alert("GPS non rilevato."); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      const message = `Sono qui! Apri il link per visualizzare la mia posizione. http://googleusercontent.com/maps.google.com/8{latitude},${longitude}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }, () => alert("Errore GPS."));
  };

  const handlePostComment = async (eventId: string) => {
    if (!commentText.trim() || !user) return;
    await supabase.from('event_comments').insert([{ event_id: eventId, author_name: user, content: commentText }]);
    setCommentText(''); setActiveCommentEvent(null); fetchData();
  };
  
  const handleDeleteComment = async (id: string) => { await supabase.from('event_comments').delete().eq('id', id); fetchData(); };
  
  const handleUpdateComment = async (id: string) => {
    if (!editCommentText.trim()) return;
    await supabase.from('event_comments').update({ content: editCommentText }).eq('id', id);
    setEditingCommentId(null); setEditCommentText(''); fetchData();
  };

  const handleAddExpense = async () => {
    if (!expenseDesc.trim() || !expenseAmount) return;
    await supabase.from('shared_expenses').insert([{ payer_name: user, description: expenseDesc, amount: Number(expenseAmount).toFixed(2) }]);
    setExpenseDesc(''); setExpenseAmount(''); fetchData();
  };

  const handleDeleteExpense = async (id: string, payer: string) => {
    if (user !== payer) return;
    if (window.confirm("Rimuovere spesa?")) { await supabase.from('shared_expenses').delete().eq('id', id); fetchData(); }
  };

  const handleVoteSballato = async (cand: string) => {
    if (hasVotedToday) return;
    const todayISO = new Date().toISOString().split('T')[0];
    await supabase.from('daily_sballato_votes').insert([{ voter_name: user, candidate_name: cand, vote_date: todayISO }]);
    fetchData();
  };

  const totalExp = sharedExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const qpp = totalExp / 11;
  const balances: Record<string, { paid: number, balance: number, isGroom: boolean }> = {};
  ALL_PARTICIPANTS.forEach(p => {
    if (p === 'Alessandro') balances[p] = { paid: 0, balance: 0, isGroom: true };
    else {
      const paid = sharedExpenses.filter(e => e.payer_name === p).reduce((acc, curr) => acc + Number(curr.amount), 0);
      balances[p] = { paid: paid, balance: paid - qpp, isGroom: false };
    }
  });

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files?.[0]) return;
      setIsUploadingAvatar(true);
      const file = event.target.files[0];
      const fileName = `${user}-${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('user_avatars').upsert({ username: user, avatar_url: publicUrl });
      fetchData();
    } catch (e) { alert("Error"); } finally { setIsUploadingAvatar(false); }
  };

  const handleUploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files?.[0]) return;
      setIsUploadingMedia(true);
      const file = event.target.files[0];
      const fileName = `${user}-${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('gallery').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
      await supabase.from('gallery_media').insert([{ uploader_name: user, media_url: publicUrl, media_type: 'image' }]);
      fetchData();
    } catch (e) { alert("Error"); } finally { setIsUploadingMedia(false); }
  };

  const handleDeleteMedia = async (id: string, url: string) => {
    if (window.confirm("Elimina?")) {
      const fn = url.split('/').pop();
      if (fn) await supabase.storage.from('gallery').remove([fn]);
      await supabase.from('gallery_media').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24 font-sans selection:bg-amber-500/30">
      <header className="p-6 border-b border-slate-800 bg-slate-900/90 sticky top-0 backdrop-blur-2xl z-50 flex justify-between items-center shadow-2xl">
        <div>
          <h2 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">Addio al Celibato Ale</h2>
          <p className="text-lg font-black tracking-tighter text-slate-100">User: {user}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleFlareSOS} className="flex items-center justify-center w-10 h-10 bg-red-950/30 hover:bg-red-600 text-red-500 hover:text-white rounded-full border border-red-900/40 transition-all active:scale-90">🎯</button>
          <a href="https://www.google.com/maps/dir/?api=1&destination=8,+Carrer+del+Cap,+Ibiza,+Islas+Baleares" target="_blank" className="flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-amber-500 hover:text-black rounded-full border border-slate-700 transition-all">🚕</a>
          <div className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center font-black overflow-hidden ml-1">
            {avatars[user!] ? <img src={avatars[user!]} alt="Tu" className="w-full h-full object-cover" /> : <span>{user![0]}</span>}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {activeTab === 'calendar' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
              <h3 className="text-amber-500 font-black uppercase tracking-widest text-sm">Giornata:</h3>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-slate-950 text-white border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none">
                {IBIZA_DAYS.map(day => ( <option key={day} value={day}>{day.split('-')[2]} GIUGNO</option> ))}
              </select>
            </div>
            <div className="space-y-6">
              {IBIZA_SCHEDULE.filter(e => e.date === selectedDay).filter(event => {
                if (event.group === 'initial' && !isGroup1) return false;
                if (event.group === 'second' && isGroup1 && !isAle) return false;
                return true;
              }).map((event) => {
                const lock = isAle && now < new Date(new Date(`${event.date}T${event.time}:00`).getTime() + 3600000);
                const evComments = allComments.filter(c => c.event_id === event.id);
                return (
                  <div key={event.id} className={`overflow-hidden rounded-3xl border-2 ${lock ? 'border-slate-800 opacity-60' : 'border-slate-800 bg-slate-900 shadow-2xl'}`}>
                    <div className="h-40 w-full bg-slate-800 relative">
                      {lock ? <div className="absolute inset-0 flex items-center justify-center font-mono text-5xl font-black text-slate-800">XXX</div> : <img src={event.imageUrl} alt="Event" className="w-full h-full object-cover opacity-70" />}
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-black uppercase">{lock ? 'Locked' : event.title}</h3>
                      {!lock && (
                        <div className="mt-6 pt-4 border-t border-slate-800/50">
                          {evComments.map(c => (
                            <div key={c.id} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 mb-3">
                              <span className="text-[10px] text-amber-500 uppercase font-black">{c.author_name}: </span>
                              <span className="text-sm text-slate-300 italic">"{c.content}"</span>
                              {c.author_name === user && <button onClick={() => handleDeleteComment(c.id)} className="ml-2 text-red-900 text-[9px] uppercase font-bold">Del</button>}
                            </div>
                          ))}
                          {activeCommentEvent === event.id ? (
                            <div className="flex gap-2"><input value={commentText} onChange={e=>setCommentText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm"/><button onClick={()=>handlePostComment(event.id)} className="bg-amber-500 text-black px-4 rounded-xl font-black text-xs uppercase">PUSH</button></div>
                          ) : ( <button onClick={() => setActiveCommentEvent(event.id)} className="text-[10px] bg-slate-800 px-3 py-2 rounded-lg font-black">ADD FEEDBACK</button> )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-5">
              <h3 className="text-amber-500 font-black uppercase text-xs mb-4">Night Radar Hints</h3>
              {IBIZA_NEWS.map((day, idx) => (
                <div key={idx} className="mb-6">
                  <h4 className="text-[10px] uppercase font-black text-slate-500 border-b border-slate-800 pb-2 mb-3">{day.date}</h4>
                  {day.events.map((ev, eIdx) => (
                    <div key={eIdx} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50 mb-3">
                      <span className="text-sm font-black text-white uppercase">{ev.club}</span>
                      <p className="text-xs font-bold text-amber-500">{ev.name}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-5">
              <h3 className="text-amber-500 font-black uppercase text-xs mb-4">Top Gastronomia</h3>
              {RECOMMENDED_RESTAURANTS.map((rest, r) => (
                <div key={r} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50 mb-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500 text-black px-3 py-1 rounded-bl-xl font-black text-[10px]">{rest.distance}</div>
                  <span className="text-sm font-black text-white uppercase">{rest.name}</span>
                  <p className="text-xs text-slate-400 italic">"{rest.desc}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'compari' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex bg-slate-900 border-2 border-slate-800 rounded-2xl p-1">
              <button onClick={() => setCompariSubTab('directory')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${compariSubTab === 'directory' ? 'bg-slate-800 text-amber-500' : 'text-slate-500'}`}>Directory</button>
              <button onClick={() => setCompariSubTab('cassa')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${compariSubTab === 'cassa' ? 'bg-slate-800 text-amber-500' : 'text-slate-500'}`}>Cassa Comune</button>
            </div>
            {compariSubTab === 'directory' ? (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border-2 border-amber-500/20 p-5 rounded-3xl">
                  <h4 className="text-[10px] uppercase font-black text-amber-600 mb-2">Sballato del Giorno</h4>
                  <p className="text-2xl font-black text-amber-500 uppercase">{dailyLeaders.length > 0 ? dailyLeaders.join(' & ') : 'N/A'}</p>
                </div>
                {ALL_PARTICIPANTS.map(p => (
                  <div key={p} className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden">
                    <div onClick={() => setExpandedUser(expandedUser === p ? null : p)} className="p-5 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center font-black overflow-hidden">{avatars[p] ? <img src={avatars[p]} className="w-full h-full object-cover" alt="User"/> : p[0]}</div>
                        <h4 className="font-black text-xl">{p}</h4>
                      </div>
                      <span>{expandedUser === p ? '−' : '+'}</span>
                    </div>
                    {expandedUser === p && (
                      <div className="p-6 bg-slate-950/60 border-t-2 border-slate-800 flex flex-col gap-4">
                        <button onClick={() => handleVoteSballato(p)} disabled={hasVotedToday} className="w-full py-4 rounded-2xl text-[10px] font-black uppercase border-2 border-slate-700 bg-slate-800 hover:bg-amber-500 hover:text-black transition-all"> {hasVotedToday ? 'Voto Espresso' : 'Vota come sballato'}</button>
                        {user === p && (
                          <label className="flex items-center justify-center p-4 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer"><span className="text-[10px] font-black uppercase text-slate-500">{isUploadingAvatar ? 'Syncing...' : 'Update Profilo'}</span><input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar}/></label>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-3xl flex justify-around">
                  <div className="text-center"><span className="text-[10px] uppercase text-slate-500 font-black">Totale</span><p className="text-2xl font-black">€{totalExp.toFixed(2)}</p></div>
                  <div className="text-center"><span className="text-[10px] uppercase text-slate-500 font-black">Quota</span><p className="text-2xl font-black text-amber-500">€{qpp.toFixed(2)}</p></div>
                </div>
                <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-[10px] uppercase text-slate-500 font-black mb-4">Add Expense</h4>
                  <div className="flex gap-3 mb-4"><input value={expenseDesc} onChange={e=>setExpenseDesc(e.target.value)} placeholder="Desc..." className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm"/><input type="number" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} placeholder="€" className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-black"/></div>
                  <button onClick={handleAddExpense} className="w-full bg-amber-500 text-black py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg transition-all active:scale-95">Submit</button>
                </div>
                <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-[10px] uppercase text-slate-500 font-black mb-4">Bilancio</h4>
                  {ALL_PARTICIPANTS.map(p => (
                    <div key={p} className="flex justify-between items-center p-3 bg-slate-950/40 rounded-2xl border border-slate-800/50 mb-2">
                      <span className="font-black text-sm">{p}</span>
                      <span className={`text-[10px] font-black uppercase ${balances[p].isGroom ? "text-amber-500" : balances[p].balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>{balances[p].isGroom ? "Groom" : `Bal: €${balances[p].balance.toFixed(2)}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase italic text-slate-300">Archives</h3>
              <label className="bg-amber-500 text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase cursor-pointer"> {isUploadingMedia ? 'Syncing...' : 'Upload Foto'} <input type="file" className="hidden" accept="image/*" onChange={handleUploadMedia}/></label>
            </div>
            <div className="flex bg-slate-900 border-2 border-slate-800 rounded-2xl p-1">
              <button onClick={() => setGalleryFilter('mine')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl ${galleryFilter === 'mine' ? 'bg-slate-800 text-amber-500' : 'text-slate-500'}`}>My Files</button>
              <button onClick={() => setGalleryFilter('others')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl ${galleryFilter === 'others' ? 'bg-slate-800 text-amber-500' : 'text-slate-500'}`}>Others</button>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {galleryMedia.filter(m => galleryFilter === 'mine' ? m.uploader_name === user : m.uploader_name !== user).map((m) => (
                <div key={m.id} className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="w-full aspect-square bg-black relative"><img src={m.media_url} alt="Gallery" className="w-full h-full object-cover opacity-80"/></div>
                  <div className="p-5 flex justify-between items-center">
                    <div><p className="text-[10px] uppercase font-black text-amber-500">By: {m.uploader_name}</p><p className="text-[10px] text-slate-500">{formatDateString(m.created_at).date}</p></div>
                    <div className="flex gap-2">
                      <a href={`${m.media_url}?download=`} download className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">⬇</a>
                      {galleryFilter === 'mine' && <button onClick={() => handleDeleteMedia(m.id, m.media_url)} className="bg-red-950/20 text-red-700 px-3 rounded-xl text-[10px] font-black uppercase">Elimina</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-2xl border-t-2 border-slate-800 p-4 flex justify-around items-center z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        {[ { id: 'calendar', label: 'Calendario' }, { id: 'news', label: 'Hints' }, { id: 'gallery', label: 'Galleria' }, { id: 'compari', label: 'Compari' } ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`text-[9px] uppercase font-black tracking-[0.15em] transition-all px-4 py-2 rounded-xl ${activeTab === tab.id ? 'bg-amber-500 text-black shadow-lg scale-110' : 'text-slate-600'}`}> {tab.label} </button>
        ))}
      </nav>
    </main>
  );
}