/**
 * AdminSchemes — list every scheme of work, with quick filtering and a
 * full editor that lets teachers manage their week-by-week breakdown.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Edit3, X, BookOpen, Loader2, Trash2, ChevronRight,
  CheckCircle2, Circle, ArrowLeft, Save, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONE = {
  draft: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-slate-200 text-slate-600',
};

export default function AdminSchemes() {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [weeksCount, setWeeksCount] = useState({}); // scheme_id → {total, done}
  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [openScheme, setOpenScheme] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const [s, c, sub, t, st, w] = await Promise.all([
      supabase.from('rc_schemes').select(`*, class:rc_classes(name, level), subject:rc_subjects(name, code), term:rc_terms(name, is_current), teacher:rc_staff(display_name, employee_id)`).order('updated_at', { ascending: false }),
      supabase.from('rc_classes').select('id, name, level').order('position'),
      supabase.from('rc_subjects').select('id, code, name').order('position'),
      supabase.from('rc_terms').select('id, name, is_current, start_date, end_date').order('start_date', { ascending: false }),
      supabase.from('rc_staff').select('id, display_name, employee_id').eq('status', 'active').in('role_id', ['teacher','headmaster','admin']),
      supabase.from('rc_scheme_weeks').select('scheme_id, completed'),
    ]);
    setRows(s.data || []); setClasses(c.data || []); setSubjects(sub.data || []);
    setTerms(t.data || []); setTeachers(st.data || []);
    const wc = {};
    for (const row of (w.data || [])) {
      const k = row.scheme_id;
      wc[k] = wc[k] || { total: 0, done: 0 };
      wc[k].total += 1;
      if (row.completed) wc[k].done += 1;
    }
    setWeeksCount(wc);
  }

  const filtered = useMemo(() => {
    let list = rows;
    if (classFilter) list = list.filter((r) => r.class_id === classFilter);
    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter((r) => [r.title, r.class?.name, r.subject?.name, r.term?.name, r.teacher?.display_name].join(' ').toLowerCase().includes(qq));
    }
    return list;
  }, [rows, classFilter, q]);

  const startAdd = () => setEditing({
    class_id: classes[0]?.id || '',
    subject_id: subjects[0]?.id || '',
    term_id: terms.find((t) => t.is_current)?.id || terms[0]?.id || '',
    teacher_id: teachers[0]?.id || '',
    title: '',
    overview: '',
    status: 'active',
  });

  const save = async (e) => {
    e?.preventDefault();
    if (!editing.title.trim()) return toast.error('Title is required.');
    setBusy(true);
    const payload = {
      class_id: editing.class_id, subject_id: editing.subject_id,
      term_id: editing.term_id, teacher_id: editing.teacher_id || null,
      title: editing.title.trim(), overview: editing.overview || null,
      status: editing.status,
    };
    let res;
    if (editing.id) res = await supabase.from('rc_schemes').update(payload).eq('id', editing.id);
    else            res = await supabase.from('rc_schemes').insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved'); setEditing(null); load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete scheme "${row.title}"? All week entries will be removed.`)) return;
    const { error } = await supabase.from('rc_schemes').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  if (openScheme) return <SchemeDetail scheme={openScheme} onBack={() => { setOpenScheme(null); load(); }}/>;

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Schemes of work</h1>
          <p className="mt-1 text-sm text-rc-600">
            One scheme per class · subject · term. Teachers tick weeks off as they complete them.
          </p>
        </div>
        <button onClick={startAdd} className="btn-primary"><Plus size={14}/> New scheme</button>
      </header>

      <div className="card mb-4 grid gap-3 md:grid-cols-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rc-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by title, class, subject, teacher…"/>
        </div>
        <select className="input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="card md:col-span-2 text-center">
            <BookOpen className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No schemes match.</p>
          </div>
        ) : filtered.map((r) => {
          const wc = weeksCount[r.id] || { total: 0, done: 0 };
          const pct = wc.total ? Math.round((wc.done / wc.total) * 100) : 0;
          return (
            <div key={r.id} className="card hover:border-rc-400 transition cursor-pointer" onClick={() => setOpenScheme(r)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-rc-900">{r.title}</p>
                  <p className="text-xs text-rc-500">{r.class?.name} · {r.subject?.name} · {r.term?.name}</p>
                </div>
                <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider self-start', STATUS_TONE[r.status])}>{r.status}</span>
                  <button onClick={() => setEditing(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><Edit3 size={14}/></button>
                  <button onClick={() => remove(r)} className="rounded-md p-1.5 text-rc-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
                </div>
              </div>
              {r.overview && <p className="mt-2 line-clamp-2 text-xs text-rc-600">{r.overview}</p>}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-rc-500">
                  <span>Weeks completed</span>
                  <span>{wc.done} / {wc.total}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-rc-100">
                  <div className="h-full bg-rc-900" style={{ width: `${pct}%` }}/>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-rc-500">
                <span>{r.teacher?.display_name || 'Unassigned teacher'}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-rc-700">Open <ChevronRight size={12}/></span>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <Drawer title={editing.id ? 'Edit scheme' : 'New scheme'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="grid gap-4">
            <F label="Title *"><input className="input" value={editing.title} onChange={(e) => setEditing({...editing, title: e.target.value})} placeholder="e.g. Mathematics — Grade 3 — Term 2 2026" required/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Class *">
                <select className="input" value={editing.class_id} onChange={(e) => setEditing({...editing, class_id: e.target.value})}>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </F>
              <F label="Subject *">
                <select className="input" value={editing.subject_id} onChange={(e) => setEditing({...editing, subject_id: e.target.value})}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Term *">
                <select className="input" value={editing.term_id} onChange={(e) => setEditing({...editing, term_id: e.target.value})}>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' · current' : ''}</option>)}
                </select>
              </F>
              <F label="Teacher">
                <select className="input" value={editing.teacher_id || ''} onChange={(e) => setEditing({...editing, teacher_id: e.target.value})}>
                  <option value="">— Unassigned —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.display_name}</option>)}
                </select>
              </F>
            </div>
            <F label="Overview"><textarea className="input" rows={4} value={editing.overview || ''} onChange={(e) => setEditing({...editing, overview: e.target.value})} placeholder="What the term is going to cover."/></F>
            <F label="Status">
              <select className="input" value={editing.status} onChange={(e) => setEditing({...editing, status: e.target.value})}>
                {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : null} Save</button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}

/* ─── Per-scheme editor — week-by-week ──────────────────────────────── */

