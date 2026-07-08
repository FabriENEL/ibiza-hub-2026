'use client'
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

type Msg = { role: 'user' | 'assistant'; content: string };
type PendingEvent = { title: string; scheduled_at: string; location: string | null; description: string | null };

export default function Julie({ onClose, hubId }: { onClose: () => void; hubId: string }) {
  const { userId } = useHub();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Buongiorno. Sono J.U.L.I.E., come posso esserLe utile?' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy, pending]);

  const parseAction = (text: string): PendingEvent | null => {
    const t = text.trim();
    if (!t.includes('aggiungi_evento')) return null;
    try {
      const start = t.indexOf('{'), end = t.lastIndexOf('}');
      if (start < 0 || end < 0) return null;
      const obj = JSON.parse(t.slice(start, end + 1));
      if (obj.action === 'aggiungi_evento' && obj.title && obj.scheduled_at) {
        return { title: obj.title, scheduled_at: obj.scheduled_at, location: obj.location ?? null, description: obj.description ?? null };
      }
    } catch { /* non JSON valido: testo normale */ }
    return null;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/julie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, hubId }),
      });
      const data = await res.json();
      const reply = data.reply ?? 'Mi scusi, non ho compreso.';
      const action = parseAction(reply);
      if (action) {
        setPending(action);
        setMessages([...next, { role: 'assistant', content: 'Ho preparato l\'evento. Confermi qui sotto per aggiungerlo.' }]);
      } else {
        setMessages([...next, { role: 'assistant', content: reply }]);
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Mi perdoni, ho avuto un problema di connessione. Riprovi.' }]);
    } finally {
      setBusy(false);
    }
  };

  const confirmEvent = async () => {
    if (!pending || !userId || saving) return;
    setSaving(true);
    const { error } = await supabase.from('events').insert({
      hub_id: hubId, title: pending.title, scheduled_at: pending.scheduled_at,
      location: pending.location, description: pending.description,
      created_by: userId, reveal_visible_to: [], revealed_override: null,
    });
    setSaving(false);
    setMessages((m) => [...m, { role: 'assistant', content: error ? 'Mi perdoni, non sono riuscita ad aggiungere l\'evento.' : 'Fatto. L\'evento e stato aggiunto al calendario.' }]);
    setPending(null);
  };

  // Mostra l'ora letterale (coerente col calendario, che usa UTC grezzo). Nessuna conversione fuso.
  const fmt = (iso: string) => {
    const m = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return iso;
    const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    return m[3] + ' ' + mesi[parseInt(m[2]) - 1] + ' alle ' + m[4] + ':' + m[5];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-[70vh] sm:h-[600px] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1C1F23, #14161A)' }}>

        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black" style={{ background: '#A3B585', color: '#14161A' }}>J</div>
          <div className="flex-1">
            <p className="text-white font-black text-sm">J.U.L.I.E.</p>
            <p className="text-emerald-200/50 text-[10px] uppercase tracking-wider">EventGarden</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ' +
                (m.role === 'user' ? 'bg-white text-slate-950 rounded-br-sm' : 'text-emerald-50 rounded-bl-sm')}
                style={m.role === 'assistant' ? { background: 'rgba(163,181,133,0.12)', border: '1px solid rgba(163,181,133,0.2)' } : {}}>
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(163,181,133,0.14)', border: '1px solid rgba(163,181,133,0.35)' }}>
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/60 font-black mb-2">Nuovo evento</p>
              <p className="text-white font-black text-base">{pending.title}</p>
              <p className="text-emerald-100/80 text-xs mt-1 capitalize">{fmt(pending.scheduled_at)}</p>
              {pending.location && <p className="text-emerald-100/60 text-xs mt-0.5">{pending.location}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={confirmEvent} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase active:scale-95 transition-transform disabled:opacity-50"
                  style={{ background: '#A3B585', color: '#14161A' }}>{saving ? 'Aggiungo...' : 'Conferma'}</button>
                <button onClick={() => setPending(null)} disabled={saving}
                  className="px-4 py-2.5 rounded-xl font-black text-xs uppercase text-slate-400 border border-white/10">Annulla</button>
              </div>
            </div>
          )}
          {busy && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(163,181,133,0.12)' }}>
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t border-white/10 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Scriva a Julie..." disabled={busy}
            className="flex-1 bg-slate-950/50 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm outline-none border border-white/10 focus:border-white/25 transition-colors" />
          <button onClick={send} disabled={busy || !input.trim()}
            className="px-4 rounded-xl font-black text-sm disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: '#A3B585', color: '#14161A' }}>Invia</button>
        </div>
      </div>
    </div>
  );
}

