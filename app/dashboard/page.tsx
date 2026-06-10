'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || 'BNgK0nR6M90_gPxXra_lCVF_HjPUj0Xbvmz6n1VFOh20lJjs7BHBsNnEVZbaCVohhMK5apH5xGpGULXTyYgkIjw';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
};

// --- CONFIGURAZIONE DOPPIO HUB ---
type HubType = 'ibiza' | 'test' | null;

const HUB_CONFIG = {
  ibiza: {
    id: '8ed48917-c73b-4d6f-a83e-c35e1dd0de52',
    name: 'Ibiza 2026',
    isArchived: true, 
    requiresPassword: false,
    password: '',
    category: 'travel' // Categoria Travel = Oro
  },
  test: {
    id: 'test-hub-0000-0000-0000-000000000000',
    name: 'Hub Test',
    isArchived: false,
    requiresPassword: true,
    password: 'Exc@l1bur0!',
    category: 'party' // Categoria Party = Rosa/Fucsia (Per farle vedere la differenza!)
  }
};

// --- MOTORE DEI TEMI ---
const THEME_COLORS: Record<string, any> = {
  travel: {
    text: 'text-yellow-500',
    textHover: 'hover:text-yellow-400',
    gradient: 'from-yellow-400 to-yellow-600',
    bgLight: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    borderHover: 'hover:border-yellow-500/50',
    shadow: 'shadow-yellow-500/20'
  },
  party: {
    text: 'text-rose-500',
    textHover: 'hover:text-rose-400',
    gradient: 'from-rose-400 to-pink-600',
    bgLight: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    borderHover: 'hover:border-rose-500/50',
    shadow: 'shadow-rose-500/20'
  },
  social: {
    text: 'text-emerald-500',
    textHover: 'hover:text-emerald-400',
    gradient: 'from-emerald-400 to-teal-600',
    bgLight: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    borderHover: 'hover:border-emerald-500/50',
    shadow: 'shadow-emerald-500/20'
  },
  corporate: {
    text: 'text-blue-500',
    textHover: 'hover:text-blue-400',
    gradient: 'from-blue-400 to-indigo-600',
    bgLight: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    borderHover: 'hover:border-blue-500/50',
    shadow: 'shadow-blue-500/20'
  }
};

const HUB_TEMPLATES = [
  { id: 'travel', icon: '✈️', title: 'Travel & Viaggi', desc: 'Voli, cassa comune, tappe, documenti.', types: ['Viaggio di Gruppo', 'Viaggio di Coppia', 'Gita fuori porta'] },
  { id: 'party', icon: '🎉', title: 'Celebrazioni', desc: 'Feste, lauree, matrimoni, lista invitati.', types: ['Compleanno', 'Festa di Laurea', 'Addio Celibato/Nubilato', 'Matrimonio'] },
  { id: 'social', icon: '🍽️', title: 'Social', desc: 'Cene, divisione conti, ritrovi veloci.', types: ['Cena di Gruppo', 'Serata / Uscita'] },
  { id: 'corporate', icon: '💼', title: 'Corporate', desc: 'Meeting, agenda relatori, networking.', types: ['Evento Aziendale', 'Team Building'] }
];

// DATASET EVENTI IBIZA
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

const IBIZA_NEWS = [
  { date: '02 GIUGNO 2026', events: [{ club: 'Cafè Mambo', name: 'Sunset Sessions', details: 'Aperitivo al tramonto. Dalle 18:00.' }, { club: 'Pacha', name: 'Chris Stussy', details: 'Ingresso dalle 23:00.' }] },
  { date: '03 GIUGNO 2026', events: [{ club: 'Las Dalias', name: 'Night Market', details: 'Dalle 19:00.' }, { club: 'Ushuaïa', name: 'Tomorrowland Pres. Dimitri Vegas', details: 'Dalle 17:00.' }] },
  { date: '04 GIUGNO 2026', events: [{ club: 'Pikes Ibiza', name: 'House Party', details: 'Dalle 20:00.' }, { club: 'Amnesia', name: 'Do Not Sleep', details: 'Ingresso dalle 23:00.' }] },
  { date: '05 GIUGNO 2026', events: [{ club: 'O Beach', name: 'Pool Party', details: 'Dalle 13:00.' }, { club: 'Ushuaïa', name: 'Calvin Harris', details: 'Dalle 17:00.' }] }
];

const DAYTIME_ACTIVITIES = [
  { name: 'Noleggio Gommoni', location: 'Sant Antoni', details: 'Esplorare calette ovest (Cala Bassa). 250€/giorno.' },
  { name: 'Sa Trinxa', location: 'Las Salinas', details: 'Atmosfera festosa, musica balearica dal vivo.' }
];

