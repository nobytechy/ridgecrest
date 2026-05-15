/**
 * TwitterFeed — tabbed live feeds from Zimbabwe's education authorities.
 * Uses Twitter's widgets.js script (loaded once, lazily). Only the active
 * timeline mounts at a time so the page stays light.
 */
import { useEffect, useRef, useState } from 'react';
import { Twitter, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const FEEDS = [
  { handle: 'MoPSEZim',       label: 'Min. of Primary Education', short: 'MoPSE',     emoji: '🇿🇼' },
  { handle: 'zimsecOFFICIAL', label: 'ZIMSEC',                    short: 'ZIMSEC',    emoji: '📋' },
  { handle: 'mhtestd',        label: 'Min. of Higher Education',  short: 'MoHTE',     emoji: '🎓' },
  { handle: 'WeArePindula',   label: 'Pindula News',              short: 'Pindula',   emoji: '📰' },
];

export default function TwitterFeed() {
  const [active, setActive] = useState(FEEDS[0].handle);
  const ref = useRef(null);

  useEffect(() => {
    if (!document.getElementById('twitter-wjs')) {
      const s = document.createElement('script');
      s.id = 'twitter-wjs';
      s.async = true;
      s.src = 'https://platform.twitter.com/widgets.js';
      document.body.appendChild(s);
    }
    const id = setTimeout(() => {
      if (window.twttr?.widgets && ref.current) {
        window.twttr.widgets.load(ref.current);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [active]);

  const activeFeed = FEEDS.find((f) => f.handle === active);

  return (
    <section className="relative overflow-hidden bg-rc-50 py-16 md:py-20">
      <div className="absolute inset-0 opacity-60" style={{
        background: 'radial-gradient(circle at 20% 20%, rgba(21,163,163,0.08), transparent 50%), radial-gradient(circle at 80% 80%, rgba(244,196,48,0.08), transparent 50%)'
      }}/>
      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
          className="mb-8 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">
            <Twitter size={11}/> Live updates
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">
            Straight from the Ministry.
          </h2>
          <p className="mt-2 text-rc-600">
            Live posts from the Ministry of Primary &amp; Secondary Education, ZIMSEC, and Zimbabwe's
            education news desks — surfaced right here so parents and learners never miss an update.
          </p>
        </motion.div>

        <div className="mb-5 flex flex-wrap gap-2">
          {FEEDS.map((f) => (
            <button
              key={f.handle}
              onClick={() => setActive(f.handle)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition',
                active === f.handle
                  ? 'bg-rc-700 text-white shadow-md'
                  : 'border border-rc-200 bg-white text-rc-700 hover:border-rc-400 hover:text-rc-900'
              )}>
              <span>{f.emoji}</span>
              <span className="hidden sm:inline">{f.label}</span>
              <span className="sm:hidden">{f.short}</span>
            </button>
          ))}
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="rounded-2xl border border-rc-200 bg-white p-3 shadow-sm md:p-4">
          <div className="mb-3 flex items-center justify-between border-b border-rc-100 px-2 pb-2">
            <p className="text-sm font-semibold text-rc-900">
              <Twitter size={14} className="-mt-1 mr-1.5 inline text-rc-500"/>
              @{active}
            </p>
            <a
              href={`https://twitter.com/${active}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-rc-600 hover:text-rc-900">
              View on X <ExternalLink size={11}/>
            </a>
          </div>
          <div ref={ref}>
            <a
              className="twitter-timeline"
              data-height="600"
              data-chrome="noheader nofooter noborders transparent"
              href={`https://twitter.com/${active}?ref_src=twsrc%5Etfw`}
            >
              Tweets by @{active}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
