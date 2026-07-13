import { createClient } from '@supabase/supabase-js';

// Tariffe al 2026. Aggiornare qui se Google cambia i listini.
const COSTO = {
  google_places: 0.032,   // Text Search Pro: 32$/1000
  google_foto:   0.007,   // Place Photo: 7$/1000
  unsplash:      0,       // gratuito, ma con tetto orario
  groq:          0,       // gratuito
} as const;

// Registra ogni chiamata esterna. Non deve MAI far fallire la richiesta principale:
// se il registro cade, l'app continua. Il monitoraggio non e' piu' importante del servizio.
export async function segna(
  servizio: keyof typeof COSTO,
  operazione: string,
  extra?: { token?: number; meta?: any },
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const sb = createClient(url, key);
    await sb.from('api_usage').insert({
      servizio,
      operazione,
      costo_usd: COSTO[servizio] ?? 0,
      token: extra?.token ?? 0,
      meta: extra?.meta ?? null,
    });
  } catch { /* il registro non deve mai rompere il servizio */ }
}