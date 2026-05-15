import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';

export default function Logo({ size = 40, withText = true, className = '' }) {
  const { settings } = useSettings();
  const custom = settings?.logo_url;
  const name = settings?.school_name || 'Ridgecrest';
  const motto = settings?.motto || 'Wisdom · Discipline · Excellence';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {custom ? (
        <img src={custom} alt={name} style={{ height: size, width: size }} className="rounded-lg object-contain"/>
      ) : (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <linearGradient id="rc-logo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3F3F46"/>
              <stop offset="100%" stopColor="#09090B"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#rc-logo)"/>
          {/* Stylised crest — open book + flame */}
          <path d="M14 38 L32 28 L50 38 L50 52 L14 52 Z" fill="#FAFAFA" opacity="0.97"/>
          <path d="M32 28 L32 52" stroke="#3F3F46" strokeWidth="1.5"/>
          <path d="M32 22 C 28 18, 28 13, 32 9 C 36 13, 36 18, 32 22 Z" fill="#FAFAFA" opacity="0.95"/>
        </svg>
      )}
      {withText && (
        <div className="leading-tight">
          <p className="font-display text-base font-bold text-rc-900">{name}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-rc-600">{motto}</p>
        </div>
      )}
    </div>
  );
}
