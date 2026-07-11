'use client'
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '../lib/logEvent';
import { useHub } from '../lib/HubContext';

// Palette "ramoscello": antracite di base, salvia come voce, terracotta desaturata per il debito.
const P = {
  panel: '#262b2e',
  inset: '#21262a',
  field: '#1f2427',
  line: 'rgba(255,255,255,0.06)',
  hi: '#e9e7e1',
  mid: '#cfd2cb',
  lo: '#7f857e',
  sage: '#a9c09c',
  sageDim: '#8fa585',
  sageInk: '#cfe0c4',
  clay: '#c79a8b',
};
const card: React.CSSProperties = { background: P.panel, border: '1px solid ' + P.line };

type Theme = { text: string; gradient: string; border: string };
type Expense = { id: string; payer_id: string; description: string; amount: number; split_with: string[] | null; created_at: string };
type Member = { user_id: string; username: string };

// --- Icone dedotte dalla descrizione: nessun campo nuovo, solo lettura del testo gia' esistente. ---
type Kind = 'food' | 'drink' | 'transport' | 'stay' | 'ticket' | 'shop' | 'other';

const KEYWORDS: { kind: Kind; words: string[] }[] = [
  { kind: 'drink',     words: ['bar', 'aperitiv', 'cocktail', 'birr', 'drink', 'caff', 'vino', 'spritz', 'prosecc', 'brindis'] },
  { kind: 'food',      words: ['cena', 'pranzo', 'ristorant', 'pizz', 'cibo', 'trattoria', 'osteria', 'brunch', 'colazion', 'gelat', 'panin', 'sushi', 'tavola'] },
  { kind: 'transport', words: ['taxi', 'benzin', 'carburant', 'trend', 'treno', 'vol', 'aere', 'bus', 'auto', 'nolegg', 'parchegg', 'pedagg', 'autostrad', 'metro', 'traghett', 'uber', 'cars'] },
  { kind: 'stay',      words: ['hotel', 'alberg', 'airbnb', 'b&b', 'camera', 'alloggi', 'appartament', 'ostell', 'resort', 'villa', 'soggiorn'] },
  { kind: 'ticket',    words: ['bigliett', 'museo', 'ingress', 'concert', 'spettacol', 'mostra', 'tour', 'escursion', 'visita', 'parco'] },
  { kind: 'shop',      words: ['spesa', 'supermerc', 'market', 'acquist', 'negozi', 'souvenir', 'farmaci'] },
];

// La prima parola-chiave che compare nella descrizione decide l'icona. Nessun match -> banconota neutra.
const kindOf = (description: string): Kind => {
  const d = (description || '').toLowerCase();
  for (const g of KEYWORDS) if (g.words.some((w) => d.includes(w))) return g.kind;
  return 'other';
};

const KIND_STYLE: Record<Kind, { color: string; bg: string }> = {
  food:      { color: '#a9c09c', bg: 'rgba(169,192,156,0.14)' },
  drink:     { color: '#d9b166', bg: 'rgba(217,177,102,0.14)' },
  transport: { color: '#89aebb', bg: 'rgba(137,174,187,0.14)' },
  stay:      { color: '#b19ac2', bg: 'rgba(177,154,194,0.14)' },
  ticket:    { color: '#c79a8b', bg: 'rgba(199,154,139,0.14)' },
  shop:      { color: '#9fb896', bg: 'rgba(159,184,150,0.13)' },
  other:     { color: '#8f958d', bg: 'rgba(143,149,141,0.12)' },
};

const KindIcon = ({ kind }: { kind: Kind }) => {
  const c = 'w-[18px] h-[18px]';
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: c };
  if (kind === 'food')      return <svg {...common}><path d="M6 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M8 13v8M17 3c-1.5 1.5-2 3.5-2 6v3h3V3Zm1 9v9" /></svg>;
  if (kind === 'drink')     return <svg {...common}><path d="M5 4h14l-6 8v6M13 18h4M13 18H9M5 4l6 8" /></svg>;
  if (kind === 'transport') return <svg {...common}><path d="M4 16v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M17 16v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M3 16v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4Z" /><circle cx="7" cy="13" r="1" /><circle cx="17" cy="13" r="1" /></svg>;
  if (kind === 'stay')      return <svg {...common}><path d="M3 18v-6h18v6M3 12V7M21 12v-1a3 3 0 0 0-3-3h-5v4M3 18v2M21 18v2" /></svg>;
  if (kind === 'ticket')    return <svg {...common}><path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4Z" /><path d="M13 5v3M13 11v2M13 16v3" strokeDasharray="1 2" /></svg>;
  if (kind === 'shop')      return <svg {...common}><path d="M4 4h2l2 11h10l2-8H7" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></svg>;
  return <svg {...common}><rect x="2.5" y="6.5" width="19" height="11" rx="2" /><circle cx="12" cy="12" r="2.4" /></svg>;
};

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[18px] h-[18px]"><path d="M12 5v14M5 12h14" /></svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></svg>
);

