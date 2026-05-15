import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, MapPin, Mail, LogIn, UserCircle2, LayoutDashboard, LogOut, BookOpen, GraduationCap, Users, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Logo from '@/components/Logo';
import FloatingInquiry from '@/components/FloatingInquiry';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/',            label: 'Home',       end: true },
  { to: '/about',       label: 'About' },
  { to: '/academics',   label: 'Academics' },
  { to: '/admissions',  label: 'Admissions' },
  { to: '/gallery',     label: 'Gallery' },
  { to: '/contact',     label: 'Contact' },
];

export default function PublicLayout() {
  const { settings } = useSettings();
  const { isAuthenticated, isStaff, isStudent, isParent, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const dashHref = isStaff ? '/admin' : isStudent ? '/student' : isParent ? '/parent' : null;
  const dashLabel = isStaff ? 'Staff Dashboard' : isStudent ? 'Student Portal' : 'Parent Portal';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    nav('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white text-rc-900">
      {/* Top strip */}
      <div className="bg-rc-950 text-rc-200">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <a href={`tel:${(settings?.primary_phone || '').replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Phone size={12}/> {settings?.primary_phone || '+263 77 000 0000'}
            </a>
            <a href={`mailto:${settings?.email || 'enquiries@ridgecrest.co.zw'}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail size={12}/> {settings?.email || 'enquiries@ridgecrest.co.zw'}
            </a>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <MapPin size={12}/> {settings?.address_line || 'Borrowdale, Harare'}
            </span>
          </div>
          <p className="text-rc-300">{settings?.motto || 'Wisdom · Discipline · Excellence'}</p>
        </div>
      </div>

      {/* Main nav */}
      <header className="sticky top-0 z-40 border-b border-rc-200 bg-white/95 backdrop-blur">
        <div className="container-page flex items-center justify-between py-4">
          <Link to="/" className="hover:opacity-90"><Logo size={44}/></Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => cn(
                  'rounded-md px-3.5 py-2 text-sm font-medium transition',
                  isActive ? 'bg-rc-100 text-rc-900' : 'text-rc-600 hover:bg-rc-50 hover:text-rc-900'
                )}>
                {label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <Link to={dashHref} className="btn-primary ml-2">
                  <LayoutDashboard size={14}/> {dashLabel}
                </Link>
                <button onClick={handleSignOut}
                  className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-rc-200 bg-white px-3 py-2 text-xs font-medium text-rc-600 hover:bg-rc-50 hover:text-rose-700">
                  <LogOut size={14}/> Sign out
                </button>
              </>
            ) : (
              <div className="ml-2 inline-flex gap-1">
                <Link to="/parent/login"  className="btn-secondary text-xs"><Users size={13}/> Parent</Link>
                <Link to="/student/login" className="btn-secondary text-xs"><GraduationCap size={13}/> Student</Link>
                <Link to="/admin/login"   className="btn-primary text-xs"><LogIn size={13}/> Staff</Link>
              </div>
            )}
          </nav>
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-md p-2 text-rc-600 hover:bg-rc-100 lg:hidden" aria-label="Toggle menu">
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
        {open && (
          <div className="border-t border-rc-200 lg:hidden">
            <div className="container-page flex flex-col gap-1 py-3">
              {NAV.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                  className={({ isActive }) => cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-rc-100 text-rc-900' : 'text-rc-700 hover:bg-rc-50'
                  )}>
                  {label}
                </NavLink>
              ))}
              {isAuthenticated ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link to={dashHref} onClick={() => setOpen(false)} className="btn-primary w-full">
                    <LayoutDashboard size={14}/> {dashLabel.split(' ')[0]}
                  </Link>
                  <button onClick={() => { setOpen(false); handleSignOut(); }} className="btn-secondary w-full">
                    <LogOut size={14}/> Sign out
                  </button>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Link to="/parent/login"  onClick={() => setOpen(false)} className="btn-secondary w-full text-xs"><Users size={12}/> Parent</Link>
                  <Link to="/student/login" onClick={() => setOpen(false)} className="btn-secondary w-full text-xs"><GraduationCap size={12}/> Student</Link>
                  <Link to="/admin/login"   onClick={() => setOpen(false)} className="btn-primary  w-full text-xs"><LogIn size={12}/> Staff</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main><Outlet/></main>
      <FloatingInquiry/>

      <footer className="border-t border-rc-200 bg-rc-50">
        <div className="container-page grid gap-8 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo size={40}/>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-rc-600">
              {settings?.tagline || 'A learning home for tomorrow\'s leaders.'}
            </p>
            <p className="mt-3 text-xs text-rc-500">Founded {settings?.founded_year || '1982'}.</p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-rc-500">School</p>
            <ul className="space-y-2 text-sm text-rc-600">
              <li><Link to="/about"      className="hover:text-rc-900">About us</Link></li>
              <li><Link to="/academics"  className="hover:text-rc-900">Academics</Link></li>
              <li><Link to="/admissions" className="hover:text-rc-900">Admissions</Link></li>
              <li><Link to="/contact"    className="hover:text-rc-900">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-rc-500">Portals</p>
            <ul className="space-y-2 text-sm text-rc-600">
              <li><Link to="/student/login" className="hover:text-rc-900">Student</Link></li>
              <li><Link to="/parent/login"  className="hover:text-rc-900">Parent</Link></li>
              <li><Link to="/admin/login"   className="hover:text-rc-900">Staff / Admin</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-rc-200 py-5 text-center text-xs text-rc-500">
          <p>© {new Date().getFullYear()} {settings?.school_name || 'Ridgecrest'}. All rights reserved.</p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-rc-400">
            Powered by{' '}
            <a href="https://wa.me/263774603865?text=Hi%20Noby%20%E2%80%94%20I%20saw%20your%20work%20and%20wanted%20to%20chat"
               target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 font-semibold text-rc-700 hover:text-rc-900 hover:underline">
              <MessageCircle size={11}/> Noby
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
