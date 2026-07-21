import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Due client distinti, due livelli di privilegio:
//  - admin: usa il PASSPARTOUT (service_role). Solo server. Scavalca le serrature.
//  - auth : usa la chiave pubblica + il badge di sessione, SOLO per verificare
//           chi è il richiedente. Non scavalca nulla.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,          // ← mai con NEXT_PUBLIC_
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  // 1) Estrai il badge di sessione che il browser invia nell'header.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  // 2) Verifica il badge: chi è davvero il richiedente?
  //    Non ci fidiamo di un id dichiarato dall'app: lo ricaviamo dal token.
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authErr } = await auth.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: 'Badge non valido' }, { status: 401 });
  }

  // 3) Leggi i dati del gruppo dal corpo della richiesta.
  const b = await req.json();
  const required = ['name','category','location','start_date','end_date','max_participants','passcode','creator_name'];
  for (const k of required) {
    if (b[k] === undefined || b[k] === null || b[k] === '') {
      return NextResponse.json({ error: `Campo mancante: ${k}` }, { status: 400 });
    }
  }

  // 4) Nascita atomica gruppo+OWNER, col passpartout, via la procedura del passo 2a.
  //    L'owner è user.id (dal badge verificato), NON un valore dichiarato dall'app.
  const { data, error } = await admin.rpc('create_hub_with_owner', {
    p_name: b.name,
    p_category: b.category,
    p_location: b.location,
    p_start_date: b.start_date,
    p_end_date: b.end_date,
    p_max_participants: b.max_participants,
    p_passcode: b.passcode,
    p_creator_name: b.creator_name,
    p_owner: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 5) Preferenze Consigli: si scrivono DOPO la nascita atomica (la RPC non le riceve).
  //    Se l'update fallisce, l'Hub resta valido e Consigli ripiega sui default:
  //    la creazione non deve fallire per una preferenza mancante.
  const consigli_cats = Array.isArray(b.consigli_cats) ? b.consigli_cats : null;
  const ritmo = typeof b.ritmo === 'string' ? b.ritmo : null;
  if (consigli_cats || ritmo) {
    const { error: prefErr } = await admin.from('hubs').update({ consigli_cats, ritmo }).eq('id', data);
    if (prefErr) console.error('Preferenze Hub non salvate:', prefErr.message);
  }

  return NextResponse.json({ hub_id: data }, { status: 201 });
}