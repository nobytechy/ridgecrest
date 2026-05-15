/**
 * AdminAttendance — daily class register. Pick class + date, tap each
 * student to cycle present → absent → late → present.
 */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Save, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

const STATUS_CYCLE = ['present', 'absent', 'late', 'excused'];
const STATUS_TONE = {
  present:  { tone: 'bg-emerald-500 text-white',  ring: 'ring-emerald-300',  label: 'Present',  icon: CheckCircle2 },
  absent:   { tone: 'bg-rose-500 text-white',     ring: 'ring-rose-300',     label: 'Absent',   icon: XCircle },
  late:     { tone: 'bg-amber-500 text-white',    ring: 'ring-amber-300',    label: 'Late',     icon: Clock },
  excused:  { tone: 'bg-blue-500 text-white',     ring: 'ring-blue-300',     label: 'Excused',  icon: CheckCircle2 },
};

export default function AdminAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today);
  const [marks, setMarks] = useState({});  // student_id → status
  const [dirty, setDirty] = useState(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('rc_classes').select('id, name, level').order('position').then(({ data }) => {
      setClasses(data || []);
      if ((data || []).length) setClassId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    supabase.from('rc_students').select('id, student_code, display_name, photo_url').eq('current_class_id', classId).eq('status', 'active').order('display_name')
      .then(({ data }) => setStudents(data || []));
  }, [classId]);

  useEffect(() => {
    if (!classId || students.length === 0) { setMarks({}); setDirty(new Set()); return; }
    supabase.from('rc_attendance').select('student_id, status').eq('date', date).in('student_id', students.map((s) => s.id))
      .then(({ data }) => {
        const m = {};
        for (const r of (data || [])) m[r.student_id] = r.status;
        // Default any unmarked to 'present' so teacher can simply tap exceptions
        for (const s of students) if (!m[s.id]) m[s.id] = 'present';
        setMarks(m);
        setDirty(new Set());
      });
  }, [classId, date, students]);

  const cycle = (sid) => {
    setMarks((prev) => {
      const cur = prev[sid] || 'present';
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
      return { ...prev, [sid]: next };
    });
    setDirty((s) => new Set([...s, sid]));
  };

  const save = async () => {
    setBusy(true);
    const rows = students.map((s) => ({
      student_id: s.id, date, status: marks[s.id] || 'present',
    }));
    const { error } = await supabase.from('rc_attendance').upsert(rows, { onConflict: 'student_id,date' });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} attendance records saved`);
    setDirty(new Set());
  };

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const s of students) c[marks[s.id] || 'present']++;
    return c;
  }, [students, marks]);

  const currentClass = classes.find((c) => c.id === classId);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Daily attendance</h1>
          <p className="mt-1 text-sm text-rc-600">Tap each child to cycle through status. Defaults to <strong>Present</strong>.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-rc-600">Class</label>
            <select className="input w-44" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-rc-600">Date</label>
            <input className="input w-40" type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
          </div>
          <button onClick={save} disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save {dirty.size > 0 && `(${dirty.size} changed)`}</button>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-4 gap-3 text-center">
        {Object.entries(STATUS_TONE).map(([k, cfg]) => (
          <div key={k} className="card">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">{cfg.label}</p>
            <p className={cn('mt-1 font-display text-2xl font-bold', counts[k] > 0 ? 'text-rc-900' : 'text-rc-300')}>{counts[k]}</p>
          </div>
        ))}
      </div>

      {!classId || students.length === 0 ? (
        <div className="card text-center">
          <Users className="mx-auto mb-2 text-rc-400" size={24}/>
          <p className="text-sm text-rc-500">{!classId ? 'Pick a class.' : 'No students in this class.'}</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => {
            const status = marks[s.id] || 'present';
            const cfg = STATUS_TONE[status];
            const Icon = cfg.icon;
            const wasDirty = dirty.has(s.id);
            return (
              <button
                key={s.id} type="button" onClick={() => cycle(s.id)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border-2 bg-white p-3 text-left transition hover:border-rc-400',
                  wasDirty ? 'border-rc-700 shadow-md' : 'border-rc-200',
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-rc-100 text-sm font-display font-bold text-rc-900">
                    {s.photo_url ? <img src={s.photo_url} alt="" className="h-full w-full object-cover"/> : s.display_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-rc-900">{s.display_name}</p>
                    <p className="truncate text-[10px] font-mono text-rc-500">{s.student_code}</p>
                  </div>
                </div>
                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-2', cfg.tone, wasDirty ? cfg.ring : 'ring-transparent')}>
                  <Icon size={11}/> {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {dirty.size > 0 && (
        <div className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-rc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl">
          {dirty.size} unsaved change{dirty.size === 1 ? '' : 's'} — click <strong className="ml-1">Save</strong>
        </div>
      )}
    </div>
  );
}
