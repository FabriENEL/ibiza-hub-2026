'use client'

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState('');

  const handleLogin = () => {
    if (user) {
      localStorage.setItem('ibiza_user', user);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
       {/* UI Semplificata per sbloccare la Build */}
       <button onClick={() => router.push('/')} className="text-white">Torna alla selezione</button>
    </div>
  );
}