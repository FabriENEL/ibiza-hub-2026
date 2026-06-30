'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

// La "carta d'identità" di un Hub e del mio ruolo dentro di esso.
type Membership = {
  hub_id: string;
  role: string;          // 'OWNER' | 'MEMBER'
  hub: {
    id: string;
    name: string;
    category: string;    // 'travel' | 'party' | ... → pilota il tema colore
  };
};

type HubContextValue = {
  userId: string | null;        // il mio codice-identità reale (dal badge)
  username: string | null;      // il mio nome visualizzato
  memberships: Membership[];    // tutti gli Hub di cui sono membro
  activeHubId: string | null;   // l'Hub che sto guardando ora
  setActiveHubId: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>; // ricarica (es. dopo aver creato un Hub)
};

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeHubId, setActiveHubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    // 1) Chi sono? Lo ricaviamo dal BADGE, non da un foglietto.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    // 2) Il mio nome visualizzato (dal profilo reale).
    const { data: profile } = await supabase
      .from('profiles').select('username').eq('id', user.id).single();
    setUsername(profile?.username ?? null);

    // 3) Di quali Hub sono membro? Letti dal registro presenze,
    //    con i dati dell'Hub agganciati. Le serrature garantiscono
    //    che vedo SOLO i miei: la query non può sconfinare.
    const { data: rows } = await supabase
      .from('hub_members')
      .select('hub_id, role, hub:hubs ( id, name, category )')
      .eq('user_id', user.id);

    setMemberships((rows as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <HubContext.Provider value={{
      userId, username, memberships,
      activeHubId, setActiveHubId,
      loading, refresh: load,
    }}>
      {children}
    </HubContext.Provider>
  );
}

// Scorciatoia che ogni modulo userà per leggere la memoria condivisa.
export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub deve stare dentro <HubProvider>');
  return ctx;
}