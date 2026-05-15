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

// DATASET INTELLIGENCE - EVENTI, ATTIVITÀ E GASTRONOMIA
const IBIZA_NEWS = [
  {
    date: '02 GIUGNO 2026',
    events: [
      { club: 'Cafè Mambo', name: 'Sunset Sessions & Live DJ', details: 'Aperitivo al tramonto con DJ set dal vivo. Classico pre-serata ibizenco. Dalle 18:00.' },
      { club: 'Pacha Ibiza', name: 'Chris Stussy presents USS', details: 'Lineup: Chris Stussy, Enzo Siragusa. Ingresso dalle 23:00.' }
    ]
  },
  {
    date: '03 GIUGNO 2026',
    events: [
      { club: 'Las Dalias', name: 'Night Market & Acoustic Live', details: 'Storico mercatino hippy in versione serale con musica dal vivo, street food e artigianato. Dalle 19:00.' },
      { club: 'Ushuaïa', name: 'Tomorrowland Pres. Dimitri Vegas', details: 'Pool Party open air. Lineup: Dimitri Vegas, Like Mike. Dalle 17:00.' },
      { club: 'Amnesia', name: 'Amnesia Trance Ibiza', details: 'Lineup: Chicane, Judge Jules. Ingresso dalle 23:59.' }
    ]
  },
  {
    date: '04 GIUGNO 2026',
    events: [
      { club: 'Pikes Ibiza', name: 'Pikes House Party', details: 'Atmosfera intima e folle. Musica dal vivo, performance teatrali e DJ set a bordo piscina. Selezione rigorosa. Dalle 20:00.' },
      { club: 'Ibiza Rocks', name: 'Live Performance / Pool Party', details: 'Musica dal vivo ed esibizioni urbane. Atmosfera giovane e caotica. Dalle 14:00 alle 21:00.' },
      { club: 'Amnesia', name: 'Do Not Sleep', details: 'Tech House. Lineup: Sidney Charles. Ingresso dalle 23:00.' }
    ]
  },
  {
    date: '05 GIUGNO 2026',
    events: [
      { club: 'O Beach', name: 'Pool Party Extravaganza', details: 'Festa diurna con acrobati, musica house e spettacolo dal vivo. Dalle 13:00.' },
      { club: 'Ushuaïa', name: 'Calvin Harris', details: 'Ingresso dalle 17:00. Evento open air di punta della giornata.' },
      { club: 'Lío Ibiza', name: 'Dinner & Cabaret Show', details: 'Spettacolo di cabaret di altissimo livello sul porto di Marina Botafoch. Necessaria prenotazione anticipata.' }
    ]
  }
];

const DAYTIME_ACTIVITIES = [
  { name: 'Noleggio Gommoni (Senza Patente)', location: 'Sant Antoni / Port d\'es Torrent', details: 'Possibilità di noleggiare piccole imbarcazioni fino a 15cv per esplorare le calette ovest (Cala Bassa, Cala Conta). Costo medio: 250€/giorno.' },
  { name: 'Esplorazione in E-Bike', location: 'Partenza da Ibiza Città o Santa Eulalia', details: 'Tour guidati o noleggio libero di mountain bike elettriche per percorsi sterrati lungo la costa nord o verso le saline.' },
  { name: 'Sa Trinxa (Playa de las Salinas)', location: 'Las Salinas', details: 'Spiaggia iconica. Atmosfera festosa, musica balearica dal vivo, cocktail e pubblico variegato. Altamente raccomandata per il tardo pomeriggio.' },
  { name: 'Blue Marlin', location: 'Cala Jondal', details: 'Il beach club più esclusivo dell\'isola. Musica costante, lettini VIP e target altolocato. Richiede budget elevato.' },
  { name: 'Bora Bora / Nassau', location: 'Playa d\'en Bossa', details: 'Il cuore della movida da spiaggia. Musica ad alto volume dalle prime ore del pomeriggio, feste sulla sabbia.' }
];

