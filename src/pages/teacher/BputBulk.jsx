import { useEffect, useState } from 'react'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'
import * as XLSX from 'xlsx'

export default function BputBulk() {
  const [sessions,      setSessions]      = useState([])
  const [session,       setSession]       = useState('')
  const [startRoll,     setStartRoll]     = useState('')
  const [endRoll,       setEndRoll]       = useState('')
  const [results,       setResults]       = useState([])
  const [loading,       setLoading]       = useState(false)
  const [fetching,      setFetching]      = useState(false)
  const [error,         setError]         = useState('')
  const [progress,      setProgress]      = useState({ done: 0, total: 0 })
  const [expandedRow,   setExpandedRow]   = useState(null)
  const [detailData,    setDetailData]    = useState({})
  const [loadingDetail, setLoadingDetail] = useState(null)
  const [semesterInfo,  setSemesterInfo]  = useState(null) // { semester, branch }

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

  const generateRollRange = (start, end) => {
    const prefix   = start.slice(0, -2)
    const startNum = parseInt(start.slice(-2))
    const endNum   = parseInt(end.slice(-2))
    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) return null
    const rolls = []
    for (let i = startNum; i <= endNum; i++) {
      rolls.push(prefix + String(i).padStart(2, '0'))
    }
    return rolls
  }

  const lookupNames = async (rollNumbers) => {
    const nameMap = {}
    try {
      const chunks = []
      for (let i = 0; i < rollNumbers.length; i += 30) chunks.push(rollNumbers.slice(i, i + 30))
      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('rollNo', 'in', chunk))
        const snap = await getDocs(q)
        snap.forEach(d => { nameMap[d.data().rollNo] = d.data().name })
      }
    } catch(e) { console.error(e) }
    return nameMap
  }

  const fetchBulk = async () => {
    setError('')
    setResults([])
    setSemesterInfo(null)
    if (!startRoll.trim() || !endRoll.trim()) return setError('Please enter start and end roll numbers.')
    if (!session) return setError('Please select a session.')

    const rollNumbers = generateRollRange(startRoll.trim().toUpperCase(), endRoll.trim().toUpperCase())
    if (!rollNumbers) return setError('Invalid roll number range. Make sure start ≤ end and same prefix.')
    if (rollNumbers.length > 100) return setError('Maximum 100 students per fetch.')

    setFetching(true)
    setProgress({ done: 0, total: rollNumbers.length })

    try {
      const nameMap = await lookupNames(rollNumbers)
      const rollWithNames = rollNumbers.map(r => ({ rollNo: r, name: nameMap[r] || '—' }))

      const allResults = []
      const batchSize = 10
      for (let i = 0; i < rollWithNames.length; i += batchSize) {
        const batch = rollWithNames.slice(i, i + batchSize)
        const res = await fetch('/api/bput-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rollNumbers: batch, session }),
        })
        const data = await res.json()
        if (data.results) allResults.push(...data.results)
        setProgress({ done: Math.min(i + batchSize, rollWithNames.length), total: rollWithNames.length })
      }

      // Grab semester + branch from first successful result
      const firstValid = allResults.find(r => r.sgpa !== null)
      if (firstValid) {
        // Try from summary field first (new API)
        if (firstValid.summary) {
          setSemesterInfo({
            semester: firstValid.summary.semester,
            branch:   firstValid.summary.branchName,
          })
        } else {
          // Fallback: fetch one student detail to get semester info
          try {
            const detailRes = await fetch('/api/bput-student', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rollNo: firstValid.rollNo, dob: '2000-01-01', session }),
            })
            const detailData = await detailRes.json()
            if (detailRes.ok && detailData.summary) {
              setSemesterInfo({
                semester: detailData.summary.semester,
                branch:   detailData.summary.branchName,
              })
            }
          } catch(e) { console.error('semester info fetch failed', e) }
        }
      }

      setResults(allResults)
    } catch(e) {
      setError('Failed to fetch results. Please try again.')
    } finally {
      setFetching(false)
      setProgress({ done: 0, total: 0 })
    }
  }

  const fetchDetail = async (rollNo) => {
    if (detailData[rollNo]) { setExpandedRow(expandedRow === rollNo ? null : rollNo); return }
    setExpandedRow(rollNo)
    setLoadingDetail(rollNo)
    try {
      const res = await fetch('/api/bput-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, dob: '2000-01-01', session }),
      })
      const data = await res.json()
      if (res.ok) setDetailData(prev => ({ ...prev, [rollNo]: data }))
    } catch(e) { console.error(e) }
    finally { setLoadingDetail(null) }
  }

  const downloadExcel = () => {
    const rows = results.map((r, i) => ({
      'S.No':    i + 1,
      'Roll No': r.rollNo,
      'Name':    r.name,
      'SGPA':    r.sgpa ?? 'N/A',
      'Status':  r.error ? 'Not Found' : 'Found',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 8 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SGPA Results')
    XLSX.writeFile(wb, `BPUT_Bulk_${session}_${startRoll}-${endRoll}.xlsx`)
  }

  const validCount = results.filter(r => r.sgpa !== null).length
  const avgSgpa    = validCount > 0
    ? (results.filter(r => r.sgpa !== null).reduce((s, r) => s + parseFloat(r.sgpa), 0) / validCount).toFixed(2)
    : null

  const sgpaColor = (s) => {
    if (!s) return '#94a3b8'
    const n = parseFloat(s)
    if (n >= 8) return '#16a34a'
    if (n >= 6) return '#2563eb'
    if (n >= 5) return '#d97706'
    return '#dc2626'
  }

  return (
    <AppShell title="BPUT Bulk Results">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Controls */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Fetch Class Results</div>
          </div>

          {loading ? <Spinner /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Session</label>
                {sessions.length === 0
                  ? <div className="alert alert-warn" style={{ margin: 0, fontSize: '0.8rem' }}>No sessions. Ask admin.</div>
                  : <select value={session} onChange={e => setSession(e.target.value)}>
                      {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                }
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Start Roll No</label>
                <input type="text" placeholder="e.g. 2301104061" value={startRoll}
                  onChange={e => setStartRoll(e.target.value.toUpperCase())} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>End Roll No</label>
                <input type="text" placeholder="e.g. 2301104120" value={endRoll}
                  onChange={e => setEndRoll(e.target.value.toUpperCase())} />
              </div>
              <div className="field" style={{ margin: 0, display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
                  onClick={fetchBulk} disabled={fetching || !session}>
                  {fetching ? 'Fetching…' : 'Fetch Results →'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="alert alert-danger" style={{ marginTop: 12 }}>{error}</div>}

          {fetching && progress.total > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 6 }}>
                <span>Fetching results from BPUT…</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div style={{ background: 'var(--gray-200)', borderRadius: 99, height: 8 }}>
                <div style={{ background: '#2563c8', borderRadius: 99, height: 8, width: `${(progress.done / progress.total) * 100}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            {/* Semester info banner */}
            {semesterInfo && (
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', borderRadius: 14, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Semester</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>Semester {semesterInfo.semester}</div>
                  </div>
                  <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{semesterInfo.branch}</div>
                  </div>
                  <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{session}</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 18px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600 }}>CLASS AVG SGPA</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{avgSgpa ?? '—'}</div>
                </div>
              </div>
            )}

            {/* Stats strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Students', value: results.length,                                                   color: '#2563c8' },
                { label: 'Results Found',  value: validCount,                                                        color: '#16a34a' },
                { label: 'Not Found',      value: results.length - validCount,                                       color: '#dc2626' },
                { label: 'Above 8 SGPA',   value: results.filter(r => r.sgpa && parseFloat(r.sgpa) >= 8).length,   color: '#7c3aed' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div className="card-header" style={{ padding: '14px 16px' }}>
                <div className="card-title">
                  Results — {semesterInfo ? `Sem ${semesterInfo.semester} · ` : ''}{session}
                </div>
                <button className="btn btn-outline" onClick={downloadExcel} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  ⬇ Excel
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#1e3a8a', borderBottom: '2px solid #1e3a8a' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left',   color: '#ffffff', fontWeight: 700, background: '#1e3a8a' }}>S.No</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left',   color: '#ffffff', fontWeight: 700, background: '#1e3a8a' }}>Roll No</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left',   color: '#ffffff', fontWeight: 700, background: '#1e3a8a' }}>Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: '#ffffff', fontWeight: 700, background: '#1e3a8a' }}>SGPA</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: '#ffffff', fontWeight: 700, background: '#1e3a8a' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <>
                        <tr key={r.rollNo} style={{ borderBottom: '1px solid var(--gray-100)', background: i % 2 === 0 ? '#fff' : 'var(--gray-50)' }}>
                          <td style={{ padding: '10px 12px', color: 'var(--gray-400)', fontSize: '0.78rem' }}>{i + 1}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem' }}>{r.rollNo}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.name}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {r.sgpa !== null
                              ? <span style={{ fontWeight: 800, fontSize: '1.05rem', color: sgpaColor(r.sgpa) }}>{r.sgpa}</span>
                              : <span style={{ color: 'var(--gray-300)', fontSize: '0.82rem' }}>Not found</span>
                            }
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {r.sgpa !== null && (
                              <button onClick={() => fetchDetail(r.rollNo)}
                                style={{ background: expandedRow === r.rollNo ? '#eff6ff' : 'var(--gray-50)', border: '1px solid var(--gray-200)', color: '#2563c8', borderRadius: 7, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                {loadingDetail === r.rollNo ? '…' : expandedRow === r.rollNo ? '▲ Hide' : '▼ View'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedRow === r.rollNo && (
                          <tr key={`${r.rollNo}-detail`}>
                            <td colSpan={5} style={{ background: '#f0f7ff', padding: '0 16px 16px' }}>
                              {loadingDetail === r.rollNo ? (
                                <div style={{ padding: 16, textAlign: 'center' }}><Spinner /></div>
                              ) : detailData[r.rollNo] ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginTop: 12 }}>
                                  <thead>
                                    <tr style={{ background: '#dbeafe' }}>
                                      <th style={{ padding: '6px 10px', textAlign: 'left',   color: '#1e40af' }}>Subject Code</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left',   color: '#1e40af' }}>Subject Name</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'center', color: '#1e40af' }}>Credits</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'center', color: '#1e40af' }}>Grade</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detailData[r.rollNo].grades.map((g, gi) => (
                                      <tr key={gi} style={{ borderBottom: '1px solid #bfdbfe', background: gi % 2 === 0 ? '#fff' : '#f0f7ff' }}>
                                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#2563c8', fontWeight: 600 }}>{g.subjectCODE}</td>
                                        <td style={{ padding: '6px 10px' }}>{g.subjectName}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>{g.subjectCredits}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 800 }}>{g.grade}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : <div style={{ padding: 12, color: 'var(--gray-400)', fontSize: '0.82rem' }}>Failed to load details.</div>}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}