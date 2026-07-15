'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type Membership = {
  hub_id: string;
  role: string;
  hub: { id: string; name: string; category: string; status: string; vote_label: string; votes_enabled: boolean; start_date: string | null; end_date: string | null };
};

type HubContextValue = {
  userId: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  memberships: Membership[];
  activeHubId: string | null;
  setActiveHubId: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>; postAction: { module: string; ts: number } | null; signalPostAction: (module: string) => void; julieOpen: boolean; openJulie: () => void; closeJulie: () => void;
  julieSeed: { title: string; location: string | null } | null; seedJulie: (s: { title: string; location: string | null }) => void; clearJulieSeed: () => void;
  // Immersivo: quando un dettaglio a schermo pieno e' aperto, la Shell nasconde intestazione e barra di navigazione.
  setHubHidden: (hubId: string, hidden: boolean) => Promise<void>;
  immersive: boolean;
  setImmersive: (v: boolean) => void;
};

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    // Espelle in tempo reale chi perde la sessione (token revocato lato server).
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_OUT') { window.location.href = '/login'; }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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
    // getUser() interroga il server (non la cache): se la sessione e' stata invalidata
    // lato Supabase, error e' valorizzato e l'utente va cacciato, PWA vecchia inclusa.
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) { await supabase.auth.signOut(); window.location.href = '/login'; return; }
    // Doppia guardia: senza un profilo reale e' comunque un fantasma.
    const { data: prof } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!prof) { await supabase.auth.signOut(); window.location.href = '/login'; return; }
    setUserId(user.id);
    setEmail(user.email ?? null);

    const { data: profile } = await supabase
      .from('profiles').select('username, avatar_url').eq('id', user.id).single();
    setUsername(profile?.username ?? null);
    setAvatarUrl(profile?.avatar_url ?? null);

    const { data: rows } = await supabase
      .from('hub_members')
      .select('hub_id, role, hidden, hub:hubs ( id, name, category, status, vote_label, votes_enabled, start_date, end_date )')
      .eq('user_id', user.id);

    // Ordine per imminenza: l'evento piu' vicino in cima. Chi apre l'app vuole vedere cosa sta per succedere.
    // Gli Hub senza data finiscono in fondo (Infinity), non in testa.
    const list = ((rows as any) ?? []).slice().sort((a: any, b: any) => {
      const ta = a.hub?.start_date ? new Date(a.hub.start_date).getTime() : Infinity;
      const tb = b.hub?.start_date ? new Date(b.hub.start_date).getTime() : Infinity;
      return ta - tb;
    });
    setMemberships(list);
    // Ripristino difensivo: l'Hub salvato vale solo se l'utente ne e' ancora membro.
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('junction_active_hub');
      if (saved && list.some((m: Membership) => m.hub_id === saved)) setActiveHubIdState(saved);
      else if (saved) localStorage.removeItem('junction_active_hub');
    }
    setLoading(false);
  };

  const setHubHidden = async (hubId: string, hidden: boolean) => {
    if (!userId) return;
    setMemberships(prev => prev.map(m => m.hub_id === hubId ? { ...m, hidden } : m));
    const { error } = await supabase
      .from('hub_members')
      .update({ hidden })
      .eq('hub_id', hubId)
      .eq('user_id', userId);
    if (error) { console.error('setHubHidden', error.message); await load(); }
  };

  useEffect(() => { load(); }, []);

  return (
    <HubContext.Provider value={{ userId, username, email, avatarUrl, memberships, activeHubId, setActiveHubId, loading, refresh: load, postAction, signalPostAction, julieOpen, openJulie, closeJulie, julieSeed, seedJulie, clearJulieSeed, setHubHidden, immersive, setImmersive }}>
      {children}
    </HubContext.Provider>
  );
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub deve stare dentro <HubProvider>');
  return ctx;
}
