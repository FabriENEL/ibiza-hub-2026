'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// DATASET INTEGRALE E SEMANTICO - 32 EVENTI
const IBIZA_SCHEDULE = [
  // 2 GIUGNO - GRUPPO INIZIALE
  { id: '1', date: '2026-06-02', time: '06:10', title: 'Decollo', location: 'Milano Malpensa', group: 'initial', img: 'photo-1436491865332-7a61a109c0f3' },
  { id: '2', date: '2026-06-02', time: '08:30', title: 'Atterraggio', location: 'Aeroporto Ibiza', group: 'initial', img: 'photo-1542296332-2e4473faf563' },
  { id: '3', date: '2026-06-02', time: '10:00', title: 'Spesa cena e Weed', location: 'Ibiza', group: 'initial', img: 'photo-1542838132-92c53300491e' },
  { id: '4', date: '2026-06-02', time: '11:30', title: 'Aperitivo/Pranzo', location: 'Cala Jondal', group: 'initial', img: 'photo-1517248135467-4c7edcad34c4' },
  { id: '5', date: '2026-06-02', time: '14:00', title: 'Imbarco Formentera', location: 'Cala Jondal', group: 'initial', img: 'photo-1534447677768-be436bb09401' },
  { id: '6', date: '2026-06-02', time: '15:30', title: 'Giro spiagge', location: 'Formentera', group: 'initial', img: 'photo-1507525428034-b723cf961d3e' },
  { id: '7', date: '2026-06-02', time: '20:00', title: 'Cena in Barca', location: 'Costa Nord Formentera', group: 'initial', img: 'photo-1567620905732-2d1ec7bb7445' },
  { id: '8', date: '2026-06-02', time: '23:00', title: 'Sbarco e locali', location: 'Formentera', group: 'initial', img: 'photo-1470225620780-dba8ba36b745' },

  // 3 GIUGNO
  { id: '9', date: '2026-06-03', time: '03:00', title: 'Rientro in barca', location: 'El Beso', group: 'initial', img: 'photo-1516939884455-1445c8652f83' },
  { id: '10', date: '2026-06-03', time: '07:00', title: 'Decollo 2° Gruppo', location: 'Milano Malpensa', group: 'second', img: 'photo-1436491865332-7a61a109c0f3' },
  { id: '11', date: '2026-06-03', time: '09:30', title: 'Atterraggio 2° Gruppo', location: 'Aeroporto Ibiza', group: 'second', img: 'photo-1464037862646-647f1c34224c' },
  { id: '12', date: '2026-06-03', time: '09:30', title: 'Partenza verso Ibiza', location: 'Spiaggia El Beso', group: 'initial', img: 'photo-1500375592092-40eb2168fd21' },
  { id: '13', date: '2026-06-03', time: '11:00', title: 'Arrivo a Ibiza', location: 'Cala Jondal', group: 'initial', img: 'photo-1515238152791-8216bfdf89a7' },
  { id: '14', date: '2026-06-03', time: '13:00', title: 'Check-in Villa', location: 'Zona Cala d\'Hort', group: 'second', img: 'photo-1512917774080-9991f1c4c750' },
  { id: '15', date: '2026-06-03', time: '13:00', title: 'Partenza verso Villa', location: 'Cala Jondal', group: 'initial', img: 'photo-1533473359331-0135ef1b58bf' },
  { id: '16', date: '2026-06-03', time: '13:30', title: 'Arrivo in Villa', location: 'Zona Cala d\'Hort', group: 'initial', img: 'photo-1613490493576-7fde63acd811' },
  { id: '17', date: '2026-06-03', time: '14:00', title: 'REUNION E PRANZO', location: 'Cala d\'Hort', group: 'all', img: 'photo-1467003909585-2f8a72700288' },
  { id: '18', date: '2026-06-03', time: '17:00', title: 'Spesa per Grigliata', location: 'Zona Cala d\'Hort', group: 'all', img: 'photo-1555939594-58d7cb561ad1' },
  { id: '19', date: '2026-06-03', time: '18:00', title: 'Rientro e Doccia', location: 'Zona Cala d\'Hort', group: 'all', img: 'photo-1552346154-21d32810aba3' },
  { id: '20', date: '2026-06-03', time: '20:00', title: 'Aperitivo + Cena Leuci', location: 'Playa d\'en Bossa', group: 'all', img: 'photo-1559339352-11d035aa65de' },

  // 4 GIUGNO
  { id: '21', date: '2026-06-04', time: '00:00', title: 'SERATA DC10', location: 'DC 10', group: 'all', img: 'photo-1516450360452-9312f5e86fc7' },
  { id: '22', date: '2026-06-04', time: '04:00', title: 'Rientro e Sbraco', location: 'Zona Cala d\'Hort', group: 'all', img: 'photo-1519681393784-d120267933ba' },
  { id: '23', date: '2026-06-04', time: '15:00', title: 'Grigliata e Piscina', location: 'Villa', group: 'all', img: 'photo-1533777857889-4be7c70b33f7' },
  { id: '24', date: '2026-06-04', time: '20:00', title: 'Preserata', location: 'Villa', group: 'all', img: 'photo-1510414842594-a61c69b5ae57' },
  { id: '25', date: '2026-06-04', time: '23:00', title: 'Da Decidersi', location: 'Ibiza', group: 'all', img: 'photo-1514525253361-bee8718a74a2' },

  // 5 GIUGNO
  { id: '26', date: '2026-06-05', time: '03:00', title: 'Rientro e Sbraco', location: 'Zona Cala d\'Hort', group: 'all', img: 'photo-1519681393784-d120267933ba' },
  { id: '27', date: '2026-06-05', time: '12:00', title: 'Colazione Hangover', location: 'Villa', group: 'all', img: 'photo-1533089860892-a7c6f0a88666' },
  { id: '28', date: '2026-06-05', time: '15:00', title: 'Spiaggia e Mare', location: 'Cala Tarida', group: 'all', img: 'photo-1507525428034-b723cf961d3e' },
  { id: '29', date: '2026-06-05', time: '17:00', title: 'Aperitivo Finale', location: 'Cala Tarida', group: 'all', img: 'photo-1510626176961-4b57d4fbad03' },
  { id: '30', date: '2026-06-05', time: '20:30', title: 'Partenza Aeroporto', location: 'Cala Tarida', group: 'all', img: 'photo-1503376780353-7e6692767b70' },
  { id: '31', date: '2026-06-05', time: '21:15', title: 'Arrivo Aeroporto', location: 'Ibiza', group: 'all', img: 'photo-1464037862646-647f1c34224c' },
  { id: '32', date: '2026-06-05', time: '22:55', title: 'Decollo Rientro', location: 'Aeroporto Ibiza', group: 'all', img: 'photo-1436491865332-7a61a109c0f3' },
];

