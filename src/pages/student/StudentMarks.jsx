import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'

const MAX_MID = 15

export default function StudentMarks() {
  const { profile } = useAuth()
  const [data,    setData]    = useState([])
  const [allData, setAllData] = useState([]) // all students for rank
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [examMode,   setExamMode]   = useState('both') // mid1 | mid2 | both

  useEffect(() => {
    if (!profile) return
    async function fetchMarks() {
      try {
        // This student's marks
        const q = query(collection(db,'marks'), where('department','==',profile.department), where('semester','==',profile.semester))
        const snap = await getDocs(q)
        const result = []
        snap.forEach(d => {
          const rd = d.data()
          const sm = rd.students?.[profile.rollNo]
          result.push({ subject: rd.subject || 'Unknown', mid1: sm?.mid1 ?? null, mid2: sm?.mid2 ?? null, allStudents: rd.students || {} })
        })
        setData(result)

        // All students in dept+sem for rank
        const stuSnap = await getDocs(query(collection(db,'users'), where('department','==',profile.department), where('semester','==',profile.semester), where('role','in',['student','cr'])))
        const stuList = []
        stuSnap.forEach(d => stuList.push({ uid:d.id, ...d.data() }))
        setAllData(stuList)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchMarks()
  }, [profile])

  const getRank = (subject, myScore, allStudents) => {
    const scores = Object.values(allStudents).map(s => {
      if (examMode === 'mid1') return s.mid1 ?? null
      if (examMode === 'mid2') return s.mid2 ?? null
      return (s.mid1 ?? 0) + (s.mid2 ?? 0)
    }).filter(s => s !== null)
    scores.sort((a, b) => b - a)
    const rank = scores.indexOf(myScore) + 1
    return rank > 0 ? rank : null
  }

  const getScore = (row) => {
    if (examMode === 'mid1') return { score: row.mid1, max: MAX_MID }
    if (examMode === 'mid2') return { score: row.mid2, max: MAX_MID }
    const both = (row.mid1 !== null || row.mid2 !== null)
    return { score: both ? (row.mid1 ?? 0) + (row.mid2 ?? 0) : null, max: MAX_MID * 2 }
  }

  const rows = data.map(row => {
    const { score, max } = getScore(row)
    const pct = score !== null ? Math.round((score / max) * 100) : null
    const rank = score !== null ? getRank(row.subject, score, row.allStudents) : null
    return { ...row, score, max, pct, rank }
  })

  // Overall totals
  const withScores = rows.filter(r => r.score !== null)
  const totalScore = withScores.reduce((a, b) => a + b.score, 0)
  const totalMax   = withScores.reduce((a, b) => a + b.max, 0)
  const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null

  const badgeColor = p => p == null ? '#94a3b8' : p >= 75 ? '#16a34a' : p >= 50 ? '#d97706' : '#dc2626'
  const badgeBg    = p => p == null ? '#f1f5f9' : p >= 75 ? '#dcfce7' : p >= 50 ? '#fef3c7' : '#fef2f2'

  const printReport = () => {
    const examLabel = examMode === 'mid1' ? 'Mid-Term 1' : examMode === 'mid2' ? 'Mid-Term 2' : 'Mid-Term 1 & 2 (Combined)'
    const win = window.open('', '_blank')
    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Marks Report — ${profile.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; padding: 36px; color: #1a2340; font-size: 13px; }
    .header { text-align:center; border-bottom: 2px solid #1a3a6e; padding-bottom:16px; margin-bottom:20px; }
    .header h1 { font-size:18px; color:#1a3a6e; }
    .header p  { font-size:12px; color:#666; margin-top:4px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:20px; background:#f8fafc; padding:14px; border-radius:8px; }
    .info-item label { font-size:10px; color:#888; font-weight:700; text-transform:uppercase; display:block; }
    .info-item span  { font-size:13px; font-weight:600; color:#1a2340; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    th { background:#1a3a6e; color:#fff; padding:9px 12px; text-align:left; font-size:11px; }
    td { padding:9px 12px; border-bottom:1px solid #e2e8f0; font-size:12px; }
    tr:nth-child(even) td { background:#f8fafc; }
    .pct-good { color:#16a34a; font-weight:700; }
    .pct-mid  { color:#d97706; font-weight:700; }
    .pct-bad  { color:#dc2626; font-weight:700; }
    .summary  { background:#1a3a6e; color:#fff; padding:14px 18px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; }
    .summary .label { font-size:11px; opacity:0.7; }
    .summary .val   { font-size:18px; font-weight:700; }
    .footer { margin-top:30px; border-top:1px solid #e2e8f0; padding-top:12px; font-size:10px; color:#aaa; display:flex; justify-content:space-between; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Government College of Engineering, Keonjhar</h1>
    <p>Internal Assessment Marks Report &nbsp;|&nbsp; ${examLabel}</p>
    <p style="margin-top:2px;font-size:11px;color:#aaa;">Generated: ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
  </div>

  <div class="info-grid">
    <div class="info-item"><label>Student Name</label><span>${profile.name}</span></div>
    <div class="info-item"><label>Roll Number</label><span>${profile.rollNo}</span></div>
    <div class="info-item"><label>Department</label><span>${profile.department}</span></div>
    <div class="info-item"><label>Semester</label><span>${profile.semester}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        ${examMode === 'both' || examMode === 'mid1' ? '<th>Mid-1 (/'+MAX_MID+')</th>' : ''}
        ${examMode === 'both' || examMode === 'mid2' ? '<th>Mid-2 (/'+MAX_MID+')</th>' : ''}
        ${examMode === 'both' ? '<th>Total (/'+(MAX_MID*2)+')</th>' : ''}
        <th>%</th>
        <th>Rank (Class)</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
      <tr>
        <td>${r.subject}</td>
        ${examMode === 'both' || examMode === 'mid1' ? `<td>${r.mid1 ?? '—'}</td>` : ''}
        ${examMode === 'both' || examMode === 'mid2' ? `<td>${r.mid2 ?? '—'}</td>` : ''}
        ${examMode === 'both' ? `<td><strong>${r.score ?? '—'}</strong></td>` : ''}
        <td class="${r.pct >= 75 ? 'pct-good' : r.pct >= 50 ? 'pct-mid' : 'pct-bad'}">${r.pct !== null ? r.pct+'%' : '—'}</td>
        <td>${r.rank ? (r.rank === 1 ? '🥇 1st' : r.rank === 2 ? '🥈 2nd' : r.rank === 3 ? '🥉 3rd' : r.rank+'th') : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="summary">
    <div><div class="label">Overall Score</div><div class="val">${totalScore} / ${totalMax}</div></div>
    <div><div class="label">Overall Percentage</div><div class="val">${overallPct !== null ? overallPct+'%' : '—'}</div></div>
    <div><div class="label">Subjects Counted</div><div class="val">${withScores.length}</div></div>
  </div>

  <div class="footer">
    <span>CampusDesk — GCE Keonjhar</span>
    <span>This is a computer-generated report.</span>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`)
    win.document.close()
  }

  return (
    <AppShell title="Internal Marks">
      {loading ? <Spinner /> : data.length === 0 ? (
        <div className="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <p>No marks published yet.</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center', marginBottom:20 }}>
            <div style={{ display:'flex', gap:8 }}>
              {['mid1','mid2','both'].map(m => (
                <button key={m} className={`btn ${examMode===m?'btn-primary':'btn-outline'}`} onClick={() => setExamMode(m)}>
                  {m==='mid1'?'Mid-1':m==='mid2'?'Mid-2':'Both'}
                </button>
              ))}
            </div>
            <button className="btn btn-outline" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }} onClick={printReport}>
              🖨️ Download / Print Report
            </button>
          </div>

          {/* Summary strip */}
          <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
            {[
              { label:'Total Score', val: `${totalScore}/${totalMax}`, color:'#2563c8', bg:'#eff6ff' },
              { label:'Overall %',   val: overallPct !== null ? overallPct+'%' : '—', color: badgeColor(overallPct), bg: badgeBg(overallPct) },
              { label:'Subjects',    val: withScores.length, color:'#7c3aed', bg:'#f5f3ff' },
            ].map(item => (
              <div key={item.label} style={{ flex:'1 1 100px', background:item.bg, borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'1.3rem', fontWeight:700, color:item.color }}>{item.val}</div>
                <div style={{ fontSize:'0.72rem', color:item.color, fontWeight:600 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Marks table */}
          <div className="card" style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
              <thead>
                <tr style={{ background:'var(--gray-50)', borderBottom:'2px solid var(--gray-200)' }}>
                  <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Subject</th>
                  {(examMode==='mid1'||examMode==='both') && <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Mid-1 (/{MAX_MID})</th>}
                  {(examMode==='mid2'||examMode==='both') && <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Mid-2 (/{MAX_MID})</th>}
                  {examMode==='both' && <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Total (/{MAX_MID*2})</th>}
                  <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>%</th>
                  <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Rank</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--gray-100)', background:i%2===0?'#fff':'var(--gray-50)' }}>
                    <td style={{ padding:'10px 12px', fontWeight:600 }}>{r.subject}</td>
                    {(examMode==='mid1'||examMode==='both') && <td style={{ padding:'10px 12px', textAlign:'center' }}>{r.mid1 ?? '—'}</td>}
                    {(examMode==='mid2'||examMode==='both') && <td style={{ padding:'10px 12px', textAlign:'center' }}>{r.mid2 ?? '—'}</td>}
                    {examMode==='both' && <td style={{ padding:'10px 12px', textAlign:'center', fontWeight:700 }}>{r.score ?? '—'}</td>}
                    <td style={{ padding:'10px 12px', textAlign:'center' }}>
                      <span style={{ display:'inline-block', padding:'3px 12px', borderRadius:99, background:badgeBg(r.pct), color:badgeColor(r.pct), fontWeight:700, fontSize:'0.82rem' }}>
                        {r.pct !== null ? r.pct+'%' : '—'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, fontSize:'1rem' }}>
                      {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank ? `#${r.rank}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  )
}