import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users2, GraduationCap, Users, BookOpen, ClipboardList,
  Receipt, Megaphone, Settings, LogOut, Menu, X, Globe, School,
  NotebookPen, CalendarDays, Image as ImageIcon, CheckSquare, FileText, MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import UniversalSearch from '@/components/UniversalSearch';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { canSee } from '@/lib/permissions';

const NAV = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Overview',         perm: null,            end: true },
  { to: '/admin/students',     icon: GraduationCap,   label: 'Students',         perm: 'students' },
  { to: '/admin/parents',      icon: Users,           label: 'Parents',          perm: 'students' },
  { to: '/admin/staff',        icon: Users2,          label: 'Staff',            perm: 'staff' },
  { to: '/admin/classes',      icon: School,          label: 'Classes',          perm: 'classes' },
  { to: '/admin/subjects',     icon: BookOpen,        label: 'Subjects',         perm: 'classes' },
  { to: '/admin/schemes',      icon: NotebookPen,     label: 'Scheme books',     perm: 'marks' },
  { to: '/admin/timetable',    icon: CalendarDays,    label: 'Timetable',        perm: 'classes' },
  { to: '/admin/attendance',   icon: CheckSquare,     label: 'Attendance',       perm: 'attendance' },
  { to: '/admin/homework',     icon: NotebookPen,     label: 'Homework',         perm: 'marks' },
  { to: '/admin/marks',        icon: ClipboardList,   label: 'Marks',            perm: 'marks' },
  { to: '/admin/term-reports', icon: FileText,        label: 'Term reports',     perm: 'marks' },
  { to: '/admin/class-feed',   icon: MessageCircle,   label: 'Class feed',       perm: 'marks' },
  { to: '/admin/fees',         icon: Receipt,         label: 'Fees & Payments',  perm: 'fees' },
  { to: '/admin/gallery',      icon: ImageIcon,       label: 'Gallery',          perm: 'announcements' },
  { to: '/admin/announcements',icon: Megaphone,       label: 'Announcements',    perm: 'announcements' },
  { to: '/admin/roles',        icon: ShieldCheck,     label: 'Roles & access',   perm: 'roles' },
  { to: '/admin/settings',     icon: Settings,        label: 'Settings',         perm: 'settings' },
];

export default function AdminLayout() {
  const { staff, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    nav('/admin/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-rc-50">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-rc-200 bg-white transition-transform md:static md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex h-full flex-col">
          <div className="border-b border-rc-200 px-5 py-4">
            <Logo size={36} withText={false}/>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-rc-700">Staff Portal</p>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {NAV.filter(({ perm }) => !perm || canSee(role, perm)).map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-rc-900 text-white' : 'text-rc-600 hover:bg-rc-100 hover:text-rc-900'
                )}>
                <Icon size={16}/> {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-rc-200 p-4">
            <div className="mb-3 rounded-lg bg-rc-50 p-3">
              <p className="text-xs font-semibold text-rc-900">{staff?.display_name}</p>
              <p className="mt-0.5 text-xs text-rc-500">{role?.name || 'Staff'} · {staff?.employee_id}</p>
            </div>
            <Link to="/" className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-rc-200 bg-rc-50 px-3 py-2 text-xs font-medium text-rc-800 hover:bg-rc-100">
              <Globe size={14}/> View public site
            </Link>
            <button type="button" onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100">
              <LogOut size={14}/> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-rc-200 bg-white px-4 py-3">
          <button onClick={() => setOpen((v) => !v)} className="rounded-md p-2 text-rc-600 hover:bg-rc-100 md:hidden">{open ? <X size={18}/> : <Menu size={18}/>}</button>
          <Logo size={28} withText={false}/>
          <UniversalSearch/>
        </header>
        <main className="flex-1 overflow-x-auto p-4 md:p-8">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
