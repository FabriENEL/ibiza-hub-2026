'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Theme = { text: string; gradient: string; border: string };
type EventRow = { id: string; title: string | null; scheduled_at: string; location: string | null; revealed: boolean };
type Wx = { temp: number; code: number; forecast: boolean };
type Tip = { name: string; type: string; rating: string; price: 1 | 2 | 3; sponsor: boolean };
type Section = { id: string; title: string; image: string; tips: Tip[] };

const CITIES: Record<string, { lat: number; lon: number }> = {
  'malpensa': { lat: 45.6306, lon: 8.7281 }, 'linate': { lat: 45.4451, lon: 9.2767 },
  'orio': { lat: 45.6739, lon: 9.7042 }, 'bergamo': { lat: 45.6983, lon: 9.6773 },
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

const wxTone = (code: number) => {
  if (code === 0) return 'from-amber-500/25 to-orange-600/5';
  if (code <= 3) return 'from-sky-500/20 to-slate-800/5';
  if (code >= 51 && code <= 82) return 'from-blue-600/25 to-slate-800/5';
  if (code >= 95) return 'from-indigo-700/30 to-slate-900/5';
  return 'from-slate-600/20 to-slate-800/5';
};

// Macro-Hub per categoria: le sezioni derivano dal blueprint, non da un modello travel-first.
const SECTIONS: Record<string, Section[]> = {
  travel: [
    { id: 'move', title: 'Viaggi e spostamenti', image: '/events/takeoff.webp', tips: [
      { name: 'Transfer Aeroporto Blu', type: 'Navetta privata 8 posti', rating: '4.7', price: 2, sponsor: true },
      { name: 'Rent a Scooter Isla', type: 'Noleggio scooter e quad', rating: '4.5', price: 1, sponsor: false },
    ]},
    { id: 'beach', title: 'Spiagge e relax', image: '/events/beach.webp', tips: [
      { name: 'Beach Club Salinas', type: 'Lettini e cabana \u00B7 meno affollato al mattino', rating: '4.8', price: 3, sponsor: true },
      { name: 'Cala Escondida', type: 'Caletta libera \u00B7 tramonto', rating: '4.6', price: 1, sponsor: false },
    ]},
    { id: 'food', title: 'Ristorazione', image: '/events/groupdinner.webp', tips: [
      { name: 'Osteria del Porto', type: 'Pesce \u00B7 tavolate fino a 20', rating: '4.5', price: 2, sponsor: false },
      { name: 'El Chiringuito', type: 'Cucina mediterranea in spiaggia', rating: '4.7', price: 3, sponsor: true },
    ]},
    { id: 'night', title: 'Nightlife e intrattenimento', image: '/events/club.webp', tips: [
      { name: 'Club Pacha', type: 'Guest list e tavoli \u00B7 line-up internazionale', rating: '4.6', price: 3, sponsor: true },
      { name: 'Sunset Rooftop', type: 'Pre-serata con vista', rating: '4.7', price: 2, sponsor: false },
    ]},
  ],
  party: [
    { id: 'pre', title: 'Pre-serata', image: '/events/cocktails.webp', tips: [
      { name: 'Rooftop Sunset Bar', type: 'Aperitivo con vista', rating: '4.7', price: 2, sponsor: true },
      { name: 'Vermuteria Centrale', type: 'Cicchetti e spritz', rating: '4.5', price: 1, sponsor: false },
    ]},
    { id: 'food', title: 'Ristorazione', image: '/events/predinner.webp', tips: [
      { name: 'Trattoria da Gino', type: 'Cena di gruppo \u00B7 menu fisso', rating: '4.6', price: 2, sponsor: false },
      { name: 'Braceria Fuoco Vivo', type: 'Griglia \u00B7 tavolate numerose', rating: '4.7', price: 2, sponsor: true },
    ]},
    { id: 'night', title: 'Nightlife', image: '/events/club2.webp', tips: [
      { name: 'Club Nyx', type: 'Discoteca \u00B7 prevendite disponibili', rating: '4.5', price: 3, sponsor: true },
      { name: 'Live Arena', type: 'Concerti ed eventi', rating: '4.6', price: 2, sponsor: false },
    ]},
  ],
  corporate: [
    { id: 'move', title: 'Logistica e transfer', image: '/events/uber.webp', tips: [
      { name: 'NCC Executive', type: 'Auto con conducente \u00B7 fatturazione', rating: '4.6', price: 3, sponsor: true },
      { name: 'Parcheggio Centro P1', type: 'Convenzione giornaliera', rating: '4.3', price: 2, sponsor: false },
    ]},
    { id: 'food', title: 'Business dining', image: '/events/groupdinner.webp', tips: [
      { name: 'Ristorante Meridiana', type: 'Sala riservata \u00B7 Wi-Fi', rating: '4.6', price: 3, sponsor: true },
      { name: 'Caffe Stazione', type: 'Coworking e light lunch', rating: '4.4', price: 1, sponsor: false },
    ]},
    { id: 'after', title: 'After-work', image: '/events/cocktails.webp', tips: [
      { name: 'Terrazza Duomo 21', type: 'Aperitivo di team', rating: '4.7', price: 2, sponsor: false },
    ]},
  ],
  social: [
    { id: 'food', title: 'Ristorazione', image: '/events/groupdinner.webp', tips: [
      { name: 'Ristorante Le Terrazze', type: 'Cena \u00B7 tavolate numerose', rating: '4.6', price: 2, sponsor: true },
      { name: 'Enoteca del Borgo', type: 'Degustazione guidata', rating: '4.7', price: 2, sponsor: false },
    ]},
    { id: 'exp', title: 'Esperienze', image: '/events/sealunch.webp', tips: [
      { name: 'Tour in Barca al Tramonto', type: 'Gruppi fino a 12', rating: '4.8', price: 3, sponsor: true },
    ]},
    { id: 'after', title: 'Dopocena', image: '/events/cocktails.webp', tips: [
      { name: 'Gelateria Artigianale', type: 'Dopocena', rating: '4.8', price: 1, sponsor: false },
    ]},
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

  const sections = SECTIONS[category] ?? SECTIONS.social;
  const fmtDay = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
  const priceTag = (p: 1 | 2 | 3) => '\u20AC'.repeat(p);

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
              ) : <span className="text-[10px] text-slate-600">meteo n/d</span>}
            </div>
          </div>
        }
      </div>

      {sections.map((s) => (
        <div key={s.id}>
          <div className={'relative h-24 overflow-hidden mb-2 ' + r}>
            <img src={s.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <h3 className="absolute bottom-3 left-4 font-black uppercase text-white tracking-wider drop-shadow-lg">{s.title}</h3>
          </div>
          <div className="space-y-2">
            {s.tips.map((tip, i) => (
              <div key={i} className={'eg-card border ' + theme.border + ' p-4 flex items-center justify-between transition-transform active:scale-[0.98] ' + r}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-sm">{tip.name}</p>
                    {tip.sponsor && <span className={'text-[7px] uppercase font-black px-1.5 py-0.5 rounded bg-gradient-to-r ' + theme.gradient + ' text-slate-950'}>Sponsor</span>}
                  </div>
                  <p className="text-[11px] text-slate-400">{tip.type}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className={'text-sm font-black block ' + theme.text}>★ {tip.rating}</span>
                  <span className="text-[10px] font-bold text-slate-500">{priceTag(tip.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[9px] text-slate-600 text-center">Le attivita partner compaiono in base alla categoria dell Hub.</p>
    </div>
  );
}

