import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Users, School, Receipt, AlertTriangle, ClipboardList, ArrowRight, Megaphone, BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import BirthdayWidget from '@/components/BirthdayWidget';

export default function AdminDashboard() {
  const { currentTerm, settings } = useSettings();
  const [stats, setStats] = useState({
    students: 0, parents: 0, staff: 0, classes: 0,
    invoiced: 0, collected: 0, outstanding: 0, openInvoices: 0,
    publishedMarks: 0,
  });
  const [recent, setRecent] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const [students, parents, staffR, classes, invoices, payments, marks, recentP] = await Promise.all([
      supabase.from('rc_students').select('id', { count: 'exact', head: true }),
      supabase.from('rc_parents').select('id',  { count: 'exact', head: true }),
      supabase.from('rc_staff').select('id',    { count: 'exact', head: true }),
      supabase.from('rc_classes').select('id',  { count: 'exact', head: true }),
      supabase.from('rc_invoices').select('total_usd, paid_usd, status'),
      supabase.from('rc_payments').select('amount_usd, paid_at, receipt_no, invoice:rc_invoices(invoice_no, student:rc_students(display_name, student_code))').order('paid_at', { ascending: false }).limit(6),
      supabase.from('rc_assessments').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('rc_payments').select('*').order('paid_at', { ascending: false }).limit(5),
    ]);

    const invs = invoices.data || [];
    const invoiced    = invs.reduce((s, r) => s + Number(r.total_usd || 0), 0);
    const collected   = invs.reduce((s, r) => s + Number(r.paid_usd || 0), 0);
    const outstanding = Math.max(0, invoiced - collected);
    const openCount   = invs.filter((r) => r.status === 'open' || r.status === 'partial').length;

    setStats({
      students: students.count ?? 0,
      parents:  parents.count ?? 0,
      staff:    staffR.count ?? 0,
      classes:  classes.count ?? 0,
      invoiced, collected, outstanding,
      openInvoices: openCount,
      publishedMarks: marks.count ?? 0,
    });
    setRecent(payments.data || []);
  }

  const collectionPct = stats.invoiced === 0 ? 0
    : Math.min(100, Math.round((stats.collected / stats.invoiced) * 100));

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">Overview</h1>
        <p className="mt-1 text-sm text-rc-600">
          {settings?.school_name || 'Ridgecrest'} · {currentTerm?.name || 'School at a glance'}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={GraduationCap} label="Students"  value={stats.students}  sub={`${stats.classes} classes`}/>
        <Kpi icon={Users}         label="Parents"   value={stats.parents}   sub="Linked guardians"/>
        <Kpi icon={School}        label="Staff"     value={stats.staff}     sub="Teachers + admin"/>
        <Kpi icon={ClipboardList} label="Published" value={stats.publishedMarks} sub="Assessments visible to parents"/>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wider text-rc-500">Fee collection · this term</p>
          <p className="mt-1 font-display text-3xl font-bold text-rc-900">{collectionPct}%</p>
          <p className="mt-1 text-xs text-rc-500">{formatMoney({ amount: stats.collected, currency: 'USD' })} of {formatMoney({ amount: stats.invoiced, currency: 'USD' })} invoiced</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-rc-100">
            <div className="h-full bg-rc-900" style={{ width: `${collectionPct}%` }}/>
          </div>
        </div>
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wider text-rc-500">Outstanding</p>
          <p className="mt-1 font-display text-3xl font-bold text-rc-900">{formatMoney({ amount: stats.outstanding, currency: 'USD' })}</p>
          <p className="mt-1 text-xs text-rc-500">Across {stats.openInvoices} open / partial invoice{stats.openInvoices === 1 ? '' : 's'}</p>
          <Link to="/admin/fees" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rc-700 hover:underline">
            Open fees ledger <ArrowRight size={12}/>
          </Link>
        </div>
      </div>

      <section className="mt-6 card">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-lg font-bold text-rc-900 inline-flex items-center gap-2"><Receipt size={16} className="text-rc-700"/> Recent fee receipts</h2>
          <Link to="/admin/fees" className="text-xs font-medium text-rc-700 hover:underline">All receipts →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-rc-300 p-6 text-center text-sm text-rc-500">No receipts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-rc-500">
                  <th className="py-2">Receipt</th><th>Student</th><th>Date</th><th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-rc-100">
                    <td className="py-2 font-mono text-xs">{r.receipt_no}</td>
                    <td>{r.invoice?.student?.display_name} <span className="text-rc-400">· {r.invoice?.student?.student_code}</span></td>
                    <td>{formatDate(r.paid_at)}</td>
                    <td className="text-right font-semibold">{formatMoney({ amount: r.amount_usd, currency: 'USD' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1"><BirthdayWidget scope="all"/></div>
        <div className="lg:col-span-2 card">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-rc-100 text-rc-700"><BookOpen size={18}/></div>
            <div>
              <p className="font-display text-base font-bold text-rc-900">Tip of the day</p>
              <p className="text-[10px] text-rc-500">Keyboard shortcut</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-rc-700">Press <kbd className="rounded bg-rc-100 px-1.5 py-0.5 font-mono text-[11px]">⌘</kbd> + <kbd className="rounded bg-rc-100 px-1.5 py-0.5 font-mono text-[11px]">K</kbd> anywhere in the staff portal to jump straight to a student, parent, staff member, or class.</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/admin/students" className="card hover:border-rc-400">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-rc-100 text-rc-900"><GraduationCap size={18}/></div>
            <div className="flex-1">
              <p className="font-display font-bold text-rc-900">Add a student</p>
              <p className="text-xs text-rc-500">Generates PIN + portal login</p>
            </div>
            <ArrowRight size={14} className="text-rc-400"/>
          </div>
        </Link>
        <Link to="/admin/marks" className="card hover:border-rc-400">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-rc-100 text-rc-900"><ClipboardList size={18}/></div>
            <div className="flex-1">
              <p className="font-display font-bold text-rc-900">Enter marks</p>
              <p className="text-xs text-rc-500">Per class · per subject · per assessment</p>
            </div>
            <ArrowRight size={14} className="text-rc-400"/>
          </div>
        </Link>
        <Link to="/admin/announcements" className="card hover:border-rc-400">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-rc-100 text-rc-900"><Megaphone size={18}/></div>
            <div className="flex-1">
              <p className="font-display font-bold text-rc-900">Post an announcement</p>
              <p className="text-xs text-rc-500">Public · parents · staff · students</p>
            </div>
            <ArrowRight size={14} className="text-rc-400"/>
          </div>
        </Link>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-rc-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-rc-900">{value}</p>
          <p className="mt-1 text-xs text-rc-500">{sub}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-rc-100 text-rc-900"><Icon size={18}/></div>
      </div>
    </div>
  );
}
