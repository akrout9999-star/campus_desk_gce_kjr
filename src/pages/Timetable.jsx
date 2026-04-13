import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import AppShell from '../components/AppShell'
import Spinner from '../components/Spinner'
import { DEPARTMENTS, SEMESTERS } from '../utils/roles'

export default function Timetable() {
  const { profile } = useAuth()
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin'

  // Teachers can browse any dept+sem; students locked to their own
  const [dept, setDept] = useState(
    isTeacher ? (profile?.departments?.[0] || profile?.department || '') : (profile?.department || '')
  )
  const [sem,  setSem]  = useState(profile?.semester || 1)
  const [url,  setUrl]  = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!dept || !sem) return
    fetchTimetable()
  }, [dept, sem])

  const fetchTimetable = async () => {
    setLoading(true)
    setUrl(null)
    try {
      const docId = `${dept}_${sem}`.replace(/\s+/g, '_')
      const snap = await getDoc(doc(db, 'timetables', docId))
      setUrl(snap.exists() ? (snap.data().embedUrl || null) : null)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const teacherDepts = profile?.departments || (profile?.department ? [profile.department] : [])

  return (
    <AppShell title="Timetable">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Selector — only teachers can change dept/sem */}
        {isTeacher && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                <label>Department</label>
                <select value={dept} onChange={e => setDept(e.target.value)}>
                  {teacherDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0, flex: 1, minWidth: 120 }}>
                <label>Semester</label>
                <select value={sem} onChange={e => setSem(Number(e.target.value))}>
                  {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Timetable display */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
        ) : url ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '14px 16px' }}>
              <div className="card-title">Timetable — {dept} · Semester {sem}</div>
              <a href={url.replace('/preview', '/view')} target="_blank" rel="noreferrer"
                className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                🔗 Open in Drive
              </a>
            </div>
            <iframe
              src={url}
              style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
              allow="autoplay"
              title="Timetable"
            />
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗓️</div>
            <div style={{ fontWeight: 700, color: 'var(--blue-900)', marginBottom: 6 }}>No timetable uploaded yet</div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>
              Ask admin to upload the timetable for {dept} · Semester {sem}.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}