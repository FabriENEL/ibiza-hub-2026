'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from './lib/logEvent';
import { useHub } from './lib/HubContext';

// Categorie Consigli offerte alla creazione: stesse id del motore /api/consigli.
const CONSIGLI_OPZIONI: [string, string][] = [
  ['colazione', 'Colazione'],
  ['cultura', 'Arte e cultura'],
  ['natura', 'Natura'],
  ['beach', 'Mare e relax'],
  ['food', 'Buona tavola'],
  ['aperitivo', 'Aperitivo'],
  ['night', 'Nightlife'],
];
// Preselezione per tipo di evento: rispecchia PER_TIPO di Consigli.tsx.
const PER_TIPO: Record<string, string[]> = {
  travel:    ['colazione', 'food', 'aperitivo', 'night', 'beach', 'cultura'],
  party:     ['aperitivo', 'night', 'food'],
  social:    ['food', 'aperitivo', 'colazione'],
  corporate: ['food', 'cultura'],
};
const RITMI: [string, string][] = [['mattiniera', 'Mattiniera'], ['equilibrata', 'Equilibrata'], ['notturna', 'Notturna']];

export default function CreateHub({ onClose }: { onClose: () => void }) {
  const { refresh, setActiveHubId } = useHub();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('travel');
  const [consigliCats, setConsigliCats] = useState<Set<string>>(new Set(PER_TIPO['travel']));
  const [ritmo, setRitmo] = useState('equilibrata');
  const [location, setLocation] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const handleCreate = async () => {
    if (!name.trim() || !location.trim() || busy) return;
    if (endDate < startDate) { setErr('La data di fine non pu\u00F2 precedere quella di inizio.'); return; }
    setBusy(true); setErr('');
    // Verifica che il luogo sia riconoscibile (geocoding gratuito, nessuna chiave).
    let geoOk = false;
    try {
      const g = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=it&name=' + encodeURIComponent(location.trim()));
      const gd = await g.json();
      geoOk = !!gd?.results?.[0];
    } catch { geoOk = false; }
    if (!geoOk) { setErr('Non ho trovato questo luogo. Provi col nome della citt\u00E0 (es. Rimini).'); setBusy(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setErr('Sessione scaduta. Rientra.'); setBusy(false); return; }
    const res = await fetch('/api/hubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({
        name: name.trim(), category, location: location.trim(), start_date: startDate, end_date: endDate,
        max_participants: 5, passcode: Math.random().toString(36).slice(2, 8), creator_name: name.trim(),
        consigli_cats: Array.from(consigliCats), ritmo,
      }),
    });
    const out = await res.json();
    if (!res.ok) { setErr(out.error ?? 'Creazione non riuscita.'); setBusy(false); return; }
    await refresh();
    logEvent('hub_created', { category }, out.hub_id);
    setActiveHubId(out.hub_id);
  };
  const cats = [['travel','Viaggio'],['party','Festa'],['social','Ritrovo'],['corporate','Lavoro']];
  const fld = 'w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none';
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-sm space-y-5">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Torna</button>
        <h1 className="text-2xl font-black text-white uppercase tracking-widest [font-family:var(--font-display)]">Nuovo Hub</h1>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome evento" className={fld} />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={'Citt\u00E0'} className={fld} />
        <div className="grid gap-2">
          {cats.map(([id, label]) => (
            <button key={id} onClick={() => { setCategory(id); setConsigliCats(new Set(PER_TIPO[id] ?? [])); }}
              className={'text-left px-4 py-3 rounded-xl border transition-colors ' + (category === id ? 'bg-white/10 border-white text-white' : 'bg-slate-900 border-white/5 text-slate-300')}>
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase text-slate-400 font-black block">Cosa Le suggerisco</label>
          <div className="grid grid-cols-2 gap-2">
            {CONSIGLI_OPZIONI.map(([id, label]) => {
              const on = consigliCats.has(id);
              return (
                <button key={id} type="button"
                  onClick={() => setConsigliCats((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                  className={'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors ' + (on ? 'bg-white/10 border-white text-white' : 'bg-slate-900 border-white/5 text-slate-400')}>
                  <span className={'w-[18px] h-[18px] rounded-md border flex items-center justify-center shrink-0 ' + (on ? 'border-transparent' : 'border-white/25')}
                    style={on ? { background: '#A3B585' } : undefined}>
                    {on && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1C1F22" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    )}
                  </span>
                  <span className="text-[12px] font-bold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase text-slate-400 font-black block">Il ritmo delle giornate</label>
          <div className="grid grid-cols-3 gap-2">
            {RITMI.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setRitmo(id)}
                className={'text-[12px] font-bold py-2 rounded-xl border transition-colors ' + (ritmo === id ? 'bg-white/10 border-white text-white' : 'bg-slate-900 border-white/5 text-slate-400')}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase text-slate-400 font-black block mb-1">Inizio</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} className={fld + ' min-w-0'} />
          </div>
          <div>
            <label className="text-[10px] uppercase text-slate-400 font-black block mb-1">Fine</label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={fld + ' min-w-0'} />
          </div>
        </div>
        <button onClick={handleCreate} disabled={busy || !name.trim() || !location.trim()}
          className="w-full bg-white text-slate-950 p-4 rounded-3xl font-black uppercase text-xs disabled:opacity-40 active:scale-[0.98] transition-transform">
          {busy ? 'Creazione...' : 'Crea Hub'}
        </button>
        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
      </div>
    </div>
  );
}