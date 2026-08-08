import { supabase } from '@/lib/supabase';
const ENABLED = process.env.NEXT_PUBLIC_LOGGING_ENABLED === 'true';
export async function logEvent(eventType: string, detail?: Record<string, unknown>, hubId?: string) {
  if (!ENABLED) return;
  try {
    // getSession legge la sessione GIA' in memoria: nessun giro di rete a ogni evento (era getUser,
    // che invece bussava al server ogni volta - troppo per un registro che dev'essere invisibile).
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    // insert restituisce { error } SENZA lanciare: se non lo si legge, un fallito passa inosservato.
    // E' cosi' che la verita' si e' persa per settimane. Il log non rompe l'app, ma in sviluppo parla.
    const { error } = await supabase.from('usage_log').insert({ user_id: user.id, hub_id: hubId ?? null, event_type: eventType, detail: detail ?? null });
    if (error && process.env.NODE_ENV !== 'production') console.warn('[log] insert', eventType, error.message);
  } catch (e) {
    // Il catch resta - il log non deve MAI rompere l'app - ma non piu' muto in sviluppo.
    if (process.env.NODE_ENV !== 'production') console.warn('[log]', eventType, e);
  }
}