function SchemeDetail({ scheme, onBack }) {
  const [weeks, setWeeks] = useState([]);
  const [dirty, setDirty] = useState(new Set());
  const [deleted, setDeleted] = useState(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('rc_scheme_weeks').select('*').eq('scheme_id', scheme.id).order('week_number')
      .then(({ data }) => setWeeks(data || []));
  }, [scheme.id]);

  const setWeek = (idx, patch) => {
    setWeeks((arr) => {
      const next = [...arr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
    const id = weeks[idx]?.id;
    if (id) setDirty((s) => new Set([...s, id]));
  };

  const addWeek = () => {
    const max = weeks.reduce((m, w) => Math.max(m, w.week_number || 0), 0);
    setWeeks((arr) => [...arr, {
      id: null, _local: crypto.randomUUID(), scheme_id: scheme.id,
      week_number: max + 1, week_start_date: '', topic: '', subtopics: '',
      learning_objectives: '', teaching_methods: '', resources: '', assessment_strategy: '',
      completed: false, completion_notes: '',
    }]);
  };

  const removeWeek = (idx) => {
    const w = weeks[idx];
    if (w.id) setDeleted((s) => new Set([...s, w.id]));
    setWeeks((arr) => arr.filter((_, i) => i !== idx));
  };

  const toggleComplete = (idx) => {
    setWeek(idx, { completed: !weeks[idx].completed });
  };

  const save = async () => {
    setBusy(true);
    // Updates
    for (const w of weeks) {
      if (w.id && dirty.has(w.id)) {
        await supabase.from('rc_scheme_weeks').update({
          week_number: w.week_number, week_start_date: w.week_start_date || null,
          topic: w.topic, subtopics: w.subtopics,
          learning_objectives: w.learning_objectives, teaching_methods: w.teaching_methods,
          resources: w.resources, assessment_strategy: w.assessment_strategy,
          completed: !!w.completed, completion_notes: w.completion_notes,
        }).eq('id', w.id);
      }
    }
    // Inserts
    const toInsert = weeks.filter((w) => !w.id && w.topic?.trim());
    if (toInsert.length) {
      await supabase.from('rc_scheme_weeks').insert(toInsert.map((w) => ({
        scheme_id: scheme.id,
        week_number: w.week_number,
        week_start_date: w.week_start_date || null,
        topic: w.topic, subtopics: w.subtopics,
        learning_objectives: w.learning_objectives, teaching_methods: w.teaching_methods,
        resources: w.resources, assessment_strategy: w.assessment_strategy,
        completed: !!w.completed, completion_notes: w.completion_notes,
      })));
    }
    if (deleted.size) {
      await supabase.from('rc_scheme_weeks').delete().in('id', Array.from(deleted));
    }
    setBusy(false);
    toast.success('Saved');
    onBack();
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900"><ArrowLeft size={14}/> Back to schemes</button>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">{scheme.title}</h1>
          <p className="mt-1 text-sm text-rc-600">
            {scheme.class?.name} · {scheme.subject?.name} · {scheme.term?.name} · {scheme.teacher?.display_name || 'Unassigned'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={addWeek} className="btn-secondary"><Plus size={14}/> Add week</button>
          <button onClick={save} disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save all</button>
        </div>
      </header>

      {scheme.overview && (
        <p className="mb-4 rounded-xl border border-rc-200 bg-rc-50/60 p-4 text-sm text-rc-700">{scheme.overview}</p>
      )}

      <div className="space-y-3">
        {weeks.length === 0 ? (
          <div className="card text-center">
            <CalendarDays className="mx-auto mb-2 text-rc-400" size={24}/>
            <p className="text-sm text-rc-500">No weeks yet — click "Add week" to start.</p>
          </div>
        ) : weeks.map((w, i) => (
          <div key={w.id || w._local} className={cn('card', w.completed && 'bg-emerald-50/40 border-emerald-200')}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => toggleComplete(i)} className={cn('mt-0.5 grid h-7 w-7 place-items-center rounded-lg transition', w.completed ? 'bg-emerald-600 text-white' : 'bg-rc-100 text-rc-500 hover:bg-rc-200')}>
                  {w.completed ? <CheckCircle2 size={16}/> : <Circle size={16}/>}
                </button>
                <div>
                  <p className="font-display text-base font-bold text-rc-900">
                    Week {w.week_number}{w.week_start_date ? ` · ${formatDate(w.week_start_date)}` : ''}
                  </p>
                  <input
                    value={w.topic} onChange={(e) => setWeek(i, { topic: e.target.value })}
                    placeholder="Topic"
                    className="mt-1 w-full border-none bg-transparent text-lg font-medium text-rc-900 focus:outline-none"
                  />
                </div>
              </div>
              <button onClick={() => removeWeek(i)} className="rounded-md p-1.5 text-rc-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Sub-topics"           value={w.subtopics}            onChange={(v) => setWeek(i, { subtopics: v })}/>
              <Field label="Learning objectives"  value={w.learning_objectives}  onChange={(v) => setWeek(i, { learning_objectives: v })}/>
              <Field label="Teaching methods"     value={w.teaching_methods}     onChange={(v) => setWeek(i, { teaching_methods: v })}/>
              <Field label="Resources"            value={w.resources}            onChange={(v) => setWeek(i, { resources: v })}/>
              <Field label="Assessment strategy"  value={w.assessment_strategy}  onChange={(v) => setWeek(i, { assessment_strategy: v })} full/>
              {w.completed && (
                <Field label="Completion notes" value={w.completion_notes || ''} onChange={(v) => setWeek(i, { completion_notes: v })} full/>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-rc-500">
              <div>
                <label className="font-semibold uppercase tracking-wider">Week start date</label>
                <input type="date" className="input mt-1" value={w.week_start_date || ''} onChange={(e) => setWeek(i, { week_start_date: e.target.value })}/>
              </div>
              <div>
                <label className="font-semibold uppercase tracking-wider">Week #</label>
                <input type="number" className="input mt-1" value={w.week_number} onChange={(e) => setWeek(i, { week_number: Number(e.target.value || 0) })}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, full }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-rc-500">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-md border border-rc-200 bg-white px-2 py-1.5 text-sm text-rc-800 focus:border-rc-700 focus:outline-none"
      />
    </div>
  );
}

function Drawer({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-rc-900/40"/>
      <div onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-rc-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function F({ label, children }) {
  return (<div><label className="mb-1 block text-xs font-medium text-rc-600">{label}</label>{children}</div>);
}
