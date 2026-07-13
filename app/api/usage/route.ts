import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

// Tetti gratuiti mensili dei fornitori. Aggiornare se cambiano i listini.
const TETTO = { google_places: 5000, google_foto: 5000, unsplash: 0, groq: 0 };

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ errore: 'config' }, { status: 500 });

  const sb = createClient(url, key);
  const ora = new Date();
  const inizioMese = new Date(ora.getFullYear(), ora.getMonth(), 1).toISOString();
  const inizioGiorno = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate()).toISOString();
  const unOraFa = new Date(Date.now() - 3600000).toISOString();

  const { data } = await sb.from('api_usage')
    .select('servizio, operazione, costo_usd, token, creato_il')
    .gte('creato_il', inizioMese)
    .order('creato_il', { ascending: false })
    .limit(5000);

  const righe = (data as any[]) ?? [];

  const agg: Record<string, any> = {};
  for (const s of ['google_places', 'google_foto', 'unsplash', 'groq']) {
    const dellaVoce = righe.filter((r) => r.servizio === s);
    agg[s] = {
      mese:   dellaVoce.length,
      giorno: dellaVoce.filter((r) => r.creato_il >= inizioGiorno).length,
      ora:    dellaVoce.filter((r) => r.creato_il >= unOraFa).length,
      costo:  dellaVoce.reduce((t, r) => t + Number(r.costo_usd ?? 0), 0),
      token:  dellaVoce.reduce((t, r) => t + Number(r.token ?? 0), 0),
      tetto:  (TETTO as any)[s] ?? 0,
    };
  }

  const ultime = righe.slice(0, 30).map((r) => ({
    servizio: r.servizio, operazione: r.operazione,
    costo: Number(r.costo_usd ?? 0), token: r.token, quando: r.creato_il,
  }));

  const costoTot = righe.reduce((t, r) => t + Number(r.costo_usd ?? 0), 0);

  return NextResponse.json({ agg, ultime, costoTot, aggiornato: ora.toISOString() });
}