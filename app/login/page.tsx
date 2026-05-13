'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem('hub_user_name');
    if (!storedName) {
      router.push('/login');
    } else {
      setUserName(storedName);
    }
  }, [router]);

  if (!userName) return null; // Preveniamo il flash di contenuto

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-green-500">Pronto e operativo, {userName}</p>
        </div>
      </header>
      
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <p className="text-center text-slate-400">
          Il sistema è online. In attesa di caricamento dei moduli: Galleria, Voti e Calendario.
        </p>
      </div>
    </div>
  );
}'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem('hub_user_name');
    if (!storedName) {
      router.push('/login');
    } else {
      setUserName(storedName);
    }
  }, [router]);

  if (!userName) return null; // Preveniamo il flash di contenuto

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-green-500">Pronto e operativo, {userName}</p>
        </div>
      </header>
      
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <p className="text-center text-slate-400">
          Il sistema è online. In attesa di caricamento dei moduli: Galleria, Voti e Calendario.
        </p>
      </div>
    </div>
  );
}