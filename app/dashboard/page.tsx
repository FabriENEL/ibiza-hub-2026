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

// DATASET INTELLIGENCE
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
  { name: 'Restaurante El Carmen', distance: '1.5 km', rating: '4.4', desc: 'Sulla spiaggia di Cala d\'Hort. Atmosfera rilassata, cucina tradicional ibizenca e frutti di mare.' },
  { name: 'Jul\'s Ibiza', distance: '10.5 km', rating: '4.5', desc: 'Ristorazione raffinata d\'ispirazione greca a Sa Caleta. Mixology avanzata e ambiente pre-serata d\'eccellenza.' },
  { name: 'Es Xarcu', distance: '12.8 km', rating: '4.7', desc: 'Rustico ed esclusivo. Noto per il pesce al forno pescato in giornata e il prosciutto iberico di pura ghianda.' },
  { name: 'Can Pujol', distance: '15.2 km', rating: '4.6', desc: 'Sant Antoni. Estetica spartana ma qualità del pescato impareggiabile. Visuale perfetta per il tramonto.' },
  { name: 'Sa Capella', distance: '19.5 km', rating: '4.8', desc: 'Situato in una cappella sconsacrata a Sant Antoni. Carne alla griglia, hierbas fatto in casa e atmosfera gotico-romantica.' },
  { name: 'Amante Ibiza', distance: '28.4 km', rating: '4.6', desc: 'Cala Llonga. Incastonato in una scogliera. Cucina mediterranea contemporanea, ambiente estremamente elegante.' },
  { name: 'La Paloma', distance: '29.1 km', rating: '4.7', desc: 'San Lorenzo. Cucina organica italo-israeliana in un rigoglioso giardino di agrumi. Prenotazione complessa ma necessaria.' },
  { name: 'Beso Beach', distance: '36.5 km', rating: '4.4', desc: 'Formentera (necessario traghetto). Locale iconico sulla spiaggia, altissimo afflusso, cucina spagnola e mojito.' }
];

const getWeatherEmoji = (code: number) => {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2 || code === 3) return '🌤️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
};

