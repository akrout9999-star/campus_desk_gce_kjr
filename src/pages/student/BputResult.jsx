import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'

const gradeColor = (g) => {
  if (!g) return { bg: '#f1f5f9', color: '#94a3b8' }
  if (g === 'O')  return { bg: '#dcfce7', color: '#16a34a' }
  if (g === 'E')  return { bg: '#d1fae5', color: '#059669' }
  if (g === 'A')  return { bg: '#dbeafe', color: '#2563eb' }
  if (g === 'B')  return { bg: '#ede9fe', color: '#7c3aed' }
  if (g === 'C')  return { bg: '#fef9c3', color: '#b45309' }
  if (g === 'D')  return { bg: '#ffedd5', color: '#ea580c' }
  if (g === 'F')  return { bg: '#fee2e2', color: '#dc2626' }
  return { bg: '#f1f5f9', color: '#64748b' }
}

export default function BputResult() {
  const { profile } = useAuth()

  const [sessions,  setSessions]  = useState([])
  const [session,   setSession]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [fetching,  setFetching]  = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState('')

  // Load exam sessions from Firestore
  useEffect(() => {
    async function fetchSessions() {
      setLoading(true)
      try {
        const snap = await getDoc(doc(db, 'settings', 'examSessions'))
        const list = snap.exists() ? (snap.data().sessions || []) : []
        setSessions(list)
        if (list.length > 0) setSession(list[0])
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchSessions()
  }, [])

  const fetchResult = async () => {
    if (!session) return
    setError('')
    setResult(null)
    setFetching(true)
    try {
      const res = await fetch('/api/bput-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNo: profile.rollNo,
          dob: '2000-01-01', // DOB not verified by BPUT
          session,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to fetch result.')
      setResult(data)
    } catch(e) {
      setError('Network error. Please try again.')
    } finally { setFetching(false) }
  }

  const handlePrint = () => window.print()

  return (
    <AppShell title="BPUT Result">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Session selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">View Exam Result</div>
          </div>

          {loading ? <Spinner /> : sessions.length === 0 ? (
            <div className="alert alert-warn">
              No exam sessions available. Please ask admin to add sessions.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="field" style={{ margin: 0, flex: 1, minWidth: 200 }}>
                  <label>Exam Session</label>
                  <select value={session} onChange={e => { setSession(e.target.value); setResult(null); setError('') }}>
                    {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ paddingBottom: 2 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginBottom: 4 }}>Roll No</div>
                  <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', fontWeight: 700, fontFamily: 'monospace', color: 'var(--blue-900)' }}>
                    {profile?.rollNo}
                  </div>
                </div>
                <button className="btn btn-primary btn-lg" onClick={fetchResult} disabled={fetching || !session}>
                  {fetching ? 'Fetching…' : 'View Result →'}
                </button>
              </div>
            </>
          )}

          {error && <div className="alert alert-danger" style={{ marginTop: 16 }}>{error}</div>}
        </div>

        {/* Result */}
        {fetching && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spinner />
            <p style={{ color: 'var(--gray-400)', marginTop: 12, fontSize: '0.9rem' }}>Fetching from BPUT…</p>
          </div>
        )}

        {result && (
          <div id="result-print-area">

            {/* Student info card */}
            <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: '#fff', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Biju Patnaik University of Technology
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
                    {result.summary.studentName || profile?.name}
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>REG. NO</div>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem' }}>{result.summary.rollNo}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>BRANCH</div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{result.summary.branchName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>SEMESTER</div>
                      <div style={{ fontWeight: 700 }}>Semester {result.summary.semester}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>SESSION</div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{session}</div>
                    </div>
                  </div>
                </div>
                {/* SGPA badge */}
                {result.sgpa?.sgpa && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '16px 24px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, marginBottom: 4 }}>SGPA</div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{result.sgpa.sgpa}</div>
                    <div style={{ fontSize: '0.7rem', color: '#bfdbfe', marginTop: 4 }}>{result.sgpa.cretits} Credits</div>
                  </div>
                )}
              </div>
            </div>

            {/* Subjects table */}
            <div className="card" style={{ padding: 0, marginBottom: 16 }}>
              <div className="card-header" style={{ padding: '14px 16px' }}>
                <div className="card-title">Subject-wise Results</div>
                <button onClick={handlePrint} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  🖨️ Print
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--blue-900)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#fff' }}>S.No</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#fff' }}>Subject Code</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#fff' }}>Subject Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#fff' }}>Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#fff' }}>Credits</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#fff' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.grades.map((g, i) => {
                      const gc = gradeColor(g.grade)
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)', background: i % 2 === 0 ? '#fff' : 'var(--gray-50)' }}>
                          <td style={{ padding: '10px 12px', color: 'var(--gray-400)', fontSize: '0.78rem' }}>{i + 1}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600, color: '#2563c8' }}>{g.subjectCODE}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{g.subjectName}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: g.subjectType === 'P' ? '#059669' : '#2563c8' }}>
                              {g.subjectType === 'P' ? 'Practical' : 'Theory'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{g.subjectCredits}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '3px 14px', borderRadius: 99, fontWeight: 800, fontSize: '0.88rem', background: gc.bg, color: gc.color }}>
                              {g.grade || '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Summary row */}
                  {result.sgpa && (
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--gray-200)' }}>
                        <td colSpan={4} style={{ padding: '12px 12px', fontWeight: 700, fontSize: '0.88rem', color: 'var(--gray-600)' }}>
                          Total
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 800, color: 'var(--blue-900)' }}>
                          {result.sgpa.cretits}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '1rem', color: '#2563c8' }}>
                            SGPA: {result.sgpa.sgpa}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Grade legend */}
            <div className="card" style={{ background: 'var(--gray-50)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: 10 }}>Grade Scale</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[['O','Outstanding'],['E','Excellent'],['A','Very Good'],['B','Good'],['C','Average'],['D','Pass'],['F','Fail']].map(([g, label]) => {
                  const gc = gradeColor(g)
                  return (
                    <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 26, height: 26, borderRadius: 99, fontWeight: 800, fontSize: '0.78rem', background: gc.bg, color: gc.color, textAlign: 'center', lineHeight: '26px' }}>{g}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .sidebar, .topbar, button, .card:first-child { display: none !important; }
          #result-print-area { padding: 0; }
        }
      `}</style>
    </AppShell>
  )
}