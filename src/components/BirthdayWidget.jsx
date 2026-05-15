/**
 * BirthdayWidget — lists students with birthdays in the next 7 days.
 * Drop into the admin dashboard or parent dashboard.
 */
import { useEffect, useState } from 'react';
import { Cake } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

function daysUntilBirthday(dob) {
  if (!dob) return null;
  const today = new Date();
  const d = new Date(dob);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return Math.floor((next - today) / 86400000);
}
function ageOnNext(dob) {
  const today = new Date();
  const d = new Date(dob);
  let age = today.getFullYear() - d.getFullYear() + 1;
  // If their birthday this year hasn't passed, age on next b-day is current+1; if it's passed, age went up already, next is +1 again — we just say age next b-day.
  return age;
}

export default function BirthdayWidget({ scope = 'all' }) {
  const { parent } = useAuth();
  const [list, setList] = useState([]);

  useEffect(() => {
    (async () => {
      let q = supabase.from('rc_students').select('id, display_name, preferred_name, dob, class:rc_classes(name)').not('dob', 'is', null).eq('status', 'active');
      // If parent scope, restrict to own children
      if (scope === 'parent' && parent?.id) {
        const { data: links } = await supabase.from('rc_student_parents').select('student_id').eq('parent_id', parent.id);
        const ids = (links || []).map((l) => l.student_id);
        if (ids.length === 0) { setList([]); return; }
        q = q.in('id', ids);
      }
      const { data } = await q;
      const enriched = (data || []).map((s) => ({ ...s, days: daysUntilBirthday(s.dob) })).filter((s) => s.days != null && s.days <= 30);
      enriched.sort((a, b) => a.days - b.days);
      setList(enriched.slice(0, 6));
    })();
  }, [scope, parent]);

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-pink-100 text-pink-700">
          <Cake size={18}/>
        </div>
        <div>
          <p className="font-display text-base font-bold text-rc-900">Birthdays</p>
          <p className="text-[10px] text-rc-500">{scope === 'parent' ? 'Your children' : 'School-wide · next 30 days'}</p>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-rc-500">No upcoming birthdays.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-md bg-rc-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-rc-900">{s.preferred_name || s.display_name.split(' ')[0]}</p>
                <p className="text-[10px] text-rc-500">{s.class?.name || ''} · turns {ageOnNext(s.dob)}</p>
              </div>
              <span className={`text-xs font-semibold ${s.days === 0 ? 'text-pink-700' : s.days <= 7 ? 'text-amber-700' : 'text-rc-600'}`}>
                {s.days === 0 ? '🎉 Today!' : s.days === 1 ? 'Tomorrow' : `${s.days} days`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
