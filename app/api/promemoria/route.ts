import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

webpush.setVapidDetails(
  'mailto:admin@eventgarden.app',
  process.env.NEXT_PUBLIC_VAPID_KEY as string,
  process.env.PRIVATE_VAPID_KEY as string
);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const scegli = (f: string[]) => f[Math.floor(Math.random() * f.length)];

// Gira ogni 15 minuti. Prende gli eventi che cadono fra 60 e 75 minuti: ogni evento
// entra in questa finestra una volta sola, quindi nessun promemoria doppio senza
// bisogno di una colonna di stato sul database.
export async function GET() {
  const ora = Date.now();
  const da = new Date(ora + 60 * 60 * 1000).toISOString();
  const a = new Date(ora + 75 * 60 * 1000).toISOString();

  const { data: eventi } = await supabase
    .from('events')
    .select('id, hub_id, title, location, scheduled_at')
    .gte('scheduled_at', da)
    .lt('scheduled_at', a);

  if (!eventi || eventi.length === 0) return NextResponse.json({ inviati: 0 });

  let inviati = 0;
  for (const ev of eventi) {
    const { data: membri } = await supabase.from('hub_members').select('user_id').eq('hub_id', ev.hub_id);
    const ids = (membri ?? []).map((m: any) => m.user_id);
    if (ids.length === 0) continue;

    const { data: subs } = await supabase.from('push_subscriptions').select('subscription_data').in('user_id', ids);
    if (!subs || subs.length === 0) continue;

    const dove = ev.location ? ' a ' + ev.location : '';
    const corpo = scegli([
      'Fra un\u2019ora tocca a "' + ev.title + '"' + dove + '. Si prepari con calma.',
      '"' + ev.title + '" inizia fra un\u2019ora' + dove + '. Glielo ricordo io.',
      'Manca un\u2019ora a "' + ev.title + '"' + dove + '. Tutto pronto.',
    ]);

    const payload = JSON.stringify({ title: 'J.U.L.I.E.', body: corpo, tag: 'promemoria-' + ev.id });

    for (const s of subs) {
      try {
        await webpush.sendNotification(s.subscription_data as any, payload);
        inviati++;
      } catch { /* iscrizione morta: si ignora */ }
    }
  }
  return NextResponse.json({ inviati });
}