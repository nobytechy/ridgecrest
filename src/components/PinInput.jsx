import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PinInput({
  value, onChange,
  autoFocus = false, placeholder = '••••', maxLength = 8,
  size = 'lg', className = '',
  autoComplete = 'current-password',
}) {
  const [shown, setShown] = useState(false);
  const sizeCls = size === 'lg'
    ? 'text-center font-mono text-2xl tracking-[1em]'
    : 'font-mono text-lg tracking-[0.4em] text-center';
  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength))}
        className={cn('input pr-11', sizeCls, className)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        tabIndex={-1}
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-rc-400 transition hover:bg-rc-100 hover:text-rc-700"
        aria-label={shown ? 'Hide PIN' : 'Show PIN'}
      >
        {shown ? <EyeOff size={16}/> : <Eye size={16}/>}
      </button>
    </div>
  );
}
