import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Receipt, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, formatDate, gradeOf } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONE = {
  open: 'bg-amber-100 text-amber-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  void: 'bg-slate-200 text-slate-500',
};

export default function ParentChildDetail() {
  const { id } = useParams();
  const { parent } = useAuth();
  const [child, setChild] = useState(null);
  const [marksByAssessment, setMarksByAssessment] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!parent?.id) return;
    supabase.from('rc_students').select('*, class:rc_classes(name)').eq('id', id).maybeSingle()
      .then(({ data }) => setChild(data));

    supabase.from('rc_results').select('*, subject:rc_subjects(name, code), assessment:rc_assessments(name, scheduled_for, is_published, term:rc_terms(name))').eq('student_id', id)
      .then(({ data }) => {
        const grouped = {};
        for (const r of (data || []).filter((x) => x.assessment?.is_published)) {
          (grouped[r.assessment_id] ||= { meta: r.assessment, rows: [] }).rows.push(r);
        }
        setMarksByAssessment(grouped);
      });

    supabase.from('rc_invoices').select('*, term:rc_terms(name)').eq('student_id', id).order('due_date', { ascending: false })
      .then(({ data }) => setInvoices(data || []));

    supabase.from('rc_payments').select('*, invoice:rc_invoices(invoice_no, student_id)')
      .then(({ data }) => setPayments((data || []).filter((p) => p.invoice?.student_id === id)));
  }, [id, parent]);

  if (!child) return <p className="text-rc-500">Loading…</p>;

  const outstanding = invoices.reduce((s, r) => s + Math.max(0, Number(r.total_usd) - Number(r.paid_usd || 0)), 0);
  const totalInvoiced = invoices.reduce((s, r) => s + Number(r.total_usd), 0);
  const totalPaid = invoices.reduce((s, r) => s + Number(r.paid_usd || 0), 0);

  return (
    <div>
      <Link to="/parent" className="mb-4 inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900"><ArrowLeft size={14}/> Back</Link>

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">{child.display_name}</h1>
        <p className="mt-1 text-sm text-rc-600">{child.class?.name || 'No class'} · {child.student_code}</p>
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
