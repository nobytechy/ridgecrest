import { useEffect, useState } from 'react';
import { NotebookPen, Calendar, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate, daysUntil } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function StudentHomework() {
  const { student } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!student?.current_class_id) return;
    supabase.from('rc_homework')
      .select('*, subject:rc_subjects(name, code), teacher:rc_staff(display_name)')
      .eq('class_id', student.current_class_id).eq('active', true)
      .order('due_date', { ascending: true })
      .then(({ data }) => setItems(data || []));
  }, [student]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">My homework</h1>
        <p className="mt-1 text-sm text-rc-600">{items.length} task{items.length === 1 ? '' : 's'} from your teacher.</p>
      </header>

      {items.length === 0 ? (
        <div className="card text-center">
          <NotebookPen className="mx-auto mb-2 text-rc-400" size={24}/>
          <p className="text-sm text-rc-500">No homework right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((h) => {
            const d = daysUntil(h.due_date);
            const overdue = d != null && d < 0;
            const soon = d != null && d >= 0 && d <= 2;
            return (
              <div key={h.id} className={cn('card', overdue && 'border-rose-200 bg-rose-50/40')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {h.subject && <span className="chip"><BookOpen size={11}/> {h.subject.name}</span>}
                    </div>
                    <p className="mt-1 font-display text-lg font-bold text-rc-900">{h.title}</p>
                    {h.description && <p className="mt-1 text-sm text-rc-700">{h.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {h.due_date && (
                        <span className={cn('inline-flex items-center gap-1',
                          overdue ? 'text-rose-700 font-semibold' :
                          soon    ? 'text-amber-700 font-semibold' : 'text-rc-500')}>
                          <Calendar size={12}/> Due {formatDate(h.due_date)}
                          {d != null && (overdue ? ` · ${Math.abs(d)} days overdue` : d === 0 ? ' · today' : d === 1 ? ' · tomorrow' : ` · in ${d} days`)}
                        </span>
                      )}
                      {h.teacher && <span className="text-rc-500">From {h.teacher.display_name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
