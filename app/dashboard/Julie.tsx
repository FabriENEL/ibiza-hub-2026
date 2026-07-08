'use client'
import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Julie({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Buongiorno. Sono J.U.L.I.E., come posso esserLe utile?' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

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
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.reply ?? 'Mi scusi, non ho compreso.' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Mi perdoni, ho avuto un problema di connessione. Riprovi.' }]);
    } finally {
      setBusy(false);
    }
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
            style={{ background: '#A3B585', color: '#14161A' }}>
            Invia
          </button>
        </div>
      </div>
    </div>
  );
}
