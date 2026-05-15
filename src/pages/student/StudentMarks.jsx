import { useEffect, useState } from 'react';
import { ClipboardList, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate, gradeOf } from '@/lib/format';

export default function StudentMarks() {
  const { student } = useAuth();
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!student?.id) return;
    supabase.from('rc_results')
      .select('*, subject:rc_subjects(name, code), assessment:rc_assessments(name, scheduled_for, term:rc_terms(name), is_published)')
      .eq('student_id', student.id)
      .order('entered_at', { ascending: false })
      .then(({ data }) => setResults((data || []).filter((r) => r.assessment?.is_published)));
  }, [student]);

  // Group by assessment
  const byAssessment = {};
  for (const r of results) {
    const k = r.assessment_id;
    (byAssessment[k] ||= { meta: r.assessment, rows: [] }).rows.push(r);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">My Marks</h1>
        <p className="mt-1 text-sm text-rc-600">Every published assessment, with grades.</p>
      </header>

      {Object.keys(byAssessment).length === 0 ? (
        <div className="card text-center">
          <ClipboardList className="mx-auto mb-2 text-rc-400" size={24}/>
          <p className="text-sm text-rc-500">No marks published yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(byAssessment).map((group) => {
            const avg = group.rows.reduce((s, r) => s + Number(r.mark || 0), 0) / group.rows.length;
            return (
              <div key={group.meta?.name} className="card">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-rc-900">{group.meta?.name}</p>
                    <p className="text-xs text-rc-500">{group.meta?.term?.name}{group.meta?.scheduled_for ? ` · ${formatDate(group.meta.scheduled_for)}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Average</p>
                    <p className="font-display text-2xl font-bold text-rc-900">{avg.toFixed(1)}<span className="text-sm text-rc-500">% · {gradeOf(avg)}</span></p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wider text-rc-500">
                      <th className="py-2">Subject</th><th className="text-right">Mark</th><th className="text-right">Grade</th><th>Remarks</th>
                    </tr></thead>
                    <tbody>
                      {group.rows.map((r) => (
                        <tr key={r.id} className="border-t border-rc-100">
                          <td className="py-2 inline-flex items-center gap-2"><BookOpen size={13} className="text-rc-400"/> {r.subject?.name}</td>
                          <td className="text-right font-semibold">{r.mark}</td>
                          <td className="text-right"><span className="inline-block min-w-[28px] rounded-md bg-rc-100 px-2 py-0.5 text-center text-xs font-bold text-rc-900">{r.grade || gradeOf(r.mark)}</span></td>
                          <td className="text-xs text-rc-600">{r.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
