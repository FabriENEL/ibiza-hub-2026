'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDynamicImage } from '@/lib/mediaEngine';

// DATASET COMPLETO IBIZA 2026
const IBIZA_SCHEDULE = [
  // 2 GIUGNO
  { id: '1', date: '2026-06-02', time: '06:10', title: 'Decollo', location: 'Milano Malpensa', group: 'initial' },
  { id: '2', date: '2026-06-02', time: '08:30', title: 'Atterraggio', location: 'Aeroporto Ibiza', group: 'initial' },
  { id: '3', date: '2026-06-02', time: '10:00', title: 'Spesa cena e Weed', location: 'Indifferente', group: 'initial' },
  { id: '4', date: '2026-06-02', time: '11:30', title: 'Aperitivo/Pranzo', location: 'Cala Jondal', group: 'initial' },
  { id: '5', date: '2026-06-02', time: '14:00', title: 'Imbarco verso Formentera', location: 'Cala Jondal', group: 'initial' },
  { id: '6', date: '2026-06-02', time: '15:30', title: 'Arrivo e giro spiagge', location: 'Formentera', group: 'initial' },
  { id: '7', date: '2026-06-02', time: '20:00', title: 'Cena in Barca', location: 'Costa Nord Formentera', group: 'initial' },
  { id: '8', date: '2026-06-02', time: '23:00', title: 'Sbarco e giro locali', location: 'Formentera', group: 'initial' },
  // 3 GIUGNO
  { id: '9', date: '2026-06-03', time: '03:00', title: 'Rientro in barca e sbraco', location: 'El Beso', group: 'initial' },
  { id: '10', date: '2026-06-03', time: '07:00', title: 'Decollo Secondo Gruppo', location: 'Milano Malpensa', group: 'second' },
  { id: '11', date: '2026-06-03', time: '09:30', title: 'Atterraggio Secondo Gruppo', location: 'Aeroporto Ibiza', group: 'second' },
  { id: '12', date: '2026-06-03', time: '09:30', title: 'Partenza verso Ibiza', location: 'Spiaggia El Beso', group: 'initial' },
  { id: '13', date: '2026-06-03', time: '11:00', title: 'Arrivo a Ibiza', location: 'Cala Jondal', group: 'initial' },
  { id: '14', date: '2026-06-03', time: '13:00', title: 'Check-in Villa', location: 'Zona Cala d\'Hort', group: 'second' },
  { id: '15', date: '2026-06-03', time: '13:00', title: 'Partenza verso Villa', location: 'Cala Jondal', group: 'initial' },
  { id: '16', date: '2026-06-03', time: '13:30', title: 'Arrivo in Villa', location: 'Zona Cala d\'Hort', group: 'initial' },
  { id: '17', date: '2026-06-03', time: '14:00', title: 'REUNION E PRANZO', location: 'Cala d\'Hort', group: 'all' },
  { id: '18', date: '2026-06-03', time: '17:00', title: 'Spesa per Grigliata', location: 'Zona Cala d\'Hort', group: 'all' },
  { id: '19', date: '2026-06-03', time: '18:00', title: 'Rientro Villa e Doccia', location: 'Zona Cala d\'Hort', group: 'all' },
  { id: '20', date: '2026-06-03', time: '20:00', title: 'Aperitivo + Cena Leuci', location: 'Playa d\'en Bossa', group: 'all' },
  // 4 GIUGNO
  { id: '21', date: '2026-06-04', time: '00:00', title: 'SERATA DC10', location: 'DC 10', group: 'all' },
  { id: '22', date: '2026-06-04', time: '04:00', title: 'Rientro Villa e Sbraco', location: 'Zona Cala d\'Hort', group: 'all' },
  { id: '23', date: '2026-06-04', time: '15:00', title: 'Grigliata Lunga e Piscina', location: 'Villa', group: 'all' },
  { id: '24', date: '2026-06-04', time: '20:00', title: 'Preserata', location: 'Villa', group: 'all' },
  { id: '25', date: '2026-06-04', time: '23:00', title: 'Da Decidersi', location: 'Ibiza', group: 'all' },
  // 5 GIUGNO
  { id: '26', date: '2026-06-05', time: '03:00', title: 'Rientro Villa e Sbraco', location: 'Zona Cala d\'Hort', group: 'all' },
  { id: '27', date: '2026-06-05', time: '12:00', title: 'Colazione Hangover', location: 'Villa', group: 'all' },
  { id: '28', date: '2026-06-05', time: '15:00', title: 'Spiaggia e Mare', location: 'Cala Tarida', group: 'all' },
  { id: '29', date: '2026-06-05', time: '17:00', title: 'Aperitivo Finale', location: 'Cala Tarida', group: 'all' },
  { id: '30', date: '2026-06-05', time: '20:30', title: 'Partenza Aeroporto', location: 'Cala Tarida', group: 'all' },
  { id: '31', date: '2026-06-05', time: '21:15', title: 'Arrivo Aeroporto', location: 'Ibiza', group: 'all' },
  { id: '32', date: '2026-06-05', time: '22:55', title: 'Decollo', location: 'Aeroporto Ibiza', group: 'all' },
];

