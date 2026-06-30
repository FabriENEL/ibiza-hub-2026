import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // conserva il badge tra ricaricamenti di pagina
    autoRefreshToken: true,    // lo rinnova da solo prima che scada
    detectSessionInUrl: true,  // utile per il futuro magic-link / email
  },
});