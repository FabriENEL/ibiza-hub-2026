'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AppIconMark } from '@/components/brand/AppIconMark';

// La versione dell'informativa a cui si riferisce la presa visione. DEVE coincidere con la
// 'versione' scritta in privacy_consents. Il controllo a monte cerca una riga con QUESTA versione,
// non "l'ultima riga dell'utente": una presa visione di un'altra versione non salta questa schermata.
export const PRIVACY_VERSIONE = '1.0';

// --- Resa dell'informativa (nessuna libreria in casa: rendo solo i costrutti che il file usa) ---
// Grassetto **...** e corsivo *...*. Il grassetto si stacca prima, cosi' il corsivo non lo spezza.
function inline(text: string, base: string): React.ReactNode[] {
  const nodi: React.ReactNode[] = [];
  text.split(/(\*\*[^*]+\*\*)/g).forEach((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) { nodi.push(<strong key={base + 'b' + i}>{p.slice(2, -2)}</strong>); return; }
    p.split(/(\*[^*]+\*)/g).forEach((s, j) => {
      if (/^\*[^*]+\*$/.test(s)) nodi.push(<em key={base + 'i' + i + '-' + j}>{s.slice(1, -1)}</em>);
      else if (s) nodi.push(<span key={base + 't' + i + '-' + j}>{s}</span>);
    });
  });
  return nodi;
}

