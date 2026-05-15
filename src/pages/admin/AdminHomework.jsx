/**
 * AdminHomework — teachers post and manage homework per class + subject.
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit3, X, NotebookPen, Loader2, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { formatDate, daysUntil } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function AdminHomework() {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const [h, c, s, t] = await Promise.all([
      supabase.from('rc_homework').select('*, class:rc_classes(name), subject:rc_subjects(name, code), teacher:rc_staff(display_name)').order('due_date', { ascending: true }),
      supabase.from('rc_classes').select('id, name, level').order('position'),
      supabase.from('rc_subjects').select('id, code, name').order('position'),
      supabase.from('rc_staff').select('id, display_name').eq('status', 'active').in('role_id', ['teacher','headmaster','admin']),
    ]);
    setRows(h.data || []); setClasses(c.data || []); setSubjects(s.data || []); setTeachers(t.data || []);
  }

  const filtered = useMemo(() => {
    let list = rows;
    if (classFilter) list = list.filter((r) => r.class_id === classFilter);
    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter((r) => [r.title, r.description, r.class?.name, r.subject?.name, r.teacher?.display_name].join(' ').toLowerCase().includes(qq));
    }
    return list;
  }, [rows, q, classFilter]);

  const startAdd = () => setEditing({
    class_id: classes[0]?.id || '',
    subject_id: subjects[0]?.id || '',
    teacher_id: teachers[0]?.id || '',
    title: '', description: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    active: true,
  });

  const save = async (e) => {
    e?.preventDefault();
    if (!editing.title.trim()) return toast.error('Title is required.');
    setBusy(true);
    const payload = {
      class_id: editing.class_id, subject_id: editing.subject_id || null,
      teacher_id: editing.teacher_id || null,
      title: editing.title.trim(), description: editing.description || null,
      due_date: editing.due_date || null,
      active: !!editing.active,
    };
    let res;
    if (editing.id) res = await supabase.from('rc_homework').update(payload).eq('id', editing.id);
    else            res = await supabase.from('rc_homework').insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved'); setEditing(null); load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete homework "${row.title}"?`)) return;
    const { error } = await supabase.from('rc_homework').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  const toggle = async (row) => {
    const { error } = await supabase.from('rc_homework').update({ active: !row.active }).eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success(row.active ? 'Hidden' : 'Published'); load();
  };

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Homework</h1>
          <p className="mt-1 text-sm text-rc-600">{rows.filter((r) => r.active).length} active · {rows.length} total.</p>
        </div>
        <button onClick={startAdd} className="btn-primary"><Plus size={14}/> New homework</button>
      </header>

      <div className="card mb-4 grid gap-3 md:grid-cols-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rc-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by title, class, subject…"/>
        </div>
        <select className="input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center">
            <NotebookPen className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No homework yet.</p>
          </div>
        ) : filtered.map((r) => {
          const d = daysUntil(r.due_date);
          const overdue = d != null && d < 0;
          const soon = d != null && d >= 0 && d <= 2;
          return (
            <div key={r.id} className={cn('card', !r.active && 'opacity-60')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold text-rc-900">{r.title}</p>
                    <span className="chip">{r.class?.name}</span>
                    {r.subject && <span className="chip">{r.subject.name}</span>}
                    {!r.active && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Hidden</span>}
                  </div>
                  {r.description && <p className="mt-2 text-sm leading-relaxed text-rc-700">{r.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rc-500">
                    {r.due_date && (
                      <span className={cn('inline-flex items-center gap-1', overdue && 'text-rose-700 font-semibold', soon && 'text-amber-700 font-semibold')}>
                        <Calendar size={12}/> Due {formatDate(r.due_date)}
                        {d != null && (overdue ? ` · ${Math.abs(d)} days overdue` : d === 0 ? ' · today' : d === 1 ? ' · tomorrow' : ` · in ${d} days`)}
                      </span>
                    )}
                    <span>By {r.teacher?.display_name || 'Unassigned'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => toggle(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900" title={r.active ? 'Hide' : 'Publish'}>
                    {r.active ? 'Hide' : 'Publish'}
                  </button>
                  <button onClick={() => setEditing(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><Edit3 size={14}/></button>
                  <button onClick={() => remove(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setEditing(null)}>
          <div className="flex-1 bg-rc-900/40"/>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-rc-900">{editing.id ? 'Edit homework' : 'New homework'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
            </div>
            <div className="grid gap-4">
              <F label="Title *"><input className="input" value={editing.title} onChange={(e) => setEditing({...editing, title: e.target.value})} required/></F>
              <F label="Description"><textarea className="input" rows={5} value={editing.description || ''} onChange={(e) => setEditing({...editing, description: e.target.value})} placeholder="What learners need to do; pages; due date specifics…"/></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Class *">
                  <select className="input" value={editing.class_id} onChange={(e) => setEditing({...editing, class_id: e.target.value})}>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </F>
                <F label="Subject">
                  <select className="input" value={editing.subject_id || ''} onChange={(e) => setEditing({...editing, subject_id: e.target.value})}>
                    <option value="">—</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Teacher">
                  <select className="input" value={editing.teacher_id || ''} onChange={(e) => setEditing({...editing, teacher_id: e.target.value})}>
                    <option value="">— Unassigned —</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.display_name}</option>)}
                  </select>
                </F>
                <F label="Due date"><input className="input" type="date" value={editing.due_date || ''} onChange={(e) => setEditing({...editing, due_date: e.target.value})}/></F>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({...editing, active: e.target.checked})}/>
                Active (visible to students & parents)
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
