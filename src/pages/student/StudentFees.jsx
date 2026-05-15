import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONE = {
  open: 'bg-amber-100 text-amber-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  void: 'bg-slate-200 text-slate-500',
};

export default function StudentFees() {
  const { student } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!student?.id) return;
    supabase.from('rc_invoices').select('*, term:rc_terms(name)').eq('student_id', student.id).order('due_date', { ascending: false }).then(({ data }) => setInvoices(data || []));
    supabase.from('rc_payments').select('*, invoice:rc_invoices(invoice_no, student_id)').then(({ data }) => {
      setPayments((data || []).filter((p) => p.invoice?.student_id === student.id));
    });
  }, [student]);

  const outstanding = invoices.reduce((s, r) => s + Math.max(0, Number(r.total_usd) - Number(r.paid_usd || 0)), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-rc-900">My Fees</h1>
        <p className="mt-1 text-sm text-rc-600">Term invoices and receipts.</p>
      </header>

      <div className="card border-amber-200 bg-amber-50/40">
        <p className="text-xs font-semibold uppercase tracking-wider text-rc-700">Total outstanding</p>
        <p className="mt-1 font-display text-4xl font-bold text-rc-900">{formatMoney({ amount: outstanding, currency: 'USD' })}</p>
        <p className="mt-1 text-xs text-rc-600">Pay through your parent / guardian at the school office or via PayNow.</p>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-bold text-rc-900">Invoices</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-rc-500">
              <th className="py-2">Invoice</th><th>Term</th><th className="text-right">Total</th><th className="text-right">Paid</th><th>Status</th>
            </tr></thead>
            <tbody>
              {invoices.length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-sm text-rc-500"><Receipt className="mx-auto mb-1 text-rc-400" size={18}/>No invoices yet.</td></tr> : invoices.map((r) => (
                <tr key={r.id} className="border-t border-rc-100">
                  <td className="py-2 font-mono text-xs">{r.invoice_no}</td>
                  <td>{r.term?.name}</td>
                  <td className="text-right font-semibold">{formatMoney({ amount: r.total_usd, currency: 'USD' })}</td>
                  <td className="text-right text-emerald-700">{formatMoney({ amount: r.paid_usd, currency: 'USD' })}</td>
                  <td><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[r.status])}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-bold text-rc-900">Receipts</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-rc-500">
              <th className="py-2">Receipt</th><th>Date</th><th>Method</th><th className="text-right">Amount</th>
            </tr></thead>
            <tbody>
              {payments.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-sm text-rc-500">No receipts yet.</td></tr> : payments.map((r) => (
                <tr key={r.id} className="border-t border-rc-100">
                  <td className="py-2 font-mono text-xs">{r.receipt_no}</td>
                  <td>{formatDate(r.paid_at)}</td>
                  <td className="capitalize">{r.method.replace('_', ' ')}</td>
                  <td className="text-right font-semibold">{formatMoney({ amount: r.amount_usd, currency: 'USD' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
