import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit3, X, School, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function AdminClasses() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [enrolment, setEnrolment] = useState({});
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const [c, s, e] = await Promise.all([
      supabase.from('rc_classes').select('*, teacher:rc_staff!class_teacher_id(display_name, employee_id)').order('position'),
      supabase.from('rc_staff').select('id, display_name, employee_id, role_id').eq('status', 'active').in('role_id', ['teacher','headmaster','admin']).order('display_name'),
      supabase.from('rc_students').select('current_class_id'),
    ]);
    setRows(c.data || []); setStaff(s.data || []);
    const counts = {};
    for (const st of (e.data || [])) {
      if (st.current_class_id) counts[st.current_class_id] = (counts[st.current_class_id] || 0) + 1;
    }
    setEnrolment(counts);
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const qq = q.toLowerCase();
    return rows.filter((r) => [r.name, r.description, r.teacher?.display_name].join(' ').toLowerCase().includes(qq));
  }, [rows, q]);

  const startAdd = () => setEditing({
    name: '', level: 1, stream: '', class_teacher_id: '',
    capacity: 32, description: '', position: 100,
  });

  const save = async (e) => {
    e?.preventDefault();
    if (!editing.name.trim()) return toast.error('Class name is required.');
    setBusy(true);
    const payload = {
      name: editing.name.trim(),
      level: Number(editing.level || 1),
      stream: editing.stream || null,
      class_teacher_id: editing.class_teacher_id || null,
      capacity: Number(editing.capacity || 32),
      description: editing.description || null,
      position: Number(editing.position || 100),
    };
    let res;
    if (editing.id) res = await supabase.from('rc_classes').update(payload).eq('id', editing.id);
    else            res = await supabase.from('rc_classes').insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved'); setEditing(null); load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete ${row.name}? Students in this class will become unassigned.`)) return;
    const { error } = await supabase.from('rc_classes').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Classes</h1>
          <p className="mt-1 text-sm text-rc-600">{rows.length} classes on the timetable.</p>
        </div>
        <button onClick={startAdd} className="btn-primary"><Plus size={14}/> Add class</button>
      </header>

      <div className="card mb-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rc-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by name, teacher…"/>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="card text-center md:col-span-2 lg:col-span-3">
            <School className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No classes yet.</p>
          </div>
        ) : filtered.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-bold text-rc-900">{r.name}</p>
                <p className="text-xs text-rc-500">Form {r.level}{r.stream ? ` · ${r.stream}` : ''}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><Edit3 size={14}/></button>
                <button onClick={() => remove(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-rc-50 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Capacity</p>
                <p className="font-display text-lg font-bold text-rc-900">{r.capacity}</p>
              </div>
              <div className="rounded-lg bg-rc-50 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Enrolled</p>
                <p className="font-display text-lg font-bold text-rc-900">{enrolment[r.id] || 0}</p>
              </div>
              <div className="rounded-lg bg-rc-50 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Available</p>
                <p className="font-display text-lg font-bold text-rc-900">{Math.max(0, (r.capacity || 0) - (enrolment[r.id] || 0))}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-rc-600">
              Class teacher: <span className="font-semibold">{r.teacher?.display_name || '—'}</span>
            </p>
          </div>
        ))}
      </div>

      {editing && (
        <Drawer title={editing.id ? 'Edit class' : 'Add class'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="grid gap-4">
            <F label="Class name *"><input className="input" value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} placeholder="Form 1A" required/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Level (form)"><input className="input" type="number" value={editing.level} onChange={(e) => setEditing({...editing, level: e.target.value})}/></F>
              <F label="Stream"><input className="input" value={editing.stream || ''} onChange={(e) => setEditing({...editing, stream: e.target.value})} placeholder="A, B, Sciences"/></F>
            </div>
            <F label="Class teacher">
              <select className="input" value={editing.class_teacher_id || ''} onChange={(e) => setEditing({...editing, class_teacher_id: e.target.value})}>
                <option value="">— Unassigned —</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.display_name} ({s.employee_id})</option>)}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Capacity"><input className="input" type="number" value={editing.capacity} onChange={(e) => setEditing({...editing, capacity: e.target.value})}/></F>
              <F label="Sort order"><input className="input" type="number" value={editing.position} onChange={(e) => setEditing({...editing, position: e.target.value})}/></F>
            </div>
            <F label="Description"><textarea className="input" rows={2} value={editing.description || ''} onChange={(e) => setEditing({...editing, description: e.target.value})}/></F>
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
      <div onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
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
