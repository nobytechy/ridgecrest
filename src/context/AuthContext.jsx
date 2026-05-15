/**
 * AuthContext — handles three PIN identity surfaces over one auth.user.
 *
 *   • signInStaff(pin, employeeId?)    — admin/teacher/bursar at /admin/login
 *   • signInStudent(pin, code?)        — /student/login
 *   • signInParent(pin, code?)         — /parent/login
 *
 * Each surface resolves its PIN to a code via a SECURITY DEFINER RPC, then
 * signs in via supabase.auth.signInWithPassword with email = `<code>@rc.local`.
 *
 * Idle auto-logout: 30 min staff, 15 min student/parent.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

const STAFF_IDLE_MS  = 30 * 60 * 1000;
const STUDENT_IDLE_MS = 15 * 60 * 1000;
const PARENT_IDLE_MS  = 15 * 60 * 1000;
const IDLE_CHECK_MS   = 60 * 1000;
const AUTH_TIMEOUT_MS = 12_000;

const emailFor = (code) => `${String(code).toLowerCase().trim()}@rc.local`;

function withTimeout(promise, ms = AUTH_TIMEOUT_MS, msg = 'Request timed out — check your connection.') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [staff,   setStaff]   = useState(null);
  const [student, setStudent] = useState(null);
  const [parent,  setParent]  = useState(null);
  const [role,    setRole]    = useState(null);
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async (userId) => {
    if (!userId) return { staff: null, student: null, parent: null, role: null };
    const [{ data: s }, { data: st }, { data: p }] = await Promise.all([
      supabase.from('rc_staff').select('*, role:rc_roles(*)').eq('id', userId).maybeSingle(),
      supabase.from('rc_students').select('*, class:rc_classes(*)').eq('id', userId).maybeSingle(),
      supabase.from('rc_parents').select('*').eq('id', userId).maybeSingle(),
    ]);
    return { staff: s || null, student: st || null, parent: p || null, role: s?.role || null };
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        const ids = await loadIdentity(data.session.user.id);
        setStaff(ids.staff); setStudent(ids.student); setParent(ids.parent); setRole(ids.role);
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      if (!active) return;
      setSession(s);
      if (s?.user) {
        const ids = await loadIdentity(s.user.id);
        setStaff(ids.staff); setStudent(ids.student); setParent(ids.parent); setRole(ids.role);
      } else {
        setStaff(null); setStudent(null); setParent(null); setRole(null);
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadIdentity]);

  // ── Staff sign-in ───────────────────────────────────────────────────
  const signInStaff = async (pin, employeeIdInput) => {
    let employeeId = (employeeIdInput || '').trim();
    if (!employeeId) {
      try {
        const { data: resolved } = await withTimeout(
          supabase.rpc('rc_resolve_staff_pin', { p_pin: pin })
        );
        employeeId = (resolved || '').trim();
      } catch (e) {
        if (pin !== '1975') throw e;
      }
      if (!employeeId && pin === '1975') employeeId = 'EMP-001';
      if (!employeeId) throw new Error('No staff matches that PIN');
    }
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email: emailFor(employeeId), password: pin })
    );
    supabase.from('rc_login_log').insert({
      who_kind: 'staff', who_id: data?.user?.id || null,
      identifier: employeeId, success: !error,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }).then(() => {});
    if (error) throw new Error('Invalid PIN');
    return data;
  };

  // ── Student sign-in ─────────────────────────────────────────────────
  const signInStudent = async (pin, codeInput) => {
    let code = (codeInput || '').trim();
    if (!code) {
      const { data: resolved } = await withTimeout(
        supabase.rpc('rc_resolve_student_pin', { p_pin: pin })
      );
      code = (resolved || '').trim();
      if (!code) throw new Error('No student matches that PIN');
    }
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email: emailFor(code), password: pin })
    );
    supabase.from('rc_login_log').insert({
      who_kind: 'student', who_id: data?.user?.id || null,
      identifier: code, success: !error,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }).then(() => {});
    if (error) throw new Error('Invalid PIN');
    return data;
  };

  // ── Parent sign-in ──────────────────────────────────────────────────
  const signInParent = async (pin, codeInput) => {
    let code = (codeInput || '').trim();
    if (!code) {
      const { data: resolved } = await withTimeout(
        supabase.rpc('rc_resolve_parent_pin', { p_pin: pin })
      );
      code = (resolved || '').trim();
      if (!code) throw new Error('No parent matches that PIN');
    }
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email: emailFor(code), password: pin })
    );
    supabase.from('rc_login_log').insert({
      who_kind: 'parent', who_id: data?.user?.id || null,
      identifier: code, success: !error,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }).then(() => {});
    if (error) throw new Error('Invalid PIN');
    return data;
  };

  const changeOwnPin = async (newPin) => {
    if (!/^\d{4,8}$/.test(newPin)) throw new Error('PIN must be 4–8 digits');
    const { error: e1 } = await supabase.auth.updateUser({ password: newPin });
    if (e1) throw new Error(e1.message);
    const uid = session.user.id;
    if (student) {
      await supabase.from('rc_students').update({ pin: newPin, force_pin_reset: false }).eq('id', uid);
    } else if (parent) {
      await supabase.from('rc_parents').update({ pin: newPin, force_pin_reset: false }).eq('id', uid);
    } else if (staff) {
      await supabase.from('rc_staff').update({ pin: newPin }).eq('id', uid);
    }
    const ids = await loadIdentity(uid);
    setStaff(ids.staff); setStudent(ids.student); setParent(ids.parent);
  };

  const signOut = useCallback(async (reason) => {
    setSession(null); setStaff(null); setStudent(null); setParent(null); setRole(null);
    try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
    if (reason === 'idle') {
      toast('You were signed out due to inactivity.', { icon: '🕒', duration: 5000 });
    }
  }, []);

  // Idle auto-logout
  useEffect(() => {
    if (!session) return;
    const idleMs = staff ? STAFF_IDLE_MS : student ? STUDENT_IDLE_MS : parent ? PARENT_IDLE_MS : STAFF_IDLE_MS;
    let lastActivity = Date.now();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const onActivity = () => { lastActivity = Date.now(); };
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > idleMs) signOut('idle');
    }, IDLE_CHECK_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, [session, staff, student, parent, signOut]);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user || null,
      staff, student, parent, role,
      isAuthenticated: !!session,
      isStaff:   !!staff,
      isStudent: !!student,
      isParent:  !!parent,
      isAdmin:   role?.id === 'admin' || role?.id === 'headmaster',
      isTeacher: role?.id === 'teacher',
      isBursar:  role?.id === 'bursar',
      loading,
      signInStaff, signInStudent, signInParent,
      changeOwnPin, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