const RECOMMENDED_RESTAURANTS = [
  { name: 'Es Boldadó', distance: '1.2 km', rating: '4.6', desc: 'Arroccato sulla scogliera. La migliore vista su Es Vedrà. Specialità paella e pesce fresco.' },
  { name: 'Restaurante El Carmen', distance: '1.5 km', rating: '4.4', desc: 'Sulla spiaggia di Cala d\'Hort. Atmosfera rilassata, cucina tradizionale ibizenca e frutti di mare.' },
  { name: 'Jul\'s Ibiza', distance: '10.5 km', rating: '4.5', desc: 'Ristorazione raffinata d\'ispirazione greca a Sa Caleta. Mixology avanzata e ambiente pre-serata d\'eccellenza.' },
  { name: 'Es Xarcu', distance: '12.8 km', rating: '4.7', desc: 'Rustico ed esclusivo. Noto per il pesce al forno pescato in giornata e il prosciutto iberico di pura ghianda.' },
  { name: 'Can Pujol', distance: '15.2 km', rating: '4.6', desc: 'Sant Antoni. Estetica spartana ma qualità del pescato impareggiabile. Visuale perfetta per il tramonto.' },
  { name: 'Sa Capella', distance: '19.5 km', rating: '4.8', desc: 'Situato in una cappella sconsacrata a Sant Antoni. Carne alla griglia, hierbas fatto in casa e atmosfera gotico-romantica.' },
  { name: 'Amante Ibiza', distance: '28.4 km', rating: '4.6', desc: 'Cala Llonga. Incastonato in una scogliera. Cucina mediterranea contemporanea, ambiente estremamente elegante.' },
  { name: 'La Paloma', distance: '29.1 km', rating: '4.7', desc: 'San Lorenzo. Cucina organica italo-israeliana in un rigoglioso giardino di agrumi. Prenotazione complessa ma necessaria.' },
  { name: 'Beso Beach', distance: '36.5 km', rating: '4.4', desc: 'Formentera (necessario traghetto). Locale iconico sulla spiaggia, altissimo afflusso, cucina spagnola e mojito.' }
];

