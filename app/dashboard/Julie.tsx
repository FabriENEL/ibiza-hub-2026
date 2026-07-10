'use client'
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';
import { ruleSignature } from './lib/eventVisuals';
import DateTimePicker from './lib/DateTimePicker';

type Msg = { role: 'user' | 'assistant'; content: string };
type PendingEvent = { kind: 'evento'; title: string; scheduled_at: string; location: string | null; description: string | null; fromConsiglio?: boolean };
type PendingExpense = { kind: 'spesa'; description: string; amount: number };
type Pending = PendingEvent | PendingExpense;

export default function Julie({ onClose, hubId }: { onClose: () => void; hubId: string }) {
  const { userId, signalPostAction, julieSeed, clearJulieSeed } = useHub();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Buongiorno. Sono J.U.L.I.E., come posso esserLe utile?' },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const ttsOk = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const recRef = useRef<any>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const sendVoiceRef = useRef<(t: string) => void>(() => {});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false); const [closing, setClosing] = useState(false); const softClose = () => { setClosing(true); setTimeout(onClose, 300); };
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy, pending]);

  // Arrivo da un consiglio ('Mi interessa'): precompilo la card con nome e luogo, chiedo solo data/ora.
  useEffect(() => {
    if (!julieSeed) return;
    setPending({ kind: 'evento', title: julieSeed.title, scheduled_at: '', location: julieSeed.location, description: null, fromConsiglio: true });
    const opts = [
      'Ottima scelta! Quando lo mettiamo in programma?',
      'Che bel posto. Mi indichi giorno e ora e lo aggiungo io.',
      'Perfetto, al resto penso io: mi dica solo data e ora.',
    ];
    setMessages((m) => [...m, { role: 'assistant', content: opts[Math.floor(Math.random() * opts.length)] }]);
    clearJulieSeed();
  }, [julieSeed]);

  // Riconosce l'azione proposta da Julie. Validazione severa: dati incoerenti = nessuna card.
  const parseAction = (text: string): Pending | null => {
    const t = text.trim();
    if (!t.includes('aggiungi_evento') && !t.includes('aggiungi_spesa')) return null;
    try {
      const start = t.indexOf('{'), end = t.lastIndexOf('}');
      if (start < 0 || end < 0) return null;
      const o = JSON.parse(t.slice(start, end + 1));

      if (o.action === 'aggiungi_evento' && o.title && o.scheduled_at) {
        return { kind: 'evento', title: o.title, scheduled_at: o.scheduled_at, location: o.location ?? null, description: o.description ?? null };
      }
      if (o.action === 'aggiungi_spesa' && o.description) {
        const n = Number(o.amount);
        // Importo non valido: meglio nessuna proposta che una cifra assurda.
        if (!Number.isFinite(n) || n <= 0) return null;
        return { kind: 'spesa', description: String(o.description), amount: n };
      }
    } catch { /* non JSON: testo normale */ }
    return null;
  };

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setVoiceOk(true);
    const rec = new SR();
    rec.lang = 'it-IT'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e: any) => {
      const said = e.results?.[0]?.[0]?.transcript?.trim();
      if (said) { setInput(said); setTimeout(() => sendVoiceRef.current(said), 100); }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, []);

  // Le voci sono caricate in modo asincrono dal browser: le mettiamo in cache appena disponibili,
  // cosi' getVoices() non torna vuoto al primo utilizzo.
  useEffect(() => {
    if (!ttsOk) return;
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, [ttsOk]);

  // Sblocca il motore vocale. DEVE partire da un gesto utente (tap): altrimenti la voce
  // emessa dopo await fetch(...) viene silenziata dalle policy di autoplay del browser.
  const unlockTTS = () => {
    if (!ttsOk) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.resume();
    } catch {}
  };

  const speak = (text: string) => {
    if (!ttsOk || !text) return;
    try {
      // Il marchio resta puntato a schermo; alla voce diciamo il nome come parola.
      const spoken = text.replace(/J\.U\.L\.I\.E\.?/gi, 'Julie');
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(spoken);
      u.lang = 'it-IT';
      u.rate = 1.1; // un filo piu' svelta: toglie la cantilena
      const itVoice = voicesRef.current.find((v) => v.lang.startsWith('it'));
      if (itVoice) u.voice = itVoice;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.resume(); // aggira il pause-bug di Chrome dopo cancel()
    } catch {}
  };

  const toggleMic = () => {
    if (!recRef.current || busy) return;
    if (!listening) { setSpeakOn(true); unlockTTS(); }
    if (listening) { recRef.current.stop(); setListening(false); }
    else { try { setInput(''); recRef.current.start(); setListening(true); } catch {} }
  };

  const sendVoice = (text: string) => { const t = text.trim(); if (t && !busy) send(t); };
  useEffect(() => { sendVoiceRef.current = sendVoice; });

  const send = async (voiceText?: string) => {
    const text = (voiceText ?? input).trim();
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
        setMessages([...next, { role: 'assistant', content: 'Ecco, guardi pure. Se va bene, confermi.' }]);
        if (speakOn) speak('Ho preparato la proposta, la verifichi e confermi pure.');
      } else {
        setMessages([...next, { role: 'assistant', content: reply }]);
        if (speakOn) speak(reply);
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Mi perdoni, ho avuto un problema di connessione. Riprovi.' }]);
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = async () => {
    if (!pending || !userId || saving) return;
    if (pending.kind === 'evento' && !pending.scheduled_at) return;
    setSaving(true);
    let error = null;

    if (pending.kind === 'evento') {
      let cover_url: string | null = null;
      if (ruleSignature(pending.title) === '__none__') {
        try {
          const cr = await fetch('/api/cover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: pending.title }) });
          const cd = await cr.json(); cover_url = cd.url ?? null;
        } catch { cover_url = null; }
      }
      const r = await supabase.from('events').insert({
        hub_id: hubId, title: pending.title, scheduled_at: pending.scheduled_at, cover_url,
        location: pending.location, description: pending.description,
        created_by: userId, reveal_visible_to: [], revealed_override: null,
      });
      error = r.error;
    } else {
      // payer_id sempre da sessione: Julie non attribuisce spese a terzi. split_with null = tutti.
      const r = await supabase.from('expenses').insert({
        hub_id: hubId, payer_id: userId, description: pending.description,
        amount: pending.amount, split_with: null,
      });
      error = r.error;
    }

    setSaving(false);
    const ok = pending.kind === 'evento' ? 'Fatto, e nel calendario. Buon divertimento.' : 'Fatto. Ho registrato la spesa in cassa.';
    setMessages((m) => [...m, { role: 'assistant', content: error ? 'Mi perdoni, non sono riuscita a registrarlo. Riprovi.' : ok }]);
    const _target = pending.kind === 'spesa' ? 'cassa' : 'calendar'; const _ok = !error; setPending(null); if (_ok) { setTimeout(() => setClosing(true), 650); setTimeout(() => { signalPostAction(_target); onClose(); }, 1050); }
  };

  const fmt = (iso: string) => {
    const m = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return iso;
    const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    return m[3] + ' ' + mesi[parseInt(m[2]) - 1] + ' alle ' + m[4] + ':' + m[5];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={softClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={'w-full max-w-md h-[70vh] sm:h-[600px] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 ease-in ' + (closing ? 'opacity-0 translate-y-4 sm:scale-95' : 'opacity-100')}
        style={{ background: 'linear-gradient(160deg, rgba(28,31,35,0.55), rgba(20,22,26,0.62))' }}>

        <div className="flex items-center gap-3.5 p-4 border-b border-white/10" style={{ background: 'linear-gradient(180deg, rgba(163,181,133,0.10), transparent)' }}>
          <div className={'relative shrink-0 w-20 h-20 ' + (busy ? 'animate-[eg-breathe_1.6s_ease-in-out_infinite]' : 'animate-[eg-breathe_4s_ease-in-out_infinite]')}>
            <span aria-hidden className="absolute -inset-1.5 rounded-full blur-lg" style={{ background: 'radial-gradient(circle, rgba(163,181,133,0.40), transparent 70%)' }} />
            <img src="/julie-avatar.png" alt="J.U.L.I.E." className="relative w-20 h-20 rounded-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-base leading-tight">J.U.L.I.E.</p>
            <p className="text-emerald-200/60 text-[10px] tracking-wide">Join Us Living In EventGarden</p>
          </div>
          {ttsOk && (
            <button onClick={() => { if (speakOn) { window.speechSynthesis.cancel(); setSpeakOn(false); } else { unlockTTS(); setSpeakOn(true); } }} aria-label={speakOn ? 'Muta Julie' : 'Attiva voce'} className='self-start p-1 rounded-lg transition-colors' style={{ color: speakOn ? '#A3B585' : '#64748b' }}>
              <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M11 5 6 9H2v6h4l5 4z' fill='currentColor' stroke='none' />
                {speakOn ? <><path d='M15.5 8.5a5 5 0 0 1 0 7' /><path d='M18.5 5.5a9 9 0 0 1 0 13' /></> : <path d='m17 9 4 6M21 9l-4 6' />}
              </svg>
            </button>
          )}
          <button onClick={softClose} aria-label="Chiudi" className="self-start text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
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

          {pending && pending.kind === 'evento' && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(163,181,133,0.14)', border: '1px solid rgba(163,181,133,0.35)' }}>
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/60 font-black mb-2">Nuovo evento</p>
              <p className="text-white font-black text-base">{pending.title}</p>
              {pending.fromConsiglio ? (
                <div className="mt-2 mb-1">
                  <DateTimePicker value={pending.scheduled_at} onChange={(v) => setPending({ ...pending, scheduled_at: v })} />
                </div>
              ) : (
                <p className="text-emerald-100/80 text-xs mt-1">{fmt(pending.scheduled_at)}</p>
              )}
              {pending.location && <p className="text-emerald-100/60 text-xs mt-0.5">{pending.location}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={confirmPending} disabled={saving || (pending.fromConsiglio && !pending.scheduled_at)}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase active:scale-95 transition-transform disabled:opacity-50"
                  style={{ background: '#A3B585', color: '#14161A' }}>{saving ? 'Aggiungo...' : 'Conferma'}</button>
                <button onClick={() => setPending(null)} disabled={saving}
                  className="px-4 py-2.5 rounded-xl font-black text-xs uppercase text-slate-400 border border-white/10">Annulla</button>
              </div>
            </div>
          )}

          {pending && pending.kind === 'spesa' && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(163,181,133,0.14)', border: '1px solid rgba(163,181,133,0.35)' }}>
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/60 font-black mb-2">Nuova spesa</p>
              <p className="text-white font-black text-2xl">{pending.amount.toFixed(2)} &euro;</p>
              <p className="text-emerald-100/80 text-sm mt-0.5">{pending.description}</p>
              <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
                <p className="text-emerald-100/60 text-[11px]">Pagata da Lei</p>
                <p className="text-emerald-100/60 text-[11px]">Divisa tra tutti i partecipanti</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={confirmPending} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase active:scale-95 transition-transform disabled:opacity-50"
                  style={{ background: '#A3B585', color: '#14161A' }}>{saving ? 'Registro...' : 'Conferma'}</button>
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
          <button onClick={() => send()} disabled={busy || !input.trim()}
            className="px-4 rounded-xl font-black text-sm disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: '#A3B585', color: '#14161A' }}>Invia</button>
          {voiceOk && (
            <button onClick={toggleMic} disabled={busy} aria-label={listening ? 'Ferma' : 'Parla con Julie'}
              className={'px-3 rounded-xl active:scale-95 transition-all disabled:opacity-40 ' + (listening ? 'animate-pulse' : '')}
              style={{ background: listening ? '#c05656' : 'rgba(163,181,133,0.18)', color: listening ? '#fff' : '#A3B585', border: '1px solid rgba(163,181,133,0.35)' }}>
              {listening ? '\u23F9' : '\u{1F3A4}'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}