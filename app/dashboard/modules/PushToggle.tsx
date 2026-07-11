'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

// Converte la chiave VAPID pubblica (base64 url-safe) in BufferSource per pushManager.subscribe().
// Restituisce l'ArrayBuffer (cast esplicito) per evitare l'attrito TS Uint8Array<ArrayBufferLike> vs ArrayBuffer.
function vapidKey(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

type St = 'loading' | 'unsupported' | 'off' | 'on' | 'denied';

export default function PushToggle({ rounded }: { rounded: string }) {
  const { userId } = useHub();
  const [st, setSt] = useState<St>('loading');
  const [busy, setBusy] = useState(false);
  const vapid = process.env.NEXT_PUBLIC_VAPID_KEY;

  // Su iPhone-browser PushManager non esiste finche' l'app non e' installata come PWA: qui il toggle si autonasconde.
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!supported) { setSt('unsupported'); return; }
    if (Notification.permission === 'denied') { setSt('denied'); return; }
    navigator.serviceWorker.getRegistration()
      .then(async (reg) => { const sub = reg ? await reg.pushManager.getSubscription() : null; setSt(sub ? 'on' : 'off'); })
      .catch(() => setSt('off'));
  }, [supported]);

  const enable = async () => {
    if (busy || !userId || !vapid) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setSt(perm === 'denied' ? 'denied' : 'off'); setBusy(false); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(vapid) });
      // Una sola iscrizione per utente: ripulisco le vecchie, poi salvo la corrente.
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
      const { error } = await supabase.from('push_subscriptions').insert({ user_id: userId, subscription_data: sub.toJSON() });
      setSt(error ? 'off' : 'on');
    } catch { setSt('off'); }
    setBusy(false);
  };

  const disable = async () => {
    if (busy || !userId) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) await sub.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    } catch {}
    setSt('off'); setBusy(false);
  };

  if (st === 'loading' || st === 'unsupported') return null;

  const on = st === 'on';
  const denied = st === 'denied';

  return (
    <div className={'eg-card-n p-4 flex items-center justify-between ' + rounded}>
      <div className="pr-3">
        <p className="text-[10px] uppercase text-slate-400 font-black">Notifiche</p>
        <p className="text-[10px] text-slate-500">
          {denied ? 'Bloccate: riattivale dalle impostazioni del sito' : on ? 'Attive su questo dispositivo' : 'Avvisi su spese, eventi e voti'}
        </p>
      </div>
      <button onClick={on ? disable : enable} disabled={busy || denied}
        aria-label={on ? 'Disattiva notifiche' : 'Attiva notifiche'}
        className={'text-[10px] uppercase font-black px-3 py-2 rounded-lg disabled:opacity-40 ' + (on ? 'bg-slate-800 text-slate-300 border border-slate-600' : 'text-slate-950')}
        style={on ? {} : { background: '#A3B585' }}>
        {busy ? '...' : on ? 'Disattiva' : 'Attiva'}
      </button>
    </div>
  );
}