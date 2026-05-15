/**
 * ParentChildEdit — parent can update a limited set of fields on their
 * own children's profiles (display name, preferred name, dob, gender,
 * notes). Calls rc_parent_update_child RPC which gates on the parent
 * being linked to the student.
 */
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function ParentChildEdit() {
  const { id } = useParams();
  const { parent } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!parent?.id) return;
    supabase.from('rc_students').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => setForm(data));
  }, [id, parent]);

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc('rc_parent_update_child', {
      p_student_id: id,
      p_display_name: form.display_name,
      p_preferred_name: form.preferred_name,
      p_dob: form.dob,
      p_gender: form.gender,
      p_notes: form.notes,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    nav(`/parent/children/${id}`);
  };

  if (!form) return <p className="text-rc-500">Loading…</p>;

  return (
    <div>
      <Link to={`/parent/children/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900"><ArrowLeft size={14}/> Back to child</Link>

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">Edit details</h1>
        <p className="mt-1 text-sm text-rc-600">Update {form.display_name}&apos;s personal details.</p>
      </header>

      <form onSubmit={save} className="card max-w-2xl">
        <div className="grid gap-4">
          <F label="Full name"><input className="input" value={form.display_name || ''} onChange={(e) => setForm({...form, display_name: e.target.value})}/></F>
          <F label="Preferred name"><input className="input" value={form.preferred_name || ''} onChange={(e) => setForm({...form, preferred_name: e.target.value})} placeholder="What teachers call them"/></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Date of birth"><input className="input" type="date" value={form.dob || ''} onChange={(e) => setForm({...form, dob: e.target.value})}/></F>
            <F label="Gender">
              <select className="input" value={form.gender || 'M'} onChange={(e) => setForm({...form, gender: e.target.value})}>
                <option value="M">Male</option><option value="F">Female</option><option value="other">Other</option>
              </select>
            </F>
          </div>
          <F label="Notes / allergies / anything school should know"><textarea className="input" rows={4} value={form.notes || ''} onChange={(e) => setForm({...form, notes: e.target.value})}/></F>
          <p className="rounded-lg bg-rc-50 p-3 text-xs text-rc-700">
            Class assignment, fees, and PIN are managed by the school office — contact admin to update those.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Link to={`/parent/children/${id}`} className="btn-ghost">Cancel</Link>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save</button>
        </div>
      </form>
    </div>
  );
}
function F({ label, children }) {
  return (<div><label className="mb-1 block text-xs font-medium text-rc-600">{label}</label>{children}</div>);
}
