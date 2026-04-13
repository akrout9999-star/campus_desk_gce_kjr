import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'
import { SEMESTERS } from '../../utils/roles'

const MAX_MID = 15

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const teacherDepts = profile?.departments || (profile?.department ? [profile.department] : [])

  const [dept,     setDept]     = useState(teacherDepts[0] || '')
  const [sem,      setSem]      = useState(1)
  const [subject,  setSubject]  = useState('')
  const [subjects, setSubjects] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [stats,    setStats]    = useState(null)

  useEffect(() => {
    if (dept && sem) fetchSubjects()
  }, [dept, sem])

  const fetchSubjects = async () => {
    const docId = `${dept}_${sem}`.replace(/\s+/g, '_')
    const snap = await getDoc(doc(db, 'subjects', docId))
    const list = snap.exists() ? (snap.data().subjects || []) : []
    setSubjects(list)
    setSubject(list[0] || '')
    setStats(null)
  }

  const loadStats = async () => {
    if (!dept || !subject) return
    setLoading(true)
    try {
      // Students
      const stuSnap = await getDocs(query(collection(db,'users'), where('department','==',dept), where('semester','==',Number(sem)), where('role','in',['student','cr'])))
      const students = []
      stuSnap.forEach(d => students.push({ uid:d.id, ...d.data() }))

      // Attendance
      const attSnap = await getDocs(query(collection(db,'attendance'), where('department','==',dept), where('semester','==',Number(sem)), where('subject','==',subject)))
      const attRecs = []
      attSnap.forEach(d => attRecs.push(d.data()))
      const allDates = [...new Set(attRecs.map(r => r.date))]

      const attStats = students.map(s => {
        let present = 0
        allDates.forEach(d => {
          const rec = attRecs.find(r => r.date === d)
          if (rec?.students?.[s.rollNo] === true) present++
        })
        const pct = allDates.length > 0 ? Math.round((present / allDates.length) * 100) : null
        return { rollNo: s.rollNo, pct }
      })
      const withAtt = attStats.filter(s => s.pct !== null)
      const avgAtt  = withAtt.length > 0 ? Math.round(withAtt.reduce((a,b) => a+b.pct, 0) / withAtt.length) : null
      const above75 = withAtt.filter(s => s.pct >= 75).length
      const b50to75 = withAtt.filter(s => s.pct >= 50 && s.pct < 75).length
      const below50 = withAtt.filter(s => s.pct < 50).length

      // Marks
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      const mSnap = await getDoc(doc(db, 'marks', docId))
      const mData = mSnap.exists() ? (mSnap.data().students || {}) : {}
      const mScores = students.map(s => {
        const d = mData[s.rollNo]
        if (!d) return null
        const total = (d.mid1 ?? 0) + (d.mid2 ?? 0)
        return (d.mid1 !== undefined || d.mid2 !== undefined) ? total : null
      }).filter(s => s !== null)

      const maxTotal = MAX_MID * 2
      const avgMarks = mScores.length > 0 ? (mScores.reduce((a,b) => a+b, 0) / mScores.length).toFixed(1) : null
      const fullScore = mScores.filter(s => s === maxTotal).length
      const above10   = mScores.filter(s => s > 10).length
      const below5    = mScores.filter(s => s < 5).length

      setStats({ totalStudents: students.length, totalClasses: allDates.length, avgAtt, above75, b50to75, below50, avgMarks, maxTotal, fullScore, above10, below5, withMarks: mScores.length })
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const pctBar = (val, max, color) => (
    <div style={{ height:8, background:'var(--gray-100)', borderRadius:99, overflow:'hidden', marginTop:4 }}>
      <div style={{ height:'100%', width: max > 0 ? `${Math.min((val/max)*100,100)}%` : '0%', background: color, borderRadius:99, transition:'width 0.5s' }} />
    </div>
  )

  const quickLinks = [
    { to:'/teacher/take-attendance', label:'Take Attendance', icon:'📋', color:'#eff6ff', iconColor:'#2563c8' },
    { to:'/teacher/marks',           label:'Enter Marks',     icon:'✏️', color:'#f0fdf4', iconColor:'#16a34a' },
    { to:'/teacher/view-attendance', label:'View Attendance', icon:'📊', color:'#faf5ff', iconColor:'#7c3aed' },
    { to:'/teacher/view-marks',      label:'View Marks',      icon:'📈', color:'#fff7ed', iconColor:'#ea580c' },
    { to:'/teacher/timetable',       label:'Time Table',      icon:'🗓️', color:'#f0fdf4', iconColor:'#0891b2' },
    { to:'/teacher/bput-results',    label:'BPUT Results',    icon:'🎓', color:'#fefce8', iconColor:'#ca8a04' },
    { to:'/teacher/notice-board',    label:'Notice Board',    icon:'📢', color:'#fdf4ff', iconColor:'#9333ea' },
  ]

  return (
    <AppShell title="Dashboard">
      {/* Greeting */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', color:'var(--blue-900)', marginBottom:4 }}>
          Hello, {profile?.name?.split(' ')[0] || 'Teacher'} 👋
        </h1>
        <p style={{ color:'var(--gray-500)', fontSize:'0.9rem' }}>
          {teacherDepts.length > 0 ? teacherDepts.join(' · ') : 'No department assigned'} &nbsp;·&nbsp; <span style={{ textTransform:'capitalize' }}>{profile?.role}</span>
        </p>
      </div>

      {/* Quick links */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:14, marginBottom:28 }}>
        {quickLinks.map(ql => (
          <Link key={ql.to} to={ql.to} style={{ textDecoration:'none' }}>
            <div style={{ background:ql.color, borderRadius:14, padding:'16px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:12, border:'1.5px solid transparent', transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.10)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
              <span style={{ fontSize:'1.4rem' }}>{ql.icon}</span>
              <span style={{ fontWeight:700, fontSize:'0.88rem', color:ql.iconColor }}>{ql.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Class summary selector */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header" style={{ marginBottom:16 }}>
          <div className="card-title">Class Summary</div>
          <span style={{ fontSize:'0.78rem', color:'var(--gray-400)' }}>Select class to see live stats</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:12, marginBottom:14 }}>
          <div className="field" style={{ margin:0 }}>
            <label>Department</label>
            <select value={dept} onChange={e => setDept(e.target.value)}>
              {teacherDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin:0 }}>
            <label>Semester</label>
            <select value={sem} onChange={e => setSem(Number(e.target.value))}>
              {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin:0 }}>
            <label>Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin:0, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn btn-primary" onClick={loadStats} disabled={!subject || loading}>
              {loading ? 'Loading…' : 'Load'}
            </button>
          </div>
        </div>
      </div>

      {loading && <Spinner />}

      {stats && !loading && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>

          {/* Attendance card */}
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <div className="card-title">📊 Attendance</div>
              <span className="badge badge-blue">{stats.totalClasses} classes</span>
            </div>

            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:'2.5rem', fontWeight:800, color: stats.avgAtt >= 75 ? '#16a34a' : stats.avgAtt >= 50 ? '#d97706' : '#dc2626' }}>
                {stats.avgAtt !== null ? stats.avgAtt + '%' : '—'}
              </div>
              <div style={{ fontSize:'0.78rem', color:'var(--gray-400)', marginTop:2 }}>Average Attendance</div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Above 75%', val:stats.above75, color:'#16a34a', bg:'#dcfce7' },
                { label:'50% – 75%', val:stats.b50to75, color:'#d97706', bg:'#fef3c7' },
                { label:'Below 50%', val:stats.below50, color:'#dc2626', bg:'#fef2f2' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:'0.82rem', fontWeight:600, color:item.color }}>{item.label}</span>
                    <span style={{ fontSize:'0.82rem', fontWeight:700, background:item.bg, color:item.color, padding:'1px 8px', borderRadius:99 }}>{item.val} students</span>
                  </div>
                  {pctBar(item.val, stats.totalStudents, item.color)}
                </div>
              ))}
            </div>
          </div>

          {/* Marks card */}
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <div className="card-title">📈 Marks</div>
              <span className="badge badge-blue">{stats.withMarks}/{stats.totalStudents} entered</span>
            </div>

            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:'2.5rem', fontWeight:800, color:'#2563c8' }}>
                {stats.avgMarks !== null ? `${stats.avgMarks}/${stats.maxTotal}` : '—'}
              </div>
              <div style={{ fontSize:'0.78rem', color:'var(--gray-400)', marginTop:2 }}>
                Class Average &nbsp;({stats.avgMarks !== null ? Math.round((stats.avgMarks/stats.maxTotal)*100)+'%' : '—'})
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:`Full Score (${stats.maxTotal}/${stats.maxTotal})`, val:stats.fullScore, color:'#7c3aed', bg:'#f5f3ff' },
                { label:'Above 10 marks',                                   val:stats.above10,   color:'#16a34a', bg:'#dcfce7' },
                { label:'Below 5 marks',                                    val:stats.below5,    color:'#dc2626', bg:'#fef2f2' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:'0.82rem', fontWeight:600, color:item.color }}>{item.label}</span>
                    <span style={{ fontSize:'0.82rem', fontWeight:700, background:item.bg, color:item.color, padding:'1px 8px', borderRadius:99 }}>{item.val} students</span>
                  </div>
                  {pctBar(item.val, stats.totalStudents, item.color)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!stats && !loading && (
        <div className="empty-state" style={{ marginTop:0 }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p>Select a class and click Load to see attendance & marks summary.</p>
        </div>
      )}
    </AppShell>
  )
}