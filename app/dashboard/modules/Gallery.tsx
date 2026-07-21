'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '../lib/logEvent';
import { useHub } from '../lib/HubContext';

type Theme = { text: string; gradient: string; border: string };
type Media = { id: string; url: string; type: string | null; user_id: string | null };

export default function Gallery({ hubId, theme, archived, isOwner }: { hubId: string; theme: Theme; archived: boolean; isOwner: boolean }) {
  const { userId } = useHub();
  const [items, setItems] = useState<Media[]>([]);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<Media | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('media').select('id, url, type, user_id').eq('hub_id', hubId).order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || uploading) return;
    setUploading(true);
    const path = userId + '/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const { error: upErr } = await supabase.storage.from('gallery').upload(path, file);
    if (upErr) { setUploading(false); alert('Caricamento non riuscito: ' + upErr.message); return; }
    const url = supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl;
    const isVideo = file.type.startsWith('video/');
    const { error: dbErr } = await supabase.from('media').insert({ hub_id: hubId, url, type: isVideo ? 'video' : 'image', user_id: userId, event_date: new Date().toISOString().split('T')[0] });
    setUploading(false);
    if (!dbErr) { logEvent('photo_uploaded', { type: isVideo ? 'video' : 'image' }, hubId); load(); } else alert('Errore: ' + dbErr.message);
  };

  const handleDownload = async (m: Media) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(m.url);
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl; a.download = 'eventgarden-' + m.id + (m.type === 'video' ? '.mp4' : '.jpg');
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch { alert('Download non riuscito.'); }
    setDownloading(false);
  };

  const [deleting, setDeleting] = useState(false);
  const handleDelete = async (m: Media) => {
    // Solo chi l'ha caricata (o l'organizzatore) puo' cancellare. Doppia difesa: qui e nelle RLS.
    if (m.user_id !== userId && !isOwner) { alert('Pu\u00F2 eliminare solo le foto che ha caricato Lei.'); return; }
    if (!confirm('Eliminare questo ricordo? L\u2019azione non si annulla.')) return;
    setDeleting(true);
    // Dall'URL pubblico ricavo il percorso dentro il bucket 'gallery' per cancellare anche il file.
    try {
      const marker = '/gallery/';
      const i = m.url.indexOf(marker);
      if (i !== -1) { const path = m.url.slice(i + marker.length); await supabase.storage.from('gallery').remove([path]); }
    } catch { /* se il file non c'e' piu', si prosegue: conta togliere la riga */ }
    const { error } = await supabase.from('media').delete().eq('id', m.id);
    setDeleting(false);
    if (error) { alert('Non sono riuscito a eliminarla: ' + error.message); return; }
    setItems((prev) => prev.filter((x) => x.id !== m.id));
    setViewer(null);
  };
  const shown = items.filter((m) => filter === 'mine' ? m.user_id === userId : true);
  if (loading) return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-square bg-slate-900 border border-white/5 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black uppercase text-white tracking-wider">Galleria</h3>
        {!archived && (
          <div className="flex gap-2">
            <label className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase cursor-pointer'}>
              {uploading ? 'Carico...' : '+ Foto'}
              <input type="file" accept="image/*,video/*" className="hidden" disabled={uploading} onChange={handleUpload} />
            </label>
            <label className={'bg-slate-900 border border-white/15 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase cursor-pointer'}>
              {String.fromCodePoint(0x1F4F7)} Scatta
              <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading} onChange={handleUpload} />
            </label>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setFilter('all')} className={'flex-1 py-2 text-xs font-bold rounded-lg ' + (filter === 'all' ? 'bg-slate-800 ' + theme.text : 'bg-slate-900 text-slate-400')}>Tutte</button>
        <button onClick={() => setFilter('mine')} className={'flex-1 py-2 text-xs font-bold rounded-lg ' + (filter === 'mine' ? 'bg-slate-800 ' + theme.text : 'bg-slate-900 text-slate-400')}>Le mie</button>
      </div>

      {shown.length === 0 ? <div className="text-center py-12 bg-slate-900 border border-dashed border-white/10 rounded-2xl">
          <p className="text-2xl mb-2">{'\u{1F4F8}'}</p>
          <p className="text-slate-300 text-sm font-bold">Il primo ricordo manca ancora.</p>
          <p className="text-slate-500 text-xs mt-1">Carichi una foto o un video con + Foto.</p>
        </div> : (
        <div className="grid grid-cols-2 gap-3">
          {shown.map((m) => (
            <div key={m.id} onClick={() => setViewer(m)} className="eg-card-n rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform">
              <div className="aspect-square bg-slate-950">
                {m.type === 'video' ? <div className="relative w-full h-full"><video src={m.url} className="w-full h-full object-cover" /><span className="absolute inset-0 flex items-center justify-center text-white/90 text-2xl drop-shadow bg-black/20">{'\u25B6'}</span></div> : <img src={m.url} className="w-full h-full object-cover" alt="" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4" onClick={() => setViewer(null)}>
          <div className="max-w-full max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {viewer.type === 'video' ? <video src={viewer.url} className="max-w-full max-h-[80vh]" controls autoPlay /> : <img src={viewer.url} className="max-w-full max-h-[80vh] object-contain" alt="" />}
          </div>
          <div className="flex gap-3 mt-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleDownload(viewer)} disabled={downloading} className={'bg-gradient-to-r ' + theme.gradient + ' text-slate-950 px-6 py-3 rounded-2xl font-black text-xs uppercase disabled:opacity-40'}>{downloading ? 'Scarico...' : 'Scarica'}</button>
            {(viewer.user_id === userId || isOwner) && (
              <button onClick={() => handleDelete(viewer)} disabled={deleting} className="px-6 py-3 rounded-2xl font-black text-xs uppercase disabled:opacity-40" style={{ background: '#c05656', color: '#fff' }}>{deleting ? 'Elimino...' : 'Elimina'}</button>
            )}
            <button onClick={() => setViewer(null)} className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}




