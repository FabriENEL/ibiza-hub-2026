'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from './lib/HubContext';

function vapidKey(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

const KEY = 'junction_push_invito';

// Chiedere il permesso a freddo brucia la richiesta: in Chrome un "no" e' definitivo.
// Prima si chiede a noi, poi al browser, e solo se l'utente ha gia' detto di si'.
export default function PushInvito() {
  const { userId } = useHub();
  const [apri, setApri] = useState(false);
  const [busy, setBusy] = useState(false);
  const vapid = process.env.NEXT_PUBLIC_VAPID_KEY;

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!ok || !userId || !vapid) return;
    if (Notification.permission !== 'default') return;
    try { if (localStorage.getItem(KEY)) return; } catch {}
    let t: any;
    // L'invito appare SOLO se l'utente sta guardando EventGarden in questo momento:
    // altrimenti Chrome, ridisegnando la scheda in secondo piano, lo mostrava fuori contesto.
    const forse = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(t);
      t = setTimeout(() => { if (document.visibilityState === 'visible' && document.hasFocus()) setApri(true); }, 4000);
    };
    forse();
    document.addEventListener('visibilitychange', forse);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', forse); };
  }, [userId, vapid]);

  const chiudi = () => { try { localStorage.setItem(KEY, '1'); } catch {} setApri(false); };

  const attiva = async () => {
    if (busy || !userId || !vapid) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(vapid) });
        await supabase.from('push_subscriptions').delete().eq('user_id', userId);
        await supabase.from('push_subscriptions').insert({ user_id: userId, subscription_data: sub.toJSON() });
      }
    } catch {}
    setBusy(false);
    chiudi();
  };

  if (!apri) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(10,12,14,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 animate-[eg-fade-in_.22s_ease]"
        style={{ background: 'linear-gradient(160deg, #1f2328, #16191d)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-3">
          <img src="/julie-avatar.png" alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: '2px solid #22C55E' }} />
          <p className="text-white font-black text-sm">Le do un colpo di telefono?</p>
        </div>
        <p className="text-slate-300 text-[13px] leading-snug mb-4">
          Se attiva le notifiche, La avviso quando il gruppo fissa un evento, registra una spesa o apre un voto. Niente altro.
        </p>
        <div className="flex gap-2">
          <button onClick={chiudi} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-black text-slate-300 border border-white/15">Non ora</button>
          <button onClick={attiva} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-black text-slate-950 disabled:opacity-50"
            style={{ background: '#A3B585' }}>{busy ? '...' : 'S\u00EC, avvisami'}</button>
        </div>
      </div>
    </div>
  );
}