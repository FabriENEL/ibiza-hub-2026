'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Expense = { id: string; payer_id: string; description: string; amount: number };
type Member = { user_id: string; username: string };

export default function Cassa({ hubId, theme }: { hubId: string; theme: Theme }) {
  const { userId } = useHub();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: exp } = await supabase
      .from('expenses').select('id, payer_id, description, amount')
      .eq('hub_id', hubId).order('created_at', { ascending: false });
    // Membri reali dell'hub + nome dal profilo agganciato.
    const { data: mem } = await supabase
      .from('hub_members').select('user_id, profiles ( username )').eq('hub_id', hubId);
    setExpenses((exp ?? []).map((e) => ({ ...e, amount: Number(e.amount) })));
    setMembers((mem ?? []).map((m: any) => ({ user_id: m.user_id, username: m.profiles?.username ?? '???' })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  const handleAdd = async () => {
    const val = Number(amount);
    if (!desc.trim() || !val || val <= 0 || busy || !userId) return;
    setBusy(true);
    const { error } = await supabase.from('expenses').insert({
      hub_id: hubId, payer_id: userId, description: desc.trim(), amount: val,
    });
    setBusy(false);
    if (!error) { setDesc(''); setAmount(''); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa spesa?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    load();
  };

  const nameOf = (uid: string) => members.find((m) => m.user_id === uid)?.username ?? '???';

  // ---- CALCOLO SALDI E PIANO BONIFICI (greedy settlement) ----
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const perHead = members.length > 0 ? total / members.length : 0;

  // Saldo netto di ciascuno: (quanto ha pagato) - (sua quota).
  // Positivo = in credito (deve ricevere). Negativo = in debito (deve dare).
  const balance: Record<string, number> = {};
  members.forEach((m) => {
    const paid = expenses.filter((e) => e.payer_id === m.user_id).reduce((s, e) => s + e.amount, 0);
    balance[m.user_id] = paid - perHead;
  });

  // Algoritmo: accoppia il debitore maggiore col creditore maggiore, satura, ripeti.
  // Minimizza in pratica il numero di bonifici.
  const transfers: { from: string; to: string; amount: number }[] = [];
  const debtors = members.map((m) => ({ id: m.user_id, amt: balance[m.user_id] }))
    .filter((x) => x.amt < -0.01).sort((a, b) => a.amt - b.amt);   // piu' negativo prima
  const creditors = members.map((m) => ({ id: m.user_id, amt: balance[m.user_id] }))
    .filter((x) => x.amt > 0.01).sort((a, b) => b.amt - a.amt);    // piu' positivo prima
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(-debtors[i].amt, creditors[j].amt);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amt += pay; creditors[j].amt -= pay;
    if (Math.abs(debtors[i].amt) < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }

  if (loading) return <p className="text-slate-500 text-center py-10">Carico la cassa...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 p-4 rounded-xl text-center">
          <span className="text-[10px] uppercase text-slate-500 font-bold">Totale</span>
          <p className="text-xl font-black text-white">{total.toFixed(2)} EUR</p>
        </div>
        <div className={'bg-slate-900 p-4 rounded-xl text-center border ' + theme.border}>
          <span className="text-[10px] uppercase text-slate-500 font-bold">A testa</span>
          <p className={'text-xl font-black ' + theme.text}>{perHead.toFixed(2)} EUR</p>
        </div>
      </div>

      <div className="bg-slate-900 p-4 rounded-xl space-y-3">
        <div className="flex gap-2">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrizione"
            className="flex-1 bg-slate-950 p-2 rounded-lg text-sm text-white border border-slate-700 outline-none" />
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="EUR"
            className="w-24 bg-slate-950 p-2 rounded-lg text-sm text-white border border-slate-700 font-black outline-none" />
        </div>
        <button onClick={handleAdd} disabled={busy || !desc.trim() || !amount}
          className={'w-full bg-gradient-to-r ' + theme.gradient + ' text-slate-950 py-2.5 rounded-lg font-black text-xs uppercase disabled:opacity-40'}>
          {busy ? 'Salvo...' : 'Registra spesa'}
        </button>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl">
        <h4 className="text-[10px] uppercase text-blue-400 font-black mb-3">Piano Bonifici (minimo)</h4>
        {transfers.length === 0 ? (
          <p className="text-xs text-slate-500">Tutti in pari.</p>
        ) : transfers.map((tr, k) => (
          <div key={k} className="flex justify-between text-sm mb-2">
            <span className="font-bold text-red-400">{nameOf(tr.from)} <span className="text-slate-500">{'->'}</span> <span className="text-emerald-400">{nameOf(tr.to)}</span></span>
            <span className="font-black text-white">{tr.amount.toFixed(2)} EUR</span>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 p-4 rounded-xl">
        <h4 className="text-[10px] uppercase text-slate-400 font-black mb-3">Registro Spese</h4>
        {expenses.length === 0 ? (
          <p className="text-xs text-slate-500">Nessuna spesa.</p>
        ) : expenses.map((e) => (
          <div key={e.id} className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 last:border-0">
            <div className="text-xs">
              <span className="font-bold text-white uppercase">{e.description}</span><br />
              <span className={theme.text}>{nameOf(e.payer_id)}</span>
            </div>
            <div className="text-right">
              <span className="font-black text-sm block text-white">{e.amount.toFixed(2)} EUR</span>
              {e.payer_id === userId && <button onClick={() => handleDelete(e.id)} className="text-[8px] text-red-500 font-bold uppercase mt-1">Elimina</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
