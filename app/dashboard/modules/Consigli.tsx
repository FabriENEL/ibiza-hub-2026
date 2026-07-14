'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string | null; scheduled_at: string; location: string | null; revealed: boolean };
type Wx = { temp: number; code: number; forecast: boolean };
type Tip = { name: string; type: string; lat: number | null; lon: number | null; address: string | null };
type Section = { id: string; title: string; tips: Tip[] };


const emoji = (code: number) => {
  if (code === 0) return '\u2600\uFE0F';
  if (code <= 3) return '\u26C5';
  if (code >= 45 && code <= 48) return '\u{1F32B}\uFE0F';
  if (code >= 51 && code <= 67) return '\u{1F327}\uFE0F';
  if (code >= 71 && code <= 77) return '\u2744\uFE0F';
  if (code >= 80 && code <= 82) return '\u{1F326}\uFE0F';
  if (code >= 95) return '\u26C8\uFE0F';
  return '\u{1F321}\uFE0F';
};

const wxTone = (code: number) => {
  if (code === 0) return 'from-amber-500/25 to-orange-600/5';
  if (code <= 3) return 'from-sky-500/20 to-slate-800/5';
  if (code >= 51 && code <= 82) return 'from-blue-600/25 to-slate-800/5';
  if (code >= 95) return 'from-indigo-700/30 to-slate-900/5';
  return 'from-slate-600/20 to-slate-800/5';
};

// Icona "aggiungi al programma": calendario con il piu'. Dice cosa fa, a differenza del cuore.
const IconCalendarPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <path d="M8 2v3M16 2v3M3.5 9h17" />
    <path d="M20.5 12.5V7a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
    <path d="M17.5 15v6M14.5 18h6" />
  </svg>
);

const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

async function fetchWx(city: { lat: number; lon: number }, iso: string): Promise<Wx | null> {
  try {
    const day = iso.split('T')[0];
    const days = (new Date(day).getTime() - Date.now()) / 86400000;
    // Oltre 3 giorni: previsione non affidabile -> nessun numero, in schermata compare l'augurio.
    if (days > 3) return null;
    // Entro 3 giorni (oggi incluso): previsione reale del giorno dell'evento.
    if (days >= -1) {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon + '&daily=weather_code,temperature_2m_max&start_date=' + day + '&end_date=' + day + '&timezone=auto');
      const d = await res.json();
      if (d?.daily?.temperature_2m_max?.[0] != null) return { temp: Math.round(d.daily.temperature_2m_max[0]), code: d.daily.weather_code[0], forecast: true };
      return null;
    }
    // Evento gia' passato: meteo attuale.
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon + '&current=temperature_2m,weather_code');
    const d = await res.json();
    if (d?.current?.temperature_2m != null) return { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, forecast: false };
    return null;
  } catch { return null; }
}

