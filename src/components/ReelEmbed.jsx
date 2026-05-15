/**
 * ReelEmbed — reusable Facebook reel section with click-to-play lazy
 * iframe. Used twice on Home (enrolment + heritage trip).
 *
 * Props:
 *   url       — Facebook reel URL
 *   eyebrow   — small badge text above the headline
 *   headline  — main heading
 *   body      — short paragraph
 *   bullets   — array of strings (rendered as bullet list)
 *   ctaLabel  — text on the "Watch on Facebook" button
 *   tone      — "dark" | "light"   (dark = navy/teal bg with sun accents,
 *                                    light = white with subtle bg)
 *   reverse   — flip image to the left
 */
import { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ReelEmbed({
  url,
  eyebrow = 'Watch',
  headline,
  body,
  bullets = [],
  ctaLabel = 'Watch on Facebook',
  tone = 'dark',
  reverse = false,
}) {
  const [playing, setPlaying] = useState(false);
  const embedSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=380`;

  const dark = tone === 'dark';

  return (
    <section className={cn(
      'relative overflow-hidden py-16 md:py-20',
      dark ? 'bg-rc-900' : 'bg-rc-50'
    )}>
      {dark && (
        <>
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-sun-500/15 blur-3xl"/>
          <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-coral-500/15 blur-3xl"/>
        </>
      )}
      {!dark && (
        <div className="absolute inset-0 opacity-60" style={{
          background: 'radial-gradient(circle at 20% 30%, rgba(21,163,163,0.10), transparent 50%), radial-gradient(circle at 80% 70%, rgba(244,196,48,0.10), transparent 50%)'
        }}/>
      )}

      <div className={cn(
        'container-page relative z-10 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]',
        reverse && 'lg:grid-flow-dense'
      )}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
          className={cn(reverse && 'lg:col-start-2', dark ? 'text-white' : 'text-rc-900')}>
          <span className={cn(
            'mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
            dark ? 'border border-sun-500/40 bg-sun-500/10 text-sun-300'
                 : 'border border-leaf-500/40 bg-leaf-50 text-leaf-700'
          )}>
            <Sparkles size={12}/> {eyebrow}
          </span>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {headline}
          </h2>
          <p className={cn('mt-4 max-w-lg text-base leading-relaxed md:text-lg', dark ? 'text-rc-100' : 'text-rc-700')}>
            {body}
          </p>
          {bullets.length > 0 && (
            <ul className={cn('mt-6 space-y-2 text-sm', dark ? 'text-rc-200' : 'text-rc-700')}>
              {bullets.map((b, i) => <li key={i}>• {b}</li>)}
            </ul>
          )}
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className={cn(
              'mt-7 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold shadow-lg transition',
              dark ? 'bg-sun-500 text-rc-950 hover:bg-sun-600'
                   : 'bg-rc-700 text-white hover:bg-rc-800'
            )}>
            {ctaLabel} <Play size={14} fill="currentColor"/>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
          className={cn('mx-auto w-full max-w-sm', reverse && 'lg:col-start-1 lg:row-start-1')}>
          <div className={cn(
            'aspect-[9/16] overflow-hidden rounded-3xl shadow-2xl',
            dark ? 'border-4 border-white/10 bg-rc-950' : 'border-4 border-white bg-rc-900'
          )}>
            {!playing ? (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group relative grid h-full w-full place-items-center bg-gradient-to-br from-rc-700 via-rc-800 to-rc-950">
                <div className="absolute inset-0 opacity-50" style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(244,196,48,0.30), transparent 60%), radial-gradient(circle at 70% 70%, rgba(230,57,70,0.30), transparent 60%)'
                }}/>
                <div className="relative grid h-20 w-20 place-items-center rounded-full bg-white text-rc-900 shadow-xl transition group-hover:scale-110">
                  <Play size={32} className="ml-1" fill="currentColor"/>
                </div>
                <span className="absolute bottom-6 left-0 right-0 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                  Tap to play
                </span>
              </button>
            ) : (
              <iframe
                src={embedSrc}
                title={headline}
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                className="h-full w-full"
                style={{ border: 0 }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
