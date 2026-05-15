/**
 * Marks entry — pick term + class + assessment, then enter a row per student
 * × subject. Auto-saves to re_results on Save. Auto-grades from mark via
 * gradeOf() but lets you override.
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Loader2, ClipboardList, Eye, EyeOff, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { gradeOf } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function AdminMarks() {
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});   // { studentId-subjectId : { mark, grade, remarks, dirty, id? } }
  const [creating, setCreating] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('rc_terms').select('*').order('start_date', { ascending: false }),
      supabase.from('rc_classes').select('id, name, level').order('position'),
      supabase.from('rc_subjects').select('id, code, name').order('position'),
    ]).then(([t, c, s]) => {
      setTerms(t.data || []);
      setClasses(c.data || []);
      setSubjects(s.data || []);
      const current = (t.data || []).find((x) => x.is_current) || (t.data || [])[0];
      if (current) setTermId(current.id);
      if ((c.data || []).length) setClassId(c.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!termId) { setAssessments([]); return; }
    supabase.from('rc_assessments').select('*').eq('term_id', termId).order('scheduled_for', { ascending: false })
      .then(({ data }) => {
        setAssessments(data || []);
        if (data && data.length && !assessmentId) setAssessmentId(data[0].id);
      });
  }, [termId]);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    supabase.from('rc_students').select('id, student_code, display_name').eq('current_class_id', classId).eq('status', 'active').order('display_name')
      .then(({ data }) => setStudents(data || []));
  }, [classId]);

  useEffect(() => {
    if (!assessmentId || !students.length) { setMarks({}); return; }
    supabase.from('rc_results').select('*').eq('assessment_id', assessmentId).in('student_id', students.map((s) => s.id))
      .then(({ data }) => {
        const map = {};
        for (const r of (data || [])) {
          map[`${r.student_id}-${r.subject_id}`] = { id: r.id, mark: r.mark, grade: r.grade, remarks: r.remarks, dirty: false };
        }
        setMarks(map);
      });
  }, [assessmentId, students]);

  const cellKey = (sid, subId) => `${sid}-${subId}`;
  const setCell = (sid, subId, patch) => {
    const k = cellKey(sid, subId);
    setMarks((prev) => {
      const next = { ...prev };
      const cur = next[k] || { mark: '', grade: '', remarks: '' };
      const merged = { ...cur, ...patch, dirty: true };
      if ('mark' in patch) merged.grade = gradeOf(patch.mark);
      next[k] = merged;
      return next;
    });
  };

  const dirtyCount = Object.values(marks).filter((m) => m.dirty).length;

  const saveAll = async () => {
    if (!assessmentId) return toast.error('Pick an assessment.');
    setBusy(true);
    const toUpsert = [];
    for (const s of students) {
      for (const sub of subjects) {
        const k = cellKey(s.id, sub.id);
        const m = marks[k];
        if (m && m.dirty && m.mark !== '' && m.mark != null) {
          toUpsert.push({
            student_id: s.id, assessment_id: assessmentId, subject_id: sub.id,
            mark: Number(m.mark), grade: m.grade || gradeOf(m.mark), remarks: m.remarks || null,
          });
        }
      }
    }
    if (!toUpsert.length) { setBusy(false); return toast('No changes to save.', { icon: 'ℹ' }); }
    const { error } = await supabase.from('rc_results').upsert(toUpsert, { onConflict: 'student_id,assessment_id,subject_id' });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${toUpsert.length} mark${toUpsert.length === 1 ? '' : 's'}`);
    // refresh
    setMarks((prev) => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) next[k] = { ...v, dirty: false };
      return next;
    });
  };

  const togglePublish = async () => {
    const assess = assessments.find((a) => a.id === assessmentId);
    if (!assess) return;
    const { error } = await supabase.from('rc_assessments').update({ is_published: !assess.is_published }).eq('id', assess.id);
    if (error) return toast.error(error.message);
    toast.success(assess.is_published ? 'Hidden from students/parents' : 'Published — students/parents can now see marks');
    const { data } = await supabase.from('rc_assessments').select('*').eq('term_id', termId).order('scheduled_for', { ascending: false });
    setAssessments(data || []);
  };

  const newAssessment = async (e) => {
    e?.preventDefault();
    if (!creating.name.trim()) return toast.error('Name is required.');
    const { error } = await supabase.from('rc_assessments').insert({
      term_id: termId, name: creating.name.trim(), kind: creating.kind,
      max_mark: Number(creating.max_mark || 100),
      scheduled_for: creating.scheduled_for || null, is_published: false,
    });
    if (error) return toast.error(error.message);
    toast.success('Assessment created');
    setCreating(null);
    const { data } = await supabase.from('rc_assessments').select('*').eq('term_id', termId).order('scheduled_for', { ascending: false });
    setAssessments(data || []);
    if (data && data[0]) setAssessmentId(data[0].id);
  };

  const currentAssessment = assessments.find((a) => a.id === assessmentId);

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Marks entry</h1>
          <p className="mt-1 text-sm text-rc-600">Pick a term, class, and assessment, then enter marks across all subjects.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCreating({ name: '', kind: 'test', max_mark: 100, scheduled_for: new Date().toISOString().slice(0,10) })} className="btn-secondary"><Plus size={14}/> New assessment</button>
          <button onClick={saveAll} disabled={busy || dirtyCount === 0} className="btn-primary">
            {busy ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save {dirtyCount > 0 && `(${dirtyCount})`}
          </button>
        </div>
      </header>

      <div className="card mb-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-rc-600">Term</label>
            <select className="input" value={termId} onChange={(e) => { setTermId(e.target.value); setAssessmentId(''); }}>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' · current' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-rc-600">Class</label>
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-rc-600">Assessment</label>
            <select className="input" value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
              {assessments.length === 0 && <option value="">— No assessments in this term —</option>}
              {assessments.map((a) => <option key={a.id} value={a.id}>{a.name}{a.is_published ? ' · published' : ' · draft'}</option>)}
            </select>
          </div>
        </div>
        {currentAssessment && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-rc-50 px-3 py-2 text-xs">
            <span className="text-rc-700">
              Max mark: <strong>{currentAssessment.max_mark}</strong>{' '}
              · Visible to students/parents:{' '}
              <strong>{currentAssessment.is_published ? 'YES' : 'NO (draft)'}</strong>
            </span>
            <button onClick={togglePublish} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-rc-900 ring-1 ring-rc-200 hover:bg-rc-100">
              {currentAssessment.is_published ? <><EyeOff size={11}/> Unpublish</> : <><Eye size={11}/> Publish</>}
            </button>
          </div>
        )}
      </div>

      {!assessmentId || students.length === 0 ? (
        <div className="card text-center">
          <ClipboardList className="mx-auto mb-2 text-rc-400" size={24}/>
          <p className="text-sm text-rc-500">{!assessmentId ? 'Create or pick an assessment.' : 'No students in this class yet.'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-rc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-rc-50 text-left text-xs uppercase tracking-wider text-rc-500 sticky top-0">
                  <th className="px-4 py-3 sticky left-0 bg-rc-50 z-10">Student</th>
                  {subjects.map((sub) => <th key={sub.id} className="px-2 py-3 text-center">{sub.code}</th>)}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-rc-100">
                    <td className="px-4 py-2 sticky left-0 bg-white z-10">
                      <p className="font-medium text-rc-900">{s.display_name}</p>
                      <p className="text-[10px] font-mono text-rc-500">{s.student_code}</p>
                    </td>
                    {subjects.map((sub) => {
                      const k = cellKey(s.id, sub.id);
                      const m = marks[k] || {};
                      return (
                        <td key={sub.id} className={cn('px-1 py-1 text-center', m.dirty && 'bg-amber-50')}>
                          <input
                            type="number" min={0} max={currentAssessment?.max_mark || 100}
                            value={m.mark ?? ''}
                            onChange={(e) => setCell(s.id, sub.id, { mark: e.target.value })}
                            className="w-14 rounded-md border border-rc-200 bg-white px-1 py-1 text-center text-sm focus:border-rc-700 focus:outline-none"
                          />
                          {m.mark !== '' && m.mark != null && (
                            <p className="mt-0.5 text-[10px] font-semibold text-rc-600">{m.grade || gradeOf(m.mark)}</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dirtyCount > 0 && (
        <div className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-rc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl">
          {dirtyCount} unsaved · click Save above
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setCreating(null)}>
          <div className="flex-1 bg-rc-900/40"/>
          <form onSubmit={newAssessment} onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-rc-900">New assessment</h2>
              <button type="button" onClick={() => setCreating(null)} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
            </div>
            <div className="grid gap-4">
              <F label="Name *"><input className="input" value={creating.name} onChange={(e) => setCreating({...creating, name: e.target.value})} placeholder="Mid-Term Test"/></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Kind"><select className="input" value={creating.kind} onChange={(e) => setCreating({...creating, kind: e.target.value})}>
                  <option value="test">Test</option><option value="exam">Exam</option><option value="assignment">Assignment</option><option value="continuous">Continuous</option>
                </select></F>
                <F label="Max mark"><input className="input" type="number" value={creating.max_mark} onChange={(e) => setCreating({...creating, max_mark: e.target.value})}/></F>
              </div>
              <F label="Scheduled for"><input className="input" type="date" value={creating.scheduled_for} onChange={(e) => setCreating({...creating, scheduled_for: e.target.value})}/></F>
              <p className="text-xs text-rc-500">New assessments are created as <strong>draft</strong>. Publish once you&apos;re happy with the marks so students and parents can see them.</p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(null)} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary"><Save size={14}/> Create</button>
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
