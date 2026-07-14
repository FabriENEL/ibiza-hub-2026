'use client'
import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';
import { ruleSignature } from './lib/eventVisuals';
import DateTimePicker from './lib/DateTimePicker';
import LuoghiCard, { type Luogo } from './LuoghiCard';
import ProgrammaCard, { type Giorno, type Voce } from './ProgrammaCard';
import CategorieCard from './CategorieCard';

type Msg = { role: 'user' | 'assistant'; content: string; luoghi?: Luogo[]; zona?: string | null; programma?: { zona: string; giorni: Giorno[] }; chiediCat?: string };
type PendingEvent = { kind: 'evento'; title: string; scheduled_at: string; location: string | null; description: string | null; fromConsiglio?: boolean };
type PendingExpense = { kind: 'spesa'; description: string; amount: number };
type Pending = PendingEvent | PendingExpense;

// Rivela il testo una parola alla volta e pilota la bocca dell'avatar.
// Vive FUORI dal padre; le callback stanno in un ref, cosi' il ciclo non si resetta
// quando il padre ri-renderizza (era questo a fermare la scrittura alla prima parola).
function Scrive({ testo, onBocca, onFine }: { testo: string; onBocca: (b: boolean) => void; onFine: () => void }) {
  const [n, setN] = useState(0);
  const parole = useMemo(() => testo.split(/(\s+)/), [testo]);
  const cb = useRef({ onBocca, onFine });
  useEffect(() => { cb.current = { onBocca, onFine }; });
  useEffect(() => {
    setN(0);
    let i = 0;
    let timer: any;
    const passo = () => {
      if (i >= parole.length) { cb.current.onBocca(false); cb.current.onFine(); return; }
      const tok = parole[i] ?? '';
      // apre solo su parole lunghe, e alterna: non ogni parola muove la bocca
      cb.current.onBocca(tok.trim().length >= 7 && i % 2 === 0);
      i += 1;
      setN(i);
      const attesa = tok.trim() === '' ? 90 : Math.min(130 + tok.length * 18, 320);
      timer = setTimeout(passo, attesa);
    };
    timer = setTimeout(passo, 60);
    return () => clearTimeout(timer);
  }, [parole]);
  return <>{parole.slice(0, n).join('')}</>;
}

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
  const [saving, setSaving] = useState(false); const [closing, setClosing] = useState(false); const [shown, setShown] = useState(false); const softClose = () => { if (!shown) return; setClosing(true); setTimeout(onClose, 300); };
  const endRef = useRef<HTMLDivElement>(null);
  // La bocca dell'avatar segue il testo che Julie sta scrivendo: parola lunga = bocca aperta.
  const [parla, setParla] = useState(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy, pending]);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);

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
      u.rate = 1.25;  // piu' svelta: la lentezza era meta' della cantilena
      u.pitch = 1.05; // un soffio piu' alta: toglie il tono robotico-basso
      // La cantilena dipende soprattutto dalla VOCE: su Android la "prima it" e' spesso la peggiore.
      // Preferiamo le voci di qualita' (Google/Natural/Premium), poi ripiego sulla prima italiana.
      const its = voicesRef.current.filter((v) => v.lang.toLowerCase().startsWith('it'));
      const best = its.find((v) => /google|natural|premium|enhanced|siri/i.test(v.name)) ?? its[0];
      if (best) u.voice = best;
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

  // Parole che annunciano una programmazione. Julie chiede le preferenze prima di comporre:
  // e' il momento in cui l'assistente smette di indovinare e ascolta.
  const vuoleProgramma = (t: string) =>
    /(organizzam|organizz|programmam|programm|pianific|itinerari|gita|weekend|giornat|viaggi)/i.test(t);

  const send = async (voiceText?: string, cats?: string[], ritmo?: string) => {
    const text = (voiceText ?? input).trim();
    if (!text || busy) return;
    // Prima volta che chiede un programma, senza aver ancora scelto: mostro le categorie.
    if (!cats && vuoleProgramma(text)) {
      setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: 'Volentieri. Su cosa devo costruire la giornata?', chiediCat: text }]);
      setInput('');
      return;
    }
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/julie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map((m: any) => ({ role: m.role, content: m.content })), hubId, cats, ritmo }),
      });
      const data = await res.json();
      const reply = data.reply ?? 'Mi scusi, non ho compreso.';
      // Julie ha cercato: il testo viaggia con le schede dei luoghi veri.
      if (Array.isArray(data.luoghi) && data.luoghi.length > 0) {
        setMessages((m) => [...m, { role: 'assistant', content: reply, luoghi: data.luoghi, zona: data.zona ?? null }]);
        if (speakOn) speak(reply);
        setBusy(false);
        return;
      }
      // Nessun programma possibile (categorie esaurite): la card si sblocca e Julie parla.
      if (cats && !data.programma) {
        setMessages((m) => [...m.filter((x: any) => !x.chiediCat), { role: 'assistant', content: reply }]);
        setBusy(false);
        return;
      }
      // Julie ha composto un programma: il testo viaggia con le voci da spuntare.
      if (data.programma && Array.isArray(data.programma.giorni) && data.programma.giorni.length > 0) {
        setMessages((m) => [...m, { role: 'assistant', content: reply, programma: data.programma }]);
        if (speakOn) speak(reply);
        setBusy(false);
        return;
      }

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


  // Scrive in calendario SOLO le voci spuntate. Le copertine si chiedono in parallelo:
  // in sequenza, sei eventi significherebbero sei attese sommate.
  const fissaProgramma = async (scelte: Voce[]) => {
    if (!hubId || !userId || scelte.length === 0) return;
    setSaving(true);
    const righe = await Promise.all(scelte.map(async (v) => {
      // Piano A: la foto REALE del luogo (Google). Zero ridondanza: il Roadhouse mostra il Roadhouse.
      // Piano B: Unsplash sull'attivita'. Piano C: lo stock locale, gestito dalla card.
      let cover_url: string | null = v.luogo?.photo ? '/api/foto?n=' + encodeURIComponent(v.luogo.photo) : null;
      if (!cover_url) {
        try {
          const cr = await fetch('/api/cover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: v.titolo }) });
          const cd = await cr.json(); cover_url = cd.url ?? null;
        } catch { cover_url = null; }
      }
      return {
        hub_id: hubId,
        title: v.luogo ? v.luogo.name : v.titolo,
        scheduled_at: v.ora,
        cover_url,
        location: v.luogo ? (v.luogo.address || v.luogo.name) : null,
        description: v.luogo ? (v.titolo + (v.luogo.address ? ' \u00B7 ' + v.luogo.address : '')) : null,
        created_by: userId,
        reveal_visible_to: [],
        revealed_override: null,
      };
    }));
    const { data: hb } = await supabase.from('hubs').select('start_date, end_date').eq('id', hubId).single();
    const dentro = (iso: string) => !hb?.start_date || !hb?.end_date || (iso.slice(0, 10) >= hb.start_date && iso.slice(0, 10) <= hb.end_date);
    const buone = righe.filter((r: any) => dentro(String(r.scheduled_at ?? '')));
    if (buone.length === 0) {
      setSaving(false);
      setMessages((m) => [...m, { role: 'assistant', content: 'Quelle date cadono fuori dal periodo dell\u2019Hub. Non le ho fissate.' }]);
      return;
    }
    const { error } = await supabase.from('events').insert(buone);
    setSaving(false);
    const n = scelte.length;
    const ok = n === 1 ? 'Fatto. La voce e in calendario.' : 'Fatto. Le ' + n + ' voci sono in calendario.';
    setMessages((m) => [...m, { role: 'assistant', content: error ? 'Mi perdoni, non sono riuscita a fissarle. Riprovi.' : ok }]);
    // Il gesto piu' bello del prodotto deve avere un finale: la chat si congeda
    // e porta l'utente al calendario, dove il suo programma lo aspetta.
    if (!error) {
      setTimeout(() => setClosing(true), 900);
      setTimeout(() => { signalPostAction('calendar'); onClose(); }, 1300);
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
      const { data: hb1 } = await supabase.from('hubs').select('start_date, end_date').eq('id', hubId).single();
      const g = String(pending.scheduled_at ?? '').slice(0, 10);
      if (hb1?.start_date && hb1?.end_date && (g < hb1.start_date || g > hb1.end_date)) {
        setPending(null); setSaving(false);
        setMessages((m) => [...m, { role: 'assistant', content: 'Quel giorno cade fuori dal periodo dell\u2019Hub (' + hb1.start_date + ' \u2013 ' + hb1.end_date + '). Non l\u2019ho fissato.' }]);
        return;
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
    <div className={'fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ' + ((closing || !shown) ? 'opacity-0' : 'opacity-100')} onClick={softClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={'w-full max-w-md h-[70vh] sm:h-[600px] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 ease-out ' + ((closing || !shown) ? 'opacity-0 translate-y-4 sm:scale-95' : 'opacity-100')}
        style={{ background: 'linear-gradient(160deg, rgba(28,31,35,0.55), rgba(20,22,26,0.62))' }}>

        <div className="flex items-center gap-3.5 p-4 border-b border-white/10" style={{ background: 'linear-gradient(180deg, rgba(163,181,133,0.10), transparent)' }}>
          <div className={'relative shrink-0 w-20 h-20 ' + (busy ? 'animate-[eg-breathe_1.6s_ease-in-out_infinite]' : 'animate-[eg-breathe_4s_ease-in-out_infinite]')}>
            <span aria-hidden className="absolute -inset-1.5 rounded-full blur-lg" style={{ background: 'radial-gradient(circle, rgba(163,181,133,0.40), transparent 70%)' }} />
            {busy && <span aria-hidden className="eg-aura absolute -inset-3 rounded-full blur-xl animate-[eg-aura_1.6s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, rgba(163,181,133,0.55), transparent 65%)' }} />}
            <img src={parla ? "/julie-talking.png" : "/julie-avatar.png"} alt="J.U.L.I.E." className="relative w-20 h-20 rounded-full object-cover" />
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
                (m.role === 'user' ? 'bg-white text-slate-950 rounded-br-sm' : 'text-emerald-50 rounded-bl-sm animate-[eg-fade-in_0.22s_ease-out]')}
                style={m.role === 'assistant' ? { background: 'rgba(163,181,133,0.12)', border: '1px solid rgba(163,181,133,0.2)' } : {}}>
                {(m.role === 'assistant' && i === messages.length - 1 && !m.luoghi && !m.programma && !m.chiediCat && typeof m.content === 'string')
                  ? <Scrive testo={m.content} onBocca={setParla} onFine={() => setParla(false)} />
                  : m.content}
              </div>
            </div>
          ))}
{messages.map((m, i) => m.chiediCat ? (
            <CategorieCard key={'C' + i} saving={busy}
              onConferma={(cats, ritmo) => send(m.chiediCat, cats, ritmo)} />
          ) : null)}

{messages.map((m, i) => m.programma ? (
            <ProgrammaCard key={'P' + i} zona={m.programma.zona} giorni={m.programma.giorni}
              saving={saving} onConferma={(scelte) => fissaProgramma(scelte)} />
          ) : null)}

{messages.map((m, i) => m.luoghi ? (
            <LuoghiCard key={'L' + i} luoghi={m.luoghi} zona={m.zona}
              onScegli={(l) => {
                setPending({ kind: 'evento', title: l.name, scheduled_at: '', location: l.address || l.name, description: null, fromConsiglio: true });
                setMessages((mm) => [...mm, { role: 'assistant', content: 'Ottima scelta. Mi dica giorno e ora e lo metto in programma.' }]);
              }} />
          ) : null)}
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
                  <span className="eg-dot w-1.5 h-1.5 rounded-full bg-emerald-300/70 animate-[eg-dot_1.1s_ease-in-out_infinite]" />
                  <span className="eg-dot w-1.5 h-1.5 rounded-full bg-emerald-300/70 animate-[eg-dot_1.1s_ease-in-out_infinite]" style={{ animationDelay: '160ms' }} />
                  <span className="eg-dot w-1.5 h-1.5 rounded-full bg-emerald-300/70 animate-[eg-dot_1.1s_ease-in-out_infinite]" style={{ animationDelay: '320ms' }} />
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
