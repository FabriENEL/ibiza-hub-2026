'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type Membership = {
  hub_id: string;
  role: string;
  hub: { id: string; name: string; category: string; status: string; vote_label: string; votes_enabled: boolean };
};

type HubContextValue = {
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  memberships: Membership[];
  activeHubId: string | null;
  setActiveHubId: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>; postAction: { module: string; ts: number } | null; signalPostAction: (module: string) => void; julieOpen: boolean; openJulie: () => void; closeJulie: () => void;
  julieSeed: { title: string; location: string | null } | null; seedJulie: (s: { title: string; location: string | null }) => void; clearJulieSeed: () => void;
  // Immersivo: quando un dettaglio a schermo pieno e' aperto, la Shell nasconde intestazione e barra di navigazione.
  immersive: boolean;
  setImmersive: (v: boolean) => void;
};

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeHubId, setActiveHubIdState] = useState<string | null>(null);
  // Persistenza: l'Hub attivo sopravvive a back button / chiusura app tramite localStorage.
  const setActiveHubId = (id: string | null) => {
    setActiveHubIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('junction_active_hub', id); else localStorage.removeItem('junction_active_hub');
    }
  };
  const [loading, setLoading] = useState(true); const [postAction, setPostAction] = useState<{ module: string; ts: number } | null>(null); const signalPostAction = (module: string) => setPostAction({ module, ts: Date.now() }); const [julieOpen, setJulieOpen] = useState(false); const openJulie = () => setJulieOpen(true); const closeJulie = () => setJulieOpen(false);
  const [julieSeed, setJulieSeed] = useState<{ title: string; location: string | null } | null>(null); const seedJulie = (s: { title: string; location: string | null }) => { setJulieSeed(s); setJulieOpen(true); }; const clearJulieSeed = () => setJulieSeed(null);
  const [immersive, setImmersive] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles').select('username, avatar_url').eq('id', user.id).single();
    setUsername(profile?.username ?? null);
    setAvatarUrl(profile?.avatar_url ?? null);

    const { data: rows } = await supabase
      .from('hub_members')
      .select('hub_id, role, hub:hubs ( id, name, category, status, vote_label, votes_enabled )')
      .eq('user_id', user.id);

    const list = (rows as any) ?? [];
    setMemberships(list);
    // Ripristino difensivo: l'Hub salvato vale solo se l'utente ne e' ancora membro.
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('junction_active_hub');
      if (saved && list.some((m: Membership) => m.hub_id === saved)) setActiveHubIdState(saved);
      else if (saved) localStorage.removeItem('junction_active_hub');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <HubContext.Provider value={{ userId, username, avatarUrl, memberships, activeHubId, setActiveHubId, loading, refresh: load, postAction, signalPostAction, julieOpen, openJulie, closeJulie, julieSeed, seedJulie, clearJulieSeed, immersive, setImmersive }}>
      {children}
    </HubContext.Provider>
  );
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub deve stare dentro <HubProvider>');
  return ctx;
}