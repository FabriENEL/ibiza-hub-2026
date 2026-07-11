'use client'

// Schede dei luoghi veri che Julie trova nei dintorni.
// Vivono dentro la chat: chi parla con Julie non deve uscirne per scegliere un posto.
export type Luogo = {
  name: string;
  type: string;
  lat: number | null;
  lon: number | null;
  address: string | null;
};

const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

const IconCalendarPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
    <path d="M8 2v3M16 2v3M3.5 9h17" />
    <path d="M20.5 12.5V7a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
    <path d="M17.5 15v6M14.5 18h6" />
  </svg>
);

export default function LuoghiCard({ luoghi, zona, onScegli }: {
  luoghi: Luogo[];
  zona?: string | null;
  onScegli: (l: Luogo) => void;
}) {
  if (!luoghi || luoghi.length === 0) return null;

  const navigaA = (l: Luogo) => window.open(
    l.lat != null && l.lon != null
      ? 'https://www.google.com/maps/search/?api=1&query=' + l.lat + ',' + l.lon
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.name),
    '_blank'
  );

  return (
    <div className="space-y-2">
      {zona && <p className="text-[10px] text-emerald-200/40 px-1">nei dintorni di {zona}</p>}
      {luoghi.map((l, i) => (
        <div key={i} className="rounded-2xl p-3.5 flex items-center justify-between gap-3"
          style={{ background: 'rgba(163,181,133,0.10)', border: '1px solid rgba(163,181,133,0.28)' }}>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{l.name}</p>
            {l.type && <p className="text-[11px] text-emerald-200/50 truncate">{l.type}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigaA(l)} aria-label="Naviga fin qui" title="Naviga fin qui"
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 text-emerald-100/70 active:scale-90 transition-transform">
              <IconPin />
            </button>
            <button onClick={() => onScegli(l)} aria-label="Aggiungi al programma" title="Aggiungi al programma"
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(163,181,133,0.16)', border: '1px solid rgba(163,181,133,0.4)', color: '#A3B585' }}>
              <IconCalendarPlus />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}