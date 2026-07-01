'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Persona } from '../lib/personas';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string; scheduled_at: string; location: string | null };

const CITIES: Record<string, { lat: number; lon: number }> = {
  'milano': { lat: 45.4642, lon: 9.19 }, 'piacenza': { lat: 45.0526, lon: 9.6929 },
  'vedano': { lat: 45.5905, lon: 9.2716 }, 'monza': { lat: 45.5845, lon: 9.2744 },
  'roma': { lat: 41.9028, lon: 12.4964 }, 'firenze': { lat: 43.7696, lon: 11.2558 },
  'napoli': { lat: 40.8518, lon: 14.2681 }, 'torino': { lat: 45.0703, lon: 7.6869 },
  'bologna': { lat: 44.4949, lon: 11.3426 }, 'venezia': { lat: 45.4408, lon: 12.3155 },
  'ibiza': { lat: 38.9067, lon: 1.4206 }, 'formentera': { lat: 38.6944, lon: 1.4322 },
};

function findCity(location: string | null): { lat: number; lon: number } | null {
  if (!location) return null;
  const l = location.toLowerCase();
  for (const key of Object.keys(CITIES)) if (l.includes(key)) return CITIES[key];
  return null;
}

const emoji = (code: number) => {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
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

export default function Consigli({ hubId, theme, category, persona }: { hubId: string; theme: Theme; category: string; persona: Persona }) {
  const r = persona.vibe.rounded;
  const [events, setEvents] = useState<EventRow[]>([]);
  const [weather, setWeather] = useState<Record<string, { temp: number; code: number; forecast: boolean } | null>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('events').select('id, title, scheduled_at, location').eq('hub_id', hubId).order('scheduled_at', { ascending: true });
    const evs = data ?? [];
    setEvents(evs);
    const wx: Record<string, { temp: number; code: number; forecast: boolean } | null> = {};
    for (const ev of evs) {
      const city = findCity(ev.location);
      if (!city) { wx[ev.id] = null; continue; }
      try {
        const day = ev.scheduled_at.split('T')[0];
        const days = (new Date(day).getTime() - Date.now()) / 86400000;
        if (days >= -1 && days <= 7) {
          const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon + '&daily=weather_code,temperature_2m_max&start_date=' + day + '&end_date=' + day + '&timezone=auto');
          const d = await res.json();
          if (d?.daily?.temperature_2m_max?.[0] != null) wx[ev.id] = { temp: Math.round(d.daily.temperature_2m_max[0]), code: d.daily.weather_code[0], forecast: true };
          else wx[ev.id] = null;
        } else {
          const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon + '&current=temperature_2m,weather_code');
          const d = await res.json();
          if (d?.current?.temperature_2m != null) wx[ev.id] = { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, forecast: false };
          else wx[ev.id] = null;
        }
      } catch { wx[ev.id] = null; }
    }
    setWeather(wx);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  const tips = TIPS[category] ?? TIPS.social;
  const fmtDay = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black uppercase text-white tracking-wider mb-3">Meteo del programma</h3>
        {loading ? <p className="text-slate-500 text-center py-6 text-sm">Carico il meteo...</p> :
          events.length === 0 ? <p className="text-slate-500 text-sm">Aggiungi eventi con un luogo per vedere il meteo.</p> :
          <div className="space-y-2">
            {events.map((ev) => {
              const w = weather[ev.id];
              return (
                <div key={ev.id} className={'bg-slate-900 border ' + theme.border + ' p-4 flex items-center justify-between ' + r}>
                  <div>
                    <p className="font-bold text-white text-sm">{ev.title}</p>
                    <p className="text-[11px] text-slate-400">{ev.location ?? 'Luogo non indicato'} · {fmtDay(ev.scheduled_at)}</p>
                  </div>
                  {w ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{emoji(w.code)}</span>
                      <div className="text-right">
                        <p className={'text-xl font-black ' + theme.text}>{w.temp}°</p>
                        <p className="text-[8px] uppercase text-slate-500 font-bold">{w.forecast ? 'previsione' : 'attuale'}</p>
                      </div>
                    </div>
                  ) : <span className="text-[10px] text-slate-600">meteo n/d</span>}
                </div>
              );
            })}
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
              <span className={'text-sm font-black ' + theme.text}>★ {tip.rating}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-slate-600 text-center mt-3">Le attivita partner compaiono qui in base alla categoria dell Hub.</p>
      </div>
    </div>
  );
}
