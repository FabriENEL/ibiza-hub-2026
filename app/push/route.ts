import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@ibiza2026.local',
  process.env.NEXT_PUBLIC_VAPID_KEY as string,
  process.env.PRIVATE_VAPID_KEY as string
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { table, record, type } = payload;

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: false, message: 'Nessun dispositivo registrato.' });
    }

    let title = 'Aggiornamento Ibiza 2026';
    let body = 'Nuovo inserimento rilevato.';

    if (table === 'daily_sballato_votes' && type === 'INSERT') {
      title = '📢 Voto Sballato!';
      body = `${record.voter_name} ha votato ${record.candidate_name}.`;
    } else if (table === 'event_comments' && type === 'INSERT') {
      title = '💬 Nuova Recensione!';
      body = `${record.author_name} ha scritto una nota.`;
    } else if (table === 'shared_expenses' && type === 'INSERT') {
      title = '💸 Spesa Comune!';
      body = `${record.payer_name} ha inserito €${Number(record.amount).toFixed(2)}.`;
    }

    const pushPayload = JSON.stringify({ title, body, url: '/dashboard' });

    const notifications = subscriptions.map((sub: any) => {
      return webpush.sendNotification(sub.subscription_data, pushPayload)
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        });
    });

    await Promise.all(notifications);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}