import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Receipt, BookOpen, NotebookPen, CalendarDays, CreditCard, X, Banknote, Smartphone, Edit3, MessageCircle, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, formatDate, gradeOf, daysUntil } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONE = {
  open: 'bg-amber-100 text-amber-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  void: 'bg-slate-200 text-slate-500',
};

// UUID guard — protects against /parent/children/undefined and similar bad routes.
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ParentChildDetail() {
  const { id } = useParams();
  const { parent } = useAuth();
  const { settings } = useSettings();
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [marksByAssessment, setMarksByAssessment] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [homework, setHomework] = useState([]);
  const [showPay, setShowPay] = useState(false);

  const validId = id && id !== 'undefined' && UUID_RX.test(id);

  useEffect(() => {
    if (!parent?.id || !validId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setLoadError(null);
    (async () => {
      try {
        const { data: c, error: cErr } = await supabase
          .from('rc_students').select('*, class:rc_classes(name)').eq('id', id).maybeSingle();
        if (cErr) throw cErr;
        if (cancelled) return;
        setChild(c || null);

        const [resR, invR, payR] = await Promise.all([
          supabase.from('rc_results').select('*, subject:rc_subjects(name, code), assessment:rc_assessments(name, scheduled_for, is_published, term:rc_terms(name))').eq('student_id', id),
          supabase.from('rc_invoices').select('*, term:rc_terms(name)').eq('student_id', id).order('due_date', { ascending: false }),
          supabase.from('rc_payments').select('*, invoice:rc_invoices(invoice_no, student_id)'),
        ]);
        if (cancelled) return;
        const grouped = {};
        for (const r of (resR.data || []).filter((x) => x.assessment?.is_published)) {
          (grouped[r.assessment_id] ||= { meta: r.assessment, rows: [] }).rows.push(r);
        }
        setMarksByAssessment(grouped);
        setInvoices(invR.data || []);
        setPayments((payR.data || []).filter((p) => p.invoice?.student_id === id));
      } catch (e) {
        if (!cancelled) setLoadError(e.message || 'Could not load this child');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, parent, validId]);

  useEffect(() => {
    if (!child?.current_class_id) return;
    supabase.from('rc_homework').select('*, subject:rc_subjects(name)').eq('class_id', child.current_class_id).eq('active', true).order('due_date', { ascending: true })
      .then(({ data }) => setHomework(data || []));
  }, [child]);

  if (!validId) {
    return (
      <div className="card max-w-md text-center">
        <p className="font-display text-lg font-bold text-rc-900">Pick a child</p>
        <p className="mt-1 text-sm text-rc-600">This link is missing a child reference. Choose one from <Link to="/parent/children" className="font-semibold text-rc-700 underline">My Children</Link>.</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="card max-w-md text-center text-rc-500">
        <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-rc-300 border-t-rc-700"/>
        Loading child profile…
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="card max-w-md text-center text-rose-700">
        {loadError}
        <p className="mt-2"><Link to="/parent/children" className="underline">Back to My Children</Link></p>
      </div>
    );
  }
  if (!child) {
    return (
      <div className="card max-w-md text-center">
        <p className="font-display text-lg font-bold text-rc-900">Child not found</p>
        <p className="mt-1 text-sm text-rc-600">This learner isn&apos;t linked to your account. <Link to="/parent/children" className="font-semibold text-rc-700 underline">Back to My Children</Link></p>
      </div>
    );
  }

  const outstanding = invoices.reduce((s, r) => s + Math.max(0, Number(r.total_usd) - Number(r.paid_usd || 0)), 0);
  const totalInvoiced = invoices.reduce((s, r) => s + Number(r.total_usd), 0);
  const totalPaid = invoices.reduce((s, r) => s + Number(r.paid_usd || 0), 0);

  return (
    <div>
      <Link to="/parent" className="mb-4 inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900"><ArrowLeft size={14}/> Back</Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">{child.display_name}</h1>
          <p className="mt-1 text-sm text-rc-600">{child.class?.name || 'No class'} · {child.student_code}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/parent/children/${id}/edit`} className="btn-secondary text-xs"><Edit3 size={12}/> Edit profile</Link>
          {outstanding > 0 && (
            <button onClick={() => setShowPay(true)} className="inline-flex items-center gap-2 rounded-lg border-2 border-emerald-600 bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-600">
              <CreditCard size={14}/> Pay fees
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Total invoiced" value={formatMoney({ amount: totalInvoiced, currency: 'USD' })}/>
        <Card label="Paid"           value={formatMoney({ amount: totalPaid, currency: 'USD' })} tone="ok"/>
        <Card label="Outstanding"    value={formatMoney({ amount: outstanding, currency: 'USD' })} tone={outstanding > 0 ? 'warn' : 'ok'}/>
      </div>

      <section className="mt-6 card">
        <h2 className="font-display text-lg font-bold text-rc-900 inline-flex items-center gap-2"><ClipboardList size={18} className="text-rc-700"/> Marks (published only)</h2>
        {Object.keys(marksByAssessment).length === 0 ? (
          <p className="mt-3 text-sm text-rc-500">No marks published yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {Object.values(marksByAssessment).map((group) => {
              const avg = group.rows.reduce((s, r) => s + Number(r.mark || 0), 0) / group.rows.length;
              return (
                <div key={group.meta?.name} className="rounded-xl border border-rc-200 bg-rc-50/40 p-4">
                  <div className="mb-2 flex items-end justify-between">
                    <p className="font-display text-base font-bold text-rc-900">{group.meta?.name} <span className="text-rc-500 font-normal text-xs">· {group.meta?.term?.name}</span></p>
                    <p className="text-xs"><strong>Avg {avg.toFixed(1)}%</strong> · {gradeOf(avg)}</p>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
                    {group.rows.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                        <span><BookOpen size={12} className="-mt-0.5 mr-1 inline text-rc-400"/>{r.subject?.name}</span>
                        <span className="font-semibold">{r.mark} <span className="text-xs text-rc-500">· {r.grade || gradeOf(r.mark)}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 card">
        <h2 className="font-display text-lg font-bold text-rc-900 inline-flex items-center gap-2"><Receipt size={18} className="text-rc-700"/> Invoices &amp; receipts</h2>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-rc-500">No invoices yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-rc-500">
                <th className="py-2">Invoice</th><th>Term</th><th className="text-right">Total</th><th className="text-right">Paid</th><th>Status</th><th>Due</th>
              </tr></thead>
              <tbody>
                {invoices.map((r) => (
                  <tr key={r.id} className="border-t border-rc-100">
                    <td className="py-2 font-mono text-xs">{r.invoice_no}</td>
                    <td>{r.term?.name}</td>
                    <td className="text-right font-semibold">{formatMoney({ amount: r.total_usd, currency: 'USD' })}</td>
                    <td className="text-right text-emerald-700">{formatMoney({ amount: r.paid_usd, currency: 'USD' })}</td>
                    <td><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[r.status])}>{r.status}</span></td>
                    <td>{formatDate(r.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {payments.length > 0 && (
          <div className="mt-4 border-t border-rc-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-rc-500">Recent receipts</p>
            <div className="mt-2 space-y-2">
              {payments.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md bg-rc-50 px-3 py-2 text-sm">
                  <span className="font-mono text-xs">{r.receipt_no}</span>
                  <span className="text-xs text-rc-500">{formatDate(r.paid_at)} · {r.method.replace('_', ' ')}</span>
                  <span className="font-semibold">{formatMoney({ amount: r.amount_usd, currency: 'USD' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Homework for the class */}
      {homework.length > 0 && (
        <section className="mt-6 card">
          <h2 className="font-display text-lg font-bold text-rc-900 inline-flex items-center gap-2"><NotebookPen size={18} className="text-rc-700"/> Homework</h2>
          <div className="mt-3 space-y-2">
            {homework.slice(0, 5).map((h) => {
              const d = daysUntil(h.due_date);
              const overdue = d != null && d < 0;
              return (
                <div key={h.id} className={cn('rounded-lg border border-rc-200 bg-rc-50/40 p-3', overdue && 'border-rose-200 bg-rose-50/40')}>
                  <div className="flex flex-wrap items-center gap-2">
                    {h.subject && <span className="chip">{h.subject.name}</span>}
                    <p className="font-semibold text-rc-900">{h.title}</p>
                  </div>
                  {h.description && <p className="mt-1 text-xs text-rc-700">{h.description}</p>}
                  {h.due_date && (
                    <p className={cn('mt-1 inline-flex items-center gap-1 text-xs', overdue ? 'text-rose-700 font-semibold' : 'text-rc-500')}>
                      <Calendar size={11}/> Due {formatDate(h.due_date)}{d != null && (overdue ? ` (${Math.abs(d)} days overdue)` : d === 0 ? ' · today' : d === 1 ? ' · tomorrow' : ` · in ${d} days`)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pay fees modal — PayNow + cash office */}
      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-rc-900/40 p-4" onClick={() => setShowPay(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl border border-rc-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-rc-200 bg-rc-50 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">Pay fees</p>
                <p className="font-display text-lg font-bold text-rc-900">Outstanding: {formatMoney({ amount: outstanding, currency: 'USD' })}</p>
              </div>
              <button onClick={() => setShowPay(false)} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
            </div>
            <div className="space-y-3 p-5">
              <a
                href={settings?.paynow_url || 'https://www.paynow.co.zw/'}
                target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 transition hover:border-emerald-500"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500 text-white"><Smartphone size={18}/></div>
                <div>
                  <p className="font-display text-base font-bold text-rc-900">Pay online via PayNow</p>
                  <p className="text-xs text-rc-700">EcoCash · OneMoney · Innbucks · Visa / Mastercard</p>
                  {settings?.paynow_account && <p className="mt-1 text-[10px] text-rc-500">{settings.paynow_account}</p>}
                </div>
              </a>

              <div className="rounded-xl border border-rc-200 bg-rc-50/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rc-900 text-white"><Banknote size={18}/></div>
                  <div>
                    <p className="font-display text-base font-bold text-rc-900">Cash at the office</p>
                    <p className="text-xs text-rc-700">{settings?.cash_office_hours || 'Mon-Fri 8am-4pm at the Admin Block.'}</p>
                    <p className="mt-1 text-[10px] text-rc-500">A printed receipt is issued on the spot.</p>
                  </div>
                </div>
              </div>

              {settings?.whatsapp_phone && (
                <a
                  href={`https://wa.me/${settings.whatsapp_phone.replace(/\D/g, '').replace(/^0/, '263')}?text=${encodeURIComponent(`Hi Ridgecrest — I'd like to pay fees for ${child.display_name} (${child.student_code}).`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-rc-200 bg-white p-3 text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  <MessageCircle size={16}/> Or chat to the bursar on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, tone }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wider text-rc-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${tone === 'warn' ? 'text-amber-700' : tone === 'ok' ? 'text-emerald-700' : 'text-rc-900'}`}>
        {value}
      </p>
    </div>
  );
}
