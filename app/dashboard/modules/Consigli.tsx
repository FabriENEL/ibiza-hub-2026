'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string | null; scheduled_at: string; location: string | null; revealed: boolean };
type Wx = { temp: number; code: number; forecast: boolean };

const CITIES: Record<string, { lat: number; lon: number }> = {
  'malpensa': { lat: 45.6306, lon: 8.7281 }, 'linate': { lat: 45.4451, lon: 9.2767 },
  'milano': { lat: 45.4642, lon: 9.19 }, 'piacenza': { lat: 45.0526, lon: 9.6929 },
  'vedano': { lat: 45.5905, lon: 9.2716 }, 'monza': { lat: 45.5845, lon: 9.2744 },
  'roma': { lat: 41.9028, lon: 12.4964 }, 'fiumicino': { lat: 41.8003, lon: 12.2389 },
  'firenze': { lat: 43.7696, lon: 11.2558 }, 'napoli': { lat: 40.8518, lon: 14.2681 },
  'torino': { lat: 45.0703, lon: 7.6869 }, 'bologna': { lat: 44.4949, lon: 11.3426 },
  'venezia': { lat: 45.4408, lon: 12.3155 }, 'bari': { lat: 41.1171, lon: 16.8719 },
  'palermo': { lat: 38.1157, lon: 13.3615 }, 'catania': { lat: 37.5079, lon: 15.0830 },
  'cagliari': { lat: 39.2238, lon: 9.1217 }, 'genova': { lat: 44.4056, lon: 8.9463 },
  'ibiza': { lat: 38.9067, lon: 1.4206 }, 'formentera': { lat: 38.6944, lon: 1.4322 },
};

function findCity(location: string | null): { lat: number; lon: number } | null {
  if (!location) return null;
  const l = location.toLowerCase();
  for (const key of Object.keys(CITIES)) if (l.includes(key)) return CITIES[key];
  return null;
}

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

const TIPS: Record<string, { name: string; type: string; rating: string; sponsor: boolean }[]> = {
  party: [
    { name: 'Rooftop Sunset Bar', type: 'Aperitivo con vista', rating: '4.7', sponsor: true },
    { name: 'Club Nyx', type: 'Discoteca', rating: '4.5', sponsor: true },
    { name: 'Trattoria da Gino', type: 'Cena di gruppo', rating: '4.6', sponsor: false },
  ],
  travel: [
    { name: 'Spiaggia della Cala', type: 'Spiaggia', rating: '4.8', sponsor: true },
    { name: 'Noleggio Gommoni Blu', type: 'Attivita in mare', rating: '4.6', sponsor: true },
    { name: 'Osteria del Porto', type: 'Ristorante', rating: '4.5', sponsor: false },
  ],
  corporate: [
    { name: 'Parcheggio Centro P1', type: 'Parcheggio a pagamento', rating: '4.3', sponsor: true },
    { name: 'Hotel Executive', type: 'Pernottamento business', rating: '4.6', sponsor: true },
    { name: 'Caffe Stazione', type: 'Hotspot Wi-Fi & coworking', rating: '4.4', sponsor: false },
  ],
  social: [
    { name: 'Enoteca del Borgo', type: 'Degustazione', rating: '4.7', sponsor: true },
    { name: 'Ristorante Le Terrazze', type: 'Cena', rating: '4.6', sponsor: true },
    { name: 'Gelateria Artigianale', type: 'Dopocena', rating: '4.8', sponsor: false },
  ],
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
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('events_view').select('id, title, scheduled_at, location, revealed').eq('hub_id', hubId).order('scheduled_at', { ascending: true });
    const evs = (data ?? []) as EventRow[];
    // Prossimo evento cronologico (scheduled_at > now). Se oscurato: fallback all'ultimo passato rivelato,
    // per non svelare l'esistenza/luogo della sorpresa mantenendo comunque un meteo utile.
    const next = evs.find((e) => new Date(e.scheduled_at).getTime() > now) ?? null;
    let target: EventRow | null = null;
    if (next && next.revealed) target = next;
    else {
      const past = evs.filter((e) => new Date(e.scheduled_at).getTime() <= now && e.revealed);
      target = past.length ? past[past.length - 1] : null;
    }
    setFocus(target);
    if (target) {
      const city = findCity(target.location);
      setWx(city ? await fetchWx(city, target.scheduled_at) : null);
    } else setWx(null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId, now]);

  const tips = TIPS[category] ?? TIPS.social;
  const fmtDay = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black uppercase text-white tracking-wider mb-3">Meteo del programma</h3>
        {loading ? <p className="text-slate-500 text-center py-6 text-sm">Carico il meteo...</p> :
          !focus ? <p className="text-slate-500 text-sm">Il meteo comparira al primo evento svelato con un luogo.</p> :
          <div className={'bg-slate-900 border ' + theme.border + ' p-4 flex items-center justify-between ' + r}>
            <div>
              <p className="font-bold text-white text-sm">{focus.title}</p>
              <p className="text-[11px] text-slate-400">{focus.location ?? 'Luogo non indicato'} \u00B7 {fmtDay(focus.scheduled_at)}</p>
            </div>
            {wx ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{emoji(wx.code)}</span>
                <div className="text-right">
                  <p className={'text-xl font-black ' + theme.text}>{wx.temp}\u00B0</p>
                  <p className="text-[8px] uppercase text-slate-500 font-bold">{wx.forecast ? 'previsione' : 'attuale'}</p>
                </div>
              </div>
            ) : <span className="text-[10px] text-slate-600">meteo n/d</span>}
          </div>
        }
      </div>

      <div>
        <h3 className="font-black uppercase text-white tracking-wider mb-3">Consigli in zona</h3>
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <div key={i} className={'bg-slate-900 border ' + theme.border + ' p-4 flex items-center justify-between ' + r}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm">{tip.name}</p>
                  {tip.sponsor && <span className={'text-[7px] uppercase font-black px-1.5 py-0.5 rounded bg-gradient-to-r ' + theme.gradient + ' text-slate-950'}>Sponsor</span>}
                </div>
                <p className="text-[11px] text-slate-400">{tip.type}</p>
              </div>
              <span className={'text-sm font-black ' + theme.text}>\u2605 {tip.rating}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-slate-600 text-center mt-3">Le attivita partner compaiono qui in base alla categoria dell Hub.</p>
      </div>
    </div>
  );
}
