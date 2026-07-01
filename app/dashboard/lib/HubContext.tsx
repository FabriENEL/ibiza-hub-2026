'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type Membership = {
  hub_id: string;
  role: string;
  hub: { id: string; name: string; category: string; status: string; vote_label: string };
};

type HubContextValue = {
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  memberships: Membership[];
  activeHubId: string | null;
  setActiveHubId: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
};

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeHubId, setActiveHubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      .select('hub_id, role, hub:hubs ( id, name, category, status, vote_label )')
      .eq('user_id', user.id);

    setMemberships((rows as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <HubContext.Provider value={{ userId, username, avatarUrl, memberships, activeHubId, setActiveHubId, loading, refresh: load }}>
      {children}
    </HubContext.Provider>
  );
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub deve stare dentro <HubProvider>');
  return ctx;
}
