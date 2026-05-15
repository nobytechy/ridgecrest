import { useEffect, useState } from 'react';
import { Send, Loader2, Pin, Trash2, MessageCircle, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import FileUpload from '@/components/FileUpload';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function AdminClassFeed() {
  const { staff } = useAuth();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [feed, setFeed] = useState([]);
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('rc_classes').select('id, name').order('position').then(({ data }) => {
      setClasses(data || []);
      if ((data || []).length) setClassId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    supabase.from('rc_class_feed').select('*, author:rc_staff(display_name)').eq('class_id', classId).order('pinned', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => setFeed(data || []));
  }, [classId]);

  async function reload() {
    const { data } = await supabase.from('rc_class_feed').select('*, author:rc_staff(display_name)').eq('class_id', classId).order('pinned', { ascending: false }).order('created_at', { ascending: false });
    setFeed(data || []);
  }

  const post = async (e) => {
    e?.preventDefault();
    if (!body.trim()) return toast.error('Write something first.');
    setBusy(true);
    const { error } = await supabase.from('rc_class_feed').insert({
      class_id: classId,
      author_id: staff?.id,
      body: body.trim(),
      photo_url: photo,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Posted');
    setBody(''); setPhoto(null);
    reload();
  };

  const togglePin = async (r) => {
    const { error } = await supabase.from('rc_class_feed').update({ pinned: !r.pinned }).eq('id', r.id);
    if (error) return toast.error(error.message);
    reload();
  };

  const remove = async (r) => {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabase.from('rc_class_feed').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    reload();
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Class feed</h1>
          <p className="mt-1 text-sm text-rc-600">Daily diary visible to parents and students in the selected class.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-rc-600">Class</label>
          <select className="input w-44" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </header>

      <form onSubmit={post} className="card mb-6">
        <h2 className="mb-3 inline-flex items-center gap-2 font-display text-base font-bold text-rc-900"><MessageCircle size={16} className="text-rc-700"/> Write a class update</h2>
        <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did Grade 3 learn today? Reminders, photos, notes for parents…"/>
        <div className="mt-3"><FileUpload variant="image" value={photo} onChange={setPhoto} folder={`class-feed/${classId}`} accept="image/*"/></div>
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={busy || !body.trim()} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : <Send size={14}/>} Post to class</button>
        </div>
      </form>

      <div className="space-y-3">
        {feed.length === 0 ? (
          <div className="card text-center">
            <MessageCircle className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No posts yet on this class feed.</p>
          </div>
        ) : feed.map((r) => (
          <div key={r.id} className={cn('card', r.pinned && 'border-amber-300 bg-amber-50/40')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-rc-500">
                  {r.pinned && <span className="chip"><Pin size={10}/> Pinned</span>}
                  <span>{r.author?.display_name}</span>
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-rc-800">{r.body}</p>
                {r.photo_url && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-rc-200">
                    <img src={r.photo_url} alt="" className="max-h-96 w-full object-cover"/>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => togglePin(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900" title={r.pinned ? 'Unpin' : 'Pin'}><Pin size={14}/></button>
                <button onClick={() => remove(r)}    className="rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
