'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const NOMI: Record<string, string> = {
  google_places: 'Google Places — ricerca luoghi',
  google_foto: 'Google Places — foto',
  unsplash: 'Unsplash — copertine',
  groq: 'Groq — Julie',
};

// Il cambio euro/dollaro non serve al centesimo: serve a capire l'ordine di grandezza.
const EUR = 0.92;

export default function Monitor() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);

  const [negato, setNegato] = useState(false);

  const carica = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setNegato(true); return; }
      const r = await fetch('/api/usage', {
        cache: 'no-store',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (r.status === 403) { setNegato(true); return; }
      setD(await r.json());
      setErr(false);
      setNegato(false);
    } catch { setErr(true); }
  };

  useEffect(() => {
    carica();
    const t = setInterval(carica, 10000);   // aggiornamento ogni 10 secondi
    return () => clearInterval(t);
  }, []);
  
if (negato) return <main className="min-h-screen bg-[#141619] text-white/60 p-6 text-sm">Questa pagina è riservata.</main>;
  if (err) return <main className="min-h-screen bg-[#141619] text-white p-6">Registro non raggiungibile.</main>;
  if (!d) return <main className="min-h-screen bg-[#141619] text-white/50 p-6">Leggo il registro…</main>;

  const costoEur = (d.costoTot ?? 0) * EUR;

  return (
    <main className="min-h-screen bg-[#141619] text-white p-5 pb-16">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-lg font-black uppercase tracking-widest" style={{ color: '#A3B585' }}>Consumo API</h1>
        <p className="text-[11px] text-white/40 mb-5">
          Mese corrente · aggiornato {new Date(d.aggiornato).toLocaleTimeString('it-IT')} · si ricarica ogni 10s
        </p>

        <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(163,181,133,0.10)', border: '1px solid rgba(163,181,133,0.28)' }}>
          <p className="text-[10px] uppercase tracking-wider font-black" style={{ color: 'rgba(163,181,133,0.75)' }}>Costo stimato del mese</p>
          <p className="text-4xl font-black mt-1 tabular-nums">
            {costoEur < 0.01 && costoEur > 0 ? '< 0,01' : costoEur.toFixed(2).replace('.', ',')} <span className="text-2xl text-white/50">€</span>
          </p>
          <p className="text-[11px] text-white/40 mt-1">
            {costoEur === 0 ? 'Tutto dentro il piano gratuito.' : 'Stima sulle chiamate effettuate, non il dato di fatturazione.'}
          </p>
        </div>

        <div className="space-y-3">
          {Object.entries(d.agg).map(([k, v]: [string, any]) => {
            const perc = v.tetto > 0 ? Math.min(100, (v.mese / v.tetto) * 100) : 0;
            const allarme = perc > 70;
            return (
              <div key={k} className="rounded-xl p-4" style={{ background: '#1C1F22', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[12px] font-bold">{NOMI[k] ?? k}</span>
                  {v.tetto > 0 && (
                    <span className="text-[11px] font-black tabular-nums" style={{ color: allarme ? '#E8735C' : '#A3B585' }}>
                      {v.mese} / {v.tetto}
                    </span>
                  )}
                </div>

                {v.tetto > 0 && (
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: perc + '%', background: allarme ? '#E8735C' : '#A3B585' }} />
                  </div>
                )}

                <div className="flex gap-5 text-[11px] text-white/50 tabular-nums">
                  <span>Oggi <b className="text-white/85">{v.giorno}</b></span>
                  <span>Ultima ora <b className="text-white/85">{v.ora}</b></span>
                  {v.token > 0 && <span>Token <b className="text-white/85">{v.token.toLocaleString('it-IT')}</b></span>}
                  {v.costo > 0 && <span>Costo <b className="text-white/85">{(v.costo * EUR).toFixed(3).replace('.', ',')} €</b></span>}
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="text-[10px] uppercase tracking-wider font-black mt-7 mb-2" style={{ color: 'rgba(163,181,133,0.75)' }}>Ultime chiamate</h2>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {d.ultime.length === 0 && <p className="p-4 text-[12px] text-white/40">Nessuna chiamata registrata.</p>}
          {d.ultime.map((u: any, i: number) => (
            <div key={i} className="flex justify-between items-center px-4 py-2.5 text-[11px]"
              style={{ background: i % 2 ? '#1A1D20' : '#1C1F22', borderTop: i ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span className="text-white/80">{NOMI[u.servizio]?.split(' — ')[0] ?? u.servizio} <span className="text-white/35">· {u.operazione}</span></span>
              <span className="text-white/40 tabular-nums">
                {u.token ? u.token + ' tk · ' : ''}{new Date(u.quando).toLocaleTimeString('it-IT')}
              </span>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}