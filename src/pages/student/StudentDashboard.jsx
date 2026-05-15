import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Receipt, Megaphone, ArrowRight, KeyRound, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, formatDate, gradeOf } from '@/lib/format';

export default function StudentDashboard() {
  const { student } = useAuth();
  const { currentTerm } = useSettings();
  const nav = useNavigate();
  const [latestMarks, setLatestMarks] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (student?.force_pin_reset) nav('/student/profile?force=1');
    if (!student?.id) return;

    // Latest published assessment marks
    supabase.from('rc_results')
      .select('*, subject:rc_subjects(name, code), assessment:rc_assessments(name, scheduled_for, is_published)')
      .eq('student_id', student.id)
      .order('entered_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setLatestMarks((data || []).filter((r) => r.assessment?.is_published)));

    // Fee balance
    supabase.from('rc_invoices').select('total_usd, paid_usd, status').eq('student_id', student.id)
      .then(({ data }) => {
        const out = (data || []).reduce((s, r) => s + Math.max(0, Number(r.total_usd) - Number(r.paid_usd || 0)), 0);
        setOutstanding(out);
      });

    // Announcements for students
    supabase.from('rc_announcements').select('*').eq('active', true).in('audience', ['students', 'all'])
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setAnnouncements(data || []));
  }, [student, nav]);

  return (
    <div>
      {student?.force_pin_reset && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <KeyRound size={16} className="-mt-0.5 mr-2 inline"/>
          You&apos;re using a starter PIN. {' '}
          <Link to="/student/profile?force=1" className="font-semibold underline">Change it now</Link> for security.
        </div>
      )}

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">Hi {student?.preferred_name || student?.display_name?.split(' ')[0]}.</h1>
        <p className="mt-1 text-sm text-rc-600">
          {student?.class?.name || 'No class assigned'} · {currentTerm?.name || 'Term in progress'}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={ClipboardList} label="Latest marks" value={`${latestMarks.length} subjects`} sub="Published this term" href="/student/marks"/>
        <Card icon={Receipt}       label="Fees due"     value={formatMoney({ amount: outstanding, currency: 'USD' })} sub={outstanding > 0 ? 'Please pay through your parent / guardian.' : 'All clear.'} href="/student/fees" tone={outstanding > 0 ? 'warn' : 'ok'}/>
        <Card icon={Calendar}      label="Term"         value={currentTerm?.name?.split(' ').slice(0, 2).join(' ') || '—'} sub={currentTerm ? `${formatDate(currentTerm.start_date)} → ${formatDate(currentTerm.end_date)}` : '—'}/>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-rc-900 inline-flex items-center gap-2"><BookOpen size={18} className="text-rc-700"/> Latest marks</h2>
              <p className="text-xs text-rc-500">Only published assessments are shown.</p>
            </div>
            <Link to="/student/marks" className="text-xs font-medium text-rc-700 hover:underline">All marks →</Link>
          </div>
          {latestMarks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-rc-300 p-6 text-center text-sm text-rc-500">No marks published yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-rc-500">
                    <th className="py-2">Subject</th><th>Assessment</th><th className="text-right">Mark</th><th className="text-right">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {latestMarks.map((r) => (
                    <tr key={r.id} className="border-t border-rc-100">
                      <td className="py-2">{r.subject?.name}</td>
                      <td>{r.assessment?.name}</td>
                      <td className="text-right font-semibold">{r.mark}</td>
                      <td className="text-right"><span className="inline-block min-w-[28px] rounded-md bg-rc-100 px-2 py-0.5 text-center text-xs font-bold text-rc-900">{r.grade || gradeOf(r.mark)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2"><Megaphone size={16} className="text-rc-700"/>
            <h2 className="font-display text-lg font-bold text-rc-900">Notices</h2>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-rc-500">No notices.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-rc-200 bg-rc-50/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">{formatDate(a.created_at)}</p>
                  <p className="mt-0.5 font-display text-base font-bold text-rc-900">{a.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-rc-700">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ icon: Icon, label, value, sub, tone, href }) {
  const Comp = href ? Link : 'div';
  return (
    <Comp to={href} className={`card ${href ? 'hover:border-rc-400' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-rc-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-rc-900">{value}</p>
          <p className="mt-1 text-xs text-rc-500">{sub}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tone === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-rc-100 text-rc-900'}`}>
          <Icon size={18}/>
        </div>
      </div>
      {href && <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rc-700">Open <ArrowRight size={11}/></p>}
    </Comp>
  );
}
