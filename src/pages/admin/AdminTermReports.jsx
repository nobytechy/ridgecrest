/**
 * AdminTermReports — pick a class + term, edit class-teacher + headmaster
 * remarks per student, toggle published. Once published, parents and
 * students see the printable report card.
 */
import { useEffect, useMemo, useState } from 'react';
import { Save, Loader2, Printer, Eye, EyeOff, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function AdminTermReports() {
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [students, setStudents] = useState([]);
  const [reports, setReports] = useState({});  // student_id → row
  const [dirty, setDirty] = useState(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('rc_classes').select('id, name, level').order('position'),
      supabase.from('rc_terms').select('id, name, is_current').order('start_date', { ascending: false }),
    ]).then(([c, t]) => {
      setClasses(c.data || []); setTerms(t.data || []);
      if ((c.data || []).length) setClassId(c.data[0].id);
      const cur = (t.data || []).find((x) => x.is_current) || (t.data || [])[0];
      if (cur) setTermId(cur.id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    supabase.from('rc_students').select('id, student_code, display_name').eq('current_class_id', classId).eq('status', 'active').order('display_name')
      .then(({ data }) => setStudents(data || []));
  }, [classId]);

  useEffect(() => {
    if (!classId || !termId || students.length === 0) { setReports({}); return; }
    supabase.from('rc_term_reports').select('*').eq('term_id', termId).in('student_id', students.map((s) => s.id))
      .then(({ data }) => {
        const m = {};
        for (const r of (data || [])) m[r.student_id] = r;
        setReports(m);
        setDirty(new Set());
      });
  }, [classId, termId, students]);

  const setField = (sid, patch) => {
    setReports((prev) => ({ ...prev, [sid]: { ...(prev[sid] || {}), ...patch, student_id: sid, term_id: termId } }));
    setDirty((s) => new Set([...s, sid]));
  };

  const saveAll = async () => {
    setBusy(true);
    const rows = Array.from(dirty).map((sid) => ({
      student_id: sid, term_id: termId,
      class_teacher_remark: reports[sid]?.class_teacher_remark || null,
      headmaster_remark: reports[sid]?.headmaster_remark || null,
      conduct: reports[sid]?.conduct || null,
      position_in_class: reports[sid]?.position_in_class ? Number(reports[sid].position_in_class) : null,
      published: !!reports[sid]?.published,
    }));
    if (!rows.length) { setBusy(false); return; }
    const { error } = await supabase.from('rc_term_reports').upsert(rows, { onConflict: 'student_id,term_id' });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} report${rows.length === 1 ? '' : 's'} saved`);
    setDirty(new Set());
  };

  const togglePublish = async (sid) => {
    const r = reports[sid] || { student_id: sid, term_id: termId };
    setField(sid, { published: !r.published });
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Term reports</h1>
          <p className="mt-1 text-sm text-rc-600">Class-teacher and headmaster remarks. Published reports become visible to parents.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-rc-600">Class</label>
            <select className="input w-44" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-rc-600">Term</label>
            <select className="input w-44" value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button onClick={saveAll} disabled={busy || dirty.size === 0} className="btn-primary">
            {busy ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save {dirty.size > 0 && `(${dirty.size})`}
          </button>
        </div>
      </header>

      {students.length === 0 ? (
        <div className="card text-center"><FileText className="mx-auto mb-2 text-rc-400" size={24}/>No students in this class.</div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => {
            const r = reports[s.id] || {};
            return (
              <div key={s.id} className={cn('card', dirty.has(s.id) && 'border-rc-700 bg-rc-50/40')}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-rc-900">{s.display_name}</p>
                    <p className="text-xs font-mono text-rc-500">{s.student_code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => togglePublish(s.id)} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold', r.published ? 'bg-emerald-100 text-emerald-800' : 'bg-rc-100 text-rc-700')}>
                      {r.published ? <><Eye size={12}/> Published</> : <><EyeOff size={12}/> Draft</>}
                    </button>
                    <a href={`/print/report/${s.id}/${termId}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs"><Printer size={12}/> Preview</a>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <F label="Conduct">
                    <select className="input" value={r.conduct || ''} onChange={(e) => setField(s.id, { conduct: e.target.value })}>
                      <option value="">—</option>
                      <option>Excellent</option><option>Good</option><option>Satisfactory</option><option>Needs improvement</option>
                    </select>
                  </F>
                  <F label="Position in class"><input className="input" type="number" value={r.position_in_class || ''} onChange={(e) => setField(s.id, { position_in_class: e.target.value })}/></F>
                  <div/>
                  <F full label="Class-teacher remark">
                    <textarea className="input" rows={2} value={r.class_teacher_remark || ''} onChange={(e) => setField(s.id, { class_teacher_remark: e.target.value })} placeholder="Two or three sentences about progress this term…"/>
                  </F>
                  <F full label="Headmaster remark">
                    <textarea className="input" rows={2} value={r.headmaster_remark || ''} onChange={(e) => setField(s.id, { headmaster_remark: e.target.value })} placeholder="A short headmaster note…"/>
                  </F>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dirty.size > 0 && (
        <div className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-rc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl">
          {dirty.size} unsaved · click <strong className="ml-1">Save</strong>
        </div>
      )}
    </div>
  );
}
function F({ label, children, full }) {
  return (
    <div className={full ? 'md:col-span-3' : ''}>
      <label className="mb-1 block text-xs font-medium text-rc-600">{label}</label>
      {children}
    </div>
  );
}
