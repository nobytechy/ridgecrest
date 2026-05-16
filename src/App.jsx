import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';

import PublicLayout  from '@/components/layout/PublicLayout';
import AdminLayout   from '@/components/layout/AdminLayout';
import StudentLayout from '@/components/layout/StudentLayout';
import ParentLayout  from '@/components/layout/ParentLayout';

import Home       from '@/pages/public/Home';
import About      from '@/pages/public/About';
import Academics  from '@/pages/public/Academics';
import Admissions from '@/pages/public/Admissions';
import Gallery    from '@/pages/public/Gallery';
import Contact    from '@/pages/public/Contact';

import AdminLogin         from '@/pages/admin/AdminLogin';
import AdminDashboard     from '@/pages/admin/AdminDashboard';
import AdminStudents      from '@/pages/admin/AdminStudents';
import AdminParents       from '@/pages/admin/AdminParents';
import AdminStaff         from '@/pages/admin/AdminStaff';
import AdminClasses       from '@/pages/admin/AdminClasses';
import AdminSubjects      from '@/pages/admin/AdminSubjects';
import AdminSchemes       from '@/pages/admin/AdminSchemes';
import AdminTimetable     from '@/pages/admin/AdminTimetable';
import AdminHomework      from '@/pages/admin/AdminHomework';
import AdminGallery       from '@/pages/admin/AdminGallery';
import AdminMarks         from '@/pages/admin/AdminMarks';
import AdminFees          from '@/pages/admin/AdminFees';
import AdminAnnouncements from '@/pages/admin/AdminAnnouncements';
import AdminSettings      from '@/pages/admin/AdminSettings';
import AdminAttendance    from '@/pages/admin/AdminAttendance';
import AdminTermReports   from '@/pages/admin/AdminTermReports';
import AdminClassFeed     from '@/pages/admin/AdminClassFeed';

import StudentLogin     from '@/pages/student/StudentLogin';
import StudentDashboard from '@/pages/student/StudentDashboard';
import StudentMarks     from '@/pages/student/StudentMarks';
import StudentTimetable from '@/pages/student/StudentTimetable';
import StudentHomework  from '@/pages/student/StudentHomework';
import StudentFees      from '@/pages/student/StudentFees';
import StudentProfile   from '@/pages/student/StudentProfile';

import ParentLogin       from '@/pages/parent/ParentLogin';
import ParentDashboard   from '@/pages/parent/ParentDashboard';
import ParentChildren    from '@/pages/parent/ParentChildren';
import ParentChildDetail from '@/pages/parent/ParentChildDetail';
import ParentChildEdit   from '@/pages/parent/ParentChildEdit';
import ParentProfile     from '@/pages/parent/ParentProfile';

import PrintReceipt from '@/pages/print/PrintReceipt';
import PrintReport  from '@/pages/print/PrintReport';

/* If the session restore takes longer than ~6s, show an escape hatch — the
   user is most likely on a stale cached PWA or a bad network. Don't trap them. */
function LoadingGate({ target }) {
  const [showEscape, setShowEscape] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShowEscape(true), 6000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="grid min-h-screen place-items-center bg-rc-50 p-6 text-center">
      <div>
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-rc-300 border-t-rc-700"/>
        <p className="text-sm text-rc-600">Loading your session…</p>
        {showEscape && (
          <div className="mt-6 max-w-sm text-xs text-rc-500">
            <p>Taking longer than expected.</p>
            <div className="mt-3 flex justify-center gap-3">
              <a href={target} className="rounded-md border border-rc-300 bg-white px-3 py-1.5 font-semibold text-rc-800 hover:bg-rc-100">Sign in again</a>
              <a href="/reset.html" className="rounded-md border border-rc-300 bg-white px-3 py-1.5 font-semibold text-rc-800 hover:bg-rc-100">Clear app cache</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RequireStaff({ children }) {
  const { isStaff, loading } = useAuth();
  if (loading)  return <LoadingGate target="/admin/login"/>;
  if (!isStaff) return <Navigate to="/admin/login" replace/>;
  return children;
}
function RequireStudent({ children }) {
  const { isStudent, loading } = useAuth();
  if (loading)    return <LoadingGate target="/student/login"/>;
  if (!isStudent) return <Navigate to="/student/login" replace/>;
  return children;
}
function RequireParent({ children }) {
  const { isParent, loading } = useAuth();
  if (loading)   return <LoadingGate target="/parent/login"/>;
  if (!isParent) return <Navigate to="/parent/login" replace/>;
  return children;
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Routes>
          {/* Public marketing site */}
          <Route element={<PublicLayout/>}>
            <Route path="/"           element={<Home/>}/>
            <Route path="/about"      element={<About/>}/>
            <Route path="/academics"  element={<Academics/>}/>
            <Route path="/admissions" element={<Admissions/>}/>
            <Route path="/gallery"    element={<Gallery/>}/>
            <Route path="/contact"    element={<Contact/>}/>
          </Route>

          {/* Admin portal */}
          <Route path="/admin/login" element={<AdminLogin/>}/>
          <Route path="/admin" element={<RequireStaff><AdminLayout/></RequireStaff>}>
            <Route index                element={<AdminDashboard/>}/>
            <Route path="students"      element={<AdminStudents/>}/>
            <Route path="parents"       element={<AdminParents/>}/>
            <Route path="staff"         element={<AdminStaff/>}/>
            <Route path="classes"       element={<AdminClasses/>}/>
            <Route path="subjects"      element={<AdminSubjects/>}/>
            <Route path="schemes"       element={<AdminSchemes/>}/>
            <Route path="timetable"     element={<AdminTimetable/>}/>
            <Route path="attendance"    element={<AdminAttendance/>}/>
            <Route path="homework"      element={<AdminHomework/>}/>
            <Route path="gallery"       element={<AdminGallery/>}/>
            <Route path="marks"         element={<AdminMarks/>}/>
            <Route path="term-reports"  element={<AdminTermReports/>}/>
            <Route path="class-feed"    element={<AdminClassFeed/>}/>
            <Route path="fees"          element={<AdminFees/>}/>
            <Route path="announcements" element={<AdminAnnouncements/>}/>
            <Route path="settings"      element={<AdminSettings/>}/>
          </Route>

          {/* Student portal */}
          <Route path="/student/login" element={<StudentLogin/>}/>
          <Route path="/student" element={<RequireStudent><StudentLayout/></RequireStudent>}>
            <Route index              element={<StudentDashboard/>}/>
            <Route path="marks"       element={<StudentMarks/>}/>
            <Route path="timetable"   element={<StudentTimetable/>}/>
            <Route path="homework"    element={<StudentHomework/>}/>
            <Route path="fees"        element={<StudentFees/>}/>
            <Route path="profile"     element={<StudentProfile/>}/>
          </Route>

          {/* Parent portal */}
          <Route path="/parent/login" element={<ParentLogin/>}/>
          <Route path="/parent" element={<RequireParent><ParentLayout/></RequireParent>}>
            <Route index                    element={<ParentDashboard/>}/>
            <Route path="children"          element={<ParentChildren/>}/>
            <Route path="children/:id"      element={<ParentChildDetail/>}/>
            <Route path="children/:id/edit" element={<ParentChildEdit/>}/>
            <Route path="profile"           element={<ParentProfile/>}/>
          </Route>

          {/* Print pages */}
          <Route path="/print/receipt/:id" element={<PrintReceipt/>}/>
          <Route path="/print/report/:studentId/:termId" element={<PrintReport/>}/>

          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </AuthProvider>
    </SettingsProvider>
  );
}
