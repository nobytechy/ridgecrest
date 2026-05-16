import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Receipt, AlertCircle, ArrowRight, KeyRound, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, formatDate, gradeOf } from '@/lib/format';
import BirthdayWidget from '@/components/BirthdayWidget';

export default function ParentDashboard() {
  const { parent } = useAuth();
  const { currentTerm } = useSettings();
  const nav = useNavigate();
  const [children, setChildren] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (parent?.force_pin_reset) nav('/parent/profile?force=1');
    if (!parent?.id) return;
    load();
  }, [parent, nav]);

  async function load() {
    const { data: kids } = await supabase.from('rc_student_parents').select('is_primary, student:rc_students(*, class:rc_classes(name))').eq('parent_id', parent.id);
    const list = (kids || [])
      .filter((row) => row.student?.id)
      .map((row) => ({ ...row.student, is_primary: row.is_primary }));
    // For each child fetch latest published assessment marks + outstanding fee
    for (const c of list) {
      const [{ data: rs }, { data: invs }] = await Promise.all([
        supabase.from('rc_results').select('mark, subject:rc_subjects(name), assessment:rc_assessments(name, is_published)').eq('student_id', c.id).order('entered_at', { ascending: false }).limit(6),
        supabase.from('rc_invoices').select('total_usd, paid_usd').eq('student_id', c.id),
      ]);
      c.recent = (rs || []).filter((r) => r.assessment?.is_published).slice(0, 4);
      c.avg = c.recent.length ? c.recent.reduce((s, r) => s + Number(r.mark || 0), 0) / c.recent.length : null;
      c.outstanding = (invs || []).reduce((s, i) => s + Math.max(0, Number(i.total_usd) - Number(i.paid_usd || 0)), 0);
    }
    setChildren(list);

    supabase.from('rc_announcements').select('*').eq('active', true).in('audience', ['parents', 'all']).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setAnnouncements(data || []));
  }

  const totalOutstanding = children.reduce((s, c) => s + (c.outstanding || 0), 0);

  return (
    <div>
      {parent?.force_pin_reset && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <KeyRound size={16} className="-mt-0.5 mr-2 inline"/>
          You&apos;re using a starter PIN. {' '}
          <Link to="/parent/profile?force=1" className="font-semibold underline">Change it now</Link> for security.
        </div>
      )}

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">Welcome, {parent?.display_name}</h1>
        <p className="mt-1 text-sm text-rc-600">{children.length} {children.length === 1 ? 'child' : 'children'} at the school · {currentTerm?.name}</p>
      </header>

      {totalOutstanding > 0 && (
        <div className="mb-6 card border-amber-300 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber-100 text-amber-700"><AlertCircle size={20}/></div>
            <div className="flex-1">
              <p className="font-display text-lg font-bold text-rc-900">Total fees outstanding: {formatMoney({ amount: totalOutstanding, currency: 'USD' })}</p>
              <p className="text-sm text-rc-600">Across {children.length} {children.length === 1 ? 'child' : 'children'}. Tap a card below to see the breakdown.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {children.length === 0 ? (
          <div className="card md:col-span-2 text-center">
            <GraduationCap className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No children linked yet. Contact the school office to link your account.</p>
          </div>
        ) : children.map((c) => (
          <Link key={c.id} to={`/parent/children/${c.id}`} className="card hover:border-rc-400">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold text-rc-900">{c.display_name}</p>
                <p className="text-xs text-rc-500">{c.class?.name || 'No class'} · {c.student_code}</p>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${c.outstanding > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {c.outstanding > 0 ? <AlertCircle size={18}/> : <GraduationCap size={18}/>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-rc-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Latest average</p>
                <p className="font-display text-2xl font-bold text-rc-900">
                  {c.avg != null ? `${c.avg.toFixed(0)}` : '—'}
                  {c.avg != null && <span className="ml-1 text-sm text-rc-500">% · {gradeOf(c.avg)}</span>}
                </p>
              </div>
              <div className="rounded-lg bg-rc-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Fees due</p>
                <p className={`font-display text-2xl font-bold ${c.outstanding > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatMoney({ amount: c.outstanding, currency: 'USD' })}
                </p>
              </div>
            </div>

            {c.recent.length > 0 && (
              <div className="mt-3 border-t border-rc-100 pt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rc-500">Recent marks</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.recent.map((r, i) => (
                    <span key={i} className="rounded-full bg-rc-100 px-2.5 py-0.5 text-[11px] font-medium text-rc-800">
                      {r.subject?.name?.slice(0, 4)} {r.mark}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rc-700">Open child <ArrowRight size={11}/></p>
          </Link>
        ))}
      </div>

      <section className="mt-6">
        <BirthdayWidget scope="parent"/>
      </section>

      {announcements.length > 0 && (
        <section className="mt-6 card">
          <div className="mb-3 flex items-center gap-2"><Megaphone size={16} className="text-rc-700"/>
            <h2 className="font-display text-lg font-bold text-rc-900">Latest news</h2>
          </div>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-lg border border-rc-200 bg-rc-50/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">{formatDate(a.created_at)}</p>
                <p className="mt-0.5 font-display text-base font-bold text-rc-900">{a.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-rc-700">{a.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
