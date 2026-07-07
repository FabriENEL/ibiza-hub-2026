import { supabase } from '@/lib/supabase';
const ENABLED = process.env.NEXT_PUBLIC_LOGGING_ENABLED === 'true';
export async function logEvent(eventType: string, detail?: Record<string, unknown>, hubId?: string) {
  if (!ENABLED) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('usage_log').insert({ user_id: user.id, hub_id: hubId ?? null, event_type: eventType, detail: detail ?? null });
  } catch { /* silenzioso: il log non rompe mai l'app */ }
}
