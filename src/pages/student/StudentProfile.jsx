import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import PinInput from '@/components/PinInput';

export default function StudentProfile() {
  const { student, changeOwnPin } = useAuth();
  const [params] = useSearchParams();
  const forced = params.get('force') === '1' || student?.force_pin_reset;

  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (pin !== confirm) return toast.error('PINs do not match');
    if (!/^\d{4,8}$/.test(pin)) return toast.error('PIN must be 4–8 digits');
    setBusy(true);
    try { await changeOwnPin(pin); toast.success('PIN updated'); setPin(''); setConfirm(''); }
    catch (err) { toast.error(err.message || 'Could not update PIN'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-rc-900">My Profile</h1>
        <p className="mt-1 text-sm text-rc-600">Your school details and PIN.</p>
      </header>

      <div className="card">
        <h2 className="font-display text-lg font-bold text-rc-900">Details</h2>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <Row label="Student code" value={<span className="font-mono">{student?.student_code}</span>}/>
          <Row label="Full name" value={student?.display_name}/>
          <Row label="Class"     value={student?.class?.name || '—'}/>
          <Row label="Admission year" value={student?.admission_year || '—'}/>
        </div>
        <p className="mt-4 text-xs text-rc-500">To correct any of these, speak to your class teacher.</p>
      </div>

      <div className={`card ${forced ? 'border-amber-300 bg-amber-50/60' : ''}`}>
        <div className="flex items-center gap-2"><KeyRound size={18} className="text-rc-700"/>
          <h2 className="font-display text-lg font-bold text-rc-900">{forced ? 'Set a new PIN' : 'Change PIN'}</h2>
        </div>
        {forced && <p className="mt-2 text-sm text-amber-900">You&apos;re using a starter PIN. Please set your own.</p>}
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
          <div><label className="mb-1 block text-xs font-medium text-rc-600">New PIN</label>
            <PinInput value={pin} onChange={setPin} size="md" autoComplete="new-password"/></div>
          <div><label className="mb-1 block text-xs font-medium text-rc-600">Confirm</label>
            <PinInput value={confirm} onChange={setConfirm} size="md" autoComplete="new-password"/></div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="animate-spin" size={14}/> : <ShieldCheck size={14}/>} Update PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-rc-100 py-2 last:border-0">
      <span className="text-rc-500">{label}</span>
      <span className="font-semibold text-rc-900">{value}</span>
    </div>
  );
}
