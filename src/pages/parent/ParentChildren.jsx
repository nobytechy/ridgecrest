import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function ParentChildren() {
  const { parent } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!parent?.id) return;
    load();
  }, [parent]);

  async function load() {
    setLoading(true); setLoadError(null);
    try {
      // Two-step fetch — the nested join sometimes returns null student rows
      // when RLS or FK joins hiccup; querying explicitly is more reliable.
      const { data: links, error: linksErr } = await supabase
        .from('rc_student_parents')
        .select('student_id, is_primary')
        .eq('parent_id', parent.id);
      if (linksErr) throw linksErr;
      const ids = (links || []).map((l) => l.student_id).filter(Boolean);
      if (ids.length === 0) { setChildren([]); return; }
      const { data: kids, error: kidsErr } = await supabase
        .from('rc_students')
        .select('id, student_code, display_name, preferred_name, photo_url, class:rc_classes(name)')
        .in('id', ids);
      if (kidsErr) throw kidsErr;
      const isPrimary = Object.fromEntries((links || []).map((l) => [l.student_id, l.is_primary]));
      setChildren((kids || []).map((k) => ({ ...k, is_primary: !!isPrimary[k.id] })));
    } catch (e) {
      setLoadError(e.message || 'Could not load your children');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900">My Children</h1>
        <p className="mt-1 text-sm text-rc-600">{children.length} child{children.length === 1 ? '' : 'ren'} linked to your account.</p>
      </header>

      {loading ? (
        <div className="card text-center text-rc-500">
          <Loader2 className="mx-auto mb-2 animate-spin text-rc-400" size={20}/>Loading your children…
        </div>
      ) : loadError ? (
        <div className="card text-center text-rose-700">
          {loadError}
          <button onClick={load} className="ml-2 underline">Retry</button>
        </div>
      ) : children.length === 0 ? (
        <div className="card text-center">
          <GraduationCap className="mx-auto mb-2 text-rc-400" size={24}/>
          <p className="text-sm text-rc-500">No children linked yet. Please contact the school office to have your account linked.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {children.map((c) => (
            <Link key={c.id} to={`/parent/children/${c.id}`} className="card hover:border-rc-400">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-rc-100 text-rc-900 font-display text-xl font-bold">
                  {c.photo_url
                    ? <img src={c.photo_url} alt="" className="h-full w-full object-cover"/>
                    : (c.display_name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}
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
