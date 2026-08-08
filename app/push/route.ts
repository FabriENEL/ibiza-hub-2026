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

const scegli = (frasi: string[]) => frasi[Math.floor(Math.random() * frasi.length)];

// Risale dall'UUID al nome leggibile; se il profilo manca, resta un fallback neutro.
async function nomeDi(userId: string | null): Promise<string> {
  if (!userId) return 'Qualcuno';
  const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
  return data?.username ?? 'Qualcuno';
}

// Julie parla in prima persona e dichiara cosa ha gia' fatto: toglie ansia, non riporta dati.
function voceSpesa(chi: string, importo: string, cosa: string): string {
  const oggetto = cosa ? cosa : 'una spesa';
  return scegli([
    chi + ' ha aggiunto ' + oggetto + ', ' + importo + ' euro. Ho gi\u00E0 aggiornato i saldi, non deve pensarci.',
    'Ho registrato ' + oggetto + ' di ' + chi + ': ' + importo + ' euro. I conti sono in ordine.',
    chi + ' ha appena messo a cassa ' + oggetto + ' (' + importo + ' euro). Me ne sono occupata io.',
    'Nuova spesa da ' + chi + ': ' + oggetto + ', ' + importo + ' euro. Saldi ricalcolati.',
  ]);
}

function voceEvento(chi: string, titolo: string): string {
  return scegli([
    chi + ' ha fissato "' + titolo + '". L\u2019ho messo in programma per Lei.',
    'Ho aggiunto "' + titolo + '" al calendario, su indicazione di ' + chi + '.',
    'Novit\u00E0 in programma: "' + titolo + '", voluta da ' + chi + '. \u00C8 tutto annotato.',
    chi + ' ha organizzato "' + titolo + '". Trova ogni dettaglio nel programma.',
  ]);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { table, record, type } = payload;

    // Dal corpo ci si fida SOLO di questi: il tipo, la tabella, e l'id della riga.
    // Tutto il resto (destinatari, autore, testo) viene riletto dal database qui sotto:
    // un POST costruito a mano non puo' piu' dettare a chi arriva la notifica ne' cosa dice.
    const id: string | null = record?.id ?? null;
    if (type !== 'INSERT' || !id) {
      return NextResponse.json({ success: false, message: 'Evento non gestito.' });
    }

    // Rilettura autorevole della riga, col client di servizio. Solo le colonne che servono.
    let riga: any = null;
    if (table === 'expenses') {
      const { data } = await supabase
        .from('expenses')
        .select('id, hub_id, payer_id, amount, description, created_at')
        .eq('id', id)
        .single();
      riga = data;
    } else if (table === 'events') {
      const { data } = await supabase
        .from('events')
        .select('id, hub_id, created_by, title, created_at, reveal_at, revealed_override, reveal_visible_to')
        .eq('id', id)
        .single();
      riga = data;
    } else {
      return NextResponse.json({ success: false, message: 'Tabella non gestita.' });
    }

    // La riga non esiste (id inventato, o gia' cancellata): non si invia nulla.
    if (!riga?.hub_id) {
      return NextResponse.json({ success: false, message: 'Riga non trovata.' });
    }

    // Solo inserimenti freschi: un webhook vero arriva subito. Oltre i 5 minuti si esce,
    // cosi' non si possono rigiocare righe vecchie a ripetizione. created_at e' un istante
    // assoluto reale (non un orario da parete): il confronto con adesso e' corretto.
    const eta = Date.now() - new Date(riga.created_at).getTime();
    if (eta > 5 * 60 * 1000) {
      return NextResponse.json({ success: false, message: 'Riga non recente.' });
    }

    // Da qui in poi TUTTO viene da `riga`, mai da `record`.
    // Chi ha generato l'azione: non va notificato a se stesso.
    const autore: string | null = riga.created_by ?? riga.payer_id ?? null;

    const title = 'EventGarden';
    let body = '';

    if (table === 'expenses') {
      const chi = await nomeDi(riga.payer_id);
      const importo = Number(riga.amount ?? 0).toFixed(2).replace('.', ',');
      body = voceSpesa(chi, importo, riga.description ?? '');
    } else {
      const chi = await nomeDi(riga.created_by);
      body = voceEvento(chi, riga.title ?? 'un nuovo appuntamento');
    }

    // SORPRESA: se un evento non e' ancora svelato, la notifica non puo' tradire il segreto.
    // Lo stato di svelamento lo decide il DATABASE - la stessa funzione della vista del calendario,
    // col SUO now() - passando l'UUID zero (mai owner/autore/pubblico): cosi' can_see_event
    // restituisce il solo svelamento GLOBALE, senza inventare qui un confronto sul fuso orario.
    let soloPubblico: Set<string> | null = null;
    if (table === 'events') {
      const { data: svelato } = await supabase.rpc('can_see_event', {
        p_hub_id: riga.hub_id,
        p_reveal_at: riga.reveal_at ?? null,
        p_created_by: riga.created_by ?? null,
        p_reveal_visible_to: riga.reveal_visible_to ?? [],
        p_revealed_override: riga.revealed_override ?? null,
        p_user: '00000000-0000-0000-0000-000000000000',
      });
      // Non svelato (o esito incerto): i destinatari sono SOLO quelli nel pubblico. Per gli altri,
      // silenzio - niente notifica, nemmeno generica: un avviso vago annuncerebbe la sorpresa.
      if (svelato !== true) {
        soloPubblico = new Set<string>((riga.reveal_visible_to ?? []) as string[]);
      }
    }

    // Destinatari: SOLO i membri di quell'Hub, escluso l'autore. Evita fughe tra Hub diversi.
    // E per una sorpresa non svelata, solo chi e' gia' dentro il segreto (reveal_visible_to).
    const { data: membri } = await supabase
      .from('hub_members')
      .select('user_id')
      .eq('hub_id', riga.hub_id);

    const destinatari = (membri ?? [])
      .map((m: any) => m.user_id)
      .filter((uid: string) => uid !== autore)
      .filter((uid: string) => soloPubblico === null || soloPubblico.has(uid));

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