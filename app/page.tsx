'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [selectedUser, setSelectedUser] = useState('');
  const router = useRouter();

  // Lista ufficiale dei 12 partecipanti di Ibiza 2026
  const participants = [
    { id: 'ale', name: "Alessandro", label: "Ale (Lo Sposo)" },
    { id: 'fabri', name: "Fabri", label: "Fabri (Testimone)" },
    { id: 'teo', name: "Teo", label: "Teo (Testimone)" },
    { id: 'edo', name: "Edo", label: "Edo (Testimone)" },
    { id: 'corra', name: "Corra", label: "Corra" },
    { id: 'fiore', name: "Fiore", label: "Fiore" },
    { id: 'nello', name: "Nello", label: "Nello" },
    { id: 'cimmi', name: "Cimmi", label: "Cimmi" },
    { id: 'chri', name: "Chri", label: "Chri" },
    { id: 'maicol', name: "Maicol", label: "Maicol" },
    { id: 'bibi', name: "Bibi", label: "Bibi" },
    { id: 'lori', name: "Lori", label: "Lori" }
  ];

 const handleLogin = () => {
    if (selectedUser) {
      // 1. Salvataggio persistente nel browser dell'utente
      localStorage.setItem('ibiza_user', selectedUser);
      
      // 2. Reindirizzamento forzato alla dashboard
      router.push('/dashboard');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black uppercase tracking-tighter italic">
          Ibiza <span className="text-yellow-500">2026</span>
        </h1>
        <p className="text-slate-500 tracking-widest uppercase text-sm">Alessandro's Bachelor Hub</p>
      </div>
      
      <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800">
        <label className="block mb-4 text-slate-400 text-center text-sm font-medium">
          Identificati per accedere alla missione
        </label>
        
        <select 
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-white mb-6 focus:ring-2 focus:ring-yellow-500 outline-none appearance-none cursor-pointer"
        >
          <option value="">-- Seleziona il tuo nome --</option>
          {participants.map((p) => (
            <option key={p.id} value={p.name}>{p.label}</option>
          ))}
        </select>

        <button 
          onClick={handleLogin}
          disabled={!selectedUser}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-600 text-black font-black py-4 rounded-xl transition-all duration-300 uppercase tracking-widest shadow-lg shadow-yellow-500/20"
        >
          Entra nell'Hub
        </button>
      </div>
    </main>
  );
}