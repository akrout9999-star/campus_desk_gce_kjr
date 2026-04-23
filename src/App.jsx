import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/Spinner'

import Login from './pages/Login'

import StudentDashboard  from './pages/student/StudentDashboard'
import StudentAttendance from './pages/student/StudentAttendance'
import StudentMarks      from './pages/student/StudentMarks'
import StudentNotes      from './pages/student/StudentNotes'
import BputResult        from './pages/student/BputResult'

import CRDashboard from './pages/cr/CRDashboard'
import UploadNotes from './pages/cr/UploadNotes'

import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TakeAttendance   from './pages/teacher/TakeAttendance'
import EnterMarks       from './pages/teacher/EnterMarks'
import ViewMarks        from './pages/teacher/ViewMarks'
import ViewAttendance   from './pages/teacher/ViewAttendance'
import BputBulk         from './pages/teacher/BputBulk'

import AdminDashboard     from './pages/admin/AdminDashboard'
import ImportCSV          from './pages/admin/ImportCSV'
import AdminUsers         from './pages/admin/AdminUsers'
import ManageSubjects     from './pages/admin/ManageSubjects'
import ManageExamSessions from './pages/admin/ManageExamSessions'
import ManageTimetable    from './pages/admin/ManageTimetable'

import NoticeBoard    from './pages/NoticeBoard'
import PlacementBoard from './pages/PlacementBoard'
import Timetable      from './pages/Timetable'
import Syllabus       from './pages/Syllabus'

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user)   return <Navigate to="/login" replace />
  const map = { student: '/student', cr: '/cr', teacher: '/teacher', admin: '/admin' }
  return <Navigate to={map[profile?.role] || '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"      element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* Student */}
          <Route path="/student"                  element={<ProtectedRoute allowedRoles={['student','cr']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/attendance"        element={<ProtectedRoute allowedRoles={['student','cr']}><StudentAttendance /></ProtectedRoute>} />
          <Route path="/student/marks"             element={<ProtectedRoute allowedRoles={['student','cr']}><StudentMarks /></ProtectedRoute>} />
          <Route path="/student/notes"             element={<ProtectedRoute allowedRoles={['student','cr']}><StudentNotes /></ProtectedRoute>} />
          <Route path="/student/result"            element={<ProtectedRoute allowedRoles={['student','cr']}><BputResult /></ProtectedRoute>} />
          <Route path="/student/notice-board"      element={<ProtectedRoute allowedRoles={['student','cr']}><NoticeBoard /></ProtectedRoute>} />
          <Route path="/student/placement-board"   element={<ProtectedRoute allowedRoles={['student','cr']}><PlacementBoard /></ProtectedRoute>} />
          <Route path="/student/timetable"         element={<ProtectedRoute allowedRoles={['student','cr']}><Timetable /></ProtectedRoute>} />
          <Route path="/student/syllabus"          element={<ProtectedRoute allowedRoles={['student','cr']}><Syllabus /></ProtectedRoute>} />

          {/* CR */}
          <Route path="/cr"                    element={<ProtectedRoute allowedRoles={['cr']}><CRDashboard /></ProtectedRoute>} />
          <Route path="/cr/attendance"          element={<ProtectedRoute allowedRoles={['cr']}><StudentAttendance /></ProtectedRoute>} />
          <Route path="/cr/marks"               element={<ProtectedRoute allowedRoles={['cr']}><StudentMarks /></ProtectedRoute>} />
          <Route path="/cr/notes"               element={<ProtectedRoute allowedRoles={['cr']}><StudentNotes /></ProtectedRoute>} />
          <Route path="/cr/upload"              element={<ProtectedRoute allowedRoles={['cr']}><UploadNotes /></ProtectedRoute>} />
          <Route path="/cr/result"              element={<ProtectedRoute allowedRoles={['cr']}><BputResult /></ProtectedRoute>} />
          <Route path="/cr/notice-board"        element={<ProtectedRoute allowedRoles={['cr']}><NoticeBoard /></ProtectedRoute>} />
          <Route path="/cr/placement-board"     element={<ProtectedRoute allowedRoles={['cr']}><PlacementBoard /></ProtectedRoute>} />
          <Route path="/cr/timetable"           element={<ProtectedRoute allowedRoles={['cr']}><Timetable /></ProtectedRoute>} />
          <Route path="/cr/syllabus"            element={<ProtectedRoute allowedRoles={['cr']}><Syllabus /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher"                   element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/take-attendance"    element={<ProtectedRoute allowedRoles={['teacher']}><TakeAttendance /></ProtectedRoute>} />
          <Route path="/teacher/marks"              element={<ProtectedRoute allowedRoles={['teacher']}><EnterMarks /></ProtectedRoute>} />
          <Route path="/teacher/view-marks"         element={<ProtectedRoute allowedRoles={['teacher','admin']}><ViewMarks /></ProtectedRoute>} />
          <Route path="/teacher/view-attendance"    element={<ProtectedRoute allowedRoles={['teacher','admin']}><ViewAttendance /></ProtectedRoute>} />
          <Route path="/teacher/bput-results"       element={<ProtectedRoute allowedRoles={['teacher','admin']}><BputBulk /></ProtectedRoute>} />
          <Route path="/teacher/notice-board"       element={<ProtectedRoute allowedRoles={['teacher']}><NoticeBoard /></ProtectedRoute>} />
          <Route path="/teacher/timetable"          element={<ProtectedRoute allowedRoles={['teacher']}><Timetable /></ProtectedRoute>} />
          <Route path="/teacher/syllabus"           element={<ProtectedRoute allowedRoles={['teacher']}><Syllabus /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin"                    element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/import"              element={<ProtectedRoute allowedRoles={['admin']}><ImportCSV /></ProtectedRoute>} />
          <Route path="/admin/subjects"            element={<ProtectedRoute allowedRoles={['admin']}><ManageSubjects /></ProtectedRoute>} />
          <Route path="/admin/users"               element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/view-marks"          element={<ProtectedRoute allowedRoles={['admin']}><ViewMarks /></ProtectedRoute>} />
          <Route path="/admin/view-attendance"     element={<ProtectedRoute allowedRoles={['admin']}><ViewAttendance /></ProtectedRoute>} />
          <Route path="/admin/exam-sessions"       element={<ProtectedRoute allowedRoles={['admin']}><ManageExamSessions /></ProtectedRoute>} />
          <Route path="/admin/bput-results"        element={<ProtectedRoute allowedRoles={['admin']}><BputBulk /></ProtectedRoute>} />
          <Route path="/admin/timetable"           element={<ProtectedRoute allowedRoles={['admin']}><ManageTimetable /></ProtectedRoute>} />
          <Route path="/admin/notice-board"        element={<ProtectedRoute allowedRoles={['admin']}><NoticeBoard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}


// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf
// #abc
// #abc
// #abc
// #acb
//   ab
// abs
// nasd
// sdf
// snsdf


