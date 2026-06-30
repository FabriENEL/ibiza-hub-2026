'use client'

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleLogin = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr('');

    // 1) Chiedi al portiere un BADGE OSPITE (accesso anonimo).
    //    Genera un utente reale con codice-identità vero, senza password.
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      setErr('Accesso non riuscito. Riprova.');
      setBusy(false);
      return;
    }

    // 2) Salva il nome scelto come etichetta leggibile del profilo
    //    (il profilo è già stato creato in automatico dal trigger del gradino 1).
    await supabase
      .from('profiles')
      .update({ username: name.trim() })
      .eq('id', data.user.id);

    // 3) Entra.
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-white text-2xl font-semibold text-center">Junction</h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="Il tuo nome"
          className="rounded-lg px-4 py-3 bg-slate-800 text-white placeholder-slate-400 outline-none"
        />
        <button
          onClick={handleLogin}
          disabled={busy || !name.trim()}
          className="rounded-lg px-4 py-3 bg-indigo-600 text-white font-medium disabled:opacity-40"
        >
          {busy ? 'Accesso…' : 'Entra'}
        </button>
        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
      </div>
    </div>
  );
}