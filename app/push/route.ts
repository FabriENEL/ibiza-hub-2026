import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@eventgarden.app',
  process.env.NEXT_PUBLIC_VAPID_KEY as string,
  process.env.PRIVATE_VAPID_KEY as string
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Risale dall'UUID al nome leggibile; se il profilo manca, resta un fallback neutro.
async function nomeDi(userId: string | null): Promise<string> {
  if (!userId) return 'Qualcuno';
  const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
  return data?.username ?? 'Qualcuno';
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { table, record, type } = payload;

    if (type !== 'INSERT' || !record?.hub_id) {
      return NextResponse.json({ success: false, message: 'Evento non gestito.' });
    }

    // Chi ha generato l'azione: non va notificato a se stesso.
    const autore: string | null = record.created_by ?? record.payer_id ?? null;

    let title = 'EventGarden';
    let body = 'Novita nel tuo Hub.';

    if (table === 'expenses') {
      const chi = await nomeDi(record.payer_id);
      const importo = Number(record.amount ?? 0).toFixed(2);
      const cosa = record.description ? ' per ' + record.description : '';
      title = 'Nuova spesa';
      body = chi + ' ha inserito ' + importo + ' EUR' + cosa + '.';
    } else if (table === 'events') {
      const chi = await nomeDi(record.created_by);
      title = 'Nuovo evento';
      body = chi + ' ha aggiunto "' + (record.title ?? 'un evento') + '" al programma.';
    } else {
      return NextResponse.json({ success: false, message: 'Tabella non gestita.' });
    }

    // Destinatari: SOLO i membri di quell'Hub, escluso l'autore. Evita fughe tra Hub diversi.
    const { data: membri } = await supabase
      .from('hub_members')
      .select('user_id')
      .eq('hub_id', record.hub_id);

    const destinatari = (membri ?? [])
      .map((m: any) => m.user_id)
      .filter((uid: string) => uid !== autore);

    if (destinatari.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Nessun destinatario.' });
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, subscription_data')
      .in('user_id', destinatari);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Nessun dispositivo iscritto.' });
    }

    const pushPayload = JSON.stringify({ title, body, url: '/dashboard' });

    const esiti = await Promise.all(
      subs.map((sub: any) =>
        webpush
          .sendNotification(sub.subscription_data, pushPayload)
          .then(() => true)
          .catch(async (err: any) => {
            // 410/404 = iscrizione morta (app disinstallata, permesso revocato): si ripulisce.
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            return false;
          })
      )
    );

    return NextResponse.json({ success: true, sent: esiti.filter(Boolean).length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}