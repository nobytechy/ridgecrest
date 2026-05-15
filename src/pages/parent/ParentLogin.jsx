import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import PinInput from '@/components/PinInput';

export default function ParentLogin() {
  const { signInParent } = useAuth();
  const nav = useNavigate();
  const [pin, setPin]   = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (pin.length < 4) return toast.error('PIN must be at least 4 digits.');
    setBusy(true);
    try { await signInParent(pin, code.trim()); toast.success('Welcome'); nav('/parent'); }
    catch (err) { toast.error(err.message || 'Login failed'); setPin(''); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-rc-100 to-white p-4">
      <div className="w-full max-w-md">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900"><ArrowLeft size={14}/> Back to public site</a>
        <div className="rounded-2xl border border-rc-200 bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo size={48} withText={false}/>
            <div>
              <h1 className="font-display text-xl font-bold text-rc-900">Parent portal</h1>
              <p className="mt-1 text-sm text-rc-500">Sign in to see your children&apos;s school life.</p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div><label className="mb-1 block text-xs font-medium uppercase tracking-wider text-rc-500">PIN</label>
              <PinInput value={pin} onChange={setPin} autoFocus/></div>
            <div>
              <button type="button" onClick={() => setShowCode((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-rc-500 hover:text-rc-900">
                <ChevronDown size={14} className={`transition-transform ${showCode ? 'rotate-180' : ''}`}/>
                Use parent code instead
              </button>
              {showCode && (
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="input mt-2 font-mono" placeholder="PAR-2026-001 (optional)"/>
              )}
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
              {busy ? <Loader2 className="animate-spin" size={16}/> : <Lock size={16}/>}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 rounded-lg bg-rc-50 p-3 text-center text-xs text-rc-800">
            <p className="font-semibold">Demo parent PIN</p>
            <p className="mt-1 font-mono"><strong>3344</strong> · Mr. T. Mukamuri (2 children)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
