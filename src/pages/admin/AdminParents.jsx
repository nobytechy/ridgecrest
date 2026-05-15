import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit3, X, Users, Loader2, KeyRound, Trash2, RefreshCw, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import PinInput from '@/components/PinInput';

const STATUS_TONE = {
  active: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-rose-100 text-rose-800',
  past: 'bg-slate-200 text-slate-600',
};

const genPin = () => String(1000 + Math.floor(Math.random() * 9000));
function nextParentCode(rows) {
  const year = new Date().getFullYear();
  const n = String((rows?.length || 0) + 1).padStart(3, '0');
  return `PAR-${year}-${n}`;
}

export default function AdminParents() {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [links, setLinks] = useState({});  // parent_id → [{student_code, display_name}]
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(null);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [linking, setLinking] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, s, l] = await Promise.all([
      supabase.from('rc_parents').select('*').order('display_name'),
      supabase.from('rc_students').select('id, student_code, display_name, class:rc_classes(name)').order('display_name'),
      supabase.from('rc_student_parents').select('parent_id, is_primary, student:rc_students(id, student_code, display_name)'),
    ]);
    setRows(p.data || []);
    setStudents(s.data || []);
    const map = {};
    for (const row of (l.data || [])) {
      (map[row.parent_id] ||= []).push({ ...row.student, is_primary: row.is_primary });
    }
    setLinks(map);
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const qq = q.toLowerCase();
    return rows.filter((r) => [r.parent_code, r.display_name, r.phone, r.email].join(' ').toLowerCase().includes(qq));
  }, [rows, q]);

  const startCreate = () => setCreating({
    parent_code: nextParentCode(rows), display_name: '',
    phone: '', whatsapp_phone: '', email: '', id_number: '',
    relationship: 'Father', pin: genPin(),
  });

  const create = async (e) => {
    e?.preventDefault();
    if (!creating.display_name.trim() || !creating.phone.trim()) return toast.error('Name and phone are required.');
    setBusy(true);
    const { error } = await supabase.rpc('rc_admin_create_parent', {
      p_parent_code:    creating.parent_code,
      p_display_name:   creating.display_name.trim(),
      p_pin:            creating.pin,
      p_phone:          creating.phone.trim(),
      p_whatsapp_phone: creating.whatsapp_phone.trim() || null,
      p_email:          creating.email.trim() || null,
      p_id_number:      creating.id_number.trim() || null,
      p_relationship:   creating.relationship,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${creating.parent_code} created · PIN ${creating.pin}`);
    setCreating(null);
    load();
  };

  const startEdit = (row) => setEditing({ ...row });

  const saveEdit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('rc_parents').update({
      display_name: editing.display_name,
      phone: editing.phone,
      whatsapp_phone: editing.whatsapp_phone,
      email: editing.email,
      id_number: editing.id_number,
      relationship: editing.relationship,
      status: editing.status,
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
    toast.success(`${resetting.parent_code} new PIN · ${resetting.new_pin}`);
    setResetting(null);
    load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete ${row.display_name}? Their portal access will be removed.`)) return;
    const { error } = await supabase.rpc('rc_admin_delete_user', { p_user_id: row.id });
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const startLink = (row) => setLinking({ parent: row, student_id: '', is_primary: false });

  const submitLink = async (e) => {
    e?.preventDefault();
    if (!linking.student_id) return toast.error('Pick a student to link.');
    const { error } = await supabase.rpc('rc_admin_link_parent_child', {
      p_parent_id: linking.parent.id, p_student_id: linking.student_id, p_is_primary: linking.is_primary,
    });
    if (error) return toast.error(error.message);
    toast.success('Linked');
    setLinking(null);
    load();
  };

  const unlink = async (parentId, studentId) => {
    if (!confirm('Unlink this child from this parent?')) return;
    const { error } = await supabase.from('rc_student_parents').delete().eq('parent_id', parentId).eq('student_id', studentId);
    if (error) return toast.error(error.message);
    toast.success('Unlinked');
    load();
  };

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Parents</h1>
          <p className="mt-1 text-sm text-rc-600">{rows.length} on file · {rows.filter((r) => r.status === 'active').length} active.</p>
        </div>
        <button onClick={startCreate} className="btn-primary"><Plus size={14}/> Add parent</button>
      </header>

      <div className="card mb-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rc-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by code, name, phone…"/>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center">
            <Users className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No parents yet.</p>
          </div>
        ) : filtered.map((r) => (
          <div key={r.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-bold text-rc-900">{r.display_name}</p>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[r.status])}>{r.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-rc-500">{r.parent_code} · {r.relationship || 'Guardian'} · PIN <span className="font-mono">{r.pin}</span></p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rc-600">
                  {r.phone && <span>📞 {r.phone}</span>}
                  {r.email && <span>✉ {r.email}</span>}
                  {r.id_number && <span>ID {r.id_number}</span>}
                </div>
                {(links[r.id] || []).length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Children:</span>
                    {links[r.id].map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-rc-100 px-2.5 py-0.5 text-xs">
                        {c.display_name}{c.is_primary && <span className="text-[9px] font-semibold uppercase tracking-wider text-rc-700">primary</span>}
                        <button onClick={() => unlink(r.id, c.id)} className="ml-1 text-rc-400 hover:text-rose-700"><X size={11}/></button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-amber-700">No children linked yet — click <strong>Link child</strong> to attach one.</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button onClick={() => startLink(r)} className="btn-secondary text-xs"><Link2 size={12}/> Link child</button>
                <button onClick={() => startReset(r)} className="btn-ghost text-xs"><RefreshCw size={12}/> Reset PIN</button>
                <button onClick={() => startEdit(r)}  className="btn-ghost text-xs"><Edit3 size={12}/> Edit</button>
                <button onClick={() => remove(r)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
                  <Trash2 size={12}/> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <Drawer title="Add parent" onClose={() => setCreating(null)}>
          <form onSubmit={create} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Parent code"><input className="input font-mono" value={creating.parent_code} onChange={(e) => setCreating({...creating, parent_code: e.target.value.toUpperCase()})}/></F>
              <F label={<span className="inline-flex items-center gap-1">PIN <KeyRound size={11}/> <button type="button" onClick={() => setCreating({...creating, pin: genPin()})} className="ml-auto text-[10px] text-rc-700 hover:underline">regenerate</button></span>}>
                <PinInput value={creating.pin} onChange={(v) => setCreating({...creating, pin: v})} size="md"/>
              </F>
            </div>
            <F label="Full name *"><input className="input" value={creating.display_name} onChange={(e) => setCreating({...creating, display_name: e.target.value})} required/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Relationship">
                <select className="input" value={creating.relationship} onChange={(e) => setCreating({...creating, relationship: e.target.value})}>
                  <option>Father</option><option>Mother</option><option>Guardian</option><option>Grandparent</option><option>Aunt/Uncle</option>
                </select>
              </F>
              <F label="National ID"><input className="input" value={creating.id_number} onChange={(e) => setCreating({...creating, id_number: e.target.value})}/></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Phone *"><input className="input" value={creating.phone} onChange={(e) => setCreating({...creating, phone: e.target.value})} required/></F>
              <F label="WhatsApp"><input className="input" value={creating.whatsapp_phone} onChange={(e) => setCreating({...creating, whatsapp_phone: e.target.value})}/></F>
            </div>
            <F label="Email"><input className="input" type="email" value={creating.email} onChange={(e) => setCreating({...creating, email: e.target.value})}/></F>
            <div className="rounded-lg bg-rc-50 p-3 text-xs text-rc-900">
              Parent signs in at <span className="font-mono">/parent/login</span> using PIN <span className="font-mono font-bold">{creating.pin}</span>.
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : null} Create parent</button>
            </div>
          </form>
        </Drawer>
      )}

      {editing && (
        <Drawer title="Edit parent" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="grid gap-4">
            <F label="Status">
              <select className="input" value={editing.status} onChange={(e) => setEditing({...editing, status: e.target.value})}>
                {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <F label="Full name"><input className="input" value={editing.display_name} onChange={(e) => setEditing({...editing, display_name: e.target.value})}/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Phone"><input className="input" value={editing.phone || ''} onChange={(e) => setEditing({...editing, phone: e.target.value})}/></F>
              <F label="WhatsApp"><input className="input" value={editing.whatsapp_phone || ''} onChange={(e) => setEditing({...editing, whatsapp_phone: e.target.value})}/></F>
            </div>
            <F label="Email"><input className="input" type="email" value={editing.email || ''} onChange={(e) => setEditing({...editing, email: e.target.value})}/></F>
            <F label="National ID"><input className="input" value={editing.id_number || ''} onChange={(e) => setEditing({...editing, id_number: e.target.value})}/></F>
            <F label="Relationship">
              <select className="input" value={editing.relationship || 'Guardian'} onChange={(e) => setEditing({...editing, relationship: e.target.value})}>
                <option>Father</option><option>Mother</option><option>Guardian</option><option>Grandparent</option><option>Aunt/Uncle</option>
              </select>
            </F>
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
              <p className="text-xs">{resetting.parent_code}</p>
            </div>
            <F label={<span className="inline-flex items-center gap-1">New PIN <button type="button" onClick={() => setResetting({...resetting, new_pin: genPin()})} className="ml-auto text-[10px] text-rc-700 hover:underline">regenerate</button></span>}>
              <PinInput value={resetting.new_pin} onChange={(v) => setResetting({...resetting, new_pin: v})}/>
            </F>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={resetting.force_pin_reset} onChange={(e) => setResetting({...resetting, force_pin_reset: e.target.checked})}/>
              Force parent to change PIN on next sign-in
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetting(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary"><RefreshCw size={14}/> Reset PIN</button>
            </div>
          </form>
        </Drawer>
      )}

      {linking && (
        <Drawer title={`Link child to ${linking.parent.display_name}`} onClose={() => setLinking(null)}>
          <form onSubmit={submitLink} className="grid gap-4">
            <F label="Pick student">
              <select className="input" value={linking.student_id} onChange={(e) => setLinking({...linking, student_id: e.target.value})}>
                <option value="">—</option>
                {students
                  .filter((s) => !(links[linking.parent.id] || []).some((c) => c.id === s.id))
                  .map((s) => <option key={s.id} value={s.id}>{s.student_code} · {s.display_name} ({s.class?.name || 'Unassigned'})</option>)}
              </select>
            </F>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={linking.is_primary} onChange={(e) => setLinking({...linking, is_primary: e.target.checked})}/>
              Mark as primary contact for this child
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setLinking(null)} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary"><Link2 size={14}/> Link</button>
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
