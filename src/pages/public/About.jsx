import { motion } from 'framer-motion';
import { Award, Heart, Users, Quote, BookOpen, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';

const MILESTONES = [
  { year: '1982',  title: 'Founded',                body: 'Ridgecrest opens its doors with 47 learners in a converted residential property in Borrowdale.' },
  { year: '1995',  title: 'First A-level cohort',   body: 'Senior school launches; the first A-level class sits Cambridge papers.' },
  { year: '2008',  title: 'Sports complex opens',   body: 'Multi-purpose sports complex with hockey pitch, swimming pool, and indoor courts.' },
  { year: '2018',  title: 'ICT lab refresh',        body: 'School-wide WiFi, two computer labs, and 1:1 device programme from Form 3 onward.' },
  { year: 'Today', title: '600+ learners',          body: 'Three streams per form, 50+ teachers, and a Cambridge/ZIMSEC dual-board pathway.' },
];

const VALUES = [
  { icon: Heart,  title: 'Care',       body: 'No child invisible. Weekly form-teacher meetings; a counsellor on call.' },
  { icon: Award,  title: 'Excellence', body: 'Top-decile O- and A-level results, year after year.' },
  { icon: Users,  title: 'Community',  body: 'A working PTA, alumni network, and weekend service projects.' },
];

export default function About() {
  const { settings } = useSettings();
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-rc-950 py-24 text-white md:py-28">
        <img src="https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=1920&auto=format&fit=crop&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-r from-rc-950/95 via-rc-900/80 to-rc-800/40"/>
        <div className="container-page relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">Our story</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
            Forty years of every-child-counts education.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-rc-100" style={{ textShadow: '0 1px 20px rgba(0,0,0,0.5)' }}>
            Ridgecrest was founded on a simple idea: that no child should be invisible in a classroom. Four decades on, that idea still drives the school.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[1.3fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">From the Headmaster</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-5xl">Built on relationships.</h2>
            <div className="prose prose-slate mt-6 max-w-none text-base leading-relaxed text-rc-700">
              <p>
                Ridgecrest is small enough that every teacher knows every learner&apos;s name, and structured enough to deliver world-class results. That balance — intimacy plus rigour — is our deliberate design.
              </p>
              <p>
                Our Cambridge International programme runs alongside ZIMSEC, so our O- and A-level learners write the papers that open every door — local universities, regional intakes, and overseas admission.
              </p>
              <p>
                We do not believe in education as production. We believe in education as cultivation. Come and see.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <div className="chip"><Award size={14}/> 95% O-level pass rate</div>
              <div className="chip"><Star size={14}/> 4.8 average parent rating</div>
            </div>
          </motion.div>

          <div className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-rc-800 to-rc-950 p-8 text-white shadow-xl">
              <Quote size={32} className="text-rc-300"/>
              <blockquote className="mt-4 font-display text-xl font-medium leading-snug">
                We don&apos;t teach subjects to children. We teach children, through subjects.
              </blockquote>
              <p className="mt-5 text-xs uppercase tracking-[0.18em] text-rc-300">— Headmaster, Ridgecrest</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-rc-50 py-16 md:py-24">
        <div className="container-page">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">Our journey</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">40 years on the same road.</h2>
          </div>
          <div className="mx-auto max-w-3xl">
            <div className="relative border-l-2 border-rc-300 pl-8 md:pl-12">
              {MILESTONES.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: i * 0.05 }} viewport={{ once: true }} className="relative mb-10 last:mb-0">
                  <div className="absolute -left-[42px] md:-left-[54px] grid h-8 w-8 place-items-center rounded-full bg-rc-900 text-xs font-bold text-white shadow-md">
                    {m.year === 'Today' ? '✓' : m.year.slice(2)}
                  </div>
                  <div className="rounded-xl border border-rc-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rc-700">{m.year}</p>
                    <h3 className="mt-1 font-display text-lg font-bold text-rc-900">{m.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-rc-600">{m.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-24">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">What we live by</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">Three principles.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-rc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-rc-100 text-rc-900"><Icon size={20}/></div>
              <h3 className="font-display text-lg font-bold text-rc-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-rc-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="rounded-3xl border border-rc-200 bg-gradient-to-br from-rc-50 to-white p-10 text-center md:p-14">
          <h2 className="font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">See it for yourself.</h2>
          <p className="mx-auto mt-3 max-w-xl text-rc-600">Bring your child. Walk the classrooms. Meet the teachers. Decide.</p>
          <Link to="/admissions" className="btn-primary mt-7 inline-flex px-7 py-3.5 text-base">
            Apply for admission <ArrowRight size={16}/>
          </Link>
        </div>
      </section>
    </div>
  );
}
