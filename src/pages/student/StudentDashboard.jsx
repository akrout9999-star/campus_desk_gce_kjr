import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function fetchStats() {
      try {
        // Attendance summary
        const attQ = query(
          collection(db, 'attendance'),
          where('department', '==', profile.department),
          where('semester', '==', profile.semester)
        )
        const attSnap = await getDocs(attQ)
        let totalClasses = 0, attendedClasses = 0
        attSnap.forEach(docSnap => {
          const data = docSnap.data()
          if (data.students && data.students[profile.rollNo] !== undefined) {
            totalClasses++
            if (data.students[profile.rollNo] === true) attendedClasses++
          }
        })

        // Marks summary
        const marksQ = query(
          collection(db, 'marks'),
          where('department', '==', profile.department),
          where('semester', '==', profile.semester)
        )
        const marksSnap = await getDocs(marksQ)
        let totalSubjects = 0
        marksSnap.forEach(() => totalSubjects++)

        // Notes count
        const notesQ = query(
          collection(db, 'notes'),
          where('department', '==', profile.department),
          where('semester', '==', profile.semester)
        )
        const notesSnap = await getDocs(notesQ)
        let notesCount = 0
        notesSnap.forEach(d => {
          notesCount += (d.data().links || []).length
        })

        const pct = totalClasses > 0
          ? Math.round((attendedClasses / totalClasses) * 100)
          : null

        setStats({ totalClasses, attendedClasses, pct, totalSubjects, notesCount })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [profile])

  const pct = stats?.pct
  const pctColor = pct === null ? 'gray' : pct >= 75 ? 'good' : pct >= 60 ? 'warn' : 'bad'

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <AppShell title="Dashboard">
      {/* Profile Card */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, color: '#fff', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)' }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            {profile?.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: '0.82rem', color: '#93c5fd' }}>
            <span>🎓 {profile?.department}</span>
            <span>📚 Semester {profile?.semester}</span>
            <span>🪪 {profile?.rollNo}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.7rem', color: '#93c5fd', marginBottom: 2 }}>ROLE</div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 14px', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {profile?.role}
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <div className="stat-value">
                  {pct !== null ? `${pct}%` : 'N/A'}
                </div>
                <div className="stat-label">Attendance</div>
                {pct !== null && (
                  <div className="pct-bar-wrap" style={{ marginTop: 6, width: 80 }}>
                    <div className="pct-bar-bg">
                      <div className={`pct-bar-fill ${pctColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{stats?.attendedClasses ?? 0}</div>
                <div className="stat-label">Classes Attended</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon gold">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{stats?.totalSubjects ?? 0}</div>
                <div className="stat-label">Subjects</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.75 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <div className="stat-value">{stats?.notesCount ?? 0}</div>
                <div className="stat-label">Notes Available</div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { to: '/student/attendance',      label: 'View Attendance',  color: 'var(--blue-600)', bg: 'var(--blue-50)' },
              { to: '/student/marks',           label: 'View Marks',       color: 'var(--success)',  bg: 'var(--success-bg)' },
              { to: '/student/notes',           label: 'Browse Notes',     color: 'var(--gold)',     bg: '#fef3c7' },
              { to: '/student/syllabus',        label: 'Syllabus',         color: '#0891b2',         bg: '#ecfeff' },
              { to: '/student/notice-board',    label: 'Notice Board',     color: '#7c3aed',         bg: '#f5f3ff' },
              { to: '/student/placement-board', label: 'Placement Board',  color: '#0891b2',         bg: '#ecfeff' },
              { to: '/student/result',          label: 'BPUT Result',      color: '#dc2626',         bg: '#fef2f2' },
            ].map(item => (
              <Link key={item.to} to={item.to}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderRadius: 'var(--radius)', background: item.bg, color: item.color, textDecoration: 'none', fontWeight: 700, fontSize: '0.92rem', border: `1px solid ${item.color}22`, transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                {item.label}
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          {pct !== null && pct < 75 && (
            <div className="alert alert-warn" style={{ marginTop: 20 }}>
              ⚠️ Your attendance is {pct}%. You need at least 75% to be eligible for exams.
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}