export default function Consigli({ hubId, theme, category, rounded }: { hubId: string; theme: Theme; category: string; rounded: string }) {
  const { seedJulie } = useHub();
  const r = rounded;
  const [focus, setFocus] = useState<EventRow | null>(null);
  const [wx, setWx] = useState<Wx | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [risolto, setRisolto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);

  // Naviga al punto esatto (coordinate Foursquare); ripiega sul nome se mancano.
  const navigateTo = (tip: Tip) => window.open(
    tip.lat != null && tip.lon != null
      ? 'https://www.google.com/maps/search/?api=1&query=' + tip.lat + ',' + tip.lon
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(tip.name),
    '_blank'
  );
  // 'Aggiungi al programma': non crea nulla di nascosto. Sveglia Julie col luogo; sara' lei a chiedere data e ora.
  const propose = (tip: Tip) => seedJulie({ title: tip.name, location: tip.address || tip.name });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('events_view').select('id, title, scheduled_at, location, revealed').eq('hub_id', hubId).order('scheduled_at', { ascending: true });
    const evs = (data ?? []) as EventRow[];
    const next = evs.find((e) => new Date(e.scheduled_at).getTime() > now) ?? null;
    let target: EventRow | null = null;
    if (next && next.revealed) target = next;
    else {
      const past = evs.filter((e) => new Date(e.scheduled_at).getTime() <= now && e.revealed);
      target = past.length ? past[past.length - 1] : null;
    }
    setFocus(target);

    // Luogo per i consigli: quello dell'evento in focus, altrimenti quello dell'Hub (l'arrivo).
    let placeLoc: string | null = target?.location ?? null;
    if (!placeLoc) {
      const { data: hub } = await supabase.from('hubs').select('location').eq('id', hubId).single();
      const hl = (hub as any)?.location;
      placeLoc = hl && hl !== '-' ? hl : null;
    }

    if (placeLoc) {
      try {
        // Le categorie sono una scelta dell'Hub: una grigliata non vuole i musei,
        // e ogni categoria di troppo e' una chiamata a Google che si paga.
        const { data: hubRow } = await supabase.from('hubs').select('consigli_cats').eq('id', hubId).single();
        const cats = Array.isArray(hubRow?.consigli_cats) && hubRow.consigli_cats.length > 0 ? hubRow.consigli_cats : null;
        const res = await fetch('/api/consigli', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: placeLoc, cats }) });
        const d = await res.json();
        setSections((d.sections ?? []) as Section[]);
        setRisolto(d.risolto ?? null);
        // La voce di Julie anche quando qualcosa non torna: mai messaggi da sviluppatore in schermata.
        setAvviso(
          d.error === 'geocode_failed'
            ? 'Non riesco a individuare la zona di "' + placeLoc + '". Se aggiunge il comune al luogo dell\u2019evento, Le porto consigli e meteo.'
            : d.error === 'no_key'
            ? 'Il servizio dei luoghi non risponde. Me ne sto occupando.'
            : null
        );
        // Meteo solo con un evento in focus (segue il calendario); dal solo luogo Hub non mostriamo un numero.
        setWx(target?.location && d.geo ? await fetchWx(d.geo, target.scheduled_at) : null);
      } catch {
        setSections([]);
        setWx(null);
        setAvviso('Non riesco a raggiungere il servizio dei consigli in questo momento. Riprovi tra poco.');
      }
    } else {
      setSections([]);
      setWx(null);
      setAvviso(null);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId, now]);

  const fmtDay = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black uppercase text-white tracking-wider mb-3">Meteo del programma</h3>
        {loading ? <div className={'h-32 bg-slate-900 border border-white/5 animate-pulse ' + r} /> :
          !focus ? <p className="text-slate-500 text-sm">Il meteo comparir&agrave; qui al primo evento svelato con un luogo. Aggiunga un evento al programma.</p> :
          <div className={'eg-card relative overflow-hidden border ' + theme.border + ' p-5 ' + r}>
            {wx && <div aria-hidden className={'absolute inset-0 bg-gradient-to-br ' + wxTone(wx.code)} />}
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Prossimo evento</p>
                <p className="font-black text-white text-lg leading-tight">{focus.title}</p>
                <p className="text-[11px] text-slate-400 mt-1">{focus.location ?? 'Luogo non indicato'} &middot; {fmtDay(focus.scheduled_at)}</p>
              </div>
              {wx ? (
                <div className="flex items-center gap-3">
                  <span className="text-5xl drop-shadow">{emoji(wx.code)}</span>
                  <div className="text-right">
                    <p className={'text-4xl font-black ' + theme.text}>{wx.temp}&deg;</p>
                    <p className="text-[8px] uppercase text-slate-400 font-bold tracking-wider">{wx.forecast ? 'previsione' : 'attuale'}</p>
                  </div>
                </div>
              ) : <span className="text-[11px] text-slate-500 text-right max-w-[45%]">Le auguriamo la migliore delle giornate, in attesa delle previsioni reali.</span>}
            </div>
          </div>
        }
      </div>

      {avviso && (
        <div className={'flex items-start gap-3 p-4 ' + r} style={{ background: 'rgba(163,181,133,0.10)', border: '1px solid rgba(163,181,133,0.28)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0" style={{ background: '#A3B585', color: '#14161A' }}>J</div>
          <p className="text-[12px] leading-relaxed text-slate-300">{avviso}</p>
        </div>
      )}

      {risolto && sections.some((s) => s.tips.length > 0) && (
        <p className="text-[10px] text-slate-500 -mt-2">Consigli nei dintorni di <span style={{ color: '#A3B585' }}>{risolto}</span></p>
      )}

      {!loading && focus && !avviso && sections.every((s) => s.tips.length === 0) && (
        <p className="text-slate-500 text-sm">Nessun consiglio trovato in questa zona.</p>
      )}

      {sections.filter((s) => s.tips.length > 0).map((s) => (
        <div key={s.id}>
          <h3 className="font-black uppercase text-white tracking-wider mb-2">{s.title}</h3>
          <div className="space-y-2">
            {s.tips.map((tip, i) => (
              <div key={i} className={'eg-card border ' + theme.border + ' p-4 flex items-center justify-between ' + r}>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">{tip.name}</p>
                  {tip.type && <p className="text-[11px] text-slate-400 truncate">{tip.type}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button onClick={() => navigateTo(tip)} aria-label="Naviga fin qui" title="Naviga fin qui"
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 text-slate-300 active:scale-90 transition-transform">
                    <IconPin />
                  </button>
                  {s.id !== 'parking' && (
                    <button onClick={() => propose(tip)} aria-label="Aggiungi al programma" title="Aggiungi al programma"
                      className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: 'rgba(163,181,133,0.14)', border: '1px solid rgba(163,181,133,0.35)', color: '#A3B585' }}>
                      <IconCalendarPlus />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-[9px] text-slate-600 text-center">Luoghi reali dai dintorni &middot; tocca il calendario per aggiungerli al programma</p>
    </div>
  );
}