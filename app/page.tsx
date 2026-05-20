'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const GROUP_1 = ["Fabri", "Alessandro", "Teo", "Edo", "Cimmi", "Lori"];
const GROUP_2 = ["Chri", "Maicol", "Nello", "Bibi", "Fiore", "Corra"];

export default function Login() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Il reindirizzamento automatico è stato rimosso per consentire 
    // la scelta del profilo a ogni apertura dell'applicazione.
  }, []);

  if (!mounted) return <div className="min-h-screen bg-slate-950" />;

  const handleSelectUser = (name: string) => {
    localStorage.setItem('ibiza_user', name);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans selection:bg-yellow-500/30">
      <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700 drop-shadow-sm uppercase">
            Ibiza Hub
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] font-black text-slate-500">
            Operazione Addio al Celibato • 2026
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-sm">
            <h2 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-4 text-center">Seleziona il tuo Profilo</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xs text-yellow-600 font-black uppercase tracking-widest mb-3 pl-1">Gruppo 1 - Sposo & Testimoni</h3>
                <div className="grid grid-cols-2 gap-2">
                  {GROUP_1.map(name => (
                    <button 
                      key={name}
                      onClick={() => handleSelectUser(name)}
                      className="bg-slate-950 border border-slate-800 hover:border-yellow-500/50 hover:bg-slate-800 text-slate-300 hover:text-white py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-inner"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>

              <div>
                <h3 className="text-xs text-yellow-600 font-black uppercase tracking-widest mb-3 pl-1">Gruppo 2 - Amici</h3>
                <div className="grid grid-cols-2 gap-2">
                  {GROUP_2.map(name => (
                    <button 
                      key={name}
                      onClick={() => handleSelectUser(name)}
                      className="bg-slate-950 border border-slate-800 hover:border-yellow-500/50 hover:bg-slate-800 text-slate-300 hover:text-white py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-inner"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}