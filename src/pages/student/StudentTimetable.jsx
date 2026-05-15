import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function StudentTimetable() {
  const { student } = useAuth();
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (!student?.current_class_id) return;
    supabase.from('rc_timetable_slots')
      .select('*, subject:rc_subjects(name, code), teacher:rc_staff(display_name)')
      .eq('class_id', student.current_class_id)
      .order('day_of_week').order('period')
      .then(({ data }) => setSlots(data || []));
  }, [student]);

  const byDayPeriod = {};
  let maxPeriod = 0;
  for (const s of slots) {
    byDayPeriod[`${s.day_of_week}-${s.period}`] = s;
    if (s.period > maxPeriod) maxPeriod = s.period;
  }
  const periods = Array.from({ length: maxPeriod || 6 }, (_, i) => i + 1);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">My timetable</h1>
        <p className="mt-1 text-sm text-rc-600">{student?.class?.name || 'No class'} · Monday–Friday</p>
      </header>

      {slots.length === 0 ? (
        <div className="card text-center">
          <CalendarDays className="mx-auto mb-2 text-rc-400" size={24}/>
          <p className="text-sm text-rc-500">Your teacher has not published the timetable yet.</p>
        </div>
      ) : (
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
                {periods.map((p) => (
                  <tr key={p} className="border-t border-rc-100">
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs font-bold text-rc-900">P{p}</p>
                      {slots.find((s) => s.period === p) && (
                        <p className="text-[10px] text-rc-500">
                          {slots.find((s) => s.period === p)?.start_time?.slice(0,5)}–{slots.find((s) => s.period === p)?.end_time?.slice(0,5)}
                        </p>
                      )}
                    </td>
                    {[1,2,3,4,5].map((d) => {
                      const cell = byDayPeriod[`${d}-${p}`];
                      return (
                        <td key={d} className="p-2 align-top">
                          {cell ? (
                            <div className="rounded-lg bg-rc-50 p-2 text-xs">
                              <p className="font-semibold text-rc-900">{cell.subject?.name || '—'}</p>
                              <p className="mt-0.5 text-[10px] text-rc-500">{cell.teacher?.display_name}</p>
                              {cell.room && <p className="text-[10px] text-rc-500">{cell.room}</p>}
                            </div>
                          ) : <p className="text-[10px] text-rc-300">—</p>}
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
    </div>
  );
}
