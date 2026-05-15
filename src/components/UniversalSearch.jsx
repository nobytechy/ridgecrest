/**
 * UniversalSearch — Cmd+K modal that searches students, parents, staff,
 * classes. Click to navigate.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, GraduationCap, Users, Users2, School, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'students', icon: GraduationCap, label: 'Students', path: '/admin/students' },
  { id: 'parents',  icon: Users,         label: 'Parents',  path: '/admin/parents' },
  { id: 'staff',    icon: Users2,        label: 'Staff',    path: '/admin/staff' },
  { id: 'classes',  icon: School,        label: 'Classes',  path: '/admin/classes' },
];

export default function UniversalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [data, setData] = useState({ students: [], parents: [], staff: [], classes: [] });
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase.from('rc_students').select('id, student_code, display_name, class:rc_classes(name)').limit(50),
      supabase.from('rc_parents').select('id, parent_code, display_name, phone').limit(50),
      supabase.from('rc_staff').select('id, employee_id, display_name, role:rc_roles(name)').limit(50),
      supabase.from('rc_classes').select('id, name, level').limit(50),
    ]).then(([s, p, st, c]) => {
      setData({
        students: s.data || [], parents: p.data || [],
        staff: st.data || [], classes: c.data || [],
      });
    });
  }, [open]);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase().trim();
    if (!qq) return data;
    return {
      students: data.students.filter((s) => [s.display_name, s.student_code, s.class?.name].join(' ').toLowerCase().includes(qq)),
      parents:  data.parents.filter((s)  => [s.display_name, s.parent_code, s.phone].join(' ').toLowerCase().includes(qq)),
      staff:    data.staff.filter((s)    => [s.display_name, s.employee_id, s.role?.name].join(' ').toLowerCase().includes(qq)),
      classes:  data.classes.filter((s)  => s.name.toLowerCase().includes(qq)),
    };
  }, [q, data]);

  const totalHits = filtered.students.length + filtered.parents.length + filtered.staff.length + filtered.classes.length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-rc-200 bg-white px-3 py-1.5 text-xs text-rc-500 hover:border-rc-300 hover:text-rc-900"
      >
        <Search size={12}/> Search… <span className="ml-2 rounded bg-rc-100 px-1.5 py-0.5 font-mono text-[10px] text-rc-600">⌘K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-rc-900/40 p-4 pt-20" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-rc-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-rc-200 px-4 py-3">
          <Search size={18} className="text-rc-400"/>
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search students, parents, staff, classes…"
            className="flex-1 border-none bg-transparent text-base text-rc-900 focus:outline-none"
          />
          <button onClick={() => setOpen(false)} className="rounded-md p-1 text-rc-400 hover:bg-rc-100"><X size={16}/></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {totalHits === 0 ? (
            <p className="p-6 text-center text-sm text-rc-500">No matches.</p>
          ) : (
            <>
              {filtered.students.length > 0 && (
                <Section icon={GraduationCap} label="Students" onPick={(s) => { setOpen(false); nav(`/admin/students`); }}>
                  {filtered.students.slice(0, 6).map((s) => <Row key={s.id} name={s.display_name} sub={`${s.student_code} · ${s.class?.name || 'No class'}`} onClick={() => { setOpen(false); nav('/admin/students'); }}/>)}
                </Section>
              )}
              {filtered.parents.length > 0 && (
                <Section icon={Users} label="Parents">
                  {filtered.parents.slice(0, 6).map((s) => <Row key={s.id} name={s.display_name} sub={`${s.parent_code} · ${s.phone}`} onClick={() => { setOpen(false); nav('/admin/parents'); }}/>)}
                </Section>
              )}
              {filtered.staff.length > 0 && (
                <Section icon={Users2} label="Staff">
                  {filtered.staff.slice(0, 6).map((s) => <Row key={s.id} name={s.display_name} sub={`${s.employee_id} · ${s.role?.name}`} onClick={() => { setOpen(false); nav('/admin/staff'); }}/>)}
                </Section>
              )}
              {filtered.classes.length > 0 && (
                <Section icon={School} label="Classes">
                  {filtered.classes.slice(0, 6).map((s) => <Row key={s.id} name={s.name} sub={`Level ${s.level}`} onClick={() => { setOpen(false); nav('/admin/classes'); }}/>)}
                </Section>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-rc-200 bg-rc-50 px-4 py-2 text-[10px] text-rc-500">
          <span>{totalHits} match{totalHits === 1 ? '' : 'es'}</span>
          <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, label, children }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rc-500">
        <Icon size={11} className="-mt-0.5 mr-1 inline"/> {label}
      </p>
      <div>{children}</div>
    </div>
  );
}
function Row({ name, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-rc-100">
      <span className="font-medium text-rc-900">{name}</span>
      <span className="text-[10px] text-rc-500">{sub}</span>
    </button>
  );
}
