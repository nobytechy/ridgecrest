import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Megaphone, Loader2, X, EyeOff, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const TYPE_TONE = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-emerald-100 text-emerald-800',
};

export default function AdminAnnouncements() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('rc_announcements').select('*').order('created_at', { ascending: false });
    setRows(data || []);
  }

  const startAdd = () => setEditing({
    title: '', body: '', audience: 'all', type: 'info', active: true,
  });

  const save = async (e) => {
    e?.preventDefault();
    if (!editing.title.trim() || !editing.body.trim()) return toast.error('Title and body are required.');
    setBusy(true);
    const payload = {
      title: editing.title.trim(), body: editing.body.trim(),
      audience: editing.audience, type: editing.type, active: editing.active,
    };
    let res;
    if (editing.id) res = await supabase.from('rc_announcements').update(payload).eq('id', editing.id);
    else            res = await supabase.from('rc_announcements').insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved'); setEditing(null); load();
  };

  const toggle = async (row) => {
    const { error } = await supabase.from('rc_announcements').update({ active: !row.active }).eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success(row.active ? 'Hidden' : 'Published');
    load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const { error } = await supabase.from('rc_announcements').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Announcements</h1>
          <p className="mt-1 text-sm text-rc-600">{rows.filter((r) => r.active).length} active · {rows.length} total.</p>
        </div>
        <button onClick={startAdd} className="btn-primary"><Plus size={14}/> New announcement</button>
      </header>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="card text-center">
            <Megaphone className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No announcements yet.</p>
          </div>
        ) : rows.map((r) => (
          <div key={r.id} className={cn('card', !r.active && 'opacity-60')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-bold text-rc-900">{r.title}</p>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', TYPE_TONE[r.type])}>{r.type}</span>
                  <span className="chip">For {r.audience}</span>
                  <span className="text-xs text-rc-400">{formatDate(r.created_at)}</span>
                  {!r.active && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Hidden</span>}
                </div>
                <p className="text-sm leading-relaxed text-rc-700">{r.body}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => toggle(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900" title={r.active ? 'Hide' : 'Publish'}>
                  {r.active ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
                <button onClick={() => setEditing(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><Edit3 size={14}/></button>
                <button onClick={() => remove(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setEditing(null)}>
          <div className="flex-1 bg-rc-900/40"/>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-rc-900">{editing.id ? 'Edit announcement' : 'New announcement'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
            </div>
            <div className="grid gap-4">
              <F label="Title *"><input className="input" value={editing.title} onChange={(e) => setEditing({...editing, title: e.target.value})} required/></F>
              <F label="Body *"><textarea className="input" rows={6} value={editing.body} onChange={(e) => setEditing({...editing, body: e.target.value})} required/></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Audience">
                  <select className="input" value={editing.audience} onChange={(e) => setEditing({...editing, audience: e.target.value})}>
                    <option value="all">All (everyone)</option>
                    <option value="public">Public (homepage)</option>
                    <option value="staff">Staff only</option>
                    <option value="students">Students only</option>
                    <option value="parents">Parents only</option>
                  </select>
                </F>
                <F label="Type">
                  <select className="input" value={editing.type} onChange={(e) => setEditing({...editing, type: e.target.value})}>
                    <option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option>
                  </select>
                </F>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({...editing, active: e.target.checked})}/>
                Active (publish immediately)
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : null} Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
function F({ label, children }) {
  return (<div><label className="mb-1 block text-xs font-medium text-rc-600">{label}</label>{children}</div>);
}