const RECOMMENDED_RESTAURANTS = [
  { name: 'Es Boldadó', distance: '1.2 km', rating: '4.6', desc: 'Arroccato sulla scogliera. La migliore vista su Es Vedrà.' },
  { name: 'Jul\'s Ibiza', distance: '10.5 km', rating: '4.5', desc: 'Ristorazione raffinata d\'ispirazione greca a Sa Caleta.' }
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
  const router = useRouter();

  // --- STATI HUB & PASSWORD ---
  const [activeHub, setActiveHub] = useState<HubType>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<boolean>(false);
  
  // Creazione Hub
  const [isCreatingHub, setIsCreatingHub] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // --- STATI GLOBALI ---
  const [user, setUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar'); 
  const [selectedDay, setSelectedDay] = useState('2026-06-02');
  const [now, setNow] = useState(new Date());
  
  // Missione (Commenti)
  const [activeCommentEvent, setActiveCommentEvent] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [allComments, setAllComments] = useState<any[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Compari
  const [compariSubTab, setCompariSubTab] = useState<'directory' | 'cassa'>('directory');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [todayVotes, setTodayVotes] = useState<any[]>([]);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [votedCandidate, setVotedCandidate] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Documenti Sdoppiati
  const [myBoardingPasses, setMyBoardingPasses] = useState<{name: string, url: string}[]>([]);
  const [myIdDocs, setMyIdDocs] = useState<{name: string, url: string}[]>([]);
  const [isUploadingBoarding, setIsUploadingBoarding] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);

  // Cassa
  const [sharedExpenses, setSharedExpenses] = useState<any[]>([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Galleria
  const [galleryMedia, setGalleryMedia] = useState<any[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'mine' | 'others'>('mine');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Meteo & Push
  const [weatherInfo, setWeatherInfo] = useState<{ type: 'current' | 'forecast', current?: any, forecast?: any[] } | null>(null);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');

  const isArchived = activeHub ? HUB_CONFIG[activeHub].isArchived : false;
  
  // DETERMINAZIONE TEMA CORRENTE
  const currentCategory = activeHub ? HUB_CONFIG[activeHub].category : 'travel';
  const t = THEME_COLORS[currentCategory];

  // --- LOGICA HUB & TELEMETRIA ---
  const handleHubSelect = (hub: HubType) => {
    if (hub && HUB_CONFIG[hub].requiresPassword) { setActiveHub(hub); setIsUnlocked(false); } 
    else { setActiveHub(hub); setIsUnlocked(true); }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeHub && passwordInput === HUB_CONFIG[activeHub].password) { setIsUnlocked(true); setPasswordError(false); } 
    else { setPasswordError(true); }
  };

  const logTelemetry = async (actionType: string, detailsPayload: any = {}) => {
    if (isArchived) return; 
    const currentUser = localStorage.getItem('ibiza_user');
    if (!currentUser) return;
    supabase.from('usage_logs').insert([{ username: currentUser, action_type: actionType, details: detailsPayload }])
      .then(({ error }) => { if (error) console.error(error); });
  };

  // --- FETCH DATI ---
  const fetchData = async () => {
    const { data: comments } = await supabase.from('event_comments').select('*').order('created_at', { ascending: true });
    if (comments) setAllComments(comments);

    const todayISO = new Date().toISOString().split('T')[0];
    const { data: votes } = await supabase.from('daily_sballato_votes').select('*').eq('vote_date', todayISO);
    if (votes) {
      setTodayVotes(votes);
      const userLogged = localStorage.getItem('ibiza_user');
      const userVote = votes.find(v => v.voter_name === userLogged);
      setHasVotedToday(!!userVote);
      setVotedCandidate(userVote ? userVote.candidate_name : null);
    }

    const currentUser = localStorage.getItem('ibiza_user');
    if (currentUser) {
      const { data: boardingFiles } = await supabase.storage.from('flight_tickets').list(`${currentUser}/boarding`);
      if (boardingFiles) {
        setMyBoardingPasses(boardingFiles.filter(f => f.name !== '.emptyFolderPlaceholder' && f.id).map(file => ({ name: file.name, url: supabase.storage.from('flight_tickets').getPublicUrl(`${currentUser}/boarding/${file.name}`).data.publicUrl })));
      }
      const { data: idFiles } = await supabase.storage.from('flight_tickets').list(`${currentUser}/id`);
      if (idFiles) {
        setMyIdDocs(idFiles.filter(f => f.name !== '.emptyFolderPlaceholder' && f.id).map(file => ({ name: file.name, url: supabase.storage.from('flight_tickets').getPublicUrl(`${currentUser}/id/${file.name}`).data.publicUrl })));
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
      if (today < new Date('2026-05-30T00:00:00')) {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.9067&longitude=1.4206&current=temperature_2m,weather_code');
        const data = await res.json();
        if (data?.current) setWeatherInfo({ type: 'current', current: data.current });
      } else {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.9067&longitude=1.4206&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin');
        const data = await res.json();
        if (data?.daily) {
          const forecastDays = [];
          for(let i=0; i<data.daily.time.length; i++) {
            if (['2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'].includes(data.daily.time[i])) {
              forecastDays.push({ date: data.daily.time[i], max: data.daily.temperature_2m_max[i], min: data.daily.temperature_2m_min[i], code: data.daily.weather_code[i] });
            }
          }
          setWeatherInfo({ type: 'forecast', forecast: forecastDays });
        }
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('ibiza_user');
    if (!savedUser) router.push('/'); else setUser(savedUser);
    if (activeHub && isUnlocked) { logTelemetry('app_open'); fetchData(); fetchWeather(); }
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [router, activeHub, isUnlocked]);

  // --- AZIONI PRINCIPALI ---
  const handleTabSwitch = (tabId: string) => {
    setActiveTab(tabId);
    logTelemetry('tab_switch', { target_tab: tabId });
  };

  const enablePushNotifications = async () => {
    if (isArchived || !user || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === 'granted') {
        let sub = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) });
        if (sub) { await supabase.from('push_subscriptions').upsert({ username: user, subscription_data: JSON.parse(JSON.stringify(sub)) }); logTelemetry('push_enabled'); }
      }
    } catch (e) { console.error(e); }
  };

  const handlePostComment = async (eventId: string) => {
    if (isArchived || !commentText.trim() || !user) return;
    await supabase.from('event_comments').insert([{ event_id: eventId, author_name: user, content: commentText }]);
    setCommentText(''); setActiveCommentEvent(null); fetchData();
  };

  const handleDeleteComment = async (id: string) => { if (!isArchived) { await supabase.from('event_comments').delete().eq('id', id); fetchData(); } };
  const handleUpdateComment = async (id: string) => { if (!isArchived) { await supabase.from('event_comments').update({ content: editCommentText }).eq('id', id); setEditingCommentId(null); fetchData(); } };

  const handleVoteSballato = async (candidateName: string) => {
    if (isArchived || !user || hasVotedToday) return;
    await supabase.from('daily_sballato_votes').insert([{ voter_name: user, candidate_name: candidateName, vote_date: new Date().toISOString().split('T')[0] }]);
    fetchData();
  };
  const handleRemoveVote = async () => { if (!isArchived && user) { await supabase.from('daily_sballato_votes').delete().match({ voter_name: user, vote_date: new Date().toISOString().split('T')[0] }); fetchData(); } };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isArchived || !event.target.files?.[0] || !user) return;
    setIsUploadingAvatar(true);
    const file = event.target.files[0];
    const fileName = `${user}-${Math.random()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    await supabase.from('user_avatars').upsert({ username: user, avatar_url: supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl });
    setIsUploadingAvatar(false); fetchData();
  };

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>, type: 'boarding' | 'id') => {
    if (isArchived || !event.target.files?.[0] || !user) return;
    type === 'boarding' ? setIsUploadingBoarding(true) : setIsUploadingId(true);
    const file = event.target.files[0];
    await supabase.storage.from('flight_tickets').upload(`${user}/${type}/${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`, file, { upsert: true });
    type === 'boarding' ? setIsUploadingBoarding(false) : setIsUploadingId(false); fetchData();
  };

  const handleDeleteDocument = async (fileName: string, type: 'boarding' | 'id') => {
    if (isArchived || !user || !window.confirm("Eliminare?")) return;
    await supabase.storage.from('flight_tickets').remove([`${user}/${type}/${fileName}`]);
    fetchData();
  };

  const handleAddExpense = async () => {
    if (isArchived || !expenseDesc.trim() || !expenseAmount || isNaN(Number(expenseAmount))) return;
    await supabase.from('shared_expenses').insert([{ payer_name: user, description: expenseDesc, amount: Number(expenseAmount) }]);
    setExpenseDesc(''); setExpenseAmount(''); fetchData();
  };

  const handleDeleteExpense = async (id: string, payerName: string) => { if (!isArchived && user === payerName && window.confirm("Eliminare?")) { await supabase.from('shared_expenses').delete().eq('id', id); fetchData(); } };

  const handleUploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isArchived || !event.target.files?.[0] || !user) return;
    setIsUploadingMedia(true);
    const file = event.target.files[0];
    const fileName = `${user}-${Date.now()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('gallery').upload(fileName, file);
    await supabase.from('gallery_media').insert([{ uploader_name: user, media_url: supabase.storage.from('gallery').getPublicUrl(fileName).data.publicUrl, media_type: file.type.startsWith('video/') ? 'video' : 'image' }]);
    setIsUploadingMedia(false); fetchData();
  };

  const handleDeleteMedia = async (mediaId: string, mediaUrl: string) => {
    if ((isArchived && user !== 'Fabri') || !user || !window.confirm("Eliminare?")) return;
    await supabase.storage.from('gallery').remove([mediaUrl.split('/').pop() || '']);
    await supabase.from('gallery_media').delete().eq('id', mediaId);
    fetchData();
  };

  const handleMediaDownload = async (mediaUrl: string) => {
    const response = await fetch(mediaUrl); const blob = await response.blob();
    const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'download'; a.click();
  };

  const handleFlareSOS = () => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => window.location.href = `whatsapp://send?text=${encodeURIComponent(`SOS: http://maps.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`)}`); };
  const handleTaxiClick = () => { logTelemetry('villa_navigation'); };
  const handleSmartTransport = () => {
    const launchUber = () => window.location.href = 'https://m.uber.com/ul/?action=setPickup&pickup=my_location';
    if (!navigator.geolocation) return launchUber();
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      if (lat >= 38.8 && lat <= 39.1 && lon >= 1.1 && lon <= 1.7) { if (window.confirm("📍 IBIZA RILEVATA: Chiamare Radio Taxi Ibiza?")) window.location.href = 'tel:+34971398483'; } else launchUber();
    }, () => launchUber());
  };

  // --- CALCOLI CASSA & VARIE ---
  const totalExpenses = sharedExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const quotaPerPerson = totalExpenses / 11; 
  const balances: Record<string, { paid: number, balance: number, isGroom: boolean }> = {};
  ALL_PARTICIPANTS.forEach(p => {
    if (p === 'Alessandro') balances[p] = { paid: 0, balance: 0, isGroom: true };
    else { const paid = sharedExpenses.filter(e => e.payer_name === p).reduce((acc, curr) => acc + Number(curr.amount), 0); balances[p] = { paid, balance: paid - quotaPerPerson, isGroom: false }; }
  });

  const optimizedTransfers = (() => {
    const debtors: any[] = [], creditors: any[] = [];
    Object.entries(balances).forEach(([name, data]) => { if (!data.isGroom) { if (data.balance < -0.01) debtors.push({ name, amount: Math.abs(data.balance) }); if (data.balance > 0.01) creditors.push({ name, amount: data.balance }); } });
    debtors.sort((a, b) => b.amount - a.amount); creditors.sort((a, b) => b.amount - a.amount);
    const transfers = []; let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amt = Math.min(debtors[i].amount, creditors[j].amount);
      transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: amt });
      debtors[i].amount -= amt; creditors[j].amount -= amt;
      if (debtors[i].amount < 0.01) i++; if (creditors[j].amount < 0.01) j++;
    }
    return transfers;
  })();

  const formatDateString = (isoString: string) => { const d = new Date(isoString); return { date: d.toLocaleDateString('it-IT'), time: d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }; };
  const dailyLeaders = (() => {
    const counts: Record<string, number> = {}; todayVotes.forEach(v => counts[v.candidate_name] = (counts[v.candidate_name] || 0) + 1);
    const max = Math.max(...Object.values(counts), 0); return max === 0 ? [] : Object.keys(counts).filter(k => counts[k] === max);
  })();

  if (!user) return <div className="bg-slate-950 min-h-screen" />;

  // --- LOBBY RINNOVATA (La lobby usa i colori standard oro per tutti) ---
  if (!activeHub) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-12 selection:bg-yellow-500/30">
        
        {!isCreatingHub ? (
          // SCHERMATA 1: I MIEI HUB
          <div className="w-full max-w-sm animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 uppercase tracking-widest drop-shadow-sm">I Miei Hub</h1>
              <p className="text-slate-400 text-sm mt-2 font-medium">Seleziona un evento esistente o creane uno nuovo.</p>
            </div>

            <div className="space-y-4">
              <button onClick={() => handleHubSelect('ibiza')} className="w-full bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 hover:border-yellow-500/50 p-5 rounded-3xl flex items-center justify-between transition-all group shadow-xl">
                <div className="flex items-center gap-4">
                  <span className="text-3xl bg-slate-800 p-3 rounded-2xl group-hover:scale-110 transition-transform shadow-inner">🌴</span>
                  <div className="text-left">
                    <span className="font-black text-lg block text-white group-hover:text-yellow-500 transition-colors tracking-tight">Ibiza 2026</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Viaggio di Gruppo</span>
                  </div>
                </div>
                <span className="text-[9px] uppercase font-black text-slate-500 bg-slate-950 px-2 py-1 rounded border border-white/5 shadow-inner">Lettura</span>
              </button>

              <button onClick={() => handleHubSelect('test')} className="w-full bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 hover:border-rose-500/50 p-5 rounded-3xl flex items-center justify-between transition-all group shadow-xl">
                <div className="flex items-center gap-4">
                  <span className="text-3xl bg-slate-800 p-3 rounded-2xl group-hover:scale-110 transition-transform shadow-inner">🎉</span>
                  <div className="text-left">
                    <span className="font-black text-lg block text-white group-hover:text-rose-500 transition-colors tracking-tight">Matrimonio Test</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Sviluppo Locale</span>
                  </div>
                </div>
                <span className="text-[9px] uppercase font-black text-rose-500 bg-rose-900/20 px-2 py-1 rounded border border-rose-500/20 shadow-inner">Privato</span>
              </button>

              <button onClick={() => setIsCreatingHub(true)} className="w-full mt-8 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:scale-[1.02] active:scale-95 text-slate-950 p-4 rounded-3xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/20">
                <span className="text-xl font-black">+</span><span className="font-black uppercase tracking-[0.2em] text-[11px]">Crea Nuovo Hub</span>
              </button>
            </div>
          </div>
        ) : (
          // SCHERMATA 2: SELEZIONE TEMPLATE
          <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-300">
            <div className="flex items-center mb-8 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
              <button onClick={() => { setIsCreatingHub(false); setSelectedCategory(null); }} className="text-slate-400 hover:text-white bg-slate-800 p-3 rounded-xl mr-4 transition-colors active:scale-95">←</button>
              <div><h2 className="text-lg font-black text-white uppercase tracking-widest">Scegli il Modello</h2><p className="text-xs text-slate-400 font-medium">Configurazione automatica moduli</p></div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {HUB_TEMPLATES.map(category => (
                <div key={category.id} className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                  <div onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)} className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl bg-slate-950 p-3 rounded-2xl shadow-inner border border-white/5">{category.icon}</span>
                      <div><h3 className="font-black text-white text-sm uppercase tracking-widest">{category.title}</h3><p className="text-[10px] text-slate-500 font-bold mt-1 pr-4">{category.desc}</p></div>
                    </div>
                    <span className={`text-slate-500 font-black transition-transform ${selectedCategory === category.id ? 'rotate-90 text-yellow-500' : ''}`}>❯</span>
                  </div>
                  {selectedCategory === category.id && (
                    <div className="bg-slate-950 p-5 border-t border-slate-800/80 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2">
                      <p className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2">Tipologie Disponibili:</p>
                      {category.types.map(type => (
                        <button key={type} onClick={() => alert(`Prossimo Step: Creazione Hub di tipo ${type}`)} className="text-left w-full p-4 bg-slate-900 hover:bg-yellow-500 hover:text-slate-950 text-slate-300 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border border-white/5 hover:border-yellow-400 shadow-sm">{type}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- GATEKEEPER ---
  if (activeHub && !isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm bg-slate-900 border border-white/5 p-8 rounded-3xl space-y-4">
          <h2 className={`text-xl font-black text-center mb-6 ${t.text}`}>Area Riservata</h2>
          <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={`w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-yellow-500`} placeholder="Password" />
          {passwordError && <p className="text-red-500 text-[10px] text-center font-bold">Errata</p>}
          <button type="submit" className={`w-full bg-gradient-to-r ${t.gradient} text-slate-950 font-black py-3 rounded-xl uppercase text-xs ${t.shadow} shadow-lg hover:scale-105 transition-transform`}>Sblocca</button>
          <button type="button" onClick={() => setActiveHub(null)} className="w-full text-[10px] text-slate-500 uppercase mt-4 hover:text-white">← Esci</button>
        </form>
      </div>
    );
  }

  // --- DASHBOARD MAIN (DINAMICA CON IL TEMA) ---
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans">
      
      {/* HEADER DINAMICO */}
      <header className="p-4 border-b border-white/5 bg-slate-950/80 sticky top-0 backdrop-blur-2xl z-50 flex justify-between items-center">
        <div>
          <h2 className={`text-transparent bg-clip-text bg-gradient-to-r ${t.gradient} text-[10px] font-black uppercase tracking-widest`}>
            {HUB_CONFIG[activeHub].name}
            {isArchived && <span className="ml-2 bg-red-500/10 text-red-500 px-1 rounded">LETTURA</span>}
          </h2>
          <p className="font-bold text-white">Accesso: {user}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveHub(null)} className="w-10 h-10 bg-slate-900 border border-white/5 rounded-full text-sm">🚪</button>
          {!isArchived && <button onClick={enablePushNotifications} className={`w-10 h-10 ${t.bgLight} ${t.text} rounded-full text-lg`}>🔔</button>}
          <div className={`w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 ${t.border}`}>{avatars[user] ? <img src={avatars[user]} className="w-full h-full object-cover" /> : user[0]}</div>
        </div>
      </header>

      {/* QUICK ACTIONS DINAMICHE */}
      {!isArchived && (
        <div className="px-4 pt-5 pb-1 animate-in slide-in-from-top-4 duration-500">
          <div className="flex gap-2">
            <button onClick={handleFlareSOS} className="flex-1 py-3 bg-red-700 rounded-2xl flex flex-col items-center shadow-lg"><span className="text-lg">🎯</span><span className="text-[8px] font-black uppercase text-white">SOS</span></button>
            <button onClick={handleSmartTransport} className="flex-1 py-3 bg-slate-800 rounded-2xl flex flex-col items-center border border-slate-700 shadow-lg"><span className="text-lg">🚘</span><span className="text-[8px] font-black uppercase text-white">Trasporto</span></button>
            <a href="http://maps.google.com/maps?q=ibiza+villa" target="_blank" rel="noopener noreferrer" onClick={handleTaxiClick} className={`flex-1 py-3 bg-gradient-to-r ${t.gradient} text-slate-950 rounded-2xl flex flex-col items-center shadow-lg`}><span className="text-lg">📍</span><span className="text-[8px] font-black uppercase">Villa</span></a>
          </div>
        </div>
      )}

      <div className="p-4 space-y-6">
        
        {/* TAB 1: CALENDARIO */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 animate-in fade-in">
            <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full bg-slate-900 text-white border border-white/5 p-3 rounded-xl font-bold uppercase text-xs outline-none">
              {['2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'].map(day => <option key={day} value={day}>{day.split('-')[2]} GIUGNO</option>)}
            </select>
            {IBIZA_SCHEDULE.filter(e => e.date === selectedDay).map((event) => {
              const isHidden = user === 'Alessandro' && now < new Date(new Date(`${event.date}T${event.time}:00`).getTime() + 3600000);
              return (
                <div key={event.id} className={`bg-slate-800 rounded-3xl overflow-hidden border border-white/10 shadow-xl ${t.shadow}`}>
                  <div className="h-40 w-full relative">{isHidden ? <div className="absolute inset-0 bg-slate-950 flex items-center justify-center"><span className="text-slate-500">(???)</span></div> : <img src={event.imageUrl} className="w-full h-full object-cover" />}<div className={`absolute top-3 left-3 bg-black/80 px-2 py-1 rounded ${t.text} font-bold text-xs`}>{event.time}</div></div>
                  <div className="p-5">
                    <h3 className="text-xl font-black uppercase text-white">{isHidden ? 'Dati Oscurati' : event.title}</h3>
                    {!isHidden && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <div className="flex justify-between items-center mb-4"><span className="text-[10px] uppercase text-slate-400 font-black">Recensioni</span>{!isArchived && <button onClick={() => setActiveCommentEvent(activeCommentEvent === event.id ? null : event.id)} className={`bg-slate-700 text-white text-[10px] px-3 py-1 rounded font-bold hover:bg-slate-600`}>{activeCommentEvent === event.id ? 'Annulla' : '+ Aggiungi'}</button>}</div>
                        {allComments.filter(c => c.event_id === event.id).map(c => (
                          <div key={c.id} className="bg-slate-900 p-3 rounded-lg mb-2"><div className="flex justify-between"><span className={`text-[10px] font-bold ${t.text}`}>{c.author_name}</span>{c.author_name === user && !isArchived && <button onClick={() => handleDeleteComment(c.id)} className="text-[9px] text-red-500">Elimina</button>}</div><p className="text-xs mt-1 text-slate-200">{c.content}</p></div>
                        ))}
                        {activeCommentEvent === event.id && !isArchived && <div className="flex gap-2 mt-2"><input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm focus:border-white outline-none" placeholder="Testo..." /><button onClick={() => handlePostComment(event.id)} className={`bg-gradient-to-r ${t.gradient} text-slate-950 px-4 rounded-lg font-black text-xs`}>Invia</button></div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: COMPARI */}
        {activeTab === 'compari' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex bg-slate-900 border border-white/5 rounded-lg p-1">
              <button onClick={() => setCompariSubTab('directory')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded transition-colors ${compariSubTab === 'directory' ? `bg-slate-800 ${t.text}` : 'text-slate-500'}`}>Gruppo</button>
              <button onClick={() => setCompariSubTab('cassa')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded transition-colors ${compariSubTab === 'cassa' ? `bg-slate-800 ${t.text}` : 'text-slate-500'}`}>Finanze</button>
            </div>
            
            {compariSubTab === 'directory' && (
              <div className="space-y-3">
                {ALL_PARTICIPANTS.map(p => {
                  const isMe = user === p, isExpanded = expandedUser === p;
                  return (
                    <div key={p} className={`bg-slate-900 border border-white/5 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors`}>
                      <div onClick={() => setExpandedUser(isExpanded ? null : p)} className="p-4 flex items-center justify-between cursor-pointer"><div className="flex items-center gap-3"><div className={`w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border ${t.border}`}>{avatars[p] ? <img src={avatars[p]} className="w-full h-full object-cover" /> : p[0]}</div><span className="font-bold text-white">{p} {isMe && <span className={`bg-gradient-to-r ${t.gradient} text-slate-950 px-1 rounded text-[8px] uppercase font-black ml-2`}>Tu</span>}</span></div><span className={`transition-transform ${isExpanded ? t.text : 'text-slate-500'}`}>{isExpanded ? '▲' : '▼'}</span></div>
                      {isExpanded && (
                        <div className="p-4 bg-slate-950/50 border-t border-slate-800 space-y-4 animate-in slide-in-from-top-2">
                          {isMe ? (
                            <>
                              {!isArchived && <label className={`block w-full text-center bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs font-bold text-white cursor-pointer ${t.textHover}`} >{isUploadingAvatar ? '...' : 'Cambia Foto Profilo'}<input type="file" className="hidden" accept="image/*" disabled={isUploadingAvatar} onChange={handleUploadAvatar} /></label>}
                              
                              <div className="bg-slate-900 p-3 rounded-xl">
                                <div className="flex justify-between items-center mb-2"><span className="text-[10px] uppercase font-bold text-slate-400">Carte d'Imbarco</span>{!isArchived && <label className={`bg-slate-800 text-white px-2 py-1 rounded text-[9px] font-bold cursor-pointer ${t.textHover}`}>{isUploadingBoarding ? '...' : '+ PDF'}<input type="file" className="hidden" accept="application/pdf" disabled={isUploadingBoarding} onChange={(e) => handleUploadDocument(e, 'boarding')} /></label>}</div>
                                {myBoardingPasses.map((doc, idx) => <div key={idx} className="flex justify-between text-xs bg-slate-950 p-2 rounded mb-1"><a href={doc.url} className={`truncate ${t.textHover} text-white`}>📄 {doc.name}</a>{!isArchived && <button onClick={() => handleDeleteDocument(doc.name, 'boarding')} className="text-red-500 font-bold ml-2">X</button>}</div>)}
                              </div>

                              <div className="bg-slate-900 p-3 rounded-xl">
                                <div className="flex justify-between items-center mb-2"><span className="text-[10px] uppercase font-bold text-slate-400">Documenti ID</span>{!isArchived && <label className={`bg-slate-800 text-white px-2 py-1 rounded text-[9px] font-bold cursor-pointer ${t.textHover}`}>{isUploadingId ? '...' : '+ File'}<input type="file" className="hidden" accept="application/pdf,image/*" disabled={isUploadingId} onChange={(e) => handleUploadDocument(e, 'id')} /></label>}</div>
                                {myIdDocs.map((doc, idx) => <div key={idx} className="flex justify-between text-xs bg-slate-950 p-2 rounded mb-1"><a href={doc.url} className={`truncate ${t.textHover} text-white`}>🪪 {doc.name}</a>{!isArchived && <button onClick={() => handleDeleteDocument(doc.name, 'id')} className="text-red-500 font-bold ml-2">X</button>}</div>)}
                              </div>
                            </>
                          ) : (
                            !isArchived && <button onClick={() => handleVoteSballato(p)} disabled={hasVotedToday} className="w-full bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-xs font-bold uppercase text-white">{hasVotedToday ? 'Già Votato' : 'Vota come Sballato'}</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {compariSubTab === 'cassa' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-4 rounded-xl text-center shadow-md"><span className="text-[10px] uppercase text-slate-500 font-bold">Totale</span><p className="text-xl font-black text-white">€{totalExpenses.toFixed(2)}</p></div>
                  <div className={`bg-slate-900 p-4 rounded-xl text-center shadow-md border ${t.border}`}><span className="text-[10px] uppercase text-slate-500 font-bold">A Testa</span><p className={`text-xl font-black ${t.text}`}>€{quotaPerPerson.toFixed(2)}</p></div>
                </div>
                
                {!isArchived && (
                  <div className="bg-slate-900 p-4 rounded-xl space-y-3">
                    <div className="flex gap-2"><input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="Descrizione" className="flex-1 bg-slate-950 p-2 rounded-lg text-sm text-white border border-slate-700 focus:border-white outline-none" /><input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="€" className="w-20 bg-slate-950 p-2 rounded-lg text-sm text-white border border-slate-700 font-black outline-none" /></div>
                    <button onClick={handleAddExpense} className={`w-full bg-gradient-to-r ${t.gradient} text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider`}>Registra Spesa</button>
                  </div>
                )}
                
                <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl"><h4 className="text-[10px] uppercase text-blue-400 font-black mb-3">Piano Bonifici</h4>{optimizedTransfers.length === 0 ? <p className="text-xs text-slate-500">Tutti in pari.</p> : optimizedTransfers.map((t_info, i) => <div key={i} className="flex justify-between text-sm mb-2"><span className="font-bold text-red-400">{t_info.from} <span className="text-slate-500">➔</span> <span className="text-emerald-400">{t_info.to}</span></span><span className="font-black text-white">€{t_info.amount.toFixed(2)}</span></div>)}</div>
                
                <div className="bg-slate-900 p-4 rounded-xl"><h4 className="text-[10px] uppercase text-slate-400 font-black mb-3">Registro Spese</h4>{sharedExpenses.map(e => <div key={e.id} className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"><div className="text-xs"><span className="font-bold text-white uppercase">{e.description}</span><br/><span className={t.text}>{e.payer_name}</span></div><div className="text-right"><span className="font-black text-sm block text-white">€{Number(e.amount).toFixed(2)}</span>{user === e.payer_name && !isArchived && <button onClick={() => handleDeleteExpense(e.id, e.payer_name)} className="text-[8px] text-red-500 font-bold uppercase mt-1">Elimina</button>}</div></div>)}</div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GALLERIA & TAB 4: HINTS */}
        {activeTab === 'gallery' && (
          <div className="space-y-4 animate-in fade-in">
            <div className={`flex justify-between items-center bg-slate-900 p-4 rounded-xl border ${t.border}`}><h3 className="font-black uppercase text-white">Galleria</h3>{!isArchived && <div className="flex gap-2"><label className={`bg-slate-800 ${t.text} border ${t.border} px-3 py-1.5 rounded-lg text-lg cursor-pointer hover:bg-slate-700`}>📸<input type="file" className="hidden" accept="image/*" capture="environment" disabled={isUploadingMedia} onChange={handleUploadMedia} /></label><label className={`bg-gradient-to-r ${t.gradient} text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer`}>Rullino<input type="file" className="hidden" accept="image/*" disabled={isUploadingMedia} onChange={handleUploadMedia} /></label></div>}</div>
            <div className="flex gap-2"><button onClick={() => setGalleryFilter('mine')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${galleryFilter === 'mine' ? `bg-slate-800 ${t.text}` : 'bg-slate-900 text-slate-400'}`}>Le Mie Foto</button><button onClick={() => setGalleryFilter('others')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${galleryFilter === 'others' ? `bg-slate-800 ${t.text}` : 'bg-slate-900 text-slate-400'}`}>Tutte</button></div>
            <div className="grid grid-cols-2 gap-3">
              {galleryMedia.filter(m => galleryFilter === 'mine' ? m.uploader_name === user : m.uploader_name !== user).map(m => (
                <div key={m.id} className={`bg-slate-900 rounded-xl overflow-hidden border border-white/5 hover:border-slate-600 transition-colors ${t.shadow} shadow-md`}><div className="aspect-square bg-slate-950"><img src={m.media_url} className="w-full h-full object-cover" /></div><div className="p-2 flex justify-between items-center"><button onClick={() => handleMediaDownload(m.media_url)} className="text-[10px] font-bold text-slate-300 hover:text-white">⬇ Salva</button>{(galleryFilter === 'mine' && (!isArchived || user === 'Fabri')) && <button onClick={() => handleDeleteMedia(m.id, m.media_url)} className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded">Elimina</button>}</div></div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-4 animate-in fade-in">
            <div className={`bg-slate-900 p-4 rounded-xl border ${t.border}`}><h3 className={`font-black uppercase text-xs mb-4 ${t.text}`}>Intelligenza Locale</h3>{IBIZA_NEWS.map((n, i) => <div key={i} className={`mb-3 border-l-2 pl-3`} style={{ borderColor: 'currentColor', color: 'inherit' }}><span className="text-[10px] font-bold text-slate-500">{n.date}</span>{n.events.map((e, j) => <div key={j} className="mt-1"><span className={`text-xs font-bold uppercase ${t.text}`}>{e.club}</span><span className="text-[10px] block text-slate-300">{e.name} - {e.details}</span></div>)}</div>)}</div>
          </div>
        )}

      </div>

      {/* NAVBAR INFERIORE */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur border-t border-slate-800 p-3 flex justify-around">
        {[{ id: 'calendar', icon: '📅', label: 'Eventi' }, { id: 'news', icon: '💡', label: 'Hints' }, { id: 'gallery', icon: '📸', label: 'Foto' }, { id: 'compari', icon: '👥', label: 'Gruppo' }].map(tab => (
          <button key={tab.id} onClick={() => handleTabSwitch(tab.id)} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id ? t.text : 'text-slate-500 hover:text-slate-300'}`}><span className="text-xl">{tab.icon}</span><span className="text-[9px] font-black uppercase">{tab.label}</span></button>
        ))}
      </nav>
    </main>
  );
}