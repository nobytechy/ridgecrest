import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, MapPin, Mail, LogIn, UserCircle2, LayoutDashboard, LogOut, BookOpen, GraduationCap, Users, MessageCircle, Facebook } from 'lucide-react';
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

      <footer className="relative overflow-hidden border-t border-rc-800 bg-rc-950 text-rc-100">
        {/* Background photo with strong dark overlay so text stays readable */}
        <img
          src="/photos/zw-marimbas.jpg"
          alt="" aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-rc-950/95 via-rc-900/92 to-rc-700/75"/>
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sun-500/10 blur-3xl"/>
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-coral-500/10 blur-3xl"/>

        <div className="container-page relative z-10 grid gap-8 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo size={44}/>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-rc-100/85">
              {settings?.tagline || 'A learning home for tomorrow\'s leaders.'}
            </p>
            <div className="mt-5 space-y-1.5 text-xs text-rc-200/80">
              <p><MapPin size={12} className="-mt-0.5 mr-1.5 inline"/> {settings?.address_line || '235 Chiremba Road, Hatfield, Harare'}</p>
              <p><Phone size={12} className="-mt-0.5 mr-1.5 inline"/> {settings?.primary_phone || '+263 77 389 2866'}</p>
              <p><Mail  size={12} className="-mt-0.5 mr-1.5 inline"/> {settings?.email || 'enquiries@ridgecrest.co.zw'}</p>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sun-300">School</p>
            <ul className="space-y-2 text-sm text-rc-100/80">
              <li><Link to="/about"      className="transition hover:text-white">About us</Link></li>
              <li><Link to="/academics"  className="transition hover:text-white">Academics</Link></li>
              <li><Link to="/admissions" className="transition hover:text-white">Admissions</Link></li>
              <li><Link to="/contact"    className="transition hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sun-300">Portals</p>
            <ul className="space-y-2 text-sm text-rc-100/80">
              <li><Link to="/student/login" className="transition hover:text-white">Student</Link></li>
              <li><Link to="/parent/login"  className="transition hover:text-white">Parent</Link></li>
              <li><Link to="/admin/login"   className="transition hover:text-white">Staff / Admin</Link></li>
            </ul>
            {settings?.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                 className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10">
                <Facebook size={14}/> Follow on Facebook
              </a>
            )}
          </div>
        </div>
        <div className="relative z-10 border-t border-white/10 py-5 text-center text-xs text-rc-200/70">
          <p>© {new Date().getFullYear()} {settings?.school_name || 'Ridgecrest'}. All rights reserved.</p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-rc-300/70">
            Powered by{' '}
            <a href="https://wa.me/263774603865?text=Hi%20Noby%20%E2%80%94%20I%20saw%20your%20work%20and%20wanted%20to%20chat"
               target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 font-semibold text-sun-300 hover:text-sun-200 hover:underline">
              <MessageCircle size={11}/> Noby
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
