import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit3, X, Users2, Loader2, KeyRound, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import PinInput from '@/components/PinInput';

const STATUS_TONE = {
  active: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-rose-100 text-rose-800',
  left: 'bg-slate-200 text-slate-600',
};
const genPin = () => String(1000 + Math.floor(Math.random() * 9000));
function nextEmpId(rows) {
  const n = String((rows?.length || 0) + 1).padStart(3, '0');
  return `EMP-${n}`;
}

export default function AdminStaff() {
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(null);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const [s, r] = await Promise.all([
      supabase.from('rc_staff').select('*, role:rc_roles(*)').order('display_name'),
      supabase.from('rc_roles').select('*').order('name'),
    ]);
    setRows(s.data || []); setRoles(r.data || []);
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const qq = q.toLowerCase();
    return rows.filter((r) => [r.employee_id, r.display_name, r.role?.name, r.phone].join(' ').toLowerCase().includes(qq));
  }, [rows, q]);

  const startCreate = () => setCreating({
    employee_id: nextEmpId(rows), display_name: '',
    role_id: 'teacher', phone: '', email: '', pin: genPin(),
  });

  const create = async (e) => {
    e?.preventDefault();
    if (!creating.display_name.trim()) return toast.error('Name is required.');
    setBusy(true);
    const { error } = await supabase.rpc('rc_admin_create_staff', {
      p_employee_id: creating.employee_id,
      p_display_name: creating.display_name.trim(),
      p_role_id: creating.role_id,
      p_pin: creating.pin,
      p_phone: creating.phone.trim() || null,
      p_email: creating.email.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${creating.employee_id} created · PIN ${creating.pin}`);
    setCreating(null); load();
  };

  const startEdit = (row) => setEditing({ ...row });

  const saveEdit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('rc_staff').update({
      display_name: editing.display_name,
      role_id: editing.role_id,
      phone: editing.phone,
      email: editing.email,
      status: editing.status,
    }).eq('id', editing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Saved'); setEditing(null); load();
  };

  const startReset = (row) => setResetting({ ...row, new_pin: genPin() });
  const submitReset = async (e) => {
    e?.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc('rc_admin_reset_pin', {
      p_user_id: resetting.id, p_new_pin: resetting.new_pin, p_force_pin_reset: false,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${resetting.employee_id} new PIN · ${resetting.new_pin}`);
    setResetting(null); load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete ${row.display_name} (${row.employee_id})?`)) return;
    const { error } = await supabase.rpc('rc_admin_delete_user', { p_user_id: row.id });
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Staff</h1>
          <p className="mt-1 text-sm text-rc-600">{rows.length} on payroll · {rows.filter((r) => r.status === 'active').length} active.</p>
        </div>
        <button onClick={startCreate} className="btn-primary"><Plus size={14}/> Add staff</button>
      </header>

      <div className="card mb-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rc-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by code, name, role…"/>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-rc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rc-50 text-left text-xs uppercase tracking-wider text-rc-500">
                <th className="px-4 py-3">Code</th><th>Name</th><th>Role</th><th>Phone</th><th>PIN</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-rc-500">
                  <Users2 className="mx-auto mb-2 text-rc-400" size={24}/>No staff yet.
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-rc-100">
                  <td className="px-4 py-3 font-mono text-xs">{r.employee_id}</td>
                  <td className="font-medium">{r.display_name}</td>
                  <td>{r.role?.name}</td>
                  <td>{r.phone || '—'}</td>
                  <td className="font-mono text-xs">{r.pin || '—'}</td>
                  <td><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[r.status])}>{r.status}</span></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startReset(r)} title="Reset PIN" className="mr-1 inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><RefreshCw size={14}/></button>
                    <button onClick={() => startEdit(r)} title="Edit" className="mr-1 inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><Edit3 size={14}/></button>
                    <button onClick={() => remove(r)} title="Delete" className="inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <Drawer title="Add staff" onClose={() => setCreating(null)}>
          <form onSubmit={create} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Employee ID"><input className="input font-mono" value={creating.employee_id} onChange={(e) => setCreating({...creating, employee_id: e.target.value.toUpperCase()})}/></F>
              <F label={<span className="inline-flex items-center gap-1">PIN <KeyRound size={11}/> <button type="button" onClick={() => setCreating({...creating, pin: genPin()})} className="ml-auto text-[10px] text-rc-700 hover:underline">regenerate</button></span>}>
                <PinInput value={creating.pin} onChange={(v) => setCreating({...creating, pin: v})} size="md"/>
              </F>
            </div>
            <F label="Full name *"><input className="input" value={creating.display_name} onChange={(e) => setCreating({...creating, display_name: e.target.value})} required/></F>
            <F label="Role">
              <select className="input" value={creating.role_id} onChange={(e) => setCreating({...creating, role_id: e.target.value})}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Phone"><input className="input" value={creating.phone} onChange={(e) => setCreating({...creating, phone: e.target.value})}/></F>
              <F label="Email"><input className="input" type="email" value={creating.email} onChange={(e) => setCreating({...creating, email: e.target.value})}/></F>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : null} Create staff</button>
            </div>
          </form>
        </Drawer>
      )}

      {editing && (
        <Drawer title="Edit staff" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="grid gap-4">
            <F label="Status">
              <select className="input" value={editing.status} onChange={(e) => setEditing({...editing, status: e.target.value})}>
                {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <F label="Full name"><input className="input" value={editing.display_name} onChange={(e) => setEditing({...editing, display_name: e.target.value})}/></F>
            <F label="Role">
              <select className="input" value={editing.role_id} onChange={(e) => setEditing({...editing, role_id: e.target.value})}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Phone"><input className="input" value={editing.phone || ''} onChange={(e) => setEditing({...editing, phone: e.target.value})}/></F>
              <F label="Email"><input className="input" type="email" value={editing.email || ''} onChange={(e) => setEditing({...editing, email: e.target.value})}/></F>
            </div>
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
              <p className="text-xs">{resetting.employee_id}</p>
            </div>
            <F label={<span className="inline-flex items-center gap-1">New PIN <button type="button" onClick={() => setResetting({...resetting, new_pin: genPin()})} className="ml-auto text-[10px] text-rc-700 hover:underline">regenerate</button></span>}>
              <PinInput value={resetting.new_pin} onChange={(v) => setResetting({...resetting, new_pin: v})}/>
            </F>
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
