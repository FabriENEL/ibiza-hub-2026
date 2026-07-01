'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Media = { id: string; url: string; type: string | null; user_id: string | null };

export default function Gallery({ hubId, theme }: { hubId: string; theme: Theme }) {
  const { userId } = useHub();
  const [items, setItems] = useState<Media[]>([]);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('media').select('id, url, type, user_id')
      .eq('hub_id', hubId).order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || uploading) return;
    setUploading(true);
    // Cartella = codice utente (richiesto dalle serrature Storage).
    const path = userId + '/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const { error: upErr } = await supabase.storage.from('gallery').upload(path, file);
    if (upErr) { setUploading(false); alert('Caricamento non riuscito: ' + upErr.message); return; }
    // Indirizzo pubblico del file caricato (bucket privato: valido per la lettura autenticata).
    const url = supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl;
    // Registra il "biglietto" nella tabella media.
    const isVideo = file.type.startsWith('video/');
    const { error: dbErr } = await supabase.from('media').insert({
      hub_id: hubId, url, type: isVideo ? 'video' : 'image', user_id: userId,
      event_date: new Date().toISOString().split('T')[0],
    });
    setUploading(false);
    if (!dbErr) load();
    else alert('Errore salvataggio: ' + dbErr.message);
  };

  const shown = items.filter((m) => filter === 'mine' ? m.user_id === userId : true);

  if (loading) return <p className="text-slate-500 text-center py-10">Carico la galleria...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black uppercase text-white tracking-wider">Galleria</h3>
        <label className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase cursor-pointer'}>
          {uploading ? 'Carico...' : '+ Foto'}
          <input type="file" accept="image/*,video/*" className="hidden" disabled={uploading} onChange={handleUpload} />
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setFilter('all')}
          className={'flex-1 py-2 text-xs font-bold rounded-lg ' + (filter === 'all' ? 'bg-slate-800 ' + theme.text : 'bg-slate-900 text-slate-400')}>Tutte</button>
        <button onClick={() => setFilter('mine')}
          className={'flex-1 py-2 text-xs font-bold rounded-lg ' + (filter === 'mine' ? 'bg-slate-800 ' + theme.text : 'bg-slate-900 text-slate-400')}>Le mie</button>
      </div>

      {shown.length === 0 ? (
        <p className="text-slate-500 text-center py-10 text-sm">Nessuna foto ancora.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shown.map((m) => (
            <div key={m.id} className="bg-slate-900 rounded-xl overflow-hidden border border-white/5">
              <div className="aspect-square bg-slate-950">
                {m.type === 'video'
                  ? <video src={m.url} className="w-full h-full object-cover" controls />
                  : <img src={m.url} className="w-full h-full object-cover" alt="" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
