/**
 * Fees & Payments — invoice ledger + per-row Pay button, prints receipt.
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Receipt, Loader2, X, CheckCircle2, Edit3, Trash2, Printer, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { formatMoney, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONE = {
  open: 'bg-amber-100 text-amber-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  void: 'bg-slate-200 text-slate-500',
};

async function nextCode(prefix, table, column) {
  const year = new Date().getFullYear();
  const { data } = await supabase.from(table).select(column).like(column, `${prefix}-${year}-%`).order(column, { ascending: false }).limit(1);
  const last = data?.[0]?.[column];
  const lastN = last ? parseInt(String(last).split('-').pop(), 10) || 0 : 0;
  return `${prefix}-${year}-${String(lastN + 1).padStart(4, '0')}`;
}

export default function AdminFees() {
  const [rows, setRows] = useState([]);
  const [terms, setTerms] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [q, setQ] = useState('');
  const [paying, setPaying] = useState(null);
  const [creatingBulk, setCreatingBulk] = useState(null);
  const [busy, setBusy] = useState(false);

  const [settings, setSettings] = useState({ sibling_discount_pct: 10, sibling_discount_third_pct: 15 });

  useEffect(() => { load(); }, []);
  async function load() {
    const [i, t, s, c, f, st] = await Promise.all([
      supabase.from('rc_invoices').select('*, student:rc_students(student_code, display_name, class:rc_classes(name)), term:rc_terms(name)').order('due_date', { ascending: false }),
      supabase.from('rc_terms').select('*').order('start_date', { ascending: false }),
      supabase.from('rc_students').select('id, student_code, display_name, current_class_id').eq('status', 'active'),
      supabase.from('rc_classes').select('id, name').order('position'),
      supabase.from('rc_fee_structures').select('*'),
      supabase.from('rc_site_settings').select('sibling_discount_pct, sibling_discount_third_pct').limit(1).maybeSingle(),
    ]);
    setRows(i.data || []); setTerms(t.data || []);
    setStudents(s.data || []); setClasses(c.data || []);
    setFeeStructures(f.data || []);
    if (st.data) setSettings({
      sibling_discount_pct: Number(st.data.sibling_discount_pct ?? 10),
      sibling_discount_third_pct: Number(st.data.sibling_discount_third_pct ?? 15),
    });
  }

  // Count active siblings sharing a parent. Returns map studentId -> sibling count (incl. self).
  async function loadSiblingCounts(studentIds) {
    const { data: links } = await supabase.from('rc_student_parents').select('student_id, parent_id').in('student_id', studentIds);
    const parentIdsByStu = new Map();
    const parentsAll = new Set();
    (links || []).forEach((l) => {
      if (!parentIdsByStu.has(l.student_id)) parentIdsByStu.set(l.student_id, []);
      parentIdsByStu.get(l.student_id).push(l.parent_id);
      parentsAll.add(l.parent_id);
    });
    if (!parentsAll.size) return new Map(studentIds.map((id) => [id, 1]));
    const { data: famLinks } = await supabase.from('rc_student_parents').select('student_id, parent_id').in('parent_id', Array.from(parentsAll));
    const sibsByStu = new Map();
    studentIds.forEach((sid) => {
      const myParents = parentIdsByStu.get(sid) || [];
      const family = new Set();
      (famLinks || []).forEach((l) => { if (myParents.includes(l.parent_id)) family.add(l.student_id); });
      family.add(sid);
      sibsByStu.set(sid, family.size);
    });
    return sibsByStu;
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const qq = q.toLowerCase();
    return rows.filter((r) => [r.invoice_no, r.student?.display_name, r.student?.student_code, r.term?.name].join(' ').toLowerCase().includes(qq));
  }, [rows, q]);

  const startPayment = async (inv) => {
    const next = await nextCode('RCT', 'rc_payments', 'receipt_no');
    const outstanding = Number(inv.total_usd) - Number(inv.paid_usd || 0);
    setPaying({ invoice: inv, receipt_no: next, amount_usd: outstanding > 0 ? outstanding : inv.total_usd, method: 'cash', reference: '', notes: '' });
  };

  const recordPayment = async (e) => {
    e?.preventDefault();
    if (Number(paying.amount_usd) <= 0) return toast.error('Amount must be > 0');
    setBusy(true);
    const receipt_no = await nextCode('RCT', 'rc_payments', 'receipt_no');
    const insertRes = await supabase.from('rc_payments').insert({
      receipt_no, invoice_id: paying.invoice.id,
      amount_usd: Number(paying.amount_usd),
      method: paying.method, reference: paying.reference || null,
      notes: paying.notes || null,
    }).select().single();
    if (insertRes.error) { setBusy(false); return toast.error(insertRes.error.message); }
    // Update invoice paid_usd + status
    const newPaid = Number(paying.invoice.paid_usd || 0) + Number(paying.amount_usd);
    const newStatus = newPaid >= Number(paying.invoice.total_usd) ? 'paid' : 'partial';
    await supabase.from('rc_invoices').update({ paid_usd: newPaid, status: newStatus }).eq('id', paying.invoice.id);
    setBusy(false);
    toast.success(`${receipt_no} recorded`);
    setPaying(null);
    if (insertRes.data?.id) window.open(`/print/receipt/${insertRes.data.id}`, '_blank', 'noopener');
    load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete invoice ${row.invoice_no}? Payments tied to it will keep their record but lose the link.`)) return;
    const { error } = await supabase.from('rc_invoices').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  // Bulk generate invoices for a term × class (uses fee structures)
  const generateInvoices = async (e) => {
    e?.preventDefault();
    if (!creatingBulk.term_id || !creatingBulk.class_id) return toast.error('Pick term and class.');
    setBusy(true);
    const struct = feeStructures.filter((s) => s.term_id === creatingBulk.term_id && s.class_id === creatingBulk.class_id);
    if (!struct.length) { setBusy(false); return toast.error('No fee structure for that term + class. Set one up first.'); }
    const totalPerStudent = struct.filter((s) => s.is_mandatory).reduce((s, r) => s + Number(r.amount_usd || 0), 0);
    const classStudents = students.filter((s) => s.current_class_id === creatingBulk.class_id);
    if (!classStudents.length) { setBusy(false); return toast.error('No students in that class.'); }

    const sibsByStu = await loadSiblingCounts(classStudents.map((s) => s.id));
    let generated = 0; let discounted = 0;
    for (const stu of classStudents) {
      const existing = rows.find((r) => r.student_id === stu.id && r.term_id === creatingBulk.term_id);
      if (existing) continue;
      const invoice_no = await nextCode('INV', 'rc_invoices', 'invoice_no');
      const sibCount = sibsByStu.get(stu.id) || 1;
      let pct = 0;
      if (sibCount >= 3) pct = Number(settings.sibling_discount_third_pct || 0);
      else if (sibCount === 2) pct = Number(settings.sibling_discount_pct || 0);
      const total = Math.round((totalPerStudent * (1 - pct / 100)) * 100) / 100;
      if (pct > 0) discounted++;
      await supabase.from('rc_invoices').insert({
        invoice_no, student_id: stu.id, term_id: creatingBulk.term_id,
        total_usd: total, paid_usd: 0,
        due_date: creatingBulk.due_date || null, status: 'open',
        notes: pct > 0
          ? `Auto-generated · sibling discount ${pct}% (${sibCount} children)`
          : `Auto-generated for term × class`,
      });
      generated++;
    }
    setBusy(false);
    toast.success(`Generated ${generated} invoice${generated === 1 ? '' : 's'}${discounted ? ` · ${discounted} with sibling discount` : ''}`);
    setCreatingBulk(null);
    load();
  };

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Fees &amp; Payments</h1>
          <p className="mt-1 text-sm text-rc-600">{rows.length} invoices · {rows.filter((r) => r.status === 'open' || r.status === 'partial').length} open / partial.</p>
        </div>
        <button onClick={() => setCreatingBulk({ term_id: terms.find((t) => t.is_current)?.id || '', class_id: classes[0]?.id || '', due_date: '' })} className="btn-primary"><Plus size={14}/> Generate invoices</button>
      </header>

      <div className="card mb-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rc-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by invoice, student, term…"/>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-rc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rc-50 text-left text-xs uppercase tracking-wider text-rc-500">
                <th className="px-4 py-3">Invoice</th>
                <th>Student</th><th>Class</th><th>Term</th>
                <th className="text-right">Total</th><th className="text-right">Paid</th>
                <th>Status</th><th>Due</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-sm text-rc-500"><Receipt className="mx-auto mb-2 text-rc-400" size={24}/>No invoices yet.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-rc-100">
                  <td className="px-4 py-3 font-mono text-xs">{r.invoice_no}</td>
                  <td>{r.student?.display_name}<br/><span className="font-mono text-[10px] text-rc-500">{r.student?.student_code}</span></td>
                  <td>{r.student?.class?.name || '—'}</td>
                  <td>{r.term?.name}</td>
                  <td className="text-right font-semibold">{formatMoney({ amount: r.total_usd, currency: 'USD' })}</td>
                  <td className="text-right text-emerald-700">{formatMoney({ amount: r.paid_usd, currency: 'USD' })}</td>
                  <td><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[r.status])}>{r.status}</span></td>
                  <td>{formatDate(r.due_date)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {r.status !== 'paid' && r.status !== 'void' && (
                      <button onClick={() => startPayment(r)} className="mr-1 inline-flex items-center gap-1.5 rounded-lg border-2 border-emerald-600 bg-emerald-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-600">
                        <CheckCircle2 size={12}/> Pay
                      </button>
                    )}
                    <button onClick={() => remove(r)} title="Delete" className="inline-flex rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {paying && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setPaying(null)}>
          <div className="flex-1 bg-rc-900/40"/>
          <form onSubmit={recordPayment} onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-rc-900">Record payment</h2>
              <button type="button" onClick={() => setPaying(null)} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
            </div>
            <div className="mb-4 rounded-lg bg-rc-50 p-3 text-sm">
              <p className="font-semibold text-rc-900">{paying.invoice.invoice_no}</p>
              <p className="text-xs text-rc-600">{paying.invoice.student?.display_name} · {paying.invoice.term?.name}</p>
              <p className="mt-1 text-xs">Total: {formatMoney({ amount: paying.invoice.total_usd, currency: 'USD' })} · Paid: {formatMoney({ amount: paying.invoice.paid_usd, currency: 'USD' })}</p>
            </div>
            <div className="grid gap-3">
              <F label="Amount (US$)"><input className="input" type="number" step="0.01" value={paying.amount_usd} onChange={(e) => setPaying({...paying, amount_usd: e.target.value})}/></F>
              <F label="Method">
                <select className="input" value={paying.method} onChange={(e) => setPaying({...paying, method: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="paynow">PayNow</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="ecocash">EcoCash</option>
                  <option value="onemoney">OneMoney</option>
                </select>
              </F>
              <F label="Reference"><input className="input" value={paying.reference} onChange={(e) => setPaying({...paying, reference: e.target.value})} placeholder="Bank slip, mobile txn"/></F>
              <F label="Notes"><textarea className="input" rows={2} value={paying.notes} onChange={(e) => setPaying({...paying, notes: e.target.value})}/></F>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setPaying(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary"><Printer size={14}/> {busy ? <Loader2 className="animate-spin" size={14}/> : null} Record &amp; print</button>
            </div>
          </form>
        </div>
      )}

      {creatingBulk && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setCreatingBulk(null)}>
          <div className="flex-1 bg-rc-900/40"/>
          <form onSubmit={generateInvoices} onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-rc-900">Generate term invoices</h2>
              <button type="button" onClick={() => setCreatingBulk(null)} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
            </div>
            <p className="mb-4 rounded-lg bg-rc-50 p-3 text-xs text-rc-700">
              Picks every active student in the chosen class and creates a single invoice per student for that term, using the fee structure.
            </p>
            <div className="grid gap-3">
              <F label="Term"><select className="input" value={creatingBulk.term_id} onChange={(e) => setCreatingBulk({...creatingBulk, term_id: e.target.value})}>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></F>
              <F label="Class"><select className="input" value={creatingBulk.class_id} onChange={(e) => setCreatingBulk({...creatingBulk, class_id: e.target.value})}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></F>
              <F label="Due date"><input className="input" type="date" value={creatingBulk.due_date} onChange={(e) => setCreatingBulk({...creatingBulk, due_date: e.target.value})}/></F>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCreatingBulk(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary"><BookOpen size={14}/> {busy ? <Loader2 className="animate-spin" size={14}/> : null} Generate</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function F({ label, children }) {
  return (<div><label className="mb-1 block text-xs font-medium text-rc-600">{label}</label>{children}</div>);
}
