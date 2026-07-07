'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '../lib/logEvent';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Expense = { id: string; payer_id: string; description: string; amount: number; split_with: string[] | null };
type Member = { user_id: string; username: string };

export default function Cassa({ hubId, theme, archived }: { hubId: string; theme: Theme; archived: boolean }) {
  const { userId } = useHub();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [splitSel, setSplitSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: exp } = await supabase
      .from('expenses').select('id, payer_id, description, amount, split_with')
      .eq('hub_id', hubId).order('created_at', { ascending: false });
    const { data: mem } = await supabase
      .from('hub_members').select('user_id, profiles ( username )').eq('hub_id', hubId);
    setExpenses((exp ?? []).map((e: any) => ({ ...e, amount: Number(e.amount), split_with: e.split_with ?? null })));
    setMembers((mem ?? []).map((m: any) => ({ user_id: m.user_id, username: m.profiles?.username ?? '???' })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

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
      <div className="h-32 bg-slate-900 border border-white/5 animate-pulse rounded-xl" />
      <div className="h-20 bg-slate-900 border border-white/5 animate-pulse rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={'relative overflow-hidden bg-slate-900 border p-5 rounded-xl text-center ' + (inCredit ? 'border-emerald-500/30' : inDebt ? 'border-red-500/30' : theme.border)}>
        <div aria-hidden className={'absolute inset-0 bg-gradient-to-br ' + (inCredit ? 'from-emerald-500/15 to-transparent' : inDebt ? 'from-red-500/15 to-transparent' : 'from-slate-700/10 to-transparent')} />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Il tuo saldo</p>
          <p className={'text-4xl font-black ' + (inCredit ? 'text-emerald-400' : inDebt ? 'text-red-400' : 'text-white')}>
            {inCredit ? '+' : ''}{myBalance.toFixed(2)} €
          </p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{inCredit ? 'Ti devono rimborsare' : inDebt ? 'Da versare al gruppo' : 'Sei in pari'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-white/5 p-3 rounded-xl text-center">
          <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Totale</span>
          <p className="text-lg font-black text-white">{total.toFixed(2)} €</p>
        </div>
        <div className={'bg-slate-900 p-3 rounded-xl text-center border ' + theme.border}>
          <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Media/persona</span>
          <p className={'text-lg font-black ' + theme.text}>{(members.length ? total / members.length : 0).toFixed(2)} €</p>
        </div>
      </div>

      {!archived && (
        <div className="bg-slate-900 border border-white/5 p-4 rounded-xl space-y-3">
          <div className="flex gap-2">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrizione"
              className="flex-1 bg-slate-950 p-2.5 rounded-lg text-sm text-white border border-slate-700 outline-none focus:border-slate-500 transition-colors" />
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="€"
              className="w-24 bg-slate-950 p-2.5 rounded-lg text-sm text-white border border-slate-700 font-black outline-none focus:border-slate-500 transition-colors" />
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-500 font-black mb-1.5 tracking-wider">Chi partecipa {splitSel.size === 0 ? '(tutti)' : '(' + splitSel.size + ')'}</p>
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
                    className={'text-[10px] font-black px-2.5 py-1 rounded-full ' + (on ? 'bg-gradient-to-r ' + theme.gradient + ' text-slate-950' : 'bg-slate-800 text-slate-500 line-through')}>
                    {m.username}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={handleAdd} disabled={busy || !desc.trim() || !amount}
            className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase disabled:opacity-40 active:scale-[0.98] transition-transform'}>
            {busy ? 'Salvo...' : 'Registra spesa'}
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-white/5 p-4 rounded-xl">
        <h4 className={'text-[10px] uppercase font-black mb-3 tracking-wider ' + theme.text}>Piano bonifici · il minimo indispensabile</h4>
        {transfers.length === 0 ? <p className="text-xs text-slate-500">Tutti in pari. Nessun bonifico necessario.</p> : transfers.map((tr, k) => (
          <div key={k} className="flex justify-between items-center mb-2 last:mb-0 bg-slate-950 border border-white/5 rounded-lg px-3 py-2.5">
            <span className="text-xs font-bold"><span className="text-red-400">{nameOf(tr.from)}</span><span className="text-slate-600 mx-1.5">→</span><span className="text-emerald-400">{nameOf(tr.to)}</span></span>
            <span className="font-black text-sm text-white">{tr.amount.toFixed(2)} €</span>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-white/5 p-4 rounded-xl">
        <h4 className="text-[10px] uppercase text-slate-400 font-black mb-3 tracking-wider">Registro spese</h4>
        {expenses.length === 0 ? <p className="text-xs text-slate-500">Nessuna spesa. Registri la prima qui sopra.</p> : expenses.map((e) => (
          <div key={e.id} className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 last:border-0 last:mb-0 last:pb-0">
            <div className="text-xs">
              <span className="font-bold text-white">{e.description}</span><br />
              <span className={theme.text}>{nameOf(e.payer_id)}</span>
            </div>
            <div className="text-right">
              <span className="font-black text-sm block text-white">{e.amount.toFixed(2)} €</span>
              {e.payer_id === userId && !archived && <button onClick={() => handleDelete(e.id)} className="text-[8px] text-red-500 font-bold uppercase mt-1">Elimina</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




