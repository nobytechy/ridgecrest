import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, formatDate } from '@/lib/format';

export default function PrintReceipt() {
  const { id } = useParams();
  const { settings } = useSettings();
  const [payment, setPayment] = useState(undefined);

  useEffect(() => {
    supabase.from('rc_payments').select(`
      *, invoice:rc_invoices(invoice_no, total_usd, paid_usd, term:rc_terms(name),
        student:rc_students(display_name, student_code, class:rc_classes(name)))
    `).eq('id', id).maybeSingle().then(({ data }) => setPayment(data || null));
  }, [id]);

  if (payment === undefined) return <div className="grid min-h-screen place-items-center text-rc-400"><Loader2 className="animate-spin" size={20}/></div>;
  if (!payment) return <div className="grid min-h-screen place-items-center bg-rc-50 p-6 text-center"><div><p className="font-display text-2xl font-bold text-rc-700">Receipt not found</p><Link to="/admin/fees" className="mt-4 inline-flex text-sm text-rc-700 hover:underline">← Back</Link></div></div>;

  const school = settings?.school_name || 'Ridgecrest';

  return (
    <div className="min-h-screen bg-rc-100 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          .no-print { display: none !important; }
          body { background: white; }
          .receipt-card { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 border-b border-rc-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/admin/fees" className="inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900"><ArrowLeft size={14}/> Back</Link>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border-2 border-rc-800 bg-rc-800 px-5 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-sm hover:bg-rc-900">
            <Printer size={14}/> Print
          </button>
        </div>
      </div>

      <div className="mx-auto my-8 max-w-2xl px-4 print:my-0 print:max-w-none print:px-0">
        <div className="receipt-card overflow-hidden rounded-2xl border border-rc-200 bg-white shadow-md">
          <div className="border-b-4 border-rc-700 bg-rc-900 p-8 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">{school}</p>
                <h1 className="mt-1 font-display text-3xl font-bold">Fee Receipt</h1>
                <p className="mt-1 text-sm text-rc-200">{settings?.motto || 'Wisdom · Discipline · Excellence'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">Receipt no.</p>
                <p className="mt-1 font-mono text-xl font-bold tracking-wider">{payment.receipt_no}</p>
                <p className="mt-1 text-xs text-rc-200">{formatDate(payment.paid_at)}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-rc-200 bg-rc-50 px-8 py-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">Amount received</p>
            <p className="mt-1 font-display text-5xl font-bold text-rc-900">{formatMoney({ amount: payment.amount_usd, currency: 'USD' })}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <CheckCircle2 size={12}/> {payment.method === 'cash' ? 'Paid in cash' : `Paid via ${payment.method.replace('_', ' ')}`}
            </p>
          </div>

          <div className="grid gap-4 p-8 text-sm md:grid-cols-2">
            <Detail label="Received from">
              <p className="font-semibold text-rc-900">{payment.invoice?.student?.display_name}</p>
              <p className="text-xs text-rc-500">{payment.invoice?.student?.student_code}</p>
              <p className="text-xs text-rc-500">{payment.invoice?.student?.class?.name}</p>
            </Detail>
            <Detail label="Invoice">
              <p className="font-mono text-sm text-rc-900">{payment.invoice?.invoice_no}</p>
              <p className="text-xs text-rc-500">{payment.invoice?.term?.name}</p>
              <p className="text-xs text-rc-500">Total {formatMoney({ amount: payment.invoice?.total_usd, currency: 'USD' })} · Paid to date {formatMoney({ amount: payment.invoice?.paid_usd, currency: 'USD' })}</p>
            </Detail>
            <Detail label="Method">
              <p className="font-semibold capitalize text-rc-900">{payment.method.replace('_', ' ')}</p>
            </Detail>
            <Detail label="Reference">
              <p className="font-mono text-sm text-rc-900">{payment.reference || '—'}</p>
              {payment.notes && <p className="text-xs text-rc-500">{payment.notes}</p>}
            </Detail>
          </div>

          <div className="grid gap-8 border-t border-rc-200 px-8 py-6 md:grid-cols-2">
            <Sig title={`Received by · ${school}`}/>
            <Sig title="Acknowledged by parent/guardian"/>
          </div>

          <div className="border-t border-rc-200 bg-rc-50 px-8 py-4 text-center text-[10px] text-rc-500">
            {school} · {settings?.address_line || 'Harare, Zimbabwe'}
            {settings?.primary_phone && <> · {settings.primary_phone}</>}
            {settings?.email && <> · {settings.email}</>}
            <br/>
            Thank you for your payment. Keep this receipt for your records.
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rc-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function Sig({ title }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rc-500">{title}</p>
      <div className="mt-8 border-b border-rc-400"/>
      <p className="mt-1 text-[10px] text-rc-500">Signature · Date</p>
    </div>
  );
}
