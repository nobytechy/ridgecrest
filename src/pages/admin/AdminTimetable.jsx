/**
 * AdminTimetable — pick a class, edit the Mon–Fri week grid.
 * Each cell is one subject + teacher + room for one period of one day.
 */
import { useEffect, useState, useMemo } from 'react';
import { Plus, Save, Loader2, CalendarDays, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DEFAULT_PERIODS = [
  { period: 1, start_time: '07:30', end_time: '08:15' },
  { period: 2, start_time: '08:15', end_time: '09:00' },
  { period: 3, start_time: '09:30', end_time: '10:15' },
  { period: 4, start_time: '10:15', end_time: '11:00' },
  { period: 5, start_time: '11:30', end_time: '12:15' },
  { period: 6, start_time: '12:15', end_time: '13:00' },
];

export default function AdminTimetable() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classId, setClassId] = useState('');
  const [slots, setSlots] = useState({});  // key day-period → row
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('rc_classes').select('id, name, level').order('position'),
      supabase.from('rc_subjects').select('id, code, name').order('position'),
      supabase.from('rc_staff').select('id, display_name, employee_id').eq('status', 'active').in('role_id', ['teacher','headmaster','admin']),
    ]).then(([c, s, t]) => {
      setClasses(c.data || []);
      setSubjects(s.data || []);
      setTeachers(t.data || []);
      if ((c.data || []).length) setClassId(c.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    supabase.from('rc_timetable_slots')
      .select('*, subject:rc_subjects(name, code), teacher:rc_staff(display_name)')
      .eq('class_id', classId)
      .then(({ data }) => {
        const map = {};
        for (const r of (data || [])) map[`${r.day_of_week}-${r.period}`] = r;
        setSlots(map);
      });
  }, [classId]);

  const grid = useMemo(() => {
    return DEFAULT_PERIODS.map((p) => ({
      ...p,
      cells: [1, 2, 3, 4, 5].map((d) => slots[`${d}-${p.period}`] || null),
    }));
  }, [slots]);

  const startEdit = (day, period, existing) => {
    setEditing({
      day_of_week: day,
      period,
      start_time: existing?.start_time || DEFAULT_PERIODS.find((p) => p.period === period)?.start_time || '',
      end_time:   existing?.end_time   || DEFAULT_PERIODS.find((p) => p.period === period)?.end_time   || '',
      subject_id: existing?.subject_id || '',
      teacher_id: existing?.teacher_id || '',
      room:       existing?.room || '',
      notes:      existing?.notes || '',
      id: existing?.id || null,
    });
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!editing.subject_id) return toast.error('Pick a subject.');
    setBusy(true);
    const payload = {
      class_id: classId,
      day_of_week: editing.day_of_week,
      period: editing.period,
      start_time: editing.start_time || null,
      end_time: editing.end_time || null,
      subject_id: editing.subject_id,
      teacher_id: editing.teacher_id || null,
      room: editing.room || null,
      notes: editing.notes || null,
    };
    let res;
    if (editing.id) res = await supabase.from('rc_timetable_slots').update(payload).eq('id', editing.id);
    else            res = await supabase.from('rc_timetable_slots').upsert(payload, { onConflict: 'class_id,day_of_week,period' });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved');
    setEditing(null);
    // reload
    const { data } = await supabase.from('rc_timetable_slots').select('*, subject:rc_subjects(name, code), teacher:rc_staff(display_name)').eq('class_id', classId);
    const map = {}; for (const r of (data || [])) map[`${r.day_of_week}-${r.period}`] = r; setSlots(map);
  };

  const remove = async () => {
    if (!editing?.id) { setEditing(null); return; }
    if (!confirm('Clear this slot?')) return;
    const { error } = await supabase.from('rc_timetable_slots').delete().eq('id', editing.id);
    if (error) return toast.error(error.message);
    toast.success('Cleared');
    setEditing(null);
    const { data } = await supabase.from('rc_timetable_slots').select('*, subject:rc_subjects(name, code), teacher:rc_staff(display_name)').eq('class_id', classId);
    const map = {}; for (const r of (data || [])) map[`${r.day_of_week}-${r.period}`] = r; setSlots(map);
  };

  const currentClass = classes.find((c) => c.id === classId);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-rc-900">Class timetable</h1>
          <p className="mt-1 text-sm text-rc-600">Click any cell to set or change a lesson.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-rc-600">Class</label>
          <select className="input w-56" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-rc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rc-50 text-left text-xs uppercase tracking-wider text-rc-500">
                <th className="px-4 py-3">Period</th>
                {DAYS.map((d) => <th key={d} className="px-2 py-3 text-center">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.period} className="border-t border-rc-100">
                  <td className="px-4 py-3 align-top">
                    <p className="font-mono text-xs font-bold text-rc-900">P{row.period}</p>
                    <p className="text-[10px] text-rc-500">{row.start_time}–{row.end_time}</p>
                  </td>
                  {row.cells.map((cell, i) => {
                    const day = i + 1;
                    return (
                      <td key={day} className="p-1 align-top">
                        <button
                          type="button"
                          onClick={() => startEdit(day, row.period, cell)}
                          className={cn(
                            'block w-full rounded-lg p-2 text-left text-xs transition',
                            cell ? 'bg-rc-50 border border-rc-200 hover:border-rc-400' : 'border-2 border-dashed border-rc-200 text-rc-400 hover:border-rc-500'
                          )}
                        >
                          {cell ? (
                            <>
                              <p className="font-semibold text-rc-900">{cell.subject?.name || '—'}</p>
                              <p className="mt-0.5 text-[10px] text-rc-500">{cell.teacher?.display_name || ''}</p>
                              {cell.room && <p className="text-[10px] text-rc-500">{cell.room}</p>}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1"><Plus size={11}/> Add</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setEditing(null)}>
          <div className="flex-1 bg-rc-900/40"/>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-rc-900">{currentClass?.name} — {DAYS[editing.day_of_week - 1]} P{editing.period}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-md p-2 hover:bg-rc-100"><X size={18}/></button>
            </div>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="Start time"><input className="input" type="time" value={editing.start_time || ''} onChange={(e) => setEditing({...editing, start_time: e.target.value})}/></F>
                <F label="End time"><input className="input" type="time" value={editing.end_time || ''} onChange={(e) => setEditing({...editing, end_time: e.target.value})}/></F>
              </div>
              <F label="Subject *">
                <select className="input" value={editing.subject_id} onChange={(e) => setEditing({...editing, subject_id: e.target.value})}>
                  <option value="">—</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </F>
              <F label="Teacher">
                <select className="input" value={editing.teacher_id} onChange={(e) => setEditing({...editing, teacher_id: e.target.value})}>
                  <option value="">— Unassigned —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.display_name}</option>)}
                </select>
              </F>
              <F label="Room"><input className="input" value={editing.room} onChange={(e) => setEditing({...editing, room: e.target.value})} placeholder="Room 3 / Lab 1 / Sports Field"/></F>
              <F label="Notes"><input className="input" value={editing.notes} onChange={(e) => setEditing({...editing, notes: e.target.value})}/></F>
            </div>
            <div className="mt-6 flex items-center justify-between">
              {editing.id ? (
                <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
                  <Trash2 size={12}/> Clear slot
                </button>
              ) : <div/>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save</button>
              </div>
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
