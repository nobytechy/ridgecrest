/**
 * AdminRoles — admin-only page for editing rc_roles.permissions.
 * Renders a roles × permission-keys grid of toggles. Admin/headmaster
 * see this page; the page itself guards on canSee(role, 'roles').
 */
import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Check, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PERMISSION_KEYS, canSee, defaultPermissions } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export default function AdminRoles() {
  const { role: myRole } = useAuth();
  const allowed = canSee(myRole, 'roles');

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState({});       // roleId -> permissions object
  const [dirty, setDirty] = useState({});       // roleId -> boolean
  const [saving, setSaving] = useState(null);

  useEffect(() => { if (allowed) load(); }, [allowed]);

  async function load() {
    setLoading(true); setLoadError(null);
    try {
      const { data, error } = await supabase.from('rc_roles').select('*').order('name');
      if (error) throw error;
      setRoles(data || []);
      const d = {};
      for (const r of data || []) {
        // Backfill defaults if the row has empty/missing permissions
        const seeded = r.permissions && Object.keys(r.permissions).length > 0
          ? r.permissions : defaultPermissions(r.id);
        d[r.id] = { ...seeded };
      }
      setDraft(d);
      setDirty({});
    } catch (e) {
      setLoadError(e.message || 'Could not load roles');
    } finally {
      setLoading(false);
    }
  }

  const toggle = (roleId, key) => {
    setDraft((prev) => {
      const next = { ...prev };
      const perms = { ...(next[roleId] || {}) };
      // Toggling 'all' wipes specific keys (intentional — the super-user shortcut).
      if (key === 'all') {
        if (perms.all) { delete perms.all; }
        else { Object.keys(perms).forEach((k) => delete perms[k]); perms.all = true; }
      } else {
        if (perms[key]) delete perms[key]; else perms[key] = true;
      }
      next[roleId] = perms;
      return next;
    });
    setDirty((prev) => ({ ...prev, [roleId]: true }));
  };

  const save = async (roleId) => {
    setSaving(roleId);
    const { error } = await supabase.from('rc_roles').update({ permissions: draft[roleId] }).eq('id', roleId);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${roleId}`);
    setDirty((prev) => ({ ...prev, [roleId]: false }));
  };

  if (!allowed) {
    return (
      <div className="card max-w-xl text-center">
        <AlertTriangle className="mx-auto mb-2 text-amber-600" size={28}/>
        <p className="font-display text-lg font-bold text-rc-900">Restricted</p>
        <p className="mt-1 text-sm text-rc-600">Only administrators and the headmaster can manage roles &amp; permissions.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-rc-900 inline-flex items-center gap-2">
          <ShieldCheck size={20} className="text-rc-700"/> Roles &amp; access
        </h1>
        <p className="mt-1 text-sm text-rc-600">
          Toggle what each role is allowed to do. The sidebar nav and dashboard cards are filtered by these permissions in real time.
        </p>
      </header>

      {loading ? (
        <div className="card text-center text-rc-500">
          <Loader2 className="mx-auto mb-2 animate-spin text-rc-400" size={20}/>Loading roles…
        </div>
      ) : loadError ? (
        <div className="card text-center text-rose-700">
          Could not load roles: {loadError}
          <button onClick={load} className="ml-2 underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((r) => {
            const perms = draft[r.id] || {};
            const isAll = perms.all === true;
            return (
              <section key={r.id} className="card">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-rc-900">{r.name}</p>
                    <p className="text-xs text-rc-500 font-mono">{r.id}</p>
                  </div>
                  <button
                    onClick={() => save(r.id)}
                    disabled={!dirty[r.id] || saving === r.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition',
                      dirty[r.id]
                        ? 'bg-rc-700 text-white hover:bg-rc-800'
                        : 'bg-rc-100 text-rc-400 cursor-not-allowed'
                    )}>
                    {saving === r.id ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                    {dirty[r.id] ? 'Save' : 'Saved'}
                  </button>
                </div>

                <div className="mb-4 flex items-center gap-3 rounded-lg border border-rc-200 bg-rc-50/40 p-3">
                  <Toggle on={isAll} onChange={() => toggle(r.id, 'all')}/>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-rc-900">All permissions</p>
                    <p className="text-xs text-rc-500">Super-user shortcut — overrides every toggle below.</p>
                  </div>
                </div>

                <div className={cn('grid gap-3 md:grid-cols-2', isAll && 'opacity-50 pointer-events-none')}>
                  {PERMISSION_KEYS.map(({ key, label, hint }) => (
                    <label key={key} className="flex items-start gap-3 rounded-lg border border-rc-200 bg-white p-3 cursor-pointer hover:bg-rc-50">
                      <Toggle on={!!perms[key]} onChange={() => toggle(r.id, key)}/>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-rc-900">{label}</p>
                        <p className="text-xs text-rc-500">{hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button type="button" onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition',
        on ? 'bg-rc-700' : 'bg-rc-300'
      )}>
      <span className={cn(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
        on ? 'translate-x-5' : 'translate-x-0.5'
      )}>
        {on && <Check size={12} className="mx-auto mt-0.5 text-rc-700"/>}
      </span>
    </button>
  );
}
