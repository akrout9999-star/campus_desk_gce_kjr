import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { Link } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'

export default function AdminDashboard() {
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const snap = await getDocs(collection(db, 'users'))
        let students = 0, teachers = 0, crs = 0
        snap.forEach(d => {
          const r = d.data().role
          if (r === 'student') students++
          else if (r === 'teacher') teachers++
          else if (r === 'cr') crs++
        })
        setCounts({ students, teachers, crs, total: snap.size })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchCounts()
  }, [])

  return (
    <AppShell title="Admin Dashboard">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--blue-900)', marginBottom: 4 }}>
          Admin Panel
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
          Manage users and system settings for CampusDesk
        </p>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Users',  value: counts?.total,    color: 'blue' },
              { label: 'Students',     value: counts?.students, color: 'green' },
              { label: 'Teachers',     value: counts?.teachers, color: 'gold' },
              { label: 'Class Reps',   value: counts?.crs,      color: 'blue' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className={`stat-icon ${s.color}`}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <div className="stat-value">{s.value ?? 0}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <Link to="/admin/import" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📥</div>
                <div style={{ fontWeight: 700, color: 'var(--blue-900)', marginBottom: 4 }}>Import CSV</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>Bulk import students or teachers</div>
              </div>
            </Link>
            <Link to="/admin/users" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>👥</div>
                <div style={{ fontWeight: 700, color: 'var(--blue-900)', marginBottom: 4 }}>Manage Users</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>View and manage all accounts</div>
              </div>
            </Link>
          </div>
        </>
      )}
    </AppShell>
  )
}