const GROUP_1 = ["Fabri", "Alessandro", "Teo", "Edo", "Cimmi", "Lori"];
const GROUP_2 = ["Chri", "Maicol", "Nello", "Bibi", "Fiore", "Corra"];
const ALL_PARTICIPANTS = [...GROUP_1, ...GROUP_2];

export default function Dashboard() {
  const [user, setUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [now, setNow] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('ibiza_user');
    if (!savedUser) router.push('/');
    else setUser(savedUser);

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [router]);

  if (!user) return <div className="bg-slate-950 min-h-screen" />;

  const isGroup1 = GROUP_1.includes(user);
  const isAle = user === 'Alessandro';

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
        {activeTab === 'calendar' && IBIZA_SCHEDULE.map((event) => {
          // Logica di Segregazione Flussi
          if (event.group === 'initial' && !isGroup1) return null;
          if (event.group === 'second' && isGroup1 && !isAle) return null; 
          
          // Logica Black Box (Alessandro)
          const eventDateTime = new Date(`${event.date}T${event.time}:00`);
          const unlockTime = new Date(eventDateTime.getTime() + (60 * 60 * 1000));
          const isHidden = isAle && now < unlockTime;
          
          const imageUrl = getDynamicImage(event.title);

          return (
            <div key={event.id} className={`overflow-hidden rounded-2xl border transition-all ${isHidden ? 'border-slate-800 bg-slate-900/40' : 'border-slate-800 bg-slate-900 shadow-xl'}`}>
              <div className="h-32 w-full bg-slate-800 relative">
                {isHidden ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    <span className="text-slate-700 font-mono text-4xl font-black">(???)</span>
                  </div>
                ) : (
                  <img src={imageUrl} alt={event.title} className="w-full h-full object-cover opacity-60" />
                )}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md border border-white/10">
                  <span className="text-yellow-500 font-mono font-bold text-xs">{event.time}</span>
                </div>
              </div>

              <div className="p-5">
                <h3 className={`text-xl font-black uppercase tracking-tight ${isHidden ? 'text-slate-600' : 'text-white'}`}>
                  {isHidden ? 'Dati Oscurati' : event.title}
                </h3>
                <p className="text-sm text-slate-400 mt-1 font-medium">
                  📍 {isHidden ? '(???)' : event.location}
                </p>

                {isHidden && (
                  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-yellow-600">Sblocco dati tra:</span>
                    <span className="font-mono font-black text-yellow-500">
                      {Math.max(0, Math.ceil((unlockTime.getTime() - now.getTime()) / 60000))} min
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* VIEW: COMPARI */}
        {activeTab === 'compari' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-300 mb-6">Directory Compari</h3>
            {ALL_PARTICIPANTS.map(p => (
              <div key={p} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-800 border-2 border-slate-700 rounded-full flex items-center justify-center text-xl font-black text-slate-400">
                    {p[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{p}</h4>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Recensioni Totali: 0</p>
                  </div>
                </div>
                <button 
                  disabled={user === p}
                  className="bg-slate-800 disabled:opacity-30 border border-slate-700 hover:border-yellow-500 hover:text-yellow-500 text-slate-400 text-[10px] font-bold py-2 px-3 rounded-lg uppercase transition-all"
                >
                  Vota
                </button>
              </div>
            ))}
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