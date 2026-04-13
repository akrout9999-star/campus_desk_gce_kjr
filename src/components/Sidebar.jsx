import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from './Logo'

const icons = {
  home: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  attendance: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  marks: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  notes: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.75 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  upload: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  users: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  logout: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  take: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  import: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  ),
  result: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  timetable: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  notice: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  placement: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  syllabus: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
}

const NAV_ITEMS = {
  student: [
    { to: '/student',                 label: 'Dashboard',       icon: 'home' },
    { to: '/student/attendance',      label: 'Attendance',      icon: 'attendance' },
    { to: '/student/marks',           label: 'Marks',           icon: 'marks' },
    { to: '/student/notes',           label: 'Notes',           icon: 'notes' },
    { to: '/student/syllabus',        label: 'Syllabus',        icon: 'syllabus' },
    { to: '/student/timetable',       label: 'Time Table',      icon: 'timetable' },
    { to: '/student/result',          label: 'BPUT Result',     icon: 'result' },
    { to: '/student/notice-board',    label: 'Notice Board',    icon: 'notice' },
    { to: '/student/placement-board', label: 'Placement Board', icon: 'placement' },
  ],
  cr: [
    { to: '/cr',                      label: 'Dashboard',       icon: 'home' },
    { to: '/cr/attendance',           label: 'Attendance',      icon: 'attendance' },
    { to: '/cr/marks',                label: 'Marks',           icon: 'marks' },
    { to: '/cr/notes',                label: 'Notes',           icon: 'notes' },
    { to: '/cr/upload',               label: 'Upload Notes',    icon: 'upload' },
    { to: '/cr/syllabus',             label: 'Syllabus',        icon: 'syllabus' },
    { to: '/cr/timetable',            label: 'Time Table',      icon: 'timetable' },
    { to: '/cr/result',               label: 'BPUT Result',     icon: 'result' },
    { to: '/cr/notice-board',         label: 'Notice Board',    icon: 'notice' },
    { to: '/cr/placement-board',      label: 'Placement Board', icon: 'placement' },
  ],
  teacher: [
    { to: '/teacher',                  label: 'Dashboard',       icon: 'home' },
    { to: '/teacher/take-attendance',  label: 'Take Attendance', icon: 'take' },
    { to: '/teacher/marks',            label: 'Enter Marks',     icon: 'marks' },
    { to: '/teacher/view-attendance',  label: 'View Attendance', icon: 'attendance' },
    { to: '/teacher/view-marks',       label: 'View Marks',      icon: 'marks' },
    { to: '/teacher/syllabus',         label: 'Syllabus',        icon: 'syllabus' },
    { to: '/teacher/timetable',        label: 'Time Table',      icon: 'timetable' },
    { to: '/teacher/bput-results',     label: 'BPUT Results',    icon: 'result' },
    { to: '/teacher/notice-board',     label: 'Notice Board',    icon: 'notice' },
  ],
  admin: [
    { to: '/admin',                  label: 'Dashboard',       icon: 'home' },
    { to: '/admin/users',            label: 'Manage Users',    icon: 'users' },
    { to: '/admin/import',           label: 'Import CSV',      icon: 'import' },
    { to: '/admin/subjects',         label: 'Subjects',        icon: 'notes' },
    { to: '/admin/timetable',        label: 'Timetables',      icon: 'timetable' },
    { to: '/admin/exam-sessions',    label: 'Exam Sessions',   icon: 'result' },
    { to: '/admin/view-attendance',  label: 'View Attendance', icon: 'attendance' },
    { to: '/admin/view-marks',       label: 'View Marks',      icon: 'marks' },
    { to: '/admin/bput-results',     label: 'BPUT Results',    icon: 'result' },
    { to: '/admin/notice-board',     label: 'Notice Board',    icon: 'notice' },
  ],
}

export default function Sidebar({ open, onClose }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.student

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? 'show' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "white", padding: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px rgba(200,151,42,0.4)" }}><Logo size={34} /></div>
          <div className="sidebar-logo-text">
            <span>CampusDesk</span>
            <span>GCE Keonjhar</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/${role}`}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              {icons[item.icon]}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.name || 'User'}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          </div>
          <button
            className="nav-item"
            onClick={handleLogout}
            style={{ marginTop: 8, width: '100%', color: '#fca5a5' }}
          >
            {icons.logout}
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}