function renderInformativa(md: string): React.ReactNode[] {
  const righe = md.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0, n = 0;
  const k = () => 'md' + (n++);
  const speciale = (l: string) => /^\s*$/.test(l) || /^---+\s*$/.test(l) || /^#{1,6}\s/.test(l) || /^>\s?/.test(l) || /^\|/.test(l) || /^-\s+/.test(l);
  while (i < righe.length) {
    const l = righe[i];
    if (/^\s*$/.test(l)) { i++; continue; }
    if (/^---+\s*$/.test(l)) { out.push(<hr key={k()} className="my-4 border-white/10" />); i++; continue; }
    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const cls = lvl <= 1 ? 'text-lg font-black text-white mt-5 mb-2'
        : lvl === 2 ? 'text-base font-black text-white mt-5 mb-2'
        : 'text-sm font-black text-slate-200 mt-3 mb-1';
      out.push(<p key={k()} className={cls}>{inline(h[2], k())}</p>); i++; continue;
    }
    if (/^>\s?/.test(l)) {
      const buf: string[] = [];
      while (i < righe.length && /^>\s?/.test(righe[i])) { buf.push(righe[i].replace(/^>\s?/, '')); i++; }
      out.push(<blockquote key={k()} className="border-l-2 border-emerald-500/40 pl-3 my-3 text-slate-300 text-sm italic">{inline(buf.join(' '), k())}</blockquote>);
      continue;
    }
    if (/^\|/.test(l)) {
      const buf: string[] = [];
      while (i < righe.length && /^\|/.test(righe[i])) { buf.push(righe[i]); i++; }
      const celle = (r: string) => r.split('|').slice(1, -1).map((c) => c.trim());
      const testa = celle(buf[0]);
      const corpo = buf.slice(2).map(celle);
      out.push(
        <div key={k()} className="my-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr>{testa.map((c, ci) => <th key={ci} className="border border-white/10 px-2 py-1 text-left font-black text-slate-200">{inline(c, k())}</th>)}</tr></thead>
            <tbody>{corpo.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-white/10 px-2 py-1 align-top text-slate-300">{inline(c, k())}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^-\s+/.test(l)) {
      const buf: string[] = [];
      while (i < righe.length && /^-\s+/.test(righe[i])) { buf.push(righe[i].replace(/^-\s+/, '')); i++; }
      out.push(<ul key={k()} className="list-disc pl-5 my-2 space-y-1 text-sm text-slate-300">{buf.map((b, bi) => <li key={bi}>{inline(b, k())}</li>)}</ul>);
      continue;
    }
    const buf: string[] = [];
    while (i < righe.length && !speciale(righe[i])) { buf.push(righe[i]); i++; }
    out.push(<p key={k()} className="my-2 text-sm text-slate-300 leading-relaxed">{inline(buf.join(' '), k())}</p>);
  }
  return out;
}

// La schermata di presa visione. Sta DAVANTI al contenuto: chi non ha ancora preso visione
// della versione corrente vede questa, non l'app. Non e' un vicolo cieco - ha la sua rete di riprova.
export default function PrivacyGate({ userId, onConsentito }: { userId: string; onConsentito: () => void }) {
  const [testo, setTesto] = useState<string | null>(null);
  const [presaVisione, setPresaVisione] = useState(false);   // MAI pre-spuntata
  const [marketing, setMarketing] = useState(false);          // MAI pre-spuntata - atto giuridico DISTINTO
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    let vivo = true;
    fetch('/privacy-v1.md').then((r) => r.text()).then((t) => { if (vivo) setTesto(t); }).catch(() => { if (vivo) setTesto(''); });
    return () => { vivo = false; };
  }, []);

  const accetta = async () => {
    if (!presaVisione || busy) return;
    setBusy(true); setErrore('');
    // PRIMA si scrive, POI si entra. accettato_il lo mette il database (now()): mando solo le tre
    // colonne che ho il permesso di scrivere - il client non puo' falsificare il momento.
    const { error } = await supabase.from('privacy_consents').insert({ user_id: userId, versione: PRIVACY_VERSIONE, marketing });
    // 23505 = la riga esiste gia': presa visione gia' registrata, si entra. Ogni altro errore
    // (quasi sempre la rete, da Bangkok capita) NON fa entrare: si resta qui, con un modo per riprovare.
    if (error && error.code !== '23505') {
      setBusy(false);
      setErrore('Non sono riuscita a registrare la Sua presa visione. Spesso è solo la rete: riprovi pure, resto qui con Lei.');
      return;
    }
    onConsentito();   // solo DOPO la scrittura (o la conferma che c'era gia')
  };

  // LA PORTA. Chi in questo momento non vuole prendere visione non resta intrappolato: un utente
  // in PWA riaprirebbe l'app allo stesso muro, ancora connesso. Collegamento discreto, non un
  // secondo bottone che compete col primo. Stesso signOut della scheda Gruppo.
  const esci = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <AppIconMark withBackground={false} withRing={false} className="w-[72px] mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 mt-2">EventGarden</p>
          <h1 className="text-2xl font-black text-white mt-1 leading-tight [font-family:var(--font-display)]">Prima di entrare, una cosa di cui devo informarLa.</h1>
          <p className="text-slate-300 text-sm mt-3 leading-relaxed">
            Qui dentro custodiremo le Sue fotografie, i Suoi eventi e le nostre conversazioni. Ho preparato il
            documento che spiega quali dati trattiamo, dove finiscono e come può farli cancellare.
          </p>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            Per usare EventGarden non serve alcun consenso: Le basta prenderne visione. Il resto è facoltativo, e lo decide Lei.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 max-h-[52vh] overflow-y-auto">
          {testo === null ? <p className="text-slate-400 text-sm">Carico l&rsquo;informativa…</p>
            : testo === '' ? <p className="text-slate-400 text-sm">Non riesco a mostrarla qui in questo momento. La apra dal collegamento qui sotto, poi torni a confermare.</p>
            : renderInformativa(testo)}
        </div>
        <div className="text-center mt-2">
          <a href="/privacy-v1.md" target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 underline underline-offset-2">Apri l&rsquo;informativa completa in una nuova scheda</a>
        </div>

        <div className="mt-6 space-y-4">
          {/* Atto obbligatorio: la presa visione. Senza, il tasto non si accende. */}
          <label className="flex items-start gap-3 rounded-2xl border border-white/15 bg-slate-900 p-4 cursor-pointer active:scale-[0.99] transition-transform">
            <input type="checkbox" checked={presaVisione} onChange={(e) => setPresaVisione(e.target.checked)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-emerald-500" />
            <span className="text-sm text-slate-200 leading-relaxed">
              Dichiaro di aver preso visione dell&rsquo;Informativa sul trattamento dei dati personali di EventGarden,
              <strong> versione 1.0 dell&rsquo;8 agosto 2026</strong>.
            </span>
          </label>

          {/* Atto DISTINTO e facoltativo: il marketing. Separato, non nello stesso gruppo. */}
          <div className="pt-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Consensi facoltativi</p>
            <p className="text-[11px] text-slate-500 mb-3 leading-snug">Il mancato rilascio non pregiudica in alcun modo la registrazione né l&rsquo;uso dell&rsquo;Applicazione.</p>
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 cursor-pointer active:scale-[0.99] transition-transform">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 w-5 h-5 shrink-0 accent-emerald-500" />
              <span className="text-sm text-slate-300 leading-relaxed">
                Acconsento a ricevere comunicazioni relative all&rsquo;Applicazione, alle sue nuove funzioni e alle iniziative del Titolare.
              </span>
            </label>
          </div>

          <button onClick={accetta} disabled={!presaVisione || busy}
            className="w-full bg-white text-slate-950 p-4 rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] disabled:opacity-40 active:scale-[0.98] transition-transform">
            {busy ? 'Registro…' : 'Ho preso visione ed entro'}
          </button>
          {errore && <p className="text-red-400 text-sm text-center leading-snug">{errore}</p>}
          <button onClick={esci} className="w-full text-center text-[10px] uppercase tracking-widest text-slate-600 active:text-slate-400 py-2">Esci</button>
        </div>
      </div>
    </div>
  );
}
