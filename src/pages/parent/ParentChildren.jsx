import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/format';

export default function ParentChildren() {
  const { parent } = useAuth();
  const [children, setChildren] = useState([]);

  useEffect(() => {
    if (!parent?.id) return;
    supabase.from('rc_student_parents').select('is_primary, student:rc_students(*, class:rc_classes(name))').eq('parent_id', parent.id)
      .then(({ data }) => setChildren((data || []).map((r) => ({ ...r.student, is_primary: r.is_primary })).filter(Boolean)));
  }, [parent]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">My Children</h1>
        <p className="mt-1 text-sm text-rc-600">{children.length} child{children.length === 1 ? '' : 'ren'} linked to your account.</p>
      </header>

      {children.length === 0 ? (
        <div className="card text-center">
          <GraduationCap className="mx-auto mb-2 text-rc-400" size={24}/>
          <p className="text-sm text-rc-500">No children linked. Contact the school office.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {children.map((c) => (
            <Link key={c.id} to={`/parent/children/${c.id}`} className="card hover:border-rc-400">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-rc-100 text-rc-900 font-display text-xl font-bold">
                  {c.display_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-rc-900">{c.display_name}</p>
                  <p className="text-xs text-rc-500">{c.class?.name || 'No class'} · {c.student_code}</p>
                  {c.is_primary && <span className="mt-1 inline-block rounded-full bg-rc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rc-700">Primary</span>}
                </div>
                <ArrowRight size={16} className="text-rc-400"/>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
