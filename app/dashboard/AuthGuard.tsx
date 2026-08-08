'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PrivacyGate, { PRIVACY_VERSIONE } from './PrivacyGate';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [stato, setStato] = useState<'verifica' | 'consenso' | 'dentro'>('verifica');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) { router.replace('/login'); return; }
      const uid = data.session.user.id;
      setUserId(uid);
      // Cerco una riga con la VERSIONE corrente, non "l'ultima riga": una presa visione di un'altra
      // versione non deve saltare la schermata. Se la lettura fallisce (rete), NON dichiaro un
      // consenso che non ho visto: mostro la schermata, che ha la sua rete di riprova. Meglio
      // richiedere due volte che entrare senza presa visione registrata.
      const { data: righe, error } = await supabase
        .from('privacy_consents').select('user_id')
        .eq('user_id', uid).eq('versione', PRIVACY_VERSIONE).limit(1);
      if (!active) return;
      setStato(!error && righe && righe.length > 0 ? 'dentro' : 'consenso');
    })();
    return () => { active = false; };
  }, [router]);

  if (stato === 'verifica') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Verifica accesso…</p>
      </div>
    );
  }
  // L'INNESTO: manca la presa visione della versione corrente -> la schermata PRENDE il posto del
  // contenuto. Un git revert di questo commit riporta AuthGuard al solo controllo di sessione.
  if (stato === 'consenso' && userId) {
    return <PrivacyGate userId={userId} onConsentito={() => setStato('dentro')} />;
  }
  return <>{children}</>;
}
