/**
 * Permissions helper — single source of truth for what a staff role can see.
 *
 * Permissions are stored as a JSONB blob on rc_roles.permissions, e.g.
 *   {"all": true}                                  → super-user (admin, headmaster)
 *   {"marks": true, "attendance": true}            → teacher
 *   {"fees": true, "payments": true}               → bursar
 *
 * `canSee(role, key)` is the gatekeeper used by both the sidebar nav and
 * the dashboard cards. Add a new permission key by:
 *   1. tagging the nav/dashboard surface with that key,
 *   2. surfacing it as a toggle in AdminRoles.jsx (PERMISSION_KEYS below).
 */

export const PERMISSION_KEYS = [
  { key: 'students',      label: 'Students & parents',     hint: 'See and edit the learner roster + parent records' },
  { key: 'staff',         label: 'Staff',                  hint: 'Create / edit / suspend staff accounts' },
  { key: 'classes',       label: 'Classes & subjects',     hint: 'Manage classes, subjects, timetable, schemes of work' },
  { key: 'attendance',    label: 'Attendance',             hint: 'Mark the daily class register' },
  { key: 'marks',         label: 'Marks & reports',        hint: 'Enter results, term reports, class feed, homework' },
  { key: 'fees',          label: 'Fees & invoicing',       hint: 'Bulk-generate invoices, see the ledger' },
  { key: 'payments',      label: 'Record payments',        hint: 'Receive cash / PayNow / EcoCash and print receipts' },
  { key: 'announcements', label: 'Announcements & gallery', hint: 'Post announcements and manage the photo gallery' },
  { key: 'settings',      label: 'Site settings',          hint: 'Edit school details, fees discounts, hero copy' },
  { key: 'roles',         label: 'Roles & permissions',    hint: 'Manage what each role is allowed to do (admin / headmaster only)' },
];

/** Does the given role (the `rc_roles` row) have access to this permission key? */
export function canSee(role, key) {
  if (!role || !role.permissions) return false;
  const p = role.permissions;
  // {"all": true} is the super-user shortcut.
  if (p.all === true) return true;
  // Role id 'admin' or 'headmaster' is implicitly all-access in case
  // the permissions blob got cleared by accident — keep them in.
  if (role.id === 'admin' || role.id === 'headmaster') return true;
  return p[key] === true;
}

/** Resolve a default-allow set for a role id when seeding new permissions. */
export function defaultPermissions(roleId) {
  switch (roleId) {
    case 'admin':
    case 'headmaster': return { all: true };
    case 'teacher':    return { marks: true, attendance: true, classes: true };
    case 'bursar':     return { fees: true, payments: true, students: true };
    case 'secretary':  return { students: true, announcements: true };
    default:           return {};
  }
}