export default function Dashboard() {
  const [user, setUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'news', 'gallery', 'compari'
  const [now, setNow] = useState(new Date());
  
  // Stati Missione
  const [activeCommentEvent, setActiveCommentEvent] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [allComments, setAllComments] = useState<any[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Stati Compari & Sottomenu
  const [compariSubTab, setCompariSubTab] = useState<'directory' | 'cassa'>('directory');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [todayVotes, setTodayVotes] = useState<any[]>([]);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [votedCandidate, setVotedCandidate] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Stati Cassa Comune
  const [sharedExpenses, setSharedExpenses] = useState<any[]>([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Stati Galleria
  const [galleryMedia, setGalleryMedia] = useState<any[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'mine' | 'others'>('mine');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const router = useRouter();

  const fetchData = async () => {
    // 1. Recensioni
    const { data: comments } = await supabase.from('event_comments').select('*').order('created_at', { ascending: true });
    if (comments) setAllComments(comments);

    // 2. Voti Odierni
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

    // 3. Avatar
    const { data: avatarsData } = await supabase.from('user_avatars').select('*');
    if (avatarsData) {
      const avatarMap: Record<string, string> = {};
      avatarsData.forEach(av => { avatarMap[av.username] = av.avatar_url; });
      setAvatars(avatarMap);
    }

    // 4. Galleria
    const { data: mediaData } = await supabase.from('gallery_media').select('*').order('created_at', { ascending: false });
    if (mediaData) setGalleryMedia(mediaData);

    // 5. Cassa Comune
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

  // --- LOGICA PROTOCOLLO FLARE (SOS) ---
  const handleFlareSOS = () => {
    if (!navigator.geolocation) {
      alert("Sensore GPS non rilevato o disabilitato dal dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const message = `Sono qui! Apri il link per visualizzare la mia posizione. https://www.google.com/maps?q=${latitude},${longitude}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      },
      () => alert("Recupero coordinate fallito. Verifichi i permessi di localizzazione del browser.")
    );
  };

  // --- LOGICA MISSIONE ---
  const handlePostComment = async (eventId: string) => {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from('event_comments').insert([{ event_id: eventId, author_name: user, content: commentText }]);
    if (!error) { setCommentText(''); setActiveCommentEvent(null); fetchData(); }
  };
  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('event_comments').delete().eq('id', commentId); fetchData();
  };
  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    await supabase.from('event_comments').update({ content: editCommentText }).eq('id', commentId);
    setEditingCommentId(null); setEditCommentText(''); fetchData();
  };

  // --- LOGICA COMPARI (DIRECTORY) ---
  const handleVoteSballato = async (candidateName: string) => {
    if (!user || hasVotedToday) return;
    const todayISO = new Date().toISOString().split('T')[0];
    await supabase.from('daily_sballato_votes').insert([{ voter_name: user, candidate_name: candidateName, vote_date: todayISO }]);
    fetchData();
  };
  const handleRemoveVote = async () => {
    if (!user) return;
    const todayISO = new Date().toISOString().split('T')[0];
    await supabase.from('daily_sballato_votes').delete().match({ voter_name: user, vote_date: todayISO });
    fetchData();
  };
  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !user) return;
      setIsUploadingAvatar(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('user_avatars').upsert({ username: user, avatar_url: publicUrl });
      fetchData();
    } catch (error) {
      alert("Errore caricamento avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // --- LOGICA CASSA COMUNE ---
  const handleAddExpense = async () => {
    if (!expenseDesc.trim() || !expenseAmount || isNaN(Number(expenseAmount))) return;
    const { error } = await supabase.from('shared_expenses').insert([{ 
      payer_name: user, 
      description: expenseDesc, 
      amount: Number(expenseAmount).toFixed(2) 
    }]);
    if (!error) {
      setExpenseDesc('');
      setExpenseAmount('');
      fetchData();
    }
  };

  const handleDeleteExpense = async (expenseId: string, payerName: string) => {
    if (user !== payerName) return;
    const confirm = window.confirm("Rimuovere questa spesa dal registro centrale?");
    if (!confirm) return;
    await supabase.from('shared_expenses').delete().eq('id', expenseId);
    fetchData();
  };

  // Calcolo Bilanci Cassa Comune (Esclusione Alessandro)
  const totalExpenses = sharedExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const quotaPerPerson = totalExpenses / 11; // Denominatore fisso a 11 paganti
  
  const balances: Record<string, { paid: number, balance: number, isGroom: boolean }> = {};
  ALL_PARTICIPANTS.forEach(p => {
    if (p === 'Alessandro') {
      balances[p] = { paid: 0, balance: 0, isGroom: true };
    } else {
      const paidByPerson = sharedExpenses
        .filter(e => e.payer_name === p)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      balances[p] = {
        paid: paidByPerson,
        balance: paidByPerson - quotaPerPerson,
        isGroom: false
      };
    }
  });

  // --- LOGICA GALLERIA ---
  const handleUploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !user) return;
      setIsUploadingMedia(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user}-${Date.now()}.${fileExt}`;
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

      const { error: uploadError } = await supabase.storage.from('gallery').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('gallery_media').insert([{ 
        uploader_name: user, 
        media_url: publicUrl,
        media_type: mediaType
      }]);
      if (dbError) throw dbError;

      fetchData();
    } catch (error) {
      alert("Errore durante il caricamento. Verificare il formato del file.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string, mediaUrl: string) => {
    if (!user) return;
    const confirmDelete = window.confirm("Conferma l'eliminazione definitiva di questa immagine?");
    if (!confirmDelete) return;

    try {
      const fileName = mediaUrl.split('/').pop();
      if (fileName) await supabase.storage.from('gallery').remove([fileName]);
      const { error } = await supabase.from('gallery_media').delete().eq('id', mediaId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert("Errore durante l'eliminazione dell'immagine.");
    }
  };

  const formatDateString = (isoString: string) => {
    const dateObj = new Date(isoString);
    const date = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  const calculateDailyLeaders = () => {
    if (todayVotes.length === 0) return [];
    const voteCounts: Record<string, number> = {};
    todayVotes.forEach(v => { voteCounts[v.candidate_name] = (voteCounts[v.candidate_name] || 0) + 1; });
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    return Object.keys(voteCounts).filter(k => voteCounts[k] === maxVotes);
  };
  const dailyLeaders = calculateDailyLeaders();
  const ibizaDays = ['2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24 font-sans">
      <header className="p-6 border-b border-slate-800 bg-slate-900/80 sticky top-0 backdrop-blur-xl z-50 flex justify-between items-center">
        <div>
          <h2 className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.3em]">Operazione Ibiza</h2>
          <p className="text-lg font-bold tracking-tight">Accesso: {user}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tasto Flare SOS */}
          <button 
            onClick={handleFlareSOS}
            className="flex items-center justify-center w-10 h-10 bg-red-900/40 hover:bg-red-500 text-red-500 hover:text-white text-xl rounded-full border border-red-800/50 shadow-lg transition-all"
            title="Invia Posizione SOS"
          >
            🎯
          </button>
          
          {/* Tasto Taxi */}
          <a 
            href="https://www.google.com/maps/dir/?api=1&destination=8,+Carrer+del+Cap,+Ibiza,+Islas+Baleares" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-yellow-500 hover:text-black text-xl rounded-full border border-slate-700 shadow-lg transition-all"
            title="Naviga verso la Villa"
          >
            🚕
          </a>
          
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black overflow-hidden ml-1">
            {avatars[user] ? (
              <img src={avatars[user]} alt="Tu" className="w-full h-full object-cover" />
            ) : (
              <span>{user[0]}</span>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        
        {/* VIEW: MISSIONE */}
        {activeTab === 'calendar' && (
          <div className="space-y-8 animate-in fade-in">
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
                    <h3 className="text-yellow-500 font-black uppercase tracking-[0.2em] text-sm">{dayLabel}</h3>
                  </div>
                  <div className="space-y-6">
                    {visibleEventsForDay.map((event) => {
                      const unlockTime = new Date(new Date(`${event.date}T${event.time}:00`).getTime() + 3600000);
                      const isHidden = isAle && now < unlockTime;
                      const eventComments = allComments.filter(c => c.event_id === event.id);

                      return (
                        <div key={event.id} className={`overflow-hidden rounded-2xl border ${isHidden ? 'border-slate-800 bg-slate-900/40' : 'border-slate-800 bg-slate-900 shadow-xl'}`}>
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
                            <h3 className={`text-xl font-black uppercase tracking-tight ${isHidden ? 'text-slate-600' : 'text-white'}`}>{isHidden ? 'Dati Oscurati' : event.title}</h3>
                            <p className="text-sm text-slate-400 mt-1 font-medium">📍 {isHidden ? '(???)' : event.location}</p>

                            {isHidden && (
                              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex justify-between items-center">
                                <span className="text-xs uppercase font-bold text-yellow-600">Sblocco tra:</span>
                                <span className="font-mono font-black text-yellow-500">{Math.max(0, Math.ceil((unlockTime.getTime() - now.getTime()) / 60000))} min</span>
                              </div>
                            )}

                            {!isHidden && (
                              <div className="mt-5 pt-4 border-t border-slate-800/50">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Recensioni</span>
                                  <button onClick={() => setActiveCommentEvent(activeCommentEvent === event.id ? null : event.id)} className="text-[10px] bg-slate-800 px-3 py-1.5 rounded-md text-white">
                                    {activeCommentEvent === event.id ? 'Annulla' : '+ Aggiungi'}
                                  </button>
                                </div>
                                {eventComments.length > 0 && (
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
                                                <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }} className="text-[9px] text-slate-400 hover:text-yellow-500 uppercase">Modifica</button>
                                                <button onClick={() => handleDeleteComment(c.id)} className="text-[9px] text-slate-400 hover:text-red-500 uppercase">Elimina</button>
                                              </div>
                                            )}
                                          </div>
                                          {isEditing ? (
                                            <div className="flex gap-2 mt-2">
                                              <input type="text" value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                                              <button onClick={() => handleUpdateComment(c.id)} className="bg-yellow-500 text-black px-2 py-1 rounded text-[10px] font-bold">Salva</button>
                                            </div>
                                          ) : <p className="text-sm text-slate-300 mt-1">{c.content}</p>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {activeCommentEvent === event.id && (
                                  <div className="flex gap-2">
                                    <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Scrivi..." />
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

        {/* VIEW: NEWS & INTELLIGENCE */}
        {activeTab === 'news' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-6">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-yellow-500 font-black uppercase tracking-[0.2em] text-sm">Opzioni Diurne & Esplorazione</h3>
                <p className="text-xs text-slate-400 mt-1">Alternativa ai piani base. Noleggi, spiagge con movida e attività all'aperto.</p>
              </div>
              <div className="p-4 space-y-3">
                {DAYTIME_ACTIVITIES.map((act, aIdx) => (
                  <div key={aIdx} className="bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-black text-white uppercase">{act.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">📍 {act.location}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{act.details}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-6">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-yellow-500 font-black uppercase tracking-[0.2em] text-sm">Radar Eventi Notturni</h3>
                <p className="text-xs text-slate-400 mt-1">Club, concerti live, mercatini serali e party alternativi (2-5 Giugno 2026).</p>
              </div>
              <div className="p-4 space-y-6">
                {IBIZA_NEWS.map((day, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-800 pb-1">{day.date}</h4>
                    <div className="space-y-3">
                      {day.events.map((ev, eIdx) => (
                        <div key={eIdx} className="bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-black text-white uppercase">{ev.club}</span>
                          </div>
                          <p className="text-xs font-bold text-yellow-500">{ev.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{ev.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-yellow-500 font-black uppercase tracking-[0.2em] text-sm">Top Gastronomia (4-5 Stelle)</h3>
                <p className="text-xs text-slate-400 mt-1">Ordinati per distanza dal Vostro campo base (Carrer del Cap, 8).</p>
              </div>
              <div className="p-4 grid grid-cols-1 gap-3">
                {RECOMMENDED_RESTAURANTS.map((rest, rIdx) => (
                  <div key={rIdx} className="bg-slate-950 p-3 rounded-lg border border-slate-800/50 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black px-2 py-1 rounded-bl-lg font-black text-[10px] z-10">
                      {rest.distance}
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1 pr-12">
                        <span className="text-sm font-black text-white uppercase">{rest.name}</span>
                        <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">{rest.rating} ★</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pr-2">{rest.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: COMPARI & CASSA COMUNE */}
        {activeTab === 'compari' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* TOGGLE SUB-MENU COMPARI */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6">
              <button onClick={() => setCompariSubTab('directory')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${compariSubTab === 'directory' ? 'bg-slate-800 text-yellow-500 shadow-md' : 'text-slate-500'}`}>Directory</button>
              <button onClick={() => setCompariSubTab('cassa')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${compariSubTab === 'cassa' ? 'bg-slate-800 text-yellow-500 shadow-md' : 'text-slate-500'}`}>Cassa Comune</button>
            </div>

            {/* SUB-VIEW: DIRECTORY */}
            {compariSubTab === 'directory' && (
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl mb-6">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-yellow-600 font-bold mb-2">Sballato del Giorno</h4>
                  {dailyLeaders.length > 0 ? (
                    <p className="text-lg font-black text-yellow-500">{dailyLeaders.join(' & ')} <span className="text-sm text-slate-400 font-normal ml-2">in testa</span></p>
                  ) : <p className="text-sm text-slate-400 italic">Nessun voto registrato oggi.</p>}
                </div>
                
                {ALL_PARTICIPANTS.map(p => {
                  const isMe = user === p;
                  const isExpanded = expandedUser === p;
                  return (
                    <div key={p} className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden transition-all">
                      <div onClick={() => setExpandedUser(isExpanded ? null : p)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-800 border-2 border-slate-700 rounded-full flex items-center justify-center text-xl font-black text-slate-400 overflow-hidden">
                            {avatars[p] ? <img src={avatars[p]} alt={p} className="w-full h-full object-cover" /> : <span>{p[0]}</span>}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{p} {isMe && <span className="text-[9px] bg-yellow-500 text-black px-2 py-0.5 rounded uppercase ml-2">Tu</span>}</h4>
                            <p className="text-[10px] uppercase text-slate-500">{GROUP_1.includes(p) ? 'Gruppo 1 - Sposo/Testimoni' : 'Gruppo 2 - Amici'}</p>
                          </div>
                        </div>
                        <div className="text-slate-600 font-mono text-xl">{isExpanded ? '-' : '+'}</div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                              <p className="text-[10px] text-slate-500 uppercase">Recensioni</p>
                              <p className="text-xl font-black">{allComments.filter(c => c.author_name === p).length}</p>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                              <p className="text-[10px] text-slate-500 uppercase">Voti Sballato (Oggi)</p>
                              <p className="text-xl font-black text-yellow-500">{todayVotes.filter(v => v.candidate_name === p).length}</p>
                            </div>
                          </div>

                          {isMe ? (
                            <label className="flex items-center justify-center w-full p-3 border border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-yellow-500 text-slate-400 transition-colors">
                              <span className="text-xs uppercase font-bold tracking-widest">{isUploadingAvatar ? 'Caricamento...' : 'Carica Foto Profilo'}</span>
                              <input type="file" className="hidden" accept="image/*" disabled={isUploadingAvatar} onChange={handleUploadAvatar} />
                            </label>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => handleVoteSballato(p)} disabled={hasVotedToday} className={`flex-1 ${hasVotedToday ? 'bg-slate-800 opacity-30' : 'bg-slate-800 hover:bg-slate-700'} border border-slate-700 text-slate-400 text-xs font-bold py-3 rounded-xl uppercase`}>
                                {hasVotedToday ? 'Voto Espresso' : 'Vota come Sballato'}
                              </button>
                              {votedCandidate === p && (
                                <button onClick={handleRemoveVote} className="bg-red-500/10 text-red-500 border border-red-500/30 text-xs font-bold py-3 px-4 rounded-xl uppercase">Ritira Voto</button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* SUB-VIEW: CASSA COMUNE */}
            {compariSubTab === 'cassa' && (
              <div className="space-y-6 animate-in fade-in">
                
                {/* Summary Box */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-center items-center">
                    <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">Totale Speso</span>
                    <span className="text-2xl font-black text-white">€{totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-center items-center">
                    <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">Quota Pro-Capite</span>
                    <span className="text-2xl font-black text-yellow-500">€{quotaPerPerson.toFixed(2)}</span>
                    <span className="text-[8px] text-slate-500 mt-1 uppercase">Diviso 11 quote</span>
                  </div>
                </div>

                {/* Aggiunta Spesa */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                  <h4 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-widest">Aggiungi Spesa per il gruppo</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={expenseDesc} 
                      onChange={(e) => setExpenseDesc(e.target.value)} 
                      placeholder="Es. Taxi per DC10" 
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <input 
                      type="number" 
                      value={expenseAmount} 
                      onChange={(e) => setExpenseAmount(e.target.value)} 
                      placeholder="€ 0.00" 
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <button onClick={handleAddExpense} className="w-full mt-3 bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                    Registra Importo
                  </button>
                </div>

                {/* Bilanci Personali */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                  <h4 className="text-xs uppercase text-slate-400 font-bold mb-4 tracking-widest border-b border-slate-800 pb-2">Bilancio Partecipanti</h4>
                  <div className="space-y-3">
                    {ALL_PARTICIPANTS.map(p => {
                      const data = balances[p];
                      const isMe = user === p;
                      let statusText = '';
                      let statusColor = 'text-slate-400';
                      
                      if (data.isGroom) {
                        statusText = "Sposo - Esente";
                        statusColor = "text-yellow-500";
                      } else if (data.balance > 0.01) {
                        statusText = `Deve ricevere €${data.balance.toFixed(2)}`;
                        statusColor = "text-emerald-500";
                      } else if (data.balance < -0.01) {
                        statusText = `Deve dare €${Math.abs(data.balance).toFixed(2)}`;
                        statusColor = "text-red-500";
                      } else {
                        statusText = "In Pari";
                        statusColor = "text-slate-500";
                      }

                      return (
                        <div key={p} className={`flex justify-between items-center p-2 rounded-lg ${isMe ? 'bg-slate-800/50' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black overflow-hidden">
                              {avatars[p] ? <img src={avatars[p]} alt={p} className="w-full h-full object-cover" /> : p[0]}
                            </div>
                            <span className="font-bold text-sm">{p}</span>
                          </div>
                          <div className={`text-xs font-bold ${statusColor} text-right`}>
                            {statusText}
                            {!data.isGroom && <div className="text-[9px] text-slate-500 font-normal">Ha pagato: €{data.paid.toFixed(2)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lista Transazioni Recenti */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                  <h4 className="text-xs uppercase text-slate-400 font-bold mb-4 tracking-widest border-b border-slate-800 pb-2">Registro Transazioni</h4>
                  {sharedExpenses.length === 0 ? (
                    <p className="text-sm text-slate-500 italic text-center py-4">Nessuna spesa registrata.</p>
                  ) : (
                    <div className="space-y-3">
                      {sharedExpenses.map(expense => {
                        const isMyExpense = user === expense.payer_name;
                        const { date, time } = formatDateString(expense.created_at);
                        return (
                          <div key={expense.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800/50 flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-white">{expense.description}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Pagato da: <span className="text-yellow-500 uppercase">{expense.payer_name}</span> • {date} {time}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-black text-lg text-white">€{Number(expense.amount).toFixed(2)}</span>
                              {isMyExpense && (
                                <button onClick={() => handleDeleteExpense(expense.id, expense.payer_name)} className="text-[9px] uppercase text-red-500 hover:underline">
                                  Elimina
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW: GALLERIA FOTOGRAFICA */}
        {activeTab === 'gallery' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-300">Archivio Foto</h3>
              <label className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-full font-black text-[10px] uppercase cursor-pointer shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
                {isUploadingMedia ? 'UPLOADING...' : '+ CARICA FOTO'}
                <input type="file" className="hidden" accept="image/*" disabled={isUploadingMedia} onChange={handleUploadMedia} />
              </label>
            </div>

            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6">
              <button onClick={() => setGalleryFilter('mine')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${galleryFilter === 'mine' ? 'bg-slate-800 text-yellow-500 shadow-md' : 'text-slate-500'}`}>I Miei File</button>
              <button onClick={() => setGalleryFilter('others')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${galleryFilter === 'others' ? 'bg-slate-800 text-yellow-500 shadow-md' : 'text-slate-500'}`}>Archivio Compari</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {galleryMedia
                .filter(media => galleryFilter === 'mine' ? media.uploader_name === user : media.uploader_name !== user)
                .map((media) => {
                  const { date, time } = formatDateString(media.created_at);
                  
                  return (
                    <div key={media.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                      <div className="w-full aspect-video bg-black relative flex items-center justify-center">
                        <img src={media.media_url} alt="Media" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="p-4 bg-slate-900/90 flex flex-col gap-3 border-t border-slate-800">
                        <div className="flex justify-between items-start">
                          <div>
                            {galleryFilter === 'others' && (
                              <p className="text-[10px] uppercase font-bold text-yellow-500 mb-1">Di: {media.uploader_name}</p>
                            )}
                            <p className="text-xs text-slate-400 font-mono">{date} - {time}</p>
                          </div>
                          <a 
                            href={`${media.media_url}?download=`} 
                            download 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-700 flex items-center gap-2"
                          >
                            ⬇ Salva
                          </a>
                        </div>

                        {galleryFilter === 'mine' && (
                          <button 
                            onClick={() => handleDeleteMedia(media.id, media.media_url)}
                            className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-bold py-2 rounded-lg uppercase tracking-widest transition-colors"
                          >
                            Elimina Definitivamente
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              
              {galleryMedia.filter(m => galleryFilter === 'mine' ? m.uploader_name === user : m.uploader_name !== user).length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-600 italic text-sm">
                  {galleryFilter === 'mine' ? 'Non hai ancora caricato nessuna fotografia.' : 'Nessuna foto condivisa dagli altri compari al momento.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 p-2 sm:p-4 flex justify-around items-center z-50">
        {[
          { id: 'calendar', label: 'Missione' },
          { id: 'news', label: 'News' },
          { id: 'gallery', label: 'Galleria' },
          { id: 'compari', label: 'Compari' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[10px] uppercase font-black tracking-widest transition-all px-3 py-2 rounded-full ${activeTab === tab.id ? 'bg-yellow-500 text-black scale-105 shadow-lg shadow-yellow-500/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </main>
  );
}