'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string | null; scheduled_at: string; location: string | null; revealed: boolean };
type Wx = { temp: number; code: number; forecast: boolean };
type Tip = { name: string; type: string; rating: number | null; price: number | null };
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

async function fetchWx(city: { lat: number; lon: number }, iso: string): Promise<Wx | null> {
  try {
    const day = iso.split('T')[0];
    const days = (new Date(day).getTime() - Date.now()) / 86400000;
    if (days >= -1 && days <= 7) {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon + '&daily=weather_code,temperature_2m_max&start_date=' + day + '&end_date=' + day + '&timezone=auto');
      const d = await res.json();
      if (d?.daily?.temperature_2m_max?.[0] != null) return { temp: Math.round(d.daily.temperature_2m_max[0]), code: d.daily.weather_code[0], forecast: true };
      return null;
    }
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon + '&current=temperature_2m,weather_code');
    const d = await res.json();
    if (d?.current?.temperature_2m != null) return { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, forecast: false };
    return null;
  } catch { return null; }
}

export default function Consigli({ hubId, theme, category, rounded }: { hubId: string; theme: Theme; category: string; rounded: string }) {
  const r = rounded;
  const [focus, setFocus] = useState<EventRow | null>(null);
  const [wx, setWx] = useState<Wx | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [diag, setDiag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);

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

    if (target?.location) {
      try {
        const res = await fetch('/api/consigli', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: target.location }) });
        const d = await res.json();
        setSections((d.sections ?? []) as Section[]);
        setDiag(d.diag ?? null);
        setWx(d.geo ? await fetchWx(d.geo, target.scheduled_at) : null);
      } catch (e) { setSections([]); setDiag('errore rete: ' + String(e)); setWx(null); }
    } else { setSections([]); setWx(null); }

    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId, now]);

  const fmtDay = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
  const priceTag = (p: number | null) => (p && p >= 1 && p <= 4 ? '\u20AC'.repeat(p) : '');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black uppercase text-white tracking-wider mb-3">Meteo del programma</h3>
        {loading ? <div className={'h-32 bg-slate-900 border border-white/5 animate-pulse ' + r} /> :
          !focus ? <p className="text-slate-500 text-sm">Il meteo comparira qui al primo evento svelato con un luogo. Aggiunga un evento al programma.</p> :
          <div className={'eg-card relative overflow-hidden border ' + theme.border + ' p-5 ' + r}>
            {wx && <div aria-hidden className={'absolute inset-0 bg-gradient-to-br ' + wxTone(wx.code)} />}
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Prossimo evento</p>
                <p className="font-black text-white text-lg leading-tight">{focus.title}</p>
                <p className="text-[11px] text-slate-400 mt-1">{focus.location ?? 'Luogo non indicato'} · {fmtDay(focus.scheduled_at)}</p>
              </div>
              {wx ? (
                <div className="flex items-center gap-3">
                  <span className="text-5xl drop-shadow">{emoji(wx.code)}</span>
                  <div className="text-right">
                    <p className={'text-4xl font-black ' + theme.text}>{wx.temp}°</p>
                    <p className="text-[8px] uppercase text-slate-400 font-bold tracking-wider">{wx.forecast ? 'previsione' : 'attuale'}</p>
                  </div>
                </div>
              ) : <span className="text-[11px] text-slate-500 text-right max-w-[45%]">Le auguriamo la migliore delle giornate, in attesa delle previsioni reali.</span>}
            </div>
          </div>
        }
      </div>

      {diag && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200 text-xs break-words">
          <span className="font-black uppercase tracking-wide">Diagnostica Foursquare</span><br />{diag}
        </div>
      )}

      {!loading && focus && sections.every((s) => s.tips.length === 0) && !diag && (
        <p className="text-slate-500 text-sm">Nessun consiglio trovato per questa zona. Verifichi il luogo dell'evento o la chiave del servizio.</p>
      )}

      {sections.filter((s) => s.tips.length > 0).map((s) => (
        <div key={s.id}>
          <h3 className="font-black uppercase text-white tracking-wider mb-2">{s.title}</h3>
          <div className="space-y-2">
            {s.tips.map((tip, i) => (
              <div key={i} className={'eg-card border ' + theme.border + ' p-4 flex items-center justify-between transition-transform active:scale-[0.98] ' + r}>
                <div>
                  <p className="font-bold text-white text-sm">{tip.name}</p>
                  {tip.type && <p className="text-[11px] text-slate-400">{tip.type}</p>}
                </div>
                <div className="text-right shrink-0 ml-3">
                  {tip.rating != null && <span className={'text-sm font-black block ' + theme.text}>★ {tip.rating.toFixed(1)}</span>}
                  <span className="text-[10px] font-bold text-slate-500">{priceTag(tip.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-[9px] text-slate-600 text-center">Luoghi reali dai dintorni dell'evento · fonte Foursquare</p>
    </div>
  );
}