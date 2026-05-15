import { Link } from 'react-router-dom';
import { CheckCircle2, FileText, Calendar, MessageCircle, Phone, ArrowRight } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const STEPS = [
  { icon: FileText,    title: '1. Application form', body: 'Collect the application form from the school office on Chiremba Road, or request it on WhatsApp.' },
  { icon: Calendar,    title: '2. School visit',     body: 'Book a tour, meet the grade teacher, and see ECD, classrooms, and the computer lab in action.' },
  { icon: CheckCircle2, title: '3. Readiness check', body: 'A short, age-appropriate readiness check (no high-pressure tests for ECD or junior grades) and a chat with the head teacher.' },
  { icon: ArrowRight,  title: '4. Acceptance',       body: 'Offer letter issued within 5 working days. A fees deposit secures the place for the next term.' },
];

export default function Admissions() {
  const { settings } = useSettings();
  const waNumber = (settings?.whatsapp_phone || '+263770000000').replace(/\D/g, '').replace(/^0/, '263');
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-rc-950 py-20 text-white md:py-24">
        <img src="/photos/rc-cafe-kids.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-r from-rc-950/95 via-rc-900/80 to-rc-800/40"/>
        <div className="container-page relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sun-300">Admissions</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
            Join Ridgecrest Junior.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-rc-100" style={{ textShadow: '0 1px 20px rgba(0,0,0,0.5)' }}>
            We accept applications from ECD A through Grade 7, year-round. Here&apos;s how to apply.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-rc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-rc-100 text-rc-700"><Icon size={20}/></div>
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
              ['What grades do you take?', 'ECD A and ECD B for our youngest learners, then Grade 1 through Grade 7. We do not have a secondary section — Grade 7 leavers move on to secondary schools across Harare.'],
              ['When can my child start?', 'We accept applications year-round, with main intakes at the start of each term (January, May, September). Mid-term placements are considered case by case.'],
              ['Is there a school bus?', 'Yes — school-run transport covers routes across Harare. A small additional fee applies; please ask the office for the latest route map and rates.'],
              ['What about meals?', 'A nutritious daily lunch programme is available. Lunch boxes from home are also welcome.'],
              ['Sports and activities?', 'Athletics, soccer, netball, swimming galas, marimba and music, plus weekly clubs. Heritage and cultural trips run every term.'],
              ['What about the computer lab?', 'Every grade — including ECD — has scheduled time in our state-of-the-art computer lab. Digital literacy is a core skill from day one.'],
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
              <p className="mt-3 max-w-xl text-rc-200">Talk to admissions today — by phone, WhatsApp, or in person at the school office on Chiremba Road.</p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <a href={`tel:${(settings?.primary_phone || '+263773892866').replace(/\s/g, '')}`} className="inline-flex items-center gap-2 rounded-lg bg-sun-500 px-6 py-3 text-sm font-semibold text-rc-950 hover:bg-sun-600">
                <Phone size={14}/> {settings?.primary_phone || '+263 77 389 2866'}
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
