/**
 * /print/report/:studentId/:termId — A4-ready termly report card.
 *
 * Pulls everything from existing tables:
 *   • student + class + parents (rc_students, rc_student_parents)
 *   • subjects + marks (rc_results joined to rc_assessments in the term)
 *   • attendance % (rc_attendance for the term window)
 *   • remarks + position (rc_term_reports)
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatDate, gradeOf } from '@/lib/format';

export default function PrintReport() {
  const { studentId, termId } = useParams();
  const { settings } = useSettings();
  const [data, setData] = useState(undefined);

  useEffect(() => {
    (async () => {
      const [student, term, report, allResults, attendance] = await Promise.all([
        supabase.from('rc_students').select('*, class:rc_classes(name, level, class_teacher:rc_staff!class_teacher_id(display_name))').eq('id', studentId).maybeSingle(),
        supabase.from('rc_terms').select('*').eq('id', termId).maybeSingle(),
        supabase.from('rc_term_reports').select('*').eq('student_id', studentId).eq('term_id', termId).maybeSingle(),
        supabase.from('rc_results').select('*, subject:rc_subjects(name, code, position), assessment:rc_assessments(name, max_mark, term_id)').eq('student_id', studentId),
        supabase.from('rc_attendance').select('status, date').eq('student_id', studentId),
      ]);
      if (!student.data || !term.data) { setData(null); return; }

      // Filter results to this term + collapse by subject (take latest mark per subject)
      const termResults = (allResults.data || []).filter((r) => r.assessment?.term_id === termId);
      const bySubject = {};
      for (const r of termResults) {
        const k = r.subject_id;
        if (!bySubject[k] || new Date(r.entered_at) > new Date(bySubject[k].entered_at)) bySubject[k] = r;
      }
      const subjectRows = Object.values(bySubject).sort((a, b) => (a.subject?.position || 0) - (b.subject?.position || 0));

      // Attendance % within term window
      const tStart = new Date(term.data.start_date);
      const tEnd   = new Date(term.data.end_date);
      const att = (attendance.data || []).filter((r) => {
        const d = new Date(r.date); return d >= tStart && d <= tEnd;
      });
      const total = att.length;
      const present = att.filter((r) => r.status === 'present' || r.status === 'late').length;
      const attPct = total > 0 ? Math.round((present / total) * 100) : null;

      setData({
        student: student.data, term: term.data, report: report.data,
        subjectRows, attTotal: total, attPresent: present, attPct,
      });
    })();
  }, [studentId, termId]);

  if (data === undefined) return <div className="grid min-h-screen place-items-center text-rc-400"><Loader2 className="animate-spin" size={20}/></div>;
  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-rc-50 p-6 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-rc-700">Report not found</p>
          <Link to="/admin/term-reports" className="mt-4 inline-flex text-sm text-rc-700 hover:underline">← Back</Link>
        </div>
      </div>
    );
  }

  const school = settings?.school_name || 'Ridgecrest';
  const { student, term, report, subjectRows, attPct, attPresent, attTotal } = data;
  const avg = subjectRows.length ? subjectRows.reduce((s, r) => s + Number(r.mark || 0), 0) / subjectRows.length : null;

  return (
    <div className="min-h-screen bg-rc-100 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          body { background: white; }
          .report-card { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 border-b border-rc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/admin/term-reports" className="inline-flex items-center gap-1.5 text-sm text-rc-500 hover:text-rc-900"><ArrowLeft size={14}/> Back</Link>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border-2 border-rc-800 bg-rc-800 px-5 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-sm hover:bg-rc-900">
            <Printer size={14}/> Print
          </button>
        </div>
      </div>

      <div className="mx-auto my-8 max-w-3xl px-4 print:my-0 print:max-w-none print:px-0">
        <div className="report-card overflow-hidden rounded-2xl border border-rc-200 bg-white shadow-md">
          {/* Header */}
          <div className="border-b-4 border-rc-700 bg-rc-900 p-8 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rc-300">{school}</p>
                <h1 className="mt-1 font-display text-3xl font-bold">Termly Report</h1>
                <p className="mt-1 text-sm text-rc-200">{settings?.motto || 'Wisdom · Discipline · Excellence'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rc-300">Term</p>
                <p className="mt-1 font-display text-xl font-bold">{term.name}</p>
                <p className="mt-1 text-xs text-rc-200">{formatDate(term.start_date)} → {formatDate(term.end_date)}</p>
              </div>
            </div>
          </div>

          {/* Student strip */}
          <div className="grid items-center gap-4 border-b border-rc-200 bg-rc-50 px-8 py-5 md:grid-cols-[auto_1fr_auto]">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-rc-900 text-xl font-display font-bold text-white">
              {student.photo_url ? <img src={student.photo_url} alt="" className="h-full w-full object-cover"/> : student.display_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-rc-900">{student.display_name}</p>
              <p className="text-xs text-rc-600">{student.class?.name} · {student.student_code}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Average</p><p className="font-display text-2xl font-bold text-rc-900">{avg != null ? `${avg.toFixed(1)}%` : '—'}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Position</p><p className="font-display text-2xl font-bold text-rc-900">{report?.position_in_class || '—'}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wider text-rc-500">Attendance</p><p className="font-display text-2xl font-bold text-rc-900">{attPct != null ? `${attPct}%` : '—'}</p></div>
            </div>
          </div>

          {/* Subjects */}
          <div className="px-8 py-6">
            <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wider text-rc-700">Subject results</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rc-200 text-left text-[10px] font-bold uppercase tracking-wider text-rc-500">
                  <th className="py-2">Subject</th>
                  <th className="text-right">Mark</th>
                  <th className="text-right">Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.length === 0 ? (
                  <tr><td colSpan={4} className="py-3 text-center text-rc-500">No marks recorded for this term.</td></tr>
                ) : subjectRows.map((r) => (
                  <tr key={r.id} className="border-b border-rc-100">
                    <td className="py-2 font-medium">{r.subject?.name}</td>
                    <td className="text-right font-semibold">{r.mark}</td>
                    <td className="text-right"><span className="inline-block min-w-[28px] rounded-md bg-rc-100 px-2 py-0.5 text-center text-xs font-bold text-rc-900">{r.grade || gradeOf(r.mark)}</span></td>
                    <td className="text-xs text-rc-600">{r.remarks || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Remarks blocks */}
          <div className="grid gap-4 px-8 pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rc-500">Class-teacher remark</p>
              <p className="mt-1 min-h-12 rounded-lg border border-rc-200 bg-rc-50/40 p-3 text-sm leading-relaxed text-rc-800">
                {report?.class_teacher_remark || <span className="italic text-rc-400">No remark yet.</span>}
              </p>
              <p className="mt-1 text-right text-[10px] text-rc-500">— {student.class?.class_teacher?.display_name || 'Class teacher'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rc-500">Headmaster remark</p>
              <p className="mt-1 min-h-12 rounded-lg border border-rc-200 bg-rc-50/40 p-3 text-sm leading-relaxed text-rc-800">
                {report?.headmaster_remark || <span className="italic text-rc-400">No remark yet.</span>}
              </p>
              <p className="mt-1 text-right text-[10px] text-rc-500">— Headmaster</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-rc-600">
              <div><span className="font-semibold">Conduct: </span>{report?.conduct || '—'}</div>
              <div><span className="font-semibold">Days attended: </span>{attTotal > 0 ? `${attPresent} of ${attTotal}` : '—'}</div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid gap-8 border-t border-rc-200 px-8 py-6 md:grid-cols-3">
            <Sig title="Class teacher"/>
            <Sig title="Headmaster"/>
            <Sig title="Parent / Guardian"/>
          </div>

          <div className="border-t border-rc-200 bg-rc-50 px-8 py-4 text-center text-[10px] text-rc-500">
            {school} · {settings?.address_line || 'Harare, Zimbabwe'}
            {settings?.primary_phone && <> · {settings.primary_phone}</>}
            <br/>
            This report is the official Term {term.term_number} {term.academic_year} record of academic performance.
          </div>
        </div>
      </div>
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