export default function Dashboard() {
  const [user, setUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar'); 
  const [selectedDay, setSelectedDay] = useState('2026-06-02');
  const [now, setNow] = useState(new Date());
  
  // Stati Missione
  const [activeCommentEvent, setActiveCommentEvent] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [allComments, setAllComments] = useState<any[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Stati Compari
  const [compariSubTab, setCompariSubTab] = useState<'directory' | 'cassa'>('directory');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [todayVotes, setTodayVotes] = useState<any[]>([]);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [votedCandidate, setVotedCandidate] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Stati Biglietti
  const [myTickets, setMyTickets] = useState<{name: string, url: string}[]>([]);
  const [isUploadingTicket, setIsUploadingTicket] = useState(false);

  // Stati Cassa
  const [sharedExpenses, setSharedExpenses] = useState<any[]>([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Stati Galleria
  const [galleryMedia, setGalleryMedia] = useState<any[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'mine' | 'others'>('mine');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Stato Meteo
  const [weatherInfo, setWeatherInfo] = useState<{ type: 'current' | 'forecast', current?: any, forecast?: any[] } | null>(null);

  const router = useRouter();

  // --- MOTORE TELEMETRICO ---
  const logTelemetry = async (actionType: string, detailsPayload: any = {}) => {
    const currentUser = localStorage.getItem('ibiza_user');
    if (!currentUser) return;
    
    // Esecuzione silente in background per non bloccare l'interfaccia
    supabase.from('usage_logs').insert([{
      username: currentUser,
      action_type: actionType,
      details: detailsPayload
    }]).then(({ error }) => {
      if (error) console.error("Telemetry error:", error);
    });
  };

  const fetchData = async () => {
    const { data: comments } = await supabase.from('event_comments').select('*').order('created_at', { ascending: true });
    if (comments) setAllComments(comments);

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

    const currentUser = localStorage.getItem('ibiza_user');
    if (currentUser) {
      const { data: ticketFiles } = await supabase.storage.from('flight_tickets').list(currentUser);
      if (ticketFiles) {
        const validFiles = ticketFiles.filter(f => f.name !== '.emptyFolderPlaceholder' && f.id);
        const tickets = validFiles.map(file => {
          const { data: { publicUrl } } = supabase.storage.from('flight_tickets').getPublicUrl(`${currentUser}/${file.name}`);
          return { name: file.name, url: publicUrl };
        });
        setMyTickets(tickets);
      }
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

  const fetchWeather = async () => {
    try {
      const today = new Date();
      const transitionDate = new Date('2026-05-30T00:00:00');
      
      if (today < transitionDate) {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.9067&longitude=1.4206&current=temperature_2m,weather_code');
        const data = await res.json();
        if (data && data.current) {
          setWeatherInfo({ type: 'current', current: data.current });
        }
      } else {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.9067&longitude=1.4206&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin');
        const data = await res.json();
        if (data && data.daily) {
          const forecastDays: any[] = [];
          for(let i=0; i<data.daily.time.length; i++) {
            if (['2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'].includes(data.daily.time[i])) {
              forecastDays.push({
                date: data.daily.time[i],
                max: data.daily.temperature_2m_max[i],
                min: data.daily.temperature_2m_min[i],
                code: data.daily.weather_code[i]
              });
            }
          }
          setWeatherInfo({ type: 'forecast', forecast: forecastDays });
        }
      }
    } catch (error) {
      console.error("Errore telemetria meteo:", error);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('ibiza_user');
    if (!savedUser) {
      router.push('/');
    } else {
      setUser(savedUser);
      logTelemetry('app_open', { timestamp: new Date().toISOString() }); // Log Avvio
    }

    fetchData();
    fetchWeather();

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [router]);

  if (!user) return <div className="bg-slate-950 min-h-screen" />;

  const isGroup1 = GROUP_1.includes(user);
  const isAle = user === 'Alessandro';

  const handleTabSwitch = (tabId: string) => {
    setActiveTab(tabId);
    logTelemetry('tab_switch', { target_tab: tabId });
  };

  const handleFlareSOS = () => {
    logTelemetry('flare_sos_triggered');
    if (!navigator.geolocation) {
      alert("Sensore GPS non rilevato o disabilitato dal dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const message = `Sono qui! Apri il link per visualizzare la mia posizione: https://maps.google.com/?q=${latitude},${longitude}`;
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        window.location.href = whatsappUrl;
      },
      () => alert("Recupero coordinate fallito. Verifichi i permessi di localizzazione di Safari e dell'iPhone.")
    );
  };

  const handleTaxiClick = () => {
    logTelemetry('taxi_navigation_triggered');
  };

  const handlePostComment = async (eventId: string) => {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from('event_comments').insert([{ event_id: eventId, author_name: user, content: commentText }]);
    if (!error) { 
      logTelemetry('post_comment', { event_id: eventId, length: commentText.length });
      setCommentText(''); setActiveCommentEvent(null); fetchData(); 
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('event_comments').delete().eq('id', commentId); 
    logTelemetry('delete_comment', { comment_id: commentId });
    fetchData();
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    await supabase.from('event_comments').update({ content: editCommentText }).eq('id', commentId);
    logTelemetry('update_comment', { comment_id: commentId });
    setEditingCommentId(null); setEditCommentText(''); fetchData();
  };

  const handleVoteSballato = async (candidateName: string) => {
    if (!user || hasVotedToday) return;
    const todayISO = new Date().toISOString().split('T')[0];
    await supabase.from('daily_sballato_votes').insert([{ voter_name: user, candidate_name: candidateName, vote_date: todayISO }]);
    logTelemetry('vote_sballato', { candidate: candidateName });
    fetchData();
  };

  const handleRemoveVote = async () => {
    if (!user) return;
    const todayISO = new Date().toISOString().split('T')[0];
    await supabase.from('daily_sballato_votes').delete().match({ voter_name: user, vote_date: todayISO });
    logTelemetry('remove_vote');
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
      logTelemetry('upload_avatar');
      fetchData();
    } catch (error) {
      alert("Errore caricamento avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUploadTicket = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !user) return;
      setIsUploadingTicket(true);
      const file = event.target.files[0];
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const { error: uploadError } = await supabase.storage.from('flight_tickets').upload(`${user}/${cleanName}`, file, { upsert: true });
      if (uploadError) throw uploadError;
      logTelemetry('upload_ticket');
      fetchData();
    } catch (error) {
      alert("Errore caricamento biglietto.");
    } finally {
      setIsUploadingTicket(false);
    }
  };

  const handleDeleteTicket = async (fileName: string) => {
    if (!user) return;
    const confirmDelete = window.confirm("Eliminare definitivamente questo documento?");
    if (!confirmDelete) return;
    try {
      await supabase.storage.from('flight_tickets').remove([`${user}/${fileName}`]);
      logTelemetry('delete_ticket');
      fetchData();
    } catch (error) {
      alert("Errore durante l'eliminazione.");
    }
  };

  const handleAddExpense = async () => {
    if (!expenseDesc.trim() || !expenseAmount || isNaN(Number(expenseAmount))) return;
    const { error } = await supabase.from('shared_expenses').insert([{ 
      payer_name: user, 
      description: expenseDesc, 
      amount: Number(expenseAmount)
    }]);
    if (!error) {
      logTelemetry('add_expense', { amount: Number(expenseAmount) });
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
    logTelemetry('delete_expense');
    fetchData();
  };

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

      logTelemetry('upload_media', { type: mediaType });
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
      logTelemetry('delete_media');
      fetchData();
    } catch (error) {
      alert("Errore durante l'eliminazione dell'immagine.");
    }
  };

  const handleMediaDownload = async (mediaUrl: string) => {
    logTelemetry('download_media', { url: mediaUrl });
    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = mediaUrl.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Errore durante il download:', error);
      alert('Errore durante il download. Verificare la connessione.');
    }
  };

  const totalExpenses = sharedExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const quotaPerPerson = totalExpenses / 11; 
  
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
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans antialiased selection:bg-yellow-500/30">
      <header className="p-6 border-b border-white/5 bg-slate-950/80 sticky top-0 backdrop-blur-2xl z-50 flex justify-between items-center shadow-2xl shadow-black/50">
        <div>
          <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 text-[10px] font-black uppercase tracking-[0.3em] drop-shadow-sm">Addio al Celibato Ale</h2>
          <p className="text-lg font-bold tracking-tight text-white drop-shadow-md">Accesso: {user}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleFlareSOS}
            className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-900/40 to-red-950/40 hover:from-red-600 hover:to-red-500 text-red-500 hover:text-white text-xl rounded-full border border-red-500/20 shadow-lg shadow-red-900/20 transition-all hover:scale-105 active:scale-95"
            title="Invia Posizione SOS"
          >
            🎯
          </button>
          
          <a 
            href="https://www.google.com/maps/dir/?api=1&destination=8,+Carrer+del+Cap,+Ibiza,+Islas+Baleares" 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={handleTaxiClick}
            className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-yellow-400 hover:to-yellow-500 hover:text-black text-xl rounded-full border border-white/5 shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
            title="Naviga verso la Villa"
          >
            🚕
          </a>
          
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700/50 shadow-inner flex items-center justify-center font-black overflow-hidden ml-1">
            {avatars[user] ? (
              <img src={avatars[user]} alt="Tu" className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-400">{user[0]}</span>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        
        {/* VIEW: CALENDARIO */}
        {activeTab === 'calendar' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center p-4 bg-slate-900/60 rounded-2xl border border-white/5 shadow-inner">
              <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 font-black uppercase tracking-[0.2em] text-sm">
                {selectedDay.split('-')[2]} GIUGNO
              </h3>
              <select 
                value={selectedDay} 
                onChange={(e) => { setSelectedDay(e.target.value); logTelemetry('filter_calendar_day', { day: e.target.value }); }}
                className="bg-slate-950 text-white border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-500/50 transition-shadow cursor-pointer hover:border-slate-500"
              >
                {ibizaDays.map(day => (
                  <option key={day} value={day}>{day.split('-')[2]} GIUGNO</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-6">
              {(() => {
                const dayEvents = IBIZA_SCHEDULE.filter(e => e.date === selectedDay);
                const visibleEventsForDay = dayEvents.filter(event => {
                  if (event.group === 'initial' && !isGroup1) return false;
                  if (event.group === 'second' && isGroup1 && !isAle) return false; 
                  return true;
                });

                if (visibleEventsForDay.length === 0) return <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-white/5"><p className="text-sm text-slate-500 italic">Nessun evento visibile per questa data.</p></div>;

                return visibleEventsForDay.map((event) => {
                  const unlockTime = new Date(new Date(`${event.date}T${event.time}:00`).getTime() + 3600000);
                  const isHidden = isAle && now < unlockTime;
                  const eventComments = allComments.filter(c => c.event_id === event.id);

                  return (
                    <div key={event.id} className={`overflow-hidden rounded-3xl border ${isHidden ? 'border-slate-800/50 bg-slate-900/30 opacity-80' : 'border-white/10 bg-slate-800 shadow-xl shadow-yellow-500/5 ring-1 ring-white/5'}`}>
                      <div className="h-40 w-full bg-slate-800 relative overflow-hidden">
                        {isHidden ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                            <span className="text-slate-700 font-mono text-5xl font-black drop-shadow-md">(???)</span>
                          </div>
                        ) : (
                          <>
                            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover brightness-110 saturate-[1.15] transition-transform duration-700 hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent" />
                          </>
                        )}
                        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-lg">
                          <span className="text-yellow-500 font-mono font-black text-xs tracking-wider">{event.time}</span>
                        </div>
                      </div>

                      <div className="p-6 relative bg-gradient-to-br from-slate-800 to-slate-800/95">
                        <h3 className={`text-2xl font-black uppercase tracking-tight drop-shadow-md ${isHidden ? 'text-slate-600' : 'text-white'}`}>{isHidden ? 'Dati Oscurati' : event.title}</h3>
                        <p className="text-sm text-slate-300 mt-1.5 font-medium flex items-center gap-1">
                          <span className="text-yellow-500/80">📍</span> {isHidden ? '(???)' : event.location}
                        </p>

                        {isHidden && (
                          <div className="mt-5 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 p-4 rounded-xl flex justify-between items-center shadow-inner">
                            <span className="text-xs uppercase font-bold text-yellow-600 tracking-wider">Sblocco tra:</span>
                            <span className="font-mono font-black text-yellow-500 text-lg drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]">{Math.max(0, Math.ceil((unlockTime.getTime() - now.getTime()) / 60000))} min</span>
                          </div>
                        )}

                        {!isHidden && (
                          <div className="mt-6 pt-5 border-t border-slate-700/80">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Recensioni</span>
                              <button onClick={() => { setActiveCommentEvent(activeCommentEvent === event.id ? null : event.id); logTelemetry('toggle_comment_box', { event_id: event.id }); }} className="text-[10px] bg-slate-700 hover:bg-slate-600 active:scale-95 px-4 py-2 rounded-lg text-white font-bold transition-all shadow-md border border-white/5">
                                {activeCommentEvent === event.id ? 'Annulla' : '+ Aggiungi'}
                              </button>
                            </div>
                            {eventComments.length > 0 && (
                              <div className="mb-5 space-y-3">
                                {eventComments.map(c => {
                                  const isMyComment = c.author_name === user;
                                  const isEditing = editingCommentId === c.id;
                                  return (
                                    <div key={c.id} className="bg-slate-900/60 p-4 rounded-xl border border-white/5 shadow-inner">
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] text-yellow-500 uppercase font-black tracking-widest">{c.author_name}</span>
                                        {isMyComment && !isEditing && (
                                          <div className="flex gap-3">
                                            <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }} className="text-[9px] text-slate-400 hover:text-yellow-500 font-bold uppercase transition-colors">Modifica</button>
                                            <button onClick={() => handleDeleteComment(c.id)} className="text-[9px] text-slate-400 hover:text-red-500 font-bold uppercase transition-colors">Elimina</button>
                                          </div>
                                        )}
                                      </div>
                                      {isEditing ? (
                                        <div className="flex gap-2 mt-3">
                                          <input type="text" value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
                                          <button onClick={() => handleUpdateComment(c.id)} className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-black shadow-md hover:scale-105 transition-transform">Salva</button>
                                        </div>
                                      ) : <p className="text-sm text-slate-200 mt-1 leading-relaxed">{c.content}</p>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {activeCommentEvent === event.id && (
                              <div className="flex gap-2 mt-2 animate-in slide-in-from-top-2">
                                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 rounded-xl px-4 py-2.5 text-sm text-white transition-all outline-none placeholder:text-slate-500" placeholder="Scrivi la tua recensione..." />
                                <button onClick={() => handlePostComment(event.id)} className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-950 px-5 rounded-xl font-black text-xs uppercase shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all">Invia</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* VIEW: HINTS & INTELLIGENCE */}
        {activeTab === 'news' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* INIZIO BANNER METEO */}
            {weatherInfo && (
              <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-cyan-500/20 rounded-3xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-black uppercase tracking-[0.2em] text-sm drop-shadow-sm">
                    {weatherInfo.type === 'current' ? 'Meteo Attuale Ibiza' : 'Previsioni Viaggio (2-5 Giu)'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    {weatherInfo.type === 'current' ? 'Dati in tempo reale.' : 'Dati aggiornati per l\'evento.'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {weatherInfo.type === 'current' && weatherInfo.current ? (
                    <div className="text-center">
                      <span className="text-3xl">{getWeatherEmoji(weatherInfo.current.weather_code)}</span>
                      <p className="text-xl font-black text-white">{weatherInfo.current.temperature_2m}°C</p>
                    </div>
                  ) : weatherInfo.forecast && weatherInfo.forecast.length > 0 ? (
                    <div className="flex gap-2">
                      {weatherInfo.forecast.map((f: any, idx: number) => (
                        <div key={idx} className="text-center bg-slate-950/50 p-2 rounded-xl border border-white/5">
                          <p className="text-[9px] font-black uppercase text-cyan-500">{f.date.split('-')[2]} GIU</p>
                          <span className="text-lg block my-0.5">{getWeatherEmoji(f.code)}</span>
                          <p className="text-[10px] font-bold text-white">{f.max}° <span className="text-slate-500">{f.min}°</span></p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Attesa dati...</p>
                  )}
                </div>
              </div>
            )}
            {/* FINE BANNER METEO */}

            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 rounded-3xl shadow-2xl overflow-hidden mb-6">
              <div className="p-5 border-b border-white/5 bg-slate-800/30 backdrop-blur-sm">
                <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 font-black uppercase tracking-[0.2em] text-sm drop-shadow-sm">Opzioni Diurne & Esplorazione</h3>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Alternativa ai piani base. Noleggi, spiagge con movida e attività all'aperto.</p>
              </div>
              <div className="p-5 space-y-3">
                {DAYTIME_ACTIVITIES.map((act, aIdx) => (
                  <div key={aIdx} className="bg-slate-950/60 p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors shadow-inner">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-sm font-black text-white uppercase tracking-tight">{act.name}</span>
                    </div>
                    <p className="text-[10px] text-yellow-500/70 font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><span className="text-slate-500">📍</span> {act.location}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{act.details}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 rounded-3xl shadow-2xl overflow-hidden mb-6">
              <div className="p-5 border-b border-white/5 bg-slate-800/30 backdrop-blur-sm">
                <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 font-black uppercase tracking-[0.2em] text-sm drop-shadow-sm">Radar Eventi Notturni</h3>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Club, concerti live, mercatini serali e party alternativi (2-5 Giugno 2026).</p>
              </div>
              <div className="p-5 space-y-8">
                {IBIZA_NEWS.map((day, idx) => (
                  <div key={idx} className="space-y-4">
                    <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] border-b border-slate-800 pb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/50"></span>
                      {day.date}
                    </h4>
                    <div className="space-y-3">
                      {day.events.map((ev, eIdx) => (
                        <div key={eIdx} className="bg-slate-950/60 p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors shadow-inner relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-yellow-600 opacity-50"></div>
                          <div className="pl-2">
                            <span className="text-sm font-black text-white uppercase tracking-tight block">{ev.club}</span>
                            <span className="text-xs font-bold text-yellow-500 mt-0.5 block">{ev.name}</span>
                            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{ev.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5 bg-slate-800/30 backdrop-blur-sm">
                <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 font-black uppercase tracking-[0.2em] text-sm drop-shadow-sm">Top Gastronomia (4-5 Stelle)</h3>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Ordinati per distanza dal Vostro campo base (Carrer del Cap, 8).</p>
              </div>
              <div className="p-5 grid grid-cols-1 gap-3">
                {RECOMMENDED_RESTAURANTS.map((rest, rIdx) => (
                  <div key={rIdx} className="bg-slate-950/60 p-4 rounded-xl border border-white/5 flex flex-col justify-between relative overflow-hidden shadow-inner group hover:border-yellow-500/30 transition-colors">
                    <div className="absolute top-0 right-0 bg-gradient-to-bl from-yellow-500 to-yellow-600 text-slate-950 px-3 py-1.5 rounded-bl-xl font-black text-[10px] z-10 shadow-md">
                      {rest.distance}
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1.5 pr-14">
                        <span className="text-sm font-black text-white uppercase tracking-tight group-hover:text-yellow-500 transition-colors">{rest.name}</span>
                        <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded shadow-sm">{rest.rating} ★</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed pr-2 italic">"{rest.desc}"</p>
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
            
            <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 mb-6 shadow-lg">
              <button onClick={() => { setCompariSubTab('directory'); logTelemetry('filter_compari', { sub_tab: 'directory' }); }} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${compariSubTab === 'directory' ? 'bg-slate-800 text-yellow-500 shadow-md border border-white/5' : 'text-slate-500 hover:text-slate-400'}`}>Directory</button>
              <button onClick={() => { setCompariSubTab('cassa'); logTelemetry('filter_compari', { sub_tab: 'cassa' }); }} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${compariSubTab === 'cassa' ? 'bg-slate-800 text-yellow-500 shadow-md border border-white/5' : 'text-slate-500 hover:text-slate-400'}`}>Cassa Comune</button>
            </div>

            {/* SUB-VIEW: DIRECTORY */}
            {compariSubTab === 'directory' && (
              <>
                <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 p-5 rounded-3xl mb-6 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-yellow-600 font-black mb-2">Sballato del Giorno</h4>
                  {dailyLeaders.length > 0 ? (
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-sm">{dailyLeaders.join(' & ')} <span className="text-sm text-slate-400 font-bold ml-2 tracking-normal text-white">in testa</span></p>
                  ) : <p className="text-sm text-slate-400 italic font-medium">Nessun voto registrato oggi.</p>}
                </div>
                
                {ALL_PARTICIPANTS.map(p => {
                  const isMe = user === p;
                  const isExpanded = expandedUser === p;
                  return (
                    <div key={p} className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 rounded-3xl shadow-xl overflow-hidden transition-all duration-300 mb-4 hover:border-slate-700">
                      <div onClick={() => { setExpandedUser(isExpanded ? null : p); if (!isExpanded) logTelemetry('expand_user_profile', { profile: p }); }} className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-800 border-2 border-slate-700/50 rounded-full flex items-center justify-center text-xl font-black text-slate-400 overflow-hidden shadow-inner">
                            {avatars[p] ? <img src={avatars[p]} alt={p} className="w-full h-full object-cover" /> : <span>{p[0]}</span>}
                          </div>
                          <div>
                            <h4 className="font-black text-xl tracking-tight text-white">{p} {isMe && <span className="text-[9px] bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-950 px-2 py-0.5 rounded shadow-sm uppercase font-black ml-2 tracking-widest align-middle">Tu</span>}</h4>
                            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mt-0.5">{GROUP_1.includes(p) ? 'Gruppo 1 - Sposo/Testimoni' : 'Gruppo 2 - Amici'}</p>
                          </div>
                        </div>
                        <div className={`text-slate-500 font-mono text-2xl font-light transition-transform duration-300 ${isExpanded ? 'rotate-45 text-yellow-500' : ''}`}>+</div>
                      </div>

                      {isExpanded && (
                        <div className="p-5 bg-slate-950/80 border-t border-slate-800/80 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 shadow-inner text-center">
                              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Recensioni</p>
                              <p className="text-2xl font-black text-white">{allComments.filter(c => c.author_name === p).length}</p>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 shadow-inner text-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none"></div>
                              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1 relative z-10">Voti Ricevuti</p>
                              <p className="text-2xl font-black text-yellow-500 drop-shadow-sm relative z-10">{todayVotes.filter(v => v.candidate_name === p).length}</p>
                            </div>
                          </div>

                          {isMe ? (
                            <div className="space-y-4">
                              <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-yellow-500/50 hover:bg-yellow-500/5 text-slate-400 transition-all group">
                                <span className="text-[11px] uppercase font-black tracking-widest group-hover:text-yellow-500 transition-colors">{isUploadingAvatar ? 'Sincronizzazione...' : 'Aggiorna Fotografia'}</span>
                                <input type="file" className="hidden" accept="image/*" disabled={isUploadingAvatar} onChange={handleUploadAvatar} />
                              </label>
                              
                              <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 shadow-inner">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-[10px] uppercase text-slate-500 font-black tracking-widest">I Miei Biglietti (PDF/IMG)</span>
                                  <label className="bg-slate-800 hover:bg-yellow-500 hover:text-slate-950 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all shadow-md">
                                    {isUploadingTicket ? 'Caricamento...' : '+ Aggiungi'}
                                    <input type="file" className="hidden" accept="application/pdf,image/*" disabled={isUploadingTicket} onChange={handleUploadTicket} />
                                  </label>
                                </div>
                                {myTickets.length > 0 ? (
                                  <div className="space-y-2">
                                    {myTickets.map((ticket, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-white/5">
                                        <a href={ticket.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white hover:text-yellow-500 truncate flex-1 pr-4">{ticket.name}</a>
                                        <button onClick={() => handleDeleteTicket(ticket.name)} className="text-[9px] font-black text-red-500/80 hover:text-red-500 uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded">Elimina</button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-600 font-medium italic">Nessun documento di viaggio caricato.</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <button onClick={() => handleVoteSballato(p)} disabled={hasVotedToday} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${hasVotedToday ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed' : 'bg-slate-800 border-slate-700 text-white hover:bg-yellow-500 hover:text-slate-950 hover:border-yellow-400 shadow-lg active:scale-95'}`}>
                                {hasVotedToday ? 'Voto Registrato' : 'Vota come Sballato'}
                              </button>
                              {votedCandidate === p && (
                                <button onClick={handleRemoveVote} className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 text-[10px] font-black py-3.5 px-5 rounded-2xl uppercase tracking-widest transition-colors active:scale-95">Ritira Voto</button>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 p-5 rounded-3xl flex flex-col justify-center items-center shadow-xl relative overflow-hidden">
                    <span className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1.5 relative z-10">Totale Cassa</span>
                    <span className="text-3xl font-black text-white tracking-tight relative z-10">€{totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 p-5 rounded-3xl flex flex-col justify-center items-center shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none"></div>
                    <span className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1.5 relative z-10">Quota Personale</span>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-sm tracking-tight relative z-10">€{quotaPerPerson.toFixed(2)}</span>
                    <span className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-widest relative z-10">Su 11 Quote</span>
                  </div>
                </div>

                <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 p-6 rounded-3xl shadow-2xl">
                  <h4 className="text-[10px] uppercase text-slate-400 font-black mb-4 tracking-[0.2em]">Registrazione Nuova Spesa</h4>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={expenseDesc} 
                      onChange={(e) => setExpenseDesc(e.target.value)} 
                      placeholder="Descrizione (es. Spesa Villa)" 
                      className="flex-1 min-w-0 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all placeholder:text-slate-600"
                    />
                    <input 
                      type="number" 
                      value={expenseAmount} 
                      onChange={(e) => setExpenseAmount(e.target.value)} 
                      placeholder="€ 0.00" 
                      className="w-24 shrink-0 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-3 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <button onClick={handleAddExpense} className="w-full mt-4 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:scale-[1.01] active:scale-95 text-slate-950 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-yellow-500/20 transition-all">
                    Processa Transazione
                  </button>
                </div>

                <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 p-6 rounded-3xl shadow-2xl">
                  <h4 className="text-[10px] uppercase text-slate-400 font-black mb-5 tracking-[0.2em] border-b border-slate-800 pb-3">Stato Bilanci Individuali</h4>
                  <div className="space-y-2.5">
                    {ALL_PARTICIPANTS.map(p => {
                      const data = balances[p];
                      const isMe = user === p;
                      let statusText = '';
                      let statusColor = 'text-slate-400';
                      let bgAccent = '';
                      
                      if (data.isGroom) {
                        statusText = "Ospite d'Onore";
                        statusColor = "text-yellow-500";
                        bgAccent = "bg-yellow-500/5 border-yellow-500/20";
                      } else if (data.balance > 0.01) {
                        statusText = `Credito: €${data.balance.toFixed(2)}`;
                        statusColor = "text-emerald-400";
                        bgAccent = "bg-emerald-500/5 border-emerald-500/10";
                      } else if (data.balance < -0.01) {
                        statusText = `Debito: €${Math.abs(data.balance).toFixed(2)}`;
                        statusColor = "text-red-400";
                        bgAccent = "bg-red-500/5 border-red-500/10";
                      } else {
                        statusText = "Bilancio in Pari";
                        statusColor = "text-slate-400";
                        bgAccent = "bg-slate-800/30 border-transparent";
                      }

                      return (
                        <div key={p} className={`flex justify-between items-center p-3 rounded-xl border ${isMe ? 'ring-1 ring-white/10 shadow-md' : ''} ${bgAccent} transition-colors`}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-xs font-black overflow-hidden shadow-inner">
                              {avatars[p] ? <img src={avatars[p]} alt={p} className="w-full h-full object-cover" /> : <span className="text-slate-400">{p[0]}</span>}
                            </div>
                            <span className="font-bold text-sm text-white">{p}</span>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-black uppercase tracking-wider ${statusColor}`}>{statusText}</div>
                            {!data.isGroom && <div className="text-[10px] text-slate-500 font-bold mt-0.5">Versato: €{data.paid.toFixed(2)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 p-6 rounded-3xl shadow-2xl">
                  <h4 className="text-[10px] uppercase text-slate-400 font-black mb-5 tracking-[0.2em] border-b border-slate-800 pb-3">Registro Attività Finanziarie</h4>
                  {sharedExpenses.length === 0 ? (
                    <p className="text-sm text-slate-500 font-medium italic text-center py-6 bg-slate-950/50 rounded-xl border border-white/5">Nessuna transazione rilevata nel database.</p>
                  ) : (
                    <div className="space-y-3">
                      {sharedExpenses.map(expense => {
                        const isMyExpense = user === expense.payer_name;
                        const { date, time } = formatDateString(expense.created_at);
                        return (
                          <div key={expense.id} className="bg-slate-950/80 p-4 rounded-xl border border-white/5 shadow-inner flex justify-between items-center">
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-tight">{expense.description}</p>
                              <p className="text-[10px] text-slate-500 mt-1 font-bold">BY: <span className="text-yellow-500/80 uppercase mr-2">{expense.payer_name}</span> <span className="font-mono font-normal opacity-70">{date} - {time}</span></p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="font-black text-xl text-white tracking-tight drop-shadow-md">€{Number(expense.amount).toFixed(2)}</span>
                              {isMyExpense && (
                                <button onClick={() => handleDeleteExpense(expense.id, expense.payer_name)} className="text-[9px] font-bold uppercase tracking-widest text-red-500/80 hover:text-red-500 transition-colors bg-red-500/10 px-2 py-0.5 rounded">
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
            <div className="flex justify-between items-center mb-6 bg-slate-900/40 p-4 rounded-2xl border border-white/5 shadow-inner">
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-200 drop-shadow-sm">Archivio Foto</h3>
              <label className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-950 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase cursor-pointer shadow-lg shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                {isUploadingMedia ? 'Sincronizzazione...' : '+ Carica File'}
                <input type="file" className="hidden" accept="image/*" disabled={isUploadingMedia} onChange={handleUploadMedia} />
              </label>
            </div>

            <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 mb-8 shadow-lg">
              <button onClick={() => { setGalleryFilter('mine'); logTelemetry('filter_gallery', { view: 'mine' }); }} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${galleryFilter === 'mine' ? 'bg-slate-800 text-yellow-500 shadow-md border border-white/5' : 'text-slate-500 hover:text-slate-400'}`}>I Miei File</button>
              <button onClick={() => { setGalleryFilter('others'); logTelemetry('filter_gallery', { view: 'others' }); }} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${galleryFilter === 'others' ? 'bg-slate-800 text-yellow-500 shadow-md border border-white/5' : 'text-slate-500 hover:text-slate-400'}`}>Archivio Compari</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {galleryMedia
                .filter(media => galleryFilter === 'mine' ? media.uploader_name === user : media.uploader_name !== user)
                .map((media) => {
                  const { date, time } = formatDateString(media.created_at);
                  
                  return (
                    <div key={media.id} className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl shadow-black/40 group">
                      <div className="w-full aspect-square bg-slate-950 relative flex items-center justify-center overflow-hidden">
                        <img src={media.media_url} alt="Media" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      
                      <div className="p-5 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col gap-4 border-t border-slate-800 relative z-10">
                        <div className="flex justify-between items-start">
                          <div>
                            {galleryFilter === 'others' && (
                              <p className="text-[10px] uppercase font-black tracking-widest text-yellow-500 mb-1">BY: {media.uploader_name}</p>
                            )}
                            <p className="text-[11px] text-slate-400 font-mono font-medium">{date} <span className="opacity-50">/</span> {time}</p>
                          </div>
                          <button 
                            onClick={() => handleMediaDownload(media.media_url)}
                            className="bg-slate-800 hover:bg-yellow-500 hover:text-slate-950 hover:border-yellow-400 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 border border-white/5 flex items-center gap-2"
                          >
                            ⬇ Salva
                          </button>
                        </div>

                        {galleryFilter === 'mine' && (
                          <button 
                            onClick={() => handleDeleteMedia(media.id, media.media_url)}
                            className="w-full mt-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-[10px] font-black py-2.5 rounded-xl uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm"
                          >
                            Elimina
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              
              {galleryMedia.filter(m => galleryFilter === 'mine' ? m.uploader_name === user : m.uploader_name !== user).length === 0 && (
                <div className="col-span-full py-16 px-4 text-center bg-slate-900/30 rounded-3xl border border-white/5 border-dashed">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    {galleryFilter === 'mine' ? 'Nessun file caricato' : 'Nessun file condiviso'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-2">I file multimediali appariranno qui dopo il caricamento.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/85 backdrop-blur-2xl border-t border-white/10 p-3 sm:p-5 flex justify-around items-center z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pb-safe">
        {[
          { id: 'calendar', label: 'Calendario' },
          { id: 'news', label: 'Hints' },
          { id: 'gallery', label: 'Galleria' },
          { id: 'compari', label: 'Compari' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id)}
            className={`text-[9px] uppercase font-black tracking-[0.2em] transition-all px-4 py-2.5 rounded-xl ${activeTab === tab.id ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-950 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </main>
  );
}