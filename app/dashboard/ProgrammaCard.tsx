'use client'
import { useState } from 'react';

export type Voce = {
  ora: string | null;
  titolo: string;
  categoria: string | null;
  luogo: { name: string; address: string | null; lat: number | null; lon: number | null } | null;
};
export type Giorno = { data: string | null; voci: Voce[] };

// Fiori di categoria: dettagli vividi su fondo antracite, mai dominanti.
const FIORE: Record<string, string> = {
  colazione: '#F0C558',
  food: '#E8A05C',
  aperitivo: '#E86DB4',
  night: '#8B6DE8',
  beach: '#5CC7E8',
  cultura: '#78B4EE',
  natura: '#8BD073',
  parking: '#8A9099',
};

const giornoEsteso = (iso: string | null) => {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return iso; }
};

export default function ProgrammaCard({
  zona, giorni, onConferma, saving,
}: {
  zona: string;
  giorni: Giorno[];
  onConferma: (scelte: Voce[]) => void;
  saving?: boolean;
}) {
  // Chiave stabile per voce: giorno + posizione. Tutte selezionate all'apertura:
  // l'utente toglie cio' che non vuole, non deve costruire da zero.
  const chiaviTutte = giorni.flatMap((g, gi) => g.voci.map((_, vi) => gi + ':' + vi));
  const [scelte, setScelte] = useState<Set<string>>(new Set(chiaviTutte));
  // Una volta fissato, la card diventa un riepilogo inerte: il tasto sparisce e le spunte si bloccano.
  const [fissato, setFissato] = useState(false);

  const alterna = (k: string) => {
    if (fissato) return;
    setScelte((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  const conferma = () => {
    if (fissato) return;
    setFissato(true);
    const out: Voce[] = [];
    giorni.forEach((g, gi) => g.voci.forEach((v, vi) => {
      if (scelte.has(gi + ':' + vi)) out.push({ ...v, ora: g.data && v.ora ? g.data + 'T' + v.ora + ':00' : null });
    }));
    onConferma(out);
  };

  const n = scelte.size;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(163,181,133,0.10)', border: '1px solid rgba(163,181,133,0.28)' }}>
      <p className="text-[10px] uppercase tracking-wider font-black mb-3" style={{ color: 'rgba(163,181,133,0.75)' }}>
        Programma &middot; {zona}
      </p>

      {giorni.map((g0, gi) => { const g = { ...g0, voci: [...g0.voci].sort((a, b) => (a.ora ?? '').localeCompare(b.ora ?? '')) }; return (
        <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
          <p className="text-[11px] font-black text-white/70 capitalize mb-2">{giornoEsteso(g.data)}</p>

          <div className="space-y-1.5">
            {g.voci.map((v, vi) => {
              const k = gi + ':' + vi;
              const on = scelte.has(k);
              const fiore = FIORE[v.categoria ?? ''] ?? '#A3B585';
              return (
                <button key={k} onClick={() => alterna(k)}
                  aria-label={(on ? 'Escludi ' : 'Includi ') + v.titolo}
                  className={'w-full flex items-start gap-2.5 text-left rounded-xl px-3 py-2.5 transition-all active:scale-[0.99] ' + (on ? '' : 'opacity-40')}
                  style={{ background: on ? 'rgba(255,255,255,0.05)' : 'transparent', border: '1px solid ' + (on ? 'rgba(163,181,133,0.25)' : 'rgba(255,255,255,0.07)') }}>

                  <span aria-hidden className="mt-0.5 shrink-0 w-4 h-4 rounded-[5px] flex items-center justify-center"
                    style={{ background: on ? fiore : 'transparent', border: '1.5px solid ' + (on ? fiore : 'rgba(255,255,255,0.3)') }}>
                    {on && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1C1F22" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[11px] font-black tabular-nums shrink-0" style={{ color: fiore }}>{v.ora ?? '--:--'}</span>
                      <span className="text-[13px] font-bold text-white truncate">{v.luogo ? v.luogo.name : v.titolo}</span>
                    </span>
                    {v.luogo && (
                      <>
                        <span className="block text-[11px] text-white/55 truncate mt-0.5">{v.titolo}</span>
                        {v.luogo.address && <span className="block text-[10px] text-white/35 truncate">{v.luogo.address}</span>}
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ); })}

      {fissato ? (
        <p className="mt-4 text-center text-[12px] font-black" style={{ color: '#A3B585' }}>Fissato in calendario</p>
      ) : (
      <button onClick={conferma} disabled={n === 0 || saving}
        className="mt-4 w-full rounded-xl py-2.5 text-[12px] font-black transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: '#A3B585', color: '#1C1F22' }}>
        {saving ? 'Fisso in calendario\u2026' : n === 0 ? 'Nessuna voce selezionata' : 'Fissa ' + n + (n === 1 ? ' voce' : ' voci')}
      </button>
      )}
    </div>
  );
}