export default function Cassa({ hubId, theme, archived }: { hubId: string; theme: Theme; archived: boolean }) {
  const { userId, postAction } = useHub();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [splitSel, setSplitSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  // Il modulo di inserimento non e' piu' sempre a schermo: si apre al gesto. Meno rumore, piu' ordine.
  const [adding, setAdding] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: exp } = await supabase
      .from('expenses').select('id, payer_id, description, amount, split_with, created_at')
      .eq('hub_id', hubId).order('created_at', { ascending: false });
    const { data: mem } = await supabase
      .from('hub_members').select('user_id, profiles ( username )').eq('hub_id', hubId);
    const rows = (exp ?? []).map((e: any) => ({ ...e, amount: Number(e.amount), split_with: e.split_with ?? null }));
    setExpenses(rows);
    setMembers((mem ?? []).map((m: any) => ({ user_id: m.user_id, username: m.profiles?.username ?? '???' })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);
  useEffect(() => { if (postAction?.module === 'cassa' && Date.now() - postAction.ts < 4000) load(); }, [postAction]);
  useEffect(() => {
    if (postAction?.module !== 'cassa' || Date.now() - postAction.ts > 4000 || !expenses.length) return;
    setHighlightId(expenses[0].id);
    const timer = setTimeout(() => setHighlightId(null), 2600);
    return () => clearTimeout(timer);
  }, [postAction, expenses]);
  // Porta in vista la riga appena aggiunta: il glow non brilla piu' fuori schermo.
  useEffect(() => {
    if (highlightId && highlightRef.current) highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId]);

  const fmtDate = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']; return p(d.getUTCDate()) + ' ' + mesi[d.getUTCMonth()]; };
  const eur = (n: number) => n.toFixed(2).replace('.', ',');

  const handleAdd = async () => {
    const val = Number(amount);
    if (!desc.trim() || !val || val <= 0 || busy || !userId) return;
    setBusy(true);
    // split_with = null quando includono tutti (default), altrimenti array esplicito degli inclusi.
    const incl = splitSel.size === 0 || splitSel.size === members.length ? null : [...splitSel];
    const { error } = await supabase.from('expenses').insert({ hub_id: hubId, payer_id: userId, description: desc.trim(), amount: val, split_with: incl });
    setBusy(false);
    if (!error) { logEvent('expense_added', { amount: val, split: incl ? incl.length : members.length }, hubId); setDesc(''); setAmount(''); setSplitSel(new Set()); setAdding(false); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa spesa?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    load();
  };

  const nameOf = (uid: string) => members.find((m) => m.user_id === uid)?.username ?? '???';

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  // Split asimmetrico: ogni spesa grava solo sui suoi inclusi (split_with) o su tutti (null).
  const balance: Record<string, number> = {};
  members.forEach((m) => { balance[m.user_id] = 0; });
  // myShare: quanto le spese pesano davvero su di me (somma delle quote in cui sono incluso).
  let myShare = 0;
  expenses.forEach((e) => {
    const incl = e.split_with && e.split_with.length > 0 ? e.split_with : members.map((m) => m.user_id);
    const share = e.amount / incl.length;
    incl.forEach((uid) => {
      if (balance[uid] !== undefined) balance[uid] -= share;
      if (uid === userId) myShare += share;
    });
    if (balance[e.payer_id] !== undefined) balance[e.payer_id] += e.amount;
  });
  const transfers: { from: string; to: string; amount: number }[] = [];
  const debtors = members.map((m) => ({ id: m.user_id, amt: balance[m.user_id] })).filter((x) => x.amt < -0.01).sort((a, b) => a.amt - b.amt);
  const creditors = members.map((m) => ({ id: m.user_id, amt: balance[m.user_id] })).filter((x) => x.amt > 0.01).sort((a, b) => b.amt - a.amt);
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(-debtors[i].amt, creditors[j].amt);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amt += pay; creditors[j].amt -= pay;
    if (Math.abs(debtors[i].amt) < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }

  const myBalance = userId ? (balance[userId] ?? 0) : 0;
  const inCredit = myBalance > 0.01;
  const inDebt = myBalance < -0.01;

  // Julie riferisce cio' che l'app gia' sa: nessun calcolo nuovo, solo la voce giusta.
  const voceJulie = (): string => {
    if (expenses.length === 0) return 'Non c\u2019e\u2019 ancora nulla in cassa. Registri la prima spesa: ai conti penso io.';
    if (transfers.length === 0) return 'Tutti in pari. Non serve alcun bonifico: pu\u00F2 stare tranquillo.';
    const n = transfers.length;
    const quanti = n === 1 ? 'Basta un solo bonifico' : 'Bastano ' + n + ' bonifici';
    return quanti + ' per chiudere tutti i conti. Ho gi\u00E0 calcolato chi deve dare cosa a chi.';
  };

  if (loading) return (
    <div className="space-y-3">
      <div className="h-36 animate-pulse rounded-2xl" style={card} />
      <div className="h-20 animate-pulse rounded-2xl" style={card} />
      <div className="h-24 animate-pulse rounded-2xl" style={card} />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* IL VERDETTO. L'unica domanda con cui si apre la Cassa: sono in pari? */}
      <div className="p-6 rounded-2xl text-center" style={card}>
        <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: P.lo }}>Il tuo saldo</p>
        <p className="text-[42px] leading-none font-medium" style={{ color: inCredit ? P.sage : inDebt ? P.clay : P.hi }}>
          {inCredit ? '+' : ''}{eur(myBalance)} &euro;
        </p>
        <p className="text-[12px] mt-2.5" style={{ color: P.lo }}>
          {inCredit ? 'Il gruppo Le deve questa cifra' : inDebt ? 'Da versare al gruppo' : 'Non deve nulla a nessuno'}
        </p>
      </div>

      {/* Contorno: due sole metriche. Il resto e' dettaglio, e il dettaglio sta sotto. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl" style={{ background: P.inset }}>
          <p className="text-[11px] mb-1" style={{ color: P.lo }}>Totale speso</p>
          <p className="text-lg font-medium" style={{ color: P.hi }}>{eur(total)} &euro;</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: P.inset }}>
          <p className="text-[11px] mb-1" style={{ color: P.lo }}>La Sua quota</p>
          <p className="text-lg font-medium" style={{ color: P.hi }}>{eur(myShare)} &euro;</p>
        </div>
      </div>

      {/* JULIE. Qui la Cassa smette di essere contabilita' e diventa servizio. */}
      <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: 'rgba(169,192,156,0.10)', border: '1px solid rgba(169,192,156,0.26)' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0" style={{ background: P.sage, color: '#20261f' }}>J</div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-relaxed" style={{ color: P.mid }}>{voceJulie()}</p>
          {transfers.length > 0 && (
            <button onClick={() => setShowPlan(!showPlan)} className="mt-2 text-[11px] font-medium active:opacity-70" style={{ color: P.sage }}>
              {showPlan ? 'Nascondi il piano' : 'Mi mostri il piano'} {showPlan ? '\u2303' : '\u2304'}
            </button>
          )}
          {showPlan && transfers.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {transfers.map((tr, k) => (
                <div key={k} className="flex justify-between items-center rounded-xl px-3 py-2.5" style={{ background: P.inset }}>
                  <span className="text-[12px] truncate">
                    <span style={{ color: P.clay }}>{nameOf(tr.from)}</span>
                    <span className="mx-1.5" style={{ color: P.lo }}>{'\u2192'}</span>
                    <span style={{ color: P.sage }}>{nameOf(tr.to)}</span>
                  </span>
                  <span className="text-[13px] font-medium shrink-0 ml-2" style={{ color: P.hi }}>{eur(tr.amount)} &euro;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MOVIMENTI. Non righe di tabella: ogni spesa e' un oggetto riconoscibile a colpo d'occhio. */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] px-1 mb-2.5" style={{ color: P.lo }}>Movimenti</p>
        {expenses.length === 0 ? (
          <div className="p-6 rounded-2xl text-center" style={card}>
            <p className="text-[13px]" style={{ color: P.lo }}>Nessuna spesa ancora registrata.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => {
              const on = e.id === highlightId;
              const kind = kindOf(e.description);
              const st = KIND_STYLE[kind];
              const incl = e.split_with && e.split_with.length > 0 ? e.split_with.length : members.length;
              const mine = e.payer_id === userId;
              // Impatto sulla riga: quanto quella spesa muove il MIO saldo. Il numero che conta davvero.
              const inMe = !e.split_with || e.split_with.length === 0 || (userId ? e.split_with.includes(userId) : false);
              const share = incl > 0 ? e.amount / incl : 0;
              const delta = (mine ? e.amount : 0) - (inMe ? share : 0);

              return (
                <div key={e.id} ref={on ? highlightRef : null}
                  className="flex items-center gap-3 p-3.5 rounded-2xl transition-colors duration-700"
                  style={{ ...card, ...(on ? { background: 'rgba(169,192,156,0.10)', boxShadow: 'inset 0 0 0 1px rgba(169,192,156,0.35)' } : {}) }}>

                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg, color: st.color }} aria-hidden>
                    <KindIcon kind={kind} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] truncate" style={{ color: P.hi }}>{e.description}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: P.lo }}>
                      {mine ? 'Lei' : nameOf(e.payer_id)} &middot; {fmtDate(e.created_at)} &middot; diviso in {incl}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-medium" style={{ color: P.hi }}>{eur(e.amount)} &euro;</p>
                    <p className="text-[11px] mt-0.5" style={{ color: Math.abs(delta) < 0.01 ? P.lo : delta > 0 ? P.sage : P.clay }}>
                      {Math.abs(delta) < 0.01 ? '\u2014' : (delta > 0 ? '+' : '') + eur(delta)}
                    </p>
                  </div>

                  {mine && !archived && (
                    <button onClick={() => handleDelete(e.id)} aria-label="Elimina spesa" title="Elimina spesa"
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg opacity-60 active:opacity-100 active:scale-90 transition-all"
                      style={{ color: P.lo }}>
                      <IconTrash />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSERIMENTO. Si apre al gesto: fuori dal flusso di lettura finche' non serve. */}
      {!archived && (
        adding ? (
          <div className="p-4 rounded-2xl space-y-3" style={card}>
            <div className="flex gap-2">
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Per cosa?" autoFocus
                className="flex-1 p-3 rounded-xl text-sm outline-none"
                style={{ background: P.field, color: P.hi, border: '1px solid ' + P.line }} />
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00"
                className="w-24 p-3 rounded-xl text-sm font-medium outline-none text-right"
                style={{ background: P.field, color: P.hi, border: '1px solid ' + P.line }} />
            </div>
            <div>
              <p className="text-[11px] mb-2" style={{ color: P.lo }}>Chi partecipa {splitSel.size === 0 ? '(tutti)' : '(' + splitSel.size + ')'}</p>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const on = splitSel.size === 0 || splitSel.has(m.user_id);
                  return (
                    <button key={m.user_id} type="button" onClick={() => setSplitSel((prev) => {
                      // Set vuoto = tutti. Primo tocco materializza la lista piena, poi toglie il deselezionato.
                      const base = prev.size === 0 ? new Set(members.map((x) => x.user_id)) : new Set(prev);
                      base.has(m.user_id) ? base.delete(m.user_id) : base.add(m.user_id);
                      return base.size === members.length ? new Set<string>() : base;
                    })}
                      className="text-[12px] px-3 py-1.5 rounded-full transition-colors"
                      style={on
                        ? { background: 'rgba(169,192,156,0.14)', color: P.sageInk }
                        : { background: P.inset, color: P.lo, textDecoration: 'line-through' }}>
                      {m.username}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setAdding(false); setDesc(''); setAmount(''); setSplitSel(new Set()); }}
                className="px-4 py-3 rounded-xl text-[13px] font-medium active:scale-[0.98] transition-transform"
                style={{ background: P.inset, color: P.lo }}>
                Annulla
              </button>
              <button onClick={handleAdd} disabled={busy || !desc.trim() || !amount}
                className="flex-1 py-3 rounded-xl font-medium text-[13px] active:scale-[0.98] transition-transform disabled:opacity-40"
                style={{ background: P.sage, color: '#20261f' }}>
                {busy ? 'Registro\u2026' : 'Registra la spesa'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full py-4 rounded-2xl font-medium text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: P.sage, color: '#20261f' }}>
            <IconPlus /> Aggiungi una spesa
          </button>
        )
      )}

    </div>
  );
}