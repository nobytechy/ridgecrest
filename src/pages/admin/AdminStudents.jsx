import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit3, X, GraduationCap, Loader2, KeyRound, Trash2, RefreshCw, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import PinInput from '@/components/PinInput';

const STATUS_TONE = {
  active: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-rose-100 text-rose-800',
  graduated: 'bg-blue-100 text-blue-800',
  withdrawn: 'bg-slate-200 text-slate-600',
};

const genPin = () => String(1000 + Math.floor(Math.random() * 9000));
function nextStudentCode(rows) {
  const year = new Date().getFullYear();
  const n = String((rows?.length || 0) + 1).padStart(3, '0');
  return `STU-${year}-${n}`;
}

export default function AdminStudents() {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [creating, setCreating] = useState(null);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setLoadError(null);
    try {
      const [s, c] = await Promise.all([
        supabase.from('rc_students').select('*, class:rc_classes(name)').order('display_name'),
        supabase.from('rc_classes').select('id, name, level').order('position'),
      ]);
      if (s.error) throw s.error;
      if (c.error) throw c.error;
      setRows(s.data || []);
      setClasses(c.data || []);
    } catch (e) {
      setLoadError(e.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const qq = q.toLowerCase();
    return rows.filter((r) => [r.student_code, r.display_name, r.preferred_name, r.class?.name].join(' ').toLowerCase().includes(qq));
  }, [rows, q]);

  const startCreate = () => setCreating({
    student_code: nextStudentCode(rows),
    display_name: '', preferred_name: '',
    dob: '', gender: 'M',
    current_class_id: classes[0]?.id || '',
    admission_year: new Date().getFullYear(),
    pin: genPin(),
  });

  const create = async (e) => {
    e?.preventDefault();
    if (!creating.display_name.trim()) return toast.error('Full name is required.');
    setBusy(true);
    const { error } = await supabase.rpc('rc_admin_create_student', {
      p_student_code:    creating.student_code,
      p_display_name:    creating.display_name.trim(),
      p_pin:             creating.pin,
      p_class_id:        creating.current_class_id || null,
      p_dob:             creating.dob || null,
      p_gender:          creating.gender || null,
      p_admission_year:  creating.admission_year ? Number(creating.admission_year) : null,
      p_preferred_name:  creating.preferred_name.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${creating.student_code} created · PIN ${creating.pin}`);
    setCreating(null);
    load();
  };

  const startEdit = (row) => setEditing({ ...row, current_class_id: row.current_class_id || '' });

  const saveEdit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('rc_students').update({
      display_name: editing.display_name,
      preferred_name: editing.preferred_name,
      dob: editing.dob || null,
      gender: editing.gender,
      current_class_id: editing.current_class_id || null,
      admission_year: editing.admission_year ? Number(editing.admission_year) : null,
      status: editing.status,
      notes: editing.notes,
    }).eq('id', editing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setEditing(null);
    load();
  };

  const startReset = (row) => setResetting({ ...row, new_pin: genPin(), force_pin_reset: true });
  const submitReset = async (e) => {
    e?.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc('rc_admin_reset_pin', {
      p_user_id: resetting.id, p_new_pin: resetting.new_pin, p_force_pin_reset: resetting.force_pin_reset,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${resetting.student_code} new PIN · ${resetting.new_pin}`);
    setResetting(null);
    load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete ${row.display_name} (${row.student_code})? Their marks, fee invoices, and login will be removed.`)) return;
    const { error } = await supabase.rpc('rc_admin_delete_user', { p_user_id: row.id });
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Students</h1>
          <p className="mt-1 text-sm text-rc-600">{rows.length} on roll · {rows.filter((r) => r.status === 'active').length} active.</p>
        </div>
        <button onClick={startCreate} className="btn-primary"><Plus size={14}/> Add student</button>
      </header>

      <div className="card mb-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rc-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by code, name, class…"/>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-rc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rc-50 text-left text-xs uppercase tracking-wider text-rc-500">
                <th className="px-4 py-3">Code</th><th>Name</th><th>Class</th><th>PIN</th><th>Status</th><th>Joined</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-rc-500">
                  <Loader2 className="mx-auto mb-2 animate-spin text-rc-400" size={20}/>Loading students…
                </td></tr>
              ) : loadError ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-rose-700">
                  Could not load students: {loadError}
                  <button onClick={load} className="ml-2 underline">Retry</button>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-rc-500">
                  <GraduationCap className="mx-auto mb-2 text-rc-400" size={24}/>No students yet.
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-rc-100">
                  <td className="px-4 py-3 font-mono text-xs">{r.student_code}</td>
                  <td className="font-medium">{r.display_name}</td>
                  <td>{r.class?.name || '—'}</td>
                  <td className="font-mono text-xs">{r.pin || '—'}</td>
                  <td><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[r.status])}>{r.status}</span></td>
                  <td className="text-xs text-rc-500">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startReset(r)} title="Reset PIN" className="mr-1 inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><RefreshCw size={14}/></button>
                    <button onClick={() => startEdit(r)}  title="Edit"      className="mr-1 inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><Edit3 size={14}/></button>
                    <button onClick={() => remove(r)}     title="Delete"    className="inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <Drawer title="Add student" onClose={() => setCreating(null)}>
          <form onSubmit={create} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Student code"><input className="input font-mono" value={creating.student_code} onChange={(e) => setCreating({...creating, student_code: e.target.value.toUpperCase()})}/></F>
              <F label={<span className="inline-flex items-center gap-1">PIN <KeyRound size={11}/> <button type="button" onClick={() => setCreating({...creating, pin: genPin()})} className="ml-auto text-[10px] text-rc-700 hover:underline">regenerate</button></span>}>
                <PinInput value={creating.pin} onChange={(v) => setCreating({...creating, pin: v})} size="md"/>
              </F>
            </div>
            <F label="Full name *"><input className="input" value={creating.display_name} onChange={(e) => setCreating({...creating, display_name: e.target.value})} required/></F>
            <F label="Preferred name"><input className="input" value={creating.preferred_name} onChange={(e) => setCreating({...creating, preferred_name: e.target.value})} placeholder="What teachers call them"/></F>
            <div className="grid grid-cols-3 gap-3">
              <F label="Date of birth"><input className="input" type="date" value={creating.dob} onChange={(e) => setCreating({...creating, dob: e.target.value})}/></F>
              <F label="Gender"><select className="input" value={creating.gender} onChange={(e) => setCreating({...creating, gender: e.target.value})}>
                <option value="M">Male</option><option value="F">Female</option><option value="other">Other</option>
              </select></F>
              <F label="Admission year"><input className="input" type="number" value={creating.admission_year} onChange={(e) => setCreating({...creating, admission_year: e.target.value})}/></F>
            </div>
            <F label="Class">
              <select className="input" value={creating.current_class_id} onChange={(e) => setCreating({...creating, current_class_id: e.target.value})}>
                <option value="">— Unassigned —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <div className="rounded-lg bg-rc-50 p-3 text-xs text-rc-900">
              Student signs in at <span className="font-mono">/student/login</span> using PIN <span className="font-mono font-bold">{creating.pin}</span>.
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : null} Create student</button>
            </div>
          </form>
        </Drawer>
      )}

      {editing && (
        <Drawer title="Edit student" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="grid gap-4">
            <F label="Status">
              <select className="input" value={editing.status} onChange={(e) => setEditing({...editing, status: e.target.value})}>
                {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <F label="Full name"><input className="input" value={editing.display_name} onChange={(e) => setEditing({...editing, display_name: e.target.value})}/></F>
            <F label="Preferred name"><input className="input" value={editing.preferred_name || ''} onChange={(e) => setEditing({...editing, preferred_name: e.target.value})}/></F>
            <div className="grid grid-cols-3 gap-3">
              <F label="Date of birth"><input className="input" type="date" value={editing.dob || ''} onChange={(e) => setEditing({...editing, dob: e.target.value})}/></F>
              <F label="Gender"><select className="input" value={editing.gender || 'M'} onChange={(e) => setEditing({...editing, gender: e.target.value})}>
                <option value="M">Male</option><option value="F">Female</option><option value="other">Other</option>
              </select></F>
              <F label="Admission year"><input className="input" type="number" value={editing.admission_year || ''} onChange={(e) => setEditing({...editing, admission_year: e.target.value})}/></F>
            </div>
            <F label="Class">
              <select className="input" value={editing.current_class_id || ''} onChange={(e) => setEditing({...editing, current_class_id: e.target.value})}>
                <option value="">— Unassigned —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Notes"><textarea className="input" rows={3} value={editing.notes || ''} onChange={(e) => setEditing({...editing, notes: e.target.value})}/></F>
            <p className="text-xs text-rc-500">To change the PIN, use the reset-PIN action on the row.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : null} Save</button>
            </div>
          </form>
        </Drawer>
      )}

      {resetting && (
        <Drawer title="Reset PIN" onClose={() => setResetting(null)}>
          <form onSubmit={submitReset} className="grid gap-4">
            <div className="rounded-lg bg-rc-50 p-3 text-sm text-rc-900">
              <p className="font-semibold">{resetting.display_name}</p>
              <p className="text-xs">{resetting.student_code}</p>
            </div>
            <F label={<span className="inline-flex items-center gap-1">New PIN <button type="button" onClick={() => setResetting({...resetting, new_pin: genPin()})} className="ml-auto text-[10px] text-rc-700 hover:underline">regenerate</button></span>}>
              <PinInput value={resetting.new_pin} onChange={(v) => setResetting({...resetting, new_pin: v})}/>
            </F>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={resetting.force_pin_reset} onChange={(e) => setResetting({...resetting, force_pin_reset: e.target.checked})}/>
              Force student to change PIN on next sign-in
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetting(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary"><RefreshCw size={14}/> Reset PIN</button>
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
