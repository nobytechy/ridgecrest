import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';

/* Default to /logo.png served from `public/` — drop the school's logo
   JPEG/PNG there as `logo.png` and it lights up automatically. If the
   file is missing, the colorful inline SVG fallback kicks in (sun + arc
   + grass — mirrors the actual Ridgecrest mark). */
export default function Logo({ size = 40, withText = true, className = '' }) {
  const { settings } = useSettings();
  const custom = settings?.logo_url || '/logo.png';
  const name = settings?.school_name || 'Ridgecrest Junior School';
  const motto = settings?.motto || 'Quality education · ECD A to Grade 7';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src={custom}
        alt={name}
        style={{ height: size, width: size }}
        className="rounded-lg object-contain"
        onError={(e) => {
          // Fallback to inline SVG if /logo.png is missing
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'none' }}>
        <defs>
          <radialGradient id="rc-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D"/>
            <stop offset="100%" stopColor="#F4C430"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="#ECFBFB"/>
        <path d="M10 40 Q 32 18 54 40" stroke="#2F9E5E" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <circle cx="32" cy="28" r="8" fill="url(#rc-sun)"/>
        <circle cx="22" cy="44" r="6" fill="#15A3A3"/>
        <circle cx="42" cy="44" r="6" fill="#E63946"/>
        <path d="M8 52 Q 32 60 56 52" stroke="#F4C430" strokeWidth="4" fill="none"/>
      </svg>
      {withText && (
        <div className="leading-tight">
          <p className="font-display text-base font-bold text-rc-900">{name}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-rc-600">{motto}</p>
        </div>
      )}
    </div>
  );
}
