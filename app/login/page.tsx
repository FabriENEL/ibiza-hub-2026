'use client'
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/app/dashboard/lib/logEvent';

// PIN 4 cifre -> password Supabase (>=6 char): suffisso fisso non segreto, solo per soglia lunghezza.
const pinToPassword = (pin: string) => pin + '#Jq';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [invito, setInvito] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const validPin = /^\d{4}$/.test(pin);

  const handleSignup = async () => {
    if (!email.trim() || !username.trim() || !validPin || busy) return;
    // Accesso su invito durante il test: serve il codice fornito dall'organizzatore.
    // Fisso nel codice: nessun pannello da gestire, si detta a voce. Da rendere dinamico dopo il test.
    if (invito.trim().toUpperCase() !== '18-S74RK') {
      setErr('Codice invito non valido. Lo chieda all organizzatore.');
      return;
    }
    setBusy(true); setErr('');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password: pinToPassword(pin),
    });
    if (error || !data.user) { setErr(error?.message ?? 'Registrazione non riuscita.'); setBusy(false); return; }
    // Sessione presente solo se confirm-email e' OFF; altrimenti l'utente deve confermare via mail.
    // Confirm-email ON: nessuna sessione al signup. L'username attende il primo signin post-conferma.
    localStorage.setItem('eg_pending_username', username.trim());
    if (!data.session) { setErr('Le abbiamo inviato una mail. Confermi il link, poi rientri con email e PIN.'); setBusy(false); return; }
    await supabase.from('profiles').update({ username: username.trim() }).eq('id', data.user.id);
    localStorage.removeItem('eg_pending_username');
    logEvent('signup');
    router.push('/dashboard');
  };

  const handleSignin = async () => {
    if (!email.trim() || !validPin || busy) return;
    setBusy(true); setErr('');
    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) {
      const { data: resolved } = await supabase.rpc('email_for_username', { p_username: loginEmail });
      if (!resolved) { setErr('Username o PIN non corretti.'); setBusy(false); return; }
      loginEmail = resolved as string;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail, password: pinToPassword(pin),
    });
    if (error) { setErr('Email o PIN non corretti.'); setBusy(false); return; }
    const pending = localStorage.getItem('eg_pending_username');
    if (pending) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) { await supabase.from('profiles').update({ username: pending }).eq('id', u.user.id); localStorage.removeItem('eg_pending_username'); }
    }
    logEvent('login');
    router.push('/dashboard');
  };

  const submit = mode === 'signup' ? handleSignup : handleSignin;
  const fld = 'rounded-lg px-4 py-3 bg-slate-800 text-white placeholder-slate-400 outline-none';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 text-center">EventGarden</p>
        <h1 className="text-white text-2xl font-black text-center [font-family:var(--font-display)]">{mode === 'signup' ? 'Crea account' : 'Bentornato'}</h1>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={mode === 'signin' ? 'Email o username' : 'Email'} className={fld} />
        {mode === 'signup' && (
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nome utente" className={fld} />
        )}
        {mode === 'signup' && (
          <input value={invito} onChange={(e) => setInvito(e.target.value)} placeholder="Codice invito" className={fld} />
        )}
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          type="password" inputMode="numeric" placeholder="PIN (4 cifre)"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className={fld + ' tracking-[0.5em] text-center'} />

        <button onClick={submit} disabled={busy || !email.trim() || !validPin || (mode === 'signup' && !username.trim())}
          className="rounded-lg px-4 py-3 bg-white text-slate-950 font-black uppercase text-xs tracking-wider disabled:opacity-40 active:scale-[0.98] transition-transform">
          {busy ? 'Attendere...' : mode === 'signup' ? 'Registrati' : 'Entra'}
        </button>

        <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErr(''); }}
          className="text-slate-400 text-xs text-center">
          {mode === 'signup' ? 'Ho gia un account - Accedi' : 'Nuovo? Crea un account'}
        </button>

        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
      </div>
    </div>
  );
}







