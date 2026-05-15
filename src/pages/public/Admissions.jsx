import { Link } from 'react-router-dom';
import { CheckCircle2, FileText, Calendar, MessageCircle, Phone, ArrowRight } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const STEPS = [
  { icon: FileText,    title: '1. Application form', body: 'Complete the application form (free) — collect from reception or download from the parent portal once registered.' },
  { icon: Calendar,    title: '2. School visit',     body: 'Book a tour and meet the form leader of the year your child is entering.' },
  { icon: CheckCircle2, title: '3. Placement test',  body: 'A short academic placement (Maths + English) and an interview with the headmaster.' },
  { icon: ArrowRight,  title: '4. Acceptance',       body: 'Acceptance letter issued within 5 working days. Fees deposit secures the place.' },
];

export default function Admissions() {
  const { settings } = useSettings();
  const waNumber = (settings?.whatsapp_phone || '+263770000000').replace(/\D/g, '').replace(/^0/, '263');
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-rc-950 py-20 text-white md:py-24">
        <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1920&auto=format&fit=crop&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-r from-rc-950/95 via-rc-900/80 to-rc-800/40"/>
        <div className="container-page relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">Admissions</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
            Join Ridgecrest.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-rc-100" style={{ textShadow: '0 1px 20px rgba(0,0,0,0.5)' }}>
            We accept applications from Form 1 through Form 6, year-round. Here&apos;s how to apply.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-rc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-rc-100 text-rc-900"><Icon size={20}/></div>
              <h3 className="font-display text-lg font-bold text-rc-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-rc-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-rc-50 py-16 md:py-20">
        <div className="container-page max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">Frequently asked</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">A few things parents ask.</h2>
          <div className="mt-8 space-y-4">
            {[
              ['What are the fees?', 'Term fees start at US$320 for Form 1 (Term 1). A full fee schedule is shared after the application form is submitted.'],
              ['Can my child sit Cambridge?', 'Yes — every O- and A-level learner is registered for Cambridge IGCSE/A-Level in addition to ZIMSEC. The double-board approach is included in the standard fees.'],
              ['Is there a school bus?', 'School transport covers Borrowdale, Mt Pleasant, Greendale, and Avondale routes. Additional fee applies (currently US$80/term).'],
              ['What about meals?', 'A daily hot lunch is offered (optional, US$100/term). Lunch boxes are also welcome.'],
              ['Sports and activities?', 'Hockey, rugby, cricket, swimming, tennis, athletics, and a strong music programme. Inter-school competition every term.'],
            ].map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-rc-200 bg-white p-5">
                <summary className="cursor-pointer list-none font-display text-base font-bold text-rc-900 marker:hidden">
                  {q} <span className="float-right text-rc-400 group-open:rotate-45 inline-block transition">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-rc-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="rounded-3xl border border-rc-200 bg-gradient-to-br from-rc-900 to-rc-950 p-10 text-white md:p-14">
          <div className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Ready to apply?</h2>
              <p className="mt-3 max-w-xl text-rc-200">Talk to admissions today — by phone, WhatsApp, or in person at the school office.</p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <a href={`tel:${(settings?.primary_phone || '+263770000000').replace(/\s/g, '')}`} className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-rc-900 hover:bg-rc-50">
                <Phone size={14}/> {settings?.primary_phone || '+263 77 000 0000'}
              </a>
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-rc-200 hover:text-white">
                <MessageCircle size={14}/> Chat on WhatsApp →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
