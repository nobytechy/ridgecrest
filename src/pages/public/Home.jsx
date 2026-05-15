import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, GraduationCap, Users, Award, BookOpen, Calendar, Megaphone, Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatDate } from '@/lib/format';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&auto=format&fit=crop&q=80',
];

const VALUES = [
  { icon: GraduationCap, title: 'Every child known by name', body: 'Small classes, attentive teachers, individual academic plans.' },
  { icon: BookOpen,      title: 'Cambridge + ZIMSEC',       body: 'Dual-board preparation gives our learners options beyond Form 4.' },
  { icon: Users,         title: 'Pastoral care first',      body: 'A house system, weekly mentor meetings, and a school counsellor on call.' },
  { icon: Award,         title: '40+ years of excellence',  body: 'Founded in 1982. Generations of Ridgecrest alumni across Zimbabwe and abroad.' },
];

export default function Home() {
  const { settings, currentTerm } = useSettings();
  const [active, setActive] = useState(0);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % HERO_IMAGES.length), 7000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    supabase.from('rc_announcements')
      .select('*').eq('active', true).in('audience', ['public', 'all'])
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setAnnouncements(data || []));
  }, []);

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="relative min-h-[640px] overflow-hidden bg-rc-950 md:min-h-[720px]">
        {HERO_IMAGES.map((url, i) => (
          <motion.div key={url}
            initial={false}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1.08 : 1 }}
            transition={{ opacity: { duration: 1.5 }, scale: { duration: 8.5, ease: 'linear' } }}
            className="absolute inset-0">
            <img src={url} alt="" aria-hidden="true" className="h-full w-full object-cover"/>
          </motion.div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-rc-950/95 via-rc-900/80 to-rc-700/40"/>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-rc-950/80 via-rc-950/20 to-transparent"/>

        <div className="container-page relative z-10 grid items-center gap-10 py-20 md:py-28">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-white max-w-3xl">
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.18em] backdrop-blur">
              <Sparkles size={12} className="text-rc-300"/> Independent school · Founded {settings?.founded_year || 1982}
            </span>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
              {settings?.hero_headline || 'A learning home for tomorrow\'s leaders.'}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-rc-100 md:text-lg" style={{ textShadow: '0 1px 20px rgba(0,0,0,0.5)' }}>
              {settings?.hero_subhead || 'Tradition, discipline, and modern teaching — every child known by name.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/admissions" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-rc-900 shadow-lg hover:bg-rc-50">
                Apply for admission <ArrowRight size={16}/>
              </Link>
              <Link to="/about" className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
                About the school
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust stats */}
      <section className="border-b border-rc-100 bg-white py-6">
        <div className="container-page">
          <div className="grid grid-cols-2 items-center gap-6 md:grid-cols-4">
            {[
              { v: '40+',     l: 'Years of excellence' },
              { v: '600+',    l: 'Learners enrolled' },
              { v: '50+',     l: 'Qualified educators' },
              { v: 'Cambridge', l: '& ZIMSEC examinations' },
            ].map((s) => (
              <div key={s.l} className="text-center md:text-left">
                <p className="font-display text-2xl font-bold tracking-tight text-rc-900 md:text-3xl">{s.v}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-rc-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container-page py-16 md:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">What sets us apart</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">
            More than a school. A learning home.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-rc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-rc-100 text-rc-900"><Icon size={20}/></div>
              <h3 className="font-display text-lg font-bold text-rc-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-rc-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Current term + announcements */}
      <section className="bg-rc-50 py-16 md:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">This term</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">
              {currentTerm?.name || 'Term in progress'}
            </h2>
            {currentTerm && (
              <p className="mt-3 text-rc-600">
                <Calendar className="-mt-0.5 mr-1.5 inline" size={14}/>
                {formatDate(currentTerm.start_date)} → {formatDate(currentTerm.end_date)}
              </p>
            )}
            <div className="mt-6 grid gap-3">
              <Link to="/student/login" className="inline-flex items-center justify-between rounded-xl border border-rc-200 bg-white p-4 text-sm transition hover:border-rc-400">
                <span className="inline-flex items-center gap-3"><GraduationCap size={18} className="text-rc-700"/> Student portal — marks, fees, profile</span>
                <ArrowRight size={14} className="text-rc-400"/>
              </Link>
              <Link to="/parent/login" className="inline-flex items-center justify-between rounded-xl border border-rc-200 bg-white p-4 text-sm transition hover:border-rc-400">
                <span className="inline-flex items-center gap-3"><Users size={18} className="text-rc-700"/> Parent portal — all my children, in one place</span>
                <ArrowRight size={14} className="text-rc-400"/>
              </Link>
              <Link to="/admin/login" className="inline-flex items-center justify-between rounded-xl border border-rc-200 bg-white p-4 text-sm transition hover:border-rc-400">
                <span className="inline-flex items-center gap-3"><Sparkles size={18} className="text-rc-700"/> Staff / Admin portal</span>
                <ArrowRight size={14} className="text-rc-400"/>
              </Link>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Megaphone size={16} className="text-rc-700"/>
              <h3 className="font-display text-lg font-bold text-rc-900">Latest news</h3>
            </div>
            {announcements.length === 0 ? (
              <p className="rounded-xl border border-dashed border-rc-300 bg-white p-6 text-sm text-rc-500">No announcements at the moment.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="rounded-xl border border-rc-200 bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">{formatDate(a.created_at)}</p>
                    <p className="mt-1 font-display text-base font-bold text-rc-900">{a.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-rc-600">{a.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16 md:py-20">
        <div className="rounded-3xl border border-rc-200 bg-gradient-to-br from-rc-900 to-rc-950 p-10 text-white md:p-14">
          <div className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Considering Ridgecrest for your child?
              </h2>
              <p className="mt-3 max-w-xl text-rc-200">
                Applications for the next intake are open. Book a school visit, meet the headmaster, and see classrooms in session.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link to="/admissions" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-rc-900 hover:bg-rc-50">
                How to apply <ArrowRight size={16}/>
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 text-sm text-rc-200 hover:text-white">
                Book a school visit →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
