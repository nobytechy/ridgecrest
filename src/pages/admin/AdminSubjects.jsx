import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit3, X, BookOpen, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function AdminSubjects() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('rc_subjects').select('*').order('position');
    setRows(data || []);
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const qq = q.toLowerCase();
    return rows.filter((r) => [r.code, r.name, r.description].join(' ').toLowerCase().includes(qq));
  }, [rows, q]);

  const startAdd = () => setEditing({ code: '', name: '', description: '', is_core: true, position: 100 });

  const save = async (e) => {
    e?.preventDefault();
    if (!editing.code.trim() || !editing.name.trim()) return toast.error('Code and name are required.');
    setBusy(true);
    const payload = {
      code: editing.code.toUpperCase().trim(),
      name: editing.name.trim(),
      description: editing.description || null,
      is_core: !!editing.is_core,
      position: Number(editing.position || 100),
    };
    let res;
    if (editing.id) res = await supabase.from('rc_subjects').update(payload).eq('id', editing.id);
    else            res = await supabase.from('rc_subjects').insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved'); setEditing(null); load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete subject ${row.name}? Marks recorded against it will be removed.`)) return;
    const { error } = await supabase.from('rc_subjects').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Subjects</h1>
          <p className="mt-1 text-sm text-rc-600">{rows.length} subjects · {rows.filter((r) => r.is_core).length} core.</p>
        </div>
        <button onClick={startAdd} className="btn-primary"><Plus size={14}/> Add subject</button>
      </header>

      <div className="card mb-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rc-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by code, name…"/>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-rc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rc-50 text-left text-xs uppercase tracking-wider text-rc-500">
                <th className="px-4 py-3">Code</th><th>Name</th><th>Type</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-sm text-rc-500"><BookOpen className="mx-auto mb-2 text-rc-400" size={24}/>No subjects yet.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-rc-100">
                  <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.is_core ? <span className="chip">Core</span> : <span className="rounded-full bg-rc-100 px-2 py-0.5 text-[10px] font-semibold text-rc-700">Elective</span>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="mr-1 inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><Edit3 size={14}/></button>
                    <button onClick={() => remove(r)} className="inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Drawer title={editing.id ? 'Edit subject' : 'Add subject'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Code *"><input className="input font-mono" value={editing.code} onChange={(e) => setEditing({...editing, code: e.target.value.toUpperCase()})} required/></F>
              <F label="Sort order"><input className="input" type="number" value={editing.position} onChange={(e) => setEditing({...editing, position: e.target.value})}/></F>
            </div>
            <F label="Name *"><input className="input" value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} required/></F>
            <F label="Description"><textarea className="input" rows={2} value={editing.description || ''} onChange={(e) => setEditing({...editing, description: e.target.value})}/></F>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.is_core} onChange={(e) => setEditing({...editing, is_core: e.target.checked})}/>
              Core subject (every learner takes it)
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : null} Save</button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}

function Drawer({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-rc-900/40"/>
      <div onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-rc-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function F({ label, children }) {
  return (<div><label className="mb-1 block text-xs font-medium text-rc-600">{label}</label>{children}</div>);
}
