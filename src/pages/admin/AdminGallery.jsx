/**
 * AdminGallery — manage photo albums + photos shown on the public site.
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, X, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import FileUpload from '@/components/FileUpload';

export default function AdminGallery() {
  const [albums, setAlbums] = useState([]);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [openAlbum, setOpenAlbum] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('rc_gallery_albums').select('*').order('position');
    setAlbums(data || []);
  }

  const startAdd = () => setEditingAlbum({ title: '', description: '', cover_url: '', event_date: '', active: true, position: 100 });

  const save = async (e) => {
    e?.preventDefault();
    if (!editingAlbum.title.trim()) return toast.error('Title is required.');
    setBusy(true);
    const payload = {
      title: editingAlbum.title.trim(),
      description: editingAlbum.description || null,
      cover_url: editingAlbum.cover_url || null,
      event_date: editingAlbum.event_date || null,
      active: !!editingAlbum.active,
      position: Number(editingAlbum.position || 100),
    };
    let res;
    if (editingAlbum.id) res = await supabase.from('rc_gallery_albums').update(payload).eq('id', editingAlbum.id);
    else                 res = await supabase.from('rc_gallery_albums').insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved'); setEditingAlbum(null); load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete album "${row.title}"? All photos in it will be removed.`)) return;
    const { error } = await supabase.from('rc_gallery_albums').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  if (openAlbum) return <PhotosManager album={openAlbum} onBack={() => { setOpenAlbum(null); load(); }}/>;

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Gallery</h1>
          <p className="mt-1 text-sm text-rc-600">Photo albums shown on the public site. {albums.length} album{albums.length === 1 ? '' : 's'}.</p>
        </div>
        <button onClick={startAdd} className="btn-primary"><Plus size={14}/> New album</button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {albums.length === 0 ? (
          <div className="card text-center md:col-span-2 lg:col-span-3">
            <ImageIcon className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No albums yet.</p>
          </div>
        ) : albums.map((a) => (
          <div key={a.id} className="card hover:border-rc-400 transition">
            <div onClick={() => setOpenAlbum(a)} className="cursor-pointer">
              <div className="aspect-video overflow-hidden rounded-lg bg-rc-100">
                {a.cover_url ? <img src={a.cover_url} alt="" className="h-full w-full object-cover"/> : (
                  <div className="grid h-full place-items-center text-rc-400"><ImageIcon size={28}/></div>
                )}
              </div>
              <p className="mt-3 font-display text-lg font-bold text-rc-900">{a.title}</p>
              <p className="text-xs text-rc-500">{a.event_date && formatDate(a.event_date)}{!a.active && ' · hidden'}</p>
              {a.description && <p className="mt-1 text-xs text-rc-600">{a.description}</p>}
            </div>
            <div className="mt-3 flex justify-end gap-1">
              <button onClick={() => setEditingAlbum(a)} className="rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><Edit3 size={14}/></button>
              <button onClick={() => remove(a)} className="rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>

      {editingAlbum && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setEditingAlbum(null)}>
          <div className="flex-1 bg-rc-900/40"/>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-rc-900">{editingAlbum.id ? 'Edit album' : 'New album'}</h2>
              <button type="button" onClick={() => setEditingAlbum(null)} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
            </div>
            <div className="grid gap-4">
              <F label="Title *"><input className="input" value={editingAlbum.title} onChange={(e) => setEditingAlbum({...editingAlbum, title: e.target.value})} required/></F>
              <F label="Description"><textarea className="input" rows={3} value={editingAlbum.description || ''} onChange={(e) => setEditingAlbum({...editingAlbum, description: e.target.value})}/></F>
              <F label="Event date"><input className="input" type="date" value={editingAlbum.event_date || ''} onChange={(e) => setEditingAlbum({...editingAlbum, event_date: e.target.value})}/></F>
              <F label="Cover image">
                <FileUpload value={editingAlbum.cover_url || null} onChange={(url) => setEditingAlbum({...editingAlbum, cover_url: url})} folder="gallery/covers" accept="image/*"/>
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Sort order"><input className="input" type="number" value={editingAlbum.position} onChange={(e) => setEditingAlbum({...editingAlbum, position: e.target.value})}/></F>
                <label className="mt-6 inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editingAlbum.active} onChange={(e) => setEditingAlbum({...editingAlbum, active: e.target.checked})}/> Show publicly
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingAlbum(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : null} Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PhotosManager({ album, onBack }) {
  const [photos, setPhotos] = useState([]);
  const [adding, setAdding] = useState({ url: '', caption: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('rc_gallery_photos').select('*').eq('album_id', album.id).order('position');
    setPhotos(data || []);
  }

  const addPhoto = async (e) => {
    e?.preventDefault();
    if (!adding.url) return toast.error('Upload a photo first.');
    setBusy(true);
    const { error } = await supabase.from('rc_gallery_photos').insert({
      album_id: album.id, url: adding.url, caption: adding.caption || null,
      position: (photos.length + 1) * 10,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Added');
    setAdding({ url: '', caption: '' });
    load();
  };

  const remove = async (p) => {
    if (!confirm('Remove this photo?')) return;
    const { error } = await supabase.from('rc_gallery_photos').delete().eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('Removed'); load();
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900"><ArrowLeft size={14}/> Back to albums</button>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">{album.title}</h1>
        <p className="mt-1 text-sm text-rc-600">{photos.length} photo{photos.length === 1 ? '' : 's'}</p>
      </header>

      <form onSubmit={addPhoto} className="card mb-6">
        <h2 className="mb-3 font-display text-base font-bold text-rc-900">Add photo</h2>
        <FileUpload value={adding.url || null} onChange={(url) => setAdding({...adding, url})} folder={`gallery/${album.id}`} accept="image/*"/>
        <input className="input mt-3" value={adding.caption} onChange={(e) => setAdding({...adding, caption: e.target.value})} placeholder="Caption (optional)"/>
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={busy || !adding.url} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : <Plus size={14}/>} Add to album</button>
        </div>
      </form>

      {photos.length === 0 ? (
        <div className="card text-center">
          <ImageIcon className="mx-auto mb-2 text-rc-400" size={24}/>
          <p className="text-sm text-rc-500">No photos in this album yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-rc-200 bg-white">
              <div className="aspect-square bg-rc-100"><img src={p.url} alt={p.caption || ''} className="h-full w-full object-cover"/></div>
              {p.caption && <p className="px-3 pt-2 text-xs text-rc-700">{p.caption}</p>}
              <div className="flex justify-end p-2"><button onClick={() => remove(p)} className="rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function F({ label, children }) {
  return (<div><label className="mb-1 block text-xs font-medium text-rc-600">{label}</label>{children}</div>);
}
