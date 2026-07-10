'use client'
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '../lib/logEvent';
import { useHub } from '../lib/HubContext';

// Palette "ramoscello": antracite di base, salvia come voce, terracotta desaturata per il debito.
// Pilota locale a questo file. Se approvata, va promossa a token di tema e rimossa da qui.
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

export default function Cassa({ hubId, theme, archived }: { hubId: string; theme: Theme; archived: boolean }) {
  const { userId, postAction } = useHub();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [splitSel, setSplitSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true); const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: exp } = await supabase
      .from('expenses').select('id, payer_id, description, amount, split_with, created_at')
      .eq('hub_id', hubId).order('created_at', { ascending: false });
    const { data: mem } = await supabase
      .from('hub_members').select('user_id, profiles ( username )').eq('hub_id', hubId);
    const rows = (exp ?? []).map((e: any) => ({ ...e, amount: Number(e.amount), split_with: e.split_with ?? null })); setExpenses(rows);
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

  const handleAdd = async () => {
    const val = Number(amount);
    if (!desc.trim() || !val || val <= 0 || busy || !userId) return;
    setBusy(true);
    // split_with = null quando includono tutti (default), altrimenti array esplicito degli inclusi.
    const incl = splitSel.size === 0 || splitSel.size === members.length ? null : [...splitSel];
    const { error } = await supabase.from('expenses').insert({ hub_id: hubId, payer_id: userId, description: desc.trim(), amount: val, split_with: incl });
    setBusy(false);
    if (!error) { logEvent('expense_added', { amount: val, split: incl ? incl.length : members.length }, hubId); setDesc(''); setAmount(''); setSplitSel(new Set()); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa spesa?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    load();
  };

  const nameOf = (uid: string) => members.find((m) => m.user_id === uid)?.username ?? '???';

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  // Split asimmetrico: ogni spesa grava solo sui suoi inclusi (split_with) o su tutti (null).
  // dovuto[m] = somma delle quote pro-capite delle sole spese in cui m e' incluso.
  const balance: Record<string, number> = {};
  members.forEach((m) => { balance[m.user_id] = 0; });
  expenses.forEach((e) => {
    const incl = e.split_with && e.split_with.length > 0 ? e.split_with : members.map((m) => m.user_id);
    const share = e.amount / incl.length;
    incl.forEach((uid) => { if (balance[uid] !== undefined) balance[uid] -= share; });
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

  // Saldo personale: valore gia' calcolato dall'algoritmo, ora promosso a elemento eroe.
  const myBalance = userId ? (balance[userId] ?? 0) : 0;
  const inCredit = myBalance > 0.01;
  const inDebt = myBalance < -0.01;

  if (loading) return (
    <div className="space-y-3">
      <div className="h-32 animate-pulse rounded-xl" style={card} />
      <div className="h-20 animate-pulse rounded-xl" style={card} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Saldo eroe: l'unico elemento che parla forte. Niente gradiente, salvia per il credito. */}
      <div className="p-5 rounded-xl text-center" style={card}>
        <p className="text-[11px] tracking-wider mb-1" style={{ color: P.lo }}>Il tuo saldo</p>
        <p className="text-4xl font-medium" style={{ color: inCredit ? P.sage : inDebt ? P.clay : P.hi }}>
          {inCredit ? '+' : ''}{myBalance.toFixed(2)} €
        </p>
        <p className="text-[11px] mt-1" style={{ color: P.lo }}>{inCredit ? 'Ti devono rimborsare' : inDebt ? 'Da versare al gruppo' : 'Sei in pari'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl text-center" style={card}>
          <span className="text-[10px] tracking-wider" style={{ color: P.lo }}>Totale</span>
          <p className="text-lg font-medium" style={{ color: P.hi }}>{total.toFixed(2)} €</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={card}>
          <span className="text-[10px] tracking-wider" style={{ color: P.lo }}>Media/persona</span>
          <p className="text-lg font-medium" style={{ color: P.sageDim }}>{(members.length ? total / members.length : 0).toFixed(2)} €</p>
        </div>
      </div>

      {!archived && (
        <div className="p-4 rounded-xl space-y-3" style={card}>
          <div className="flex gap-2">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrizione"
              className="flex-1 p-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ background: P.field, color: P.hi, border: '1px solid ' + P.line }} />
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="€"
              className="w-24 p-2.5 rounded-lg text-sm font-medium outline-none transition-colors"
              style={{ background: P.field, color: P.hi, border: '1px solid ' + P.line }} />
          </div>
          <div>
            <p className="text-[10px] tracking-wider mb-1.5" style={{ color: P.lo }}>Chi partecipa {splitSel.size === 0 ? '(tutti)' : '(' + splitSel.size + ')'}</p>
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
                    className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                    style={on
                      ? { background: 'rgba(169,192,156,0.14)', color: P.sageInk }
                      : { background: P.inset, color: P.lo, textDecoration: 'line-through' }}>
                    {m.username}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={handleAdd} disabled={busy || !desc.trim() || !amount}
            className="w-full py-2.5 rounded-lg font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{ background: P.sage, color: '#20261f' }}>
            {busy ? 'Salvo…' : 'Registra spesa'}
          </button>
        </div>
      )}

      <div className="p-4 rounded-xl" style={card}>
        <h4 className="text-[11px] tracking-wider mb-3" style={{ color: P.sage }}>Piano bonifici · il minimo indispensabile</h4>
        {transfers.length === 0 ? <p className="text-xs" style={{ color: P.lo }}>Tutti in pari. Nessun bonifico necessario.</p> : transfers.map((tr, k) => (
          <div key={k} className="flex justify-between items-center mb-2 last:mb-0 rounded-lg px-3 py-2.5" style={{ background: P.inset }}>
            <span className="text-xs"><span style={{ color: P.clay }}>{nameOf(tr.from)}</span><span className="mx-1.5" style={{ color: P.lo }}>→</span><span style={{ color: P.sage }}>{nameOf(tr.to)}</span></span>
            <span className="text-sm font-medium" style={{ color: P.hi }}>{tr.amount.toFixed(2)} €</span>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl" style={card}>
        <h4 className="text-[11px] tracking-wider mb-1" style={{ color: P.lo }}>Registro spese</h4>
        {expenses.length === 0 ? <p className="text-xs pt-2" style={{ color: P.lo }}>Nessuna spesa. Registri la prima qui sopra.</p> : expenses.map((e) => {
          const on = e.id === highlightId;
          return (
            <div key={e.id} ref={on ? highlightRef : null}
              className="flex justify-between items-center py-2.5 px-2 -mx-2 rounded-lg transition-colors duration-700"
              style={{ borderBottom: '1px solid ' + P.line, ...(on ? { background: 'rgba(169,192,156,0.10)', boxShadow: 'inset 0 0 0 1px rgba(169,192,156,0.35)', borderBottom: '1px solid transparent' } : {}) }}>
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Il fiore: un solo puntino nel colore-tema dell'Hub, non piu' un neon sparato. */}
                <span className={theme.text + ' shrink-0'} aria-hidden><span className="block w-1.5 h-1.5 rounded-full bg-current" /></span>
                <div className="min-w-0">
                  <p className="text-[13px] truncate" style={{ color: P.hi }}>{e.description}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: P.lo }}>{nameOf(e.payer_id)} · {fmtDate(e.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[13px] font-medium" style={{ color: P.hi }}>{e.amount.toFixed(2)} €</span>
                {e.payer_id === userId && !archived && (
                  <button onClick={() => handleDelete(e.id)} aria-label="Elimina spesa"
                    className="transition-colors hover:opacity-100 opacity-70" style={{ color: P.lo }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}