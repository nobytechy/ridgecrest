/**
 * GradientBackdrop — animated grey/slate ambient backdrop for white
 * marketing sections. Drifting blobs + a slow shimmer band. GPU-only.
 */
const KEYFRAMES = `
  @keyframes rc-wave-1 { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(80px,-50px) scale(1.18);} }
  @keyframes rc-wave-2 { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(-70px,70px) scale(1.22);} }
  @keyframes rc-wave-3 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(60px,-80px);} }
  @keyframes rc-band-pulse { 0%,100% { opacity: 0.55;} 50% { opacity: 1;} }
  @keyframes rc-shine-sweep {
    0% { transform: translateX(-100%) skewX(-20deg); opacity: 0; }
    10% { opacity: 1; } 90% { opacity: 1; }
    100% { transform: translateX(120%) skewX(-20deg); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rc-blob-1,.rc-blob-2,.rc-blob-3,.rc-band,.rc-shine { animation: none !important; }
  }
`;
export default function GradientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <style>{KEYFRAMES}</style>
      <div className="absolute inset-0 bg-gradient-to-br from-rc-50/60 via-white to-rc-100/30"/>
      <div className="rc-blob-1 absolute -left-44 -top-44 h-[640px] w-[640px] rounded-full blur-3xl"
           style={{ background: 'radial-gradient(circle, rgba(63,63,70,0.20), transparent 70%)', animation: 'rc-wave-1 22s ease-in-out infinite' }}/>
      <div className="rc-blob-2 absolute -right-32 top-1/4 h-[600px] w-[600px] rounded-full blur-3xl"
           style={{ background: 'radial-gradient(circle, rgba(82,82,91,0.18), transparent 70%)', animation: 'rc-wave-2 28s ease-in-out infinite' }}/>
      <div className="rc-blob-3 absolute -bottom-40 left-1/4 h-[520px] w-[520px] rounded-full blur-3xl"
           style={{ background: 'radial-gradient(circle, rgba(39,39,42,0.12), transparent 70%)', animation: 'rc-wave-3 32s ease-in-out infinite' }}/>
      <div className="rc-band absolute inset-0"
           style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(63,63,70,0.10) 50%, transparent 70%)', animation: 'rc-band-pulse 6s ease-in-out infinite' }}/>
      <div className="rc-shine absolute -inset-y-20 left-0 w-[40%]"
           style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 40%, rgba(244,244,245,0.55) 50%, rgba(255,255,255,0.45) 60%, transparent 100%)', mixBlendMode: 'screen', animation: 'rc-shine-sweep 9s ease-in-out infinite' }}/>
    </div>
  );
}
