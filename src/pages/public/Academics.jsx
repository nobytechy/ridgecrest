import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Award, ArrowRight, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const STREAMS = [
  { title: 'Junior School (Form 1–2)', body: 'Foundations across Mathematics, English, Shona, Combined Science, History, and ICT. Each Form is split into two streams (A and B) — small classes of 28–32.' },
  { title: 'O-Level (Form 3–4)',       body: 'Cambridge IGCSE + ZIMSEC O-Level dual entry. Eight subjects standard; three sciences as a stream option.' },
  { title: 'A-Level (Form 5–6)',       body: 'Cambridge A-Level and ZIMSEC A-Level pathways. Sciences, Commercials, and Arts groupings.' },
];

export default function Academics() {
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    supabase.from('rc_subjects').select('*').order('position').then(({ data }) => setSubjects(data || []));
  }, []);

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-rc-950 py-20 text-white md:py-24">
        <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&auto=format&fit=crop&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-r from-rc-950/95 via-rc-900/80 to-rc-800/40"/>
        <div className="container-page relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">Academics</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
            A curriculum that opens doors.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-rc-100" style={{ textShadow: '0 1px 20px rgba(0,0,0,0.5)' }}>
            Cambridge International and ZIMSEC — every learner sits the qualifications that work whether they stay in Zimbabwe or study abroad.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-5 md:grid-cols-3">
          {STREAMS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-rc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-rc-100 text-rc-900"><Layers size={20}/></div>
              <h3 className="font-display text-lg font-bold text-rc-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-rc-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-rc-50 py-16 md:py-20">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">Subjects on offer</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-rc-900 md:text-4xl">What we teach.</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-rc-200 bg-white p-4">
                <div>
                  <p className="font-display text-base font-bold text-rc-900">{s.name}</p>
                  <p className="text-xs text-rc-500">{s.code} · {s.is_core ? 'Core subject' : 'Elective'}</p>
                </div>
                <BookOpen size={16} className="text-rc-400"/>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="rounded-3xl border border-rc-200 bg-gradient-to-br from-rc-900 to-rc-950 p-10 text-white md:p-14">
          <div className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Wondering if Ridgecrest fits your child?</h2>
              <p className="mt-3 max-w-xl text-rc-200">Speak to our admissions office. We&apos;ll walk you through fees, the application timeline, and arrange a school visit.</p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link to="/admissions" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-rc-900 hover:bg-rc-50">
                Admissions information <ArrowRight size={16}/>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
