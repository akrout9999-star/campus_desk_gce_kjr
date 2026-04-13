import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'

export default function StudentAttendance() {
  const { profile } = useAuth()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function fetchAttendance() {
      try {
        const q = query(
          collection(db, 'attendance'),
          where('department', '==', profile.department),
          where('semester',   '==', profile.semester)
        )
        const snap = await getDocs(q)
        const subjectMap = {}
        snap.forEach(docSnap => {
          const d = docSnap.data()
          const subj = d.subject || 'Unknown'
          if (!subjectMap[subj]) subjectMap[subj] = { total: 0, attended: 0 }
          if (d.students && d.students[profile.rollNo] !== undefined) {
            subjectMap[subj].total++
            if (d.students[profile.rollNo] === true) subjectMap[subj].attended++
          }
        })
        const result = Object.entries(subjectMap).map(([subject, v]) => ({
          subject, ...v,
          pct: v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0,
        }))
        setData(result)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchAttendance()
  }, [profile])

  const overall = data.length
    ? Math.round(data.reduce((a, b) => a + b.pct, 0) / data.length)
    : null

  const totalAttended = data.reduce((a, b) => a + b.attended, 0)
  const totalClasses  = data.reduce((a, b) => a + b.total, 0)

  const pctColor = p => p >= 75 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626'
  const pctBg    = p => p >= 75 ? '#dcfce7' : p >= 60 ? '#fef3c7' : '#fef2f2'

  const printReport = () => {
    const win = window.open('', '_blank')
    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Attendance Report — ${profile.name}</title>
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
    .bar-wrap { background:#e2e8f0; border-radius:99px; height:7px; width:100%; margin-top:4px; }
    .bar-fill { height:7px; border-radius:99px; }
    .good { color:#16a34a; font-weight:700; }
    .warn { color:#d97706; font-weight:700; }
    .bad  { color:#dc2626; font-weight:700; }
    .summary { background:#1a3a6e; color:#fff; padding:14px 18px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .summary .label { font-size:11px; opacity:0.7; }
    .summary .val   { font-size:18px; font-weight:700; }
    .notice { font-size:11px; padding:10px 14px; border-radius:6px; margin-bottom:16px; }
    .footer { margin-top:30px; border-top:1px solid #e2e8f0; padding-top:12px; font-size:10px; color:#aaa; display:flex; justify-content:space-between; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Government College of Engineering, Keonjhar</h1>
    <p>Attendance Report &nbsp;|&nbsp; Semester ${profile.semester}</p>
    <p style="margin-top:2px;font-size:11px;color:#aaa;">Generated: ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
  </div>

  <div class="info-grid">
    <div class="info-item"><label>Student Name</label><span>${profile.name}</span></div>
    <div class="info-item"><label>Roll Number</label><span>${profile.rollNo}</span></div>
    <div class="info-item"><label>Department</label><span>${profile.department}</span></div>
    <div class="info-item"><label>Semester</label><span>${profile.semester}</span></div>
  </div>

  <div class="summary">
    <div><div class="label">Overall Attendance</div><div class="val">${overall !== null ? overall + '%' : '—'}</div></div>
    <div><div class="label">Total Classes Attended</div><div class="val">${totalAttended} / ${totalClasses}</div></div>
    <div><div class="label">Subjects</div><div class="val">${data.length}</div></div>
  </div>

  <div class="notice" style="background:${overall >= 75 ? '#dcfce7' : overall >= 60 ? '#fef3c7' : '#fef2f2'}; color:${overall >= 75 ? '#16a34a' : overall >= 60 ? '#d97706' : '#dc2626'};">
    ${overall >= 75
      ? '✅ You meet the minimum 75% attendance requirement.'
      : overall >= 60
      ? '⚠️ At risk — you need to attend more classes to meet the 75% requirement.'
      : '❌ Below minimum attendance — please attend classes urgently.'}
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th>Classes Attended</th>
        <th>Total Classes</th>
        <th>Attendance %</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
      <tr>
        <td>${row.subject}</td>
        <td>${row.attended}</td>
        <td>${row.total}</td>
        <td class="${row.pct >= 75 ? 'good' : row.pct >= 60 ? 'warn' : 'bad'}">${row.pct}%</td>
        <td>${row.pct >= 75 ? '✅ Safe' : row.pct >= 60 ? '⚠️ At Risk' : '❌ Low'}</td>
      </tr>`).join('')}
    </tbody>
  </table>

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
    <AppShell title="My Attendance">
      {loading ? <Spinner /> : (
        <>
          {/* Overall + print button */}
          {overall !== null && (
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, flexWrap:'wrap' }}>
              <div className="card" style={{ flex:1, minWidth:240, display:'flex', alignItems:'center', gap:20, padding:'16px 20px' }}>
                <div style={{ width:72, height:72, borderRadius:'50%', background:pctBg(overall), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:'1.3rem', fontWeight:700, color:pctColor(overall) }}>{overall}%</span>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--blue-900)' }}>Overall Attendance</div>
                  <div style={{ fontSize:'0.82rem', color:'var(--gray-500)', marginTop:2 }}>
                    {totalAttended} / {totalClasses} classes &nbsp;•&nbsp; {data.length} subjects
                  </div>
                  <div style={{ fontSize:'0.8rem', marginTop:6, fontWeight:600, color:pctColor(overall) }}>
                    {overall >= 75 ? '✅ You meet the 75% requirement'
                      : overall >= 60 ? '⚠️ At risk — attend more classes'
                      : '❌ Below minimum — attend urgently'}
                  </div>
                </div>
              </div>
              <button className="btn btn-outline" onClick={printReport}
                style={{ display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap', height:'fit-content' }}>
                🖨️ Download / Print Report
              </button>
            </div>
          )}

          {/* Summary stat strip */}
          {data.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:12, marginBottom:20 }}>
              {[
                { label:'Total Classes',  val:totalClasses,  color:'#7c3aed', bg:'#f5f3ff' },
                { label:'Attended',       val:totalAttended, color:'#2563c8', bg:'#eff6ff' },
                { label:'Subjects Safe',  val:data.filter(d=>d.pct>=75).length, color:'#16a34a', bg:'#dcfce7' },
                { label:'Subjects at Risk', val:data.filter(d=>d.pct<75).length, color:'#dc2626', bg:'#fef2f2' },
              ].map(item => (
                <div key={item.label} style={{ background:item.bg, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:'1.3rem', fontWeight:700, color:item.color }}>{item.val}</div>
                  <div style={{ fontSize:'0.7rem', color:item.color, fontWeight:600 }}>{item.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Subject cards */}
          {data.length === 0 ? (
            <div className="empty-state">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No attendance records found yet.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {data.map(item => (
                <div key={item.subject} className="card" style={{ padding:'16px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700, color:'var(--blue-900)', fontSize:'0.95rem' }}>{item.subject}</div>
                      <div style={{ fontSize:'0.78rem', color:'var(--gray-500)', marginTop:2 }}>
                        {item.attended} / {item.total} classes attended
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ display:'inline-block', padding:'3px 12px', borderRadius:99, background:pctBg(item.pct), color:pctColor(item.pct), fontWeight:700, fontSize:'0.85rem' }}>
                        {item.pct}%
                      </span>
                      <span style={{ fontSize:'0.7rem', color:pctColor(item.pct), fontWeight:600 }}>
                        {item.pct >= 75 ? '✅ Safe' : item.pct >= 60 ? '⚠️ At Risk' : '❌ Low'}
                      </span>
                    </div>
                  </div>
                  <div className="pct-bar-bg">
                    <div className={`pct-bar-fill ${item.pct >= 75 ? 'good' : item.pct >= 60 ? 'warn' : 'bad'}`} style={{ width:`${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}