export default function Dashboard() {
  const [user, setUser] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('2026-06-02');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('ibiza_user');
    if (!savedUser) router.push('/'); else setUser(savedUser);
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [router]);

  if (!user) return <div className="bg-slate-950 min-h-screen" />;

  const isInitialMember = ["Fabri", "Alessandro", "Teo", "Edo", "Lori", "Cimmi"].includes(user);

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      <header className="p-6 border-b border-slate-800 bg-slate-900/80 sticky top-0 backdrop-blur-xl z-50 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em]">Ibiza Hub</h2>
            <p className="text-lg font-bold italic">{user}</p>
          </div>
          <select 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none text-yellow-500"
          >
            <option value="2026-06-02">2 Giugno</option>
            <option value="2026-06-03">3 Giugno</option>
            <option value="2026-06-04">4 Giugno</option>
            <option value="2026-06-05">5 Giugno</option>
          </select>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {IBIZA_SCHEDULE.filter(e => e.date === selectedDate).map((event) => {
          if (event.group === 'initial' && !isInitialMember) return null;
          
          const eventDateTime = new Date(`${event.date}T${event.time}:00`);
          const isHidden = user === 'Alessandro' && now < new Date(eventDateTime.getTime() + 3600000);

          return (
            <div 
              key={event.id} 
              onClick={() => setSelectedEvent(event)}
              className="group relative overflow-hidden bg-slate-900 border border-slate-800 rounded-xl flex items-center h-20 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex-1 p-4 z-10 bg-slate-900/40 backdrop-blur-sm h-full flex flex-col justify-center">
                <span className="text-[10px] font-black text-yellow-500/70">{event.time}</span>
                <h3 className="text-sm font-black uppercase tracking-tight leading-tight">
                  {isHidden ? '???' : event.title}
                </h3>
              </div>

              <div className="w-24 h-full overflow-hidden relative">
                {!isHidden && (
                  <img 
                    src={`https://images.unsplash.com/${event.img}?auto=format&fit=crop&w=300&q=80`} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    alt={event.title}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-transparent" />
              </div>
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl">
            <div className="h-56 relative">
               <img 
                src={`https://images.unsplash.com/${selectedEvent.img}?auto=format&fit=crop&w=600&q=80`} 
                className="w-full h-full object-cover" 
                alt="detail" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
            </div>

            <div className="p-8 -mt-10 relative z-10 text-center">
              <span className="text-yellow-500 font-black tracking-widest uppercase text-xs">{selectedEvent.time}</span>
              <h4 className="text-2xl font-black uppercase italic mt-2">
                {user === 'Alessandro' && now < new Date(new Date(`${selectedEvent.date}T${selectedEvent.time}:00`).getTime() + 3600000) ? '???' : selectedEvent.title}
              </h4>
              <p className="text-slate-400 mt-2 text-sm">📍 {selectedEvent.location}</p>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="mt-8 px-8 bg-yellow-500 text-black font-black py-3 rounded-full uppercase text-[10px] tracking-widest"
              >Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}