'use client'
import { useState } from 'react';

export type Cat = { id: string; label: string; fiore: string; icona: string };

// Le sette categorie reali del motore. L'ordine segue il ritmo di una giornata.
export const CATEGORIE: Cat[] = [
  { id: 'colazione', label: 'Colazione', fiore: '#F0C558', icona: 'M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z M6 2v2M10 2v2M14 2v2' },
  { id: 'cultura',   label: 'Arte e cultura', fiore: '#78B4EE', icona: 'M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6' },
  { id: 'natura',    label: 'Natura', fiore: '#8BD073', icona: 'M12 22v-7M12 15c-4 0-6-3-6-6a6 6 0 0 1 12 0c0 3-2 6-6 6Z' },
  { id: 'beach',     label: 'Mare e relax', fiore: '#5CC7E8', icona: 'M2 18c1.5 0 2-1 3.5-1s2 1 3.5 1 2-1 3.5-1 2 1 3.5 1 2-1 3.5-1M12 3v12M4 15a8 8 0 0 1 16 0' },
  { id: 'food',      label: 'Buona tavola', fiore: '#E8A05C', icona: 'M7 2v9a3 3 0 0 0 3 3v8M7 6h6M10 2v4M17 2c-1.5 2-2 4-2 7h4c0-3-.5-5-2-7ZM17 9v13' },
  { id: 'aperitivo', label: 'Aperitivo', fiore: '#E86DB4', icona: 'M5 4h14l-7 8ZM12 12v8M8 20h8' },
  { id: 'night',     label: 'Nightlife', fiore: '#8B6DE8', icona: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
];

export default function CategorieCard({
  onConferma, saving,
}: {
  onConferma: (scelte: string[], ritmo: string) => void;
  saving?: boolean;
}) {
  const [scelte, setScelte] = useState<Set<string>>(new Set());
  const [fatto, setFatto] = useState(false);
  // Il ritmo non e' una proprieta' della persona: dipende dal viaggio.
  // Chi rientra alle cinque non vuole la spiaggia alle nove.
  const [ritmo, setRitmo] = useState('equilibrata');

  const alterna = (id: string) => {
    if (fatto) return;
    setScelte((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const conferma = () => {
    if (fatto || scelte.size === 0) return;
    setFatto(true);
    onConferma(Array.from(scelte), ritmo);
  };

  const n = scelte.size;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(163,181,133,0.10)', border: '1px solid rgba(163,181,133,0.28)' }}>
      <p className="text-[10px] uppercase tracking-wider font-black mb-3" style={{ color: 'rgba(163,181,133,0.75)' }}>
        Che giornata desidera?
      </p>

      <div className="flex flex-wrap gap-2">
        {CATEGORIE.map((c) => {
          const on = scelte.has(c.id);
          return (
            <button key={c.id} onClick={() => alterna(c.id)}
              aria-label={(on ? 'Togli ' : 'Aggiungi ') + c.label}
              disabled={fatto}
              className={'flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1.5 transition-all active:scale-95 ' + (fatto && !on ? 'opacity-30' : '')}
              style={{
                background: on ? c.fiore : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (on ? c.fiore : 'rgba(255,255,255,0.12)'),
                color: on ? '#1C1F22' : 'rgba(255,255,255,0.7)',
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d={c.icona} />
              </svg>
              <span className="text-[11px] font-bold whitespace-nowrap">{c.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] uppercase tracking-wider font-black mt-4 mb-2" style={{ color: 'rgba(163,181,133,0.75)' }}>
        Che ritmo?
      </p>
      <div className="flex gap-2">
        {[['mattiniera', 'Mattiniera'], ['equilibrata', 'Equilibrata'], ['notturna', 'Notturna']].map(([id, lab]) => {
          const on = ritmo === id;
          return (
            <button key={id} onClick={() => { if (!fatto) setRitmo(id); }} disabled={fatto}
              className={'flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95 ' + (fatto && !on ? 'opacity-30' : '')}
              style={{
                background: on ? 'rgba(163,181,133,0.9)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (on ? '#A3B585' : 'rgba(255,255,255,0.12)'),
                color: on ? '#1C1F22' : 'rgba(255,255,255,0.7)',
              }}>
              {lab}
            </button>
          );
        })}
      </div>

      {fatto ? (
        <p className="mt-4 text-center text-[12px] font-black" style={{ color: '#A3B585' }}>Sto componendo&hellip;</p>
      ) : (
        <button onClick={conferma} disabled={n === 0 || saving}
          className="mt-4 w-full rounded-xl py-2.5 text-[12px] font-black transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: '#A3B585', color: '#1C1F22' }}>
          {n === 0 ? 'Ne scelga almeno una' : 'Componi il programma'}
        </button>
      )}
    </div>
  );
}
