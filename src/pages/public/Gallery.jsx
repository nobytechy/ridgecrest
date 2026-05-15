import { useEffect, useState } from 'react';
import { Image as ImageIcon, X, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';

export default function Gallery() {
  const [albums, setAlbums] = useState([]);
  const [open, setOpen] = useState(null);  // album currently viewed
  const [photos, setPhotos] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    supabase.from('rc_gallery_albums').select('*').eq('active', true).order('position')
      .then(({ data }) => setAlbums(data || []));
  }, []);

  useEffect(() => {
    if (!open) { setPhotos([]); return; }
    supabase.from('rc_gallery_photos').select('*').eq('album_id', open.id).order('position')
      .then(({ data }) => setPhotos(data || []));
  }, [open]);

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-rc-950 py-20 text-white md:py-24">
        <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&auto=format&fit=crop&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-r from-rc-950/95 via-rc-900/80 to-rc-800/40"/>
        <div className="container-page relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">Gallery</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
            School life in pictures.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-rc-100" style={{ textShadow: '0 1px 20px rgba(0,0,0,0.5)' }}>
            Sports days, prize-givings, learning in the classroom — a window into life at Ridgecrest.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        {open ? (
          <>
            <button onClick={() => setOpen(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900">
              ← Back to all albums
            </button>
            <header className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">
                {open.event_date && <><Calendar size={11} className="-mt-0.5 mr-1 inline"/>{formatDate(open.event_date)}</>}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">{open.title}</h2>
              {open.description && <p className="mt-2 max-w-2xl text-rc-600">{open.description}</p>}
            </header>

            {photos.length === 0 ? (
              <p className="text-sm text-rc-500">No photos in this album yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {photos.map((p) => (
                  <button key={p.id} type="button" onClick={() => setLightbox(p)} className="group relative aspect-square overflow-hidden rounded-2xl bg-rc-100">
                    <img src={p.url} alt={p.caption || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                    {p.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-rc-950/80 to-transparent p-3 text-left text-xs text-white">
                        {p.caption}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">Albums</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">A year at Ridgecrest, in photos.</h2>
            </div>
            {albums.length === 0 ? (
              <div className="rounded-xl border border-dashed border-rc-300 bg-rc-50/40 p-12 text-center">
                <ImageIcon className="mx-auto mb-2 text-rc-400" size={28}/>
                <p className="font-display text-lg font-bold text-rc-700">No albums yet.</p>
                <p className="mt-1 text-sm text-rc-500">Albums posted by the school will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {albums.map((a) => (
                  <button key={a.id} type="button" onClick={() => setOpen(a)} className="group overflow-hidden rounded-2xl border border-rc-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="aspect-[4/3] overflow-hidden bg-rc-100">
                      {a.cover_url ? <img src={a.cover_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"/> : <div className="grid h-full place-items-center text-rc-400"><ImageIcon size={28}/></div>}
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rc-500">
                        {a.event_date ? formatDate(a.event_date) : '—'}
                      </p>
                      <p className="mt-1 font-display text-lg font-bold text-rc-900">{a.title}</p>
                      {a.description && <p className="mt-1 line-clamp-2 text-sm text-rc-600">{a.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-rc-950/90 p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X size={20}/></button>
          <img src={lightbox.url} alt={lightbox.caption || ''} className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"/>
          {lightbox.caption && <p className="absolute inset-x-0 bottom-6 mx-auto max-w-2xl text-center text-sm text-white">{lightbox.caption}</p>}
        </div>
      )}
    </div>
  );
}
