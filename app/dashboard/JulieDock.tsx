'use client'
import { useHub } from './lib/HubContext';
import Julie from './Julie';

// Presenza persistente di J.U.L.I.E. dentro un Hub. Montata a livello pagina (non nel
// Gruppo) per sopravvivere al cambio sezione: icona "J" contratta -> tap -> chat espansa.
export default function JulieDock() {
  const { activeHubId, julieOpen, openJulie, closeJulie } = useHub();
  const julieOn = process.env.NEXT_PUBLIC_JULIE_ENABLED === 'true';
  if (!activeHubId || !julieOn) return null;

  return (
    <>
      {!julieOpen && (
        <button onClick={openJulie} aria-label="Apri J.U.L.I.E." title="Parla con J.U.L.I.E."
          className="fixed bottom-24 right-4 z-[90] w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform">
          <span aria-hidden className="eg-ripple-ring absolute inset-0 rounded-full animate-[eg-ripple_2.6s_ease-out_infinite]" style={{ background: 'rgba(163,181,133,0.45)' }} />
          <span aria-hidden className="eg-ripple-ring absolute inset-0 rounded-full animate-[eg-ripple_2.6s_ease-out_infinite]" style={{ background: 'rgba(163,181,133,0.30)', animationDelay: '1.3s' }} />
          <span className="relative w-full h-full rounded-full flex items-center justify-center text-2xl font-black shadow-xl shadow-black/60 [font-family:var(--font-display)]" style={{ background: 'linear-gradient(145deg, #B5C79A, #7d9968)', color: '#14161A', border: '2px solid rgba(255,255,255,0.30)' }}>J</span>
        </button>
      )}
      {julieOpen && <Julie onClose={closeJulie} hubId={activeHubId} />}
    </>
  );
}


