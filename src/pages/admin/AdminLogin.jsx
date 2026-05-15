import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Delete, ArrowLeft, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import PinInput from '@/components/PinInput';

export default function AdminLogin() {
  const { signInStaff } = useAuth();
  const nav = useNavigate();
  const [pin, setPin]               = useState('');
  const [empId, setEmpId]           = useState('');
  const [showEmpId, setShowEmpId]   = useState(false);
  const [busy, setBusy]             = useState(false);

  const press = (k) => {
    if (busy) return;
    if (k === 'del')   { setPin((p) => p.slice(0, -1)); return; }
    if (k === 'clear') { setPin(''); return; }
    if (pin.length < 8) setPin((p) => p + k);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (pin.length < 4) return toast.error('PIN must be at least 4 digits.');
    setBusy(true);
    try {
      await signInStaff(pin, empId.trim());
      toast.success('Welcome back');
      nav('/admin');
    } catch (err) {
      toast.error(err.message || 'Login failed');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-rc-50 to-rc-100 p-4">
      <div className="w-full max-w-md">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900">
          <ArrowLeft size={14}/> Back to public site
        </a>
        <div className="rounded-2xl border border-rc-200 bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo size={48} withText={false}/>
            <div>
              <h1 className="font-display text-xl font-bold text-rc-900">Staff sign in</h1>
              <p className="mt-1 text-sm text-rc-500">Enter your PIN to continue.</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-rc-500">PIN</label>
              <PinInput value={pin} onChange={setPin} autoFocus/>
            </div>
            <div>
              <button type="button" onClick={() => setShowEmpId((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-rc-500 hover:text-rc-900">
                <ChevronDown size={14} className={`transition-transform ${showEmpId ? 'rotate-180' : ''}`}/>
                Use Employee ID instead
              </button>
              {showEmpId && (
                <input value={empId} onChange={(e) => setEmpId(e.target.value.toUpperCase())} className="input mt-2 font-mono" placeholder="EMP-001 (optional)" autoComplete="username"/>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:hidden">
              {[1,2,3,4,5,6,7,8,9].map((n) => (
                <button key={n} type="button" onClick={() => press(String(n))} className="h-14 rounded-lg border border-rc-200 bg-white text-2xl font-semibold text-rc-700 hover:bg-rc-50">{n}</button>
              ))}
              <button type="button" onClick={() => press('clear')} className="h-14 rounded-lg border border-rc-200 bg-white text-xs font-semibold text-rc-500 hover:bg-rc-50">CLR</button>
              <button type="button" onClick={() => press('0')}     className="h-14 rounded-lg border border-rc-200 bg-white text-2xl font-semibold text-rc-700 hover:bg-rc-50">0</button>
              <button type="button" onClick={() => press('del')}   className="h-14 rounded-lg border border-rc-200 bg-white text-rc-500 hover:bg-rc-50"><Delete className="mx-auto" size={20}/></button>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
              {busy ? <Loader2 className="animate-spin" size={16}/> : <Lock size={16}/>}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-rc-50 p-3 text-center text-xs text-rc-800">
            <p className="font-semibold">Demo PIN</p>
            <p className="mt-1 font-mono"><strong>1975</strong> · admin (EMP-001)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
