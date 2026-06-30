import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authErr } = await auth.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Badge non valido' }, { status: 401 });

  const body = await req.json();
  const passcode = (body.passcode ?? '').trim();
  if (!passcode) return NextResponse.json({ error: 'Passcode mancante' }, { status: 400 });

  const { data, error } = await admin.rpc('join_hub_with_passcode', {
    p_passcode: passcode,
    p_user: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Passcode non valido' }, { status: 404 });

  return NextResponse.json({ hub_id: data }, { status: 200 });
}
