import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'
import { DEPARTMENTS, SEMESTERS } from '../../utils/roles'
import * as XLSX from 'xlsx'

export default function ViewAttendance() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const teacherDepts = profile?.departments || (profile?.department ? [profile.department] : [])
  const deptList = isAdmin ? DEPARTMENTS : teacherDepts

  // Main mode toggle — admin only
  const [mode, setMode] = useState('subject') // 'subject' | 'semester'

  // ── SUBJECT-WISE state ──
  const [dept,     setDept]     = useState(isAdmin ? '' : (teacherDepts[0] || ''))
  const [sem,      setSem]      = useState(1)
  const [subject,  setSubject]  = useState('')
  const [subjects, setSubjects] = useState([])
  const [records,  setRecords]  = useState([])
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const [minPct,       setMinPct]       = useState('')
  const [sortBy,       setSortBy]       = useState('rollno')
  const [view,         setView]         = useState('summary')
  const [deletingDate, setDeletingDate] = useState(null)

  // ── SEMESTER-WISE state (admin only) ──
  const [swDept,     setSwDept]     = useState('')
  const [swSem,      setSwSem]      = useState(1)
  const [swSubjects, setSwSubjects] = useState([])
  const [swStudents, setSwStudents] = useState([])
  const [swData,     setSwData]     = useState({}) // { [subject]: { [rollNo]: { present, total } } }
  const [swLoading,  setSwLoading]  = useState(false)
  const [swLoaded,   setSwLoaded]   = useState(false)
  const [swSortBy,   setSwSortBy]   = useState('rollno')
  const [swFilter,   setSwFilter]   = useState('all') // all | above75 | 50to75 | below50

  // ── SUBJECT-WISE functions ──
  useEffect(() => { if (dept && sem) fetchSubjects() }, [dept, sem])

  const fetchSubjects = async () => {
    const docId = `${dept}_${sem}`.replace(/\s+/g, '_')
    const snap = await getDoc(doc(db, 'subjects', docId))
    setSubjects(snap.exists() ? (snap.data().subjects || []) : [])
    setSubject('')
    setLoaded(false)
  }

  const fetchData = async () => {
    if (!dept || !subject) return
    setLoading(true)
    setLoaded(false)
    try {
      const attSnap = await getDocs(query(collection(db,'attendance'), where('department','==',dept), where('semester','==',Number(sem)), where('subject','==',subject)))
      const recs = []
      attSnap.forEach(d => recs.push({ id:d.id, ...d.data() }))
      recs.sort((a,b) => a.date?.localeCompare(b.date))
      setRecords(recs)
      const stuSnap = await getDocs(query(collection(db,'users'), where('department','==',dept), where('semester','==',Number(sem)), where('role','in',['student','cr'])))
      const list = []
      stuSnap.forEach(d => list.push({ uid:d.id, ...d.data() }))
      list.sort((a,b) => a.rollNo?.localeCompare(b.rollNo))
      setStudents(list)
      setLoaded(true)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const allDates = [...new Set(records.map(r => r.date))].sort()

  const getStudentStats = () => students.map(stu => {
    let present = 0
    const dateMap = {}
    allDates.forEach(d => {
      const rec = records.find(r => r.date === d)
      const val = rec?.students?.[stu.rollNo]
      dateMap[d] = val === true ? 'P' : val === false ? 'A' : '-'
      if (val === true) present++
    })
    const pct = allDates.length > 0 ? Math.round((present / allDates.length) * 100) : null
    return { ...stu, present, total: allDates.length, pct, dateMap }
  })

  let allStats = getStudentStats()
  let filtered = minPct !== '' ? allStats.filter(s => s.pct !== null && s.pct >= Number(minPct)) : allStats
  filtered = [...filtered].sort((a,b) => {
    if (sortBy === 'rollno')      return a.rollNo?.localeCompare(b.rollNo)
    if (sortBy === 'rollno-desc') return b.rollNo?.localeCompare(a.rollNo)
    if (sortBy === 'pct-desc')    return (b.pct??-1) - (a.pct??-1)
    if (sortBy === 'pct-asc')     return (a.pct??101) - (b.pct??101)
    return 0
  })

  const dateTotals = {}
  allDates.forEach(d => {
    const rec = records.find(r => r.date === d)
    dateTotals[d] = students.filter(s => rec?.students?.[s.rollNo] === true).length
  })

  const deleteAttendance = async (date) => {
    if (!window.confirm(`Delete attendance for ${subject} on ${date}? This cannot be undone.`)) return
    setDeletingDate(date)
    try {
      const docId = `${dept}_${sem}_${subject}_${date}`.replace(/\s+/g, '_')
      await deleteDoc(doc(db, 'attendance', docId))
      setRecords(prev => prev.filter(r => r.date !== date))
    } catch(e) { console.error(e); alert('Failed to delete.') }
    finally { setDeletingDate(null) }
  }

  const downloadExcel = () => {
    const headers = ['Roll No','Name',...allDates.map(d=>fmtDate(d)),'Total Present','Total Classes','Attendance %']
    const rows = filtered.map(s => [s.rollNo, s.name, ...allDates.map(d=>s.dateMap[d]), s.present, s.total, s.pct!==null?s.pct+'%':'-'])
    rows.push(['','CLASS TOTAL',...allDates.map(d=>dateTotals[d]),'','',''])
    const ws = XLSX.utils.aoa_to_sheet([headers,...rows])
    ws['!cols'] = [{wch:14},{wch:24},...allDates.map(()=>({wch:10})),{wch:14},{wch:14},{wch:14}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `Attendance_${dept}_Sem${sem}_${subject}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const fmtDate = (d) => {
    const [, m, day] = d.split('-')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${parseInt(day)}-${months[parseInt(m)-1]}`
  }

  const pctColor = p => p==null?'#94a3b8':p>=75?'#16a34a':p>=60?'#d97706':'#dc2626'
  const pctBg    = p => p==null?'#f1f5f9':p>=75?'#dcfce7':p>=60?'#fef3c7':'#fef2f2'

  // ── SEMESTER-WISE functions ──
  const fetchSwData = async () => {
    if (!swDept || !swSem) return
    setSwLoading(true)
    setSwLoaded(false)
    try {
      // Get subjects for this dept+sem
      const subDocId = `${swDept}_${swSem}`.replace(/\s+/g, '_')
      const subSnap = await getDoc(doc(db, 'subjects', subDocId))
      const subList = subSnap.exists() ? (subSnap.data().subjects || []) : []
      setSwSubjects(subList)

      // Get students
      const stuSnap = await getDocs(query(collection(db,'users'), where('department','==',swDept), where('semester','==',Number(swSem)), where('role','in',['student','cr'])))
      const stuList = []
      stuSnap.forEach(d => stuList.push({ uid:d.id, ...d.data() }))
      stuList.sort((a,b) => a.rollNo?.localeCompare(b.rollNo))
      setSwStudents(stuList)

      // Get attendance for each subject
      const dataMap = {}
      await Promise.all(subList.map(async (subj) => {
        const attSnap = await getDocs(query(collection(db,'attendance'), where('department','==',swDept), where('semester','==',Number(swSem)), where('subject','==',subj)))
        const recs = []
        attSnap.forEach(d => recs.push(d.data()))
        const allSubjDates = [...new Set(recs.map(r => r.date))]
        const subjMap = {}
        stuList.forEach(stu => {
          let present = 0
          allSubjDates.forEach(date => {
            const rec = recs.find(r => r.date === date)
            if (rec?.students?.[stu.rollNo] === true) present++
          })
          subjMap[stu.rollNo] = { present, total: allSubjDates.length }
        })
        dataMap[subj] = subjMap
      }))

      setSwData(dataMap)
      setSwLoaded(true)
    } catch(e) { console.error(e) }
    finally { setSwLoading(false) }
  }

  // Compute overall % per student across all subjects
  const getSwStats = () => swStudents.map(stu => {
    let totalPresent = 0, totalClasses = 0
    swSubjects.forEach(subj => {
      const d = swData[subj]?.[stu.rollNo]
      if (d) { totalPresent += d.present; totalClasses += d.total }
    })
    const overallPct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : null
    return { ...stu, overallPct }
  })

  let swStats = getSwStats()

  // Filter
  let swFiltered = swStats.filter(s => {
    if (swFilter === 'above75')  return s.overallPct !== null && s.overallPct >= 75
    if (swFilter === '50to75')   return s.overallPct !== null && s.overallPct >= 50 && s.overallPct < 75
    if (swFilter === 'below50')  return s.overallPct !== null && s.overallPct < 50
    return true
  })

  // Sort
  swFiltered = [...swFiltered].sort((a,b) => {
    if (swSortBy === 'rollno')      return a.rollNo?.localeCompare(b.rollNo)
    if (swSortBy === 'rollno-desc') return b.rollNo?.localeCompare(a.rollNo)
    if (swSortBy === 'pct-desc')    return (b.overallPct??-1) - (a.overallPct??-1)
    if (swSortBy === 'pct-asc')     return (a.overallPct??101) - (b.overallPct??101)
    return 0
  })

  const downloadSwExcel = () => {
    // Build headers: Roll No, Name, then per subject: "SubjName P/T", "SubjName %", then Overall %
    const headers = ['Roll No', 'Name']
    swSubjects.forEach(subj => { headers.push(`${subj} (P/T)`); headers.push(`${subj} (%)`) })
    headers.push('Overall %')

    const rows = swFiltered.map(stu => {
      const row = [stu.rollNo, stu.name]
      swSubjects.forEach(subj => {
        const d = swData[subj]?.[stu.rollNo]
        row.push(d && d.total > 0 ? `${d.present}/${d.total}` : '—')
        row.push(d && d.total > 0 ? Math.round((d.present/d.total)*100)+'%' : '—')
      })
      row.push(stu.overallPct !== null ? stu.overallPct+'%' : '—')
      return row
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{wch:14},{wch:24},...swSubjects.flatMap(()=>[{wch:12},{wch:10}]),{wch:12}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Semester Attendance')
    XLSX.writeFile(wb, `SemAttendance_${swDept}_Sem${swSem}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  return (
    <AppShell title="View Attendance">

      {/* Mode toggle — admin only */}
      {isAdmin && (
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <button className={`btn ${mode==='subject'?'btn-primary':'btn-outline'}`} onClick={() => setMode('subject')}>
            📚 Subject-wise
          </button>
          <button className={`btn ${mode==='semester'?'btn-primary':'btn-outline'}`} onClick={() => setMode('semester')}>
            🏫 Semester-wise
          </button>
        </div>
      )}

      {/* ══ SUBJECT-WISE MODE ══ */}
      {mode === 'subject' && (
        <>
          {/* Filter */}
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
              {isAdmin && (
                <div className="field" style={{ margin:0 }}>
                  <label>Department</label>
                  <select value={dept} onChange={e=>{ setDept(e.target.value); setLoaded(false) }}>
                    <option value="">Select dept</option>
                    {deptList.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div className="field" style={{ margin:0 }}>
                <label>Semester</label>
                <select value={sem} onChange={e=>{ setSem(Number(e.target.value)); setLoaded(false) }}>
                  {SEMESTERS.map(s=><option key={s} value={s}>Sem {s}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin:0 }}>
                <label>Subject</label>
                <select value={subject} onChange={e=>{ setSubject(e.target.value); setLoaded(false) }}>
                  <option value="">Select subject</option>
                  {subjects.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin:0, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={fetchData} disabled={!dept||!subject||loading}>
                  {loading?'Loading…':'Load'}
                </button>
              </div>
            </div>
          </div>

          {!loaded && !loading && <div className="empty-state">Select department, semester and subject then click Load.</div>}
          {loading && <Spinner />}

          {loaded && (
            <>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', marginBottom:12 }}>
                <div style={{ display:'flex', gap:6 }}>
                  <button className={`btn ${view==='summary'?'btn-primary':'btn-outline'}`} onClick={()=>setView('summary')}>📊 Summary</button>
                  <button className={`btn ${view==='datewise'?'btn-primary':'btn-outline'}`} onClick={()=>setView('datewise')}>📅 Date-wise</button>
                </div>
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--gray-600)', whiteSpace:'nowrap' }}>Sort by</label>
                  <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                    style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }}>
                    <option value="rollno">🔢 Roll No (A→Z)</option>
                    <option value="rollno-desc">🔢 Roll No (Z→A)</option>
                    <option value="pct-desc">📈 Attendance % (High→Low)</option>
                    <option value="pct-asc">📉 Attendance % (Low→High)</option>
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--gray-600)', whiteSpace:'nowrap' }}>Min %</label>
                  <select value={minPct} onChange={e=>setMinPct(e.target.value)}
                    style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }}>
                    <option value="">All</option>
                    <option value="80">≥80%</option>
                    <option value="75">≥75%</option>
                    <option value="70">≥70%</option>
                    <option value="60">≥60%</option>
                    <option value="50">≥50%</option>
                  </select>
                </div>
                <button className="btn btn-outline" onClick={downloadExcel} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>⬇ Excel</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:12, marginBottom:16 }} className="summary-stats">
                {[
                  { label: minPct ? `≥${minPct}% Students` : 'Total Students', val: filtered.length, color:'#2563c8', bg:'#eff6ff' },
                  { label:'Total Classes',  val:allDates.length, color:'#7c3aed', bg:'#f5f3ff' },
                  { label:'≥75% Students',  val:filtered.filter(s=>s.pct>=75).length, color:'#16a34a', bg:'#dcfce7' },
                  { label:'<75% Students',  val:filtered.filter(s=>s.pct!==null&&s.pct<75).length, color:'#dc2626', bg:'#fef2f2' },
                ].map(item => (
                  <div key={item.label} style={{ background:item.bg, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:'1.2rem', fontWeight:700, color:item.color }}>{item.val}</div>
                    <div style={{ fontSize:'0.7rem', color:item.color, fontWeight:600 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* SUMMARY VIEW */}
              {view === 'summary' && (
                <div className="card" style={{ padding:0 }}>
                  <div className="card-header" style={{ padding:'14px 16px' }}>
                    <div className="card-title">{subject} — {dept}, Sem {sem}</div>
                    <span className="badge badge-blue">{filtered.length} students</span>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem', minWidth:380 }}>
                      <thead>
                        <tr style={{ background:'var(--gray-50)', borderBottom:'2px solid var(--gray-200)' }}>
                          <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Roll No</th>
                          <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Name</th>
                          <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Present</th>
                          <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Total</th>
                          <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s,i) => (
                          <tr key={s.rollNo} style={{ borderBottom:'1px solid var(--gray-100)', background:i%2===0?'#fff':'var(--gray-50)' }}>
                            <td style={{ padding:'10px 12px', color:'var(--gray-500)', fontSize:'0.8rem', whiteSpace:'nowrap' }}>{s.rollNo}</td>
                            <td style={{ padding:'10px 12px', fontWeight:600, whiteSpace:'nowrap' }}>{s.name}</td>
                            <td style={{ padding:'10px 12px', textAlign:'center', fontWeight:600 }}>{s.present}</td>
                            <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--gray-500)' }}>{s.total}</td>
                            <td style={{ padding:'10px 12px', textAlign:'center' }}>
                              <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:99, background:pctBg(s.pct), color:pctColor(s.pct), fontWeight:700, fontSize:'0.82rem' }}>
                                {s.pct!==null?s.pct+'%':'—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding:'10px 16px', fontSize:'0.72rem', color:'var(--gray-400)', borderTop:'1px solid var(--gray-100)' }}>
                    🟢 ≥75% &nbsp;•&nbsp; 🟡 60–74% &nbsp;•&nbsp; 🔴 &lt;60%
                  </div>
                </div>
              )}

              {/* DATE-WISE VIEW */}
              {view === 'datewise' && (
                <div className="card" style={{ padding:0 }}>
                  <div className="card-header" style={{ padding:'14px 16px' }}>
                    <div className="card-title">Date-wise — {subject}</div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem', minWidth: 400 + allDates.length*50 }}>
                      <thead>
                        <tr style={{ background:'var(--gray-50)', borderBottom:'2px solid var(--gray-200)' }}>
                          <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)', whiteSpace:'nowrap' }}>Roll No</th>
                          <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)', whiteSpace:'nowrap' }}>Name</th>
                          {allDates.map(d => (
                            <th key={d} style={{ padding:'6px 4px', textAlign:'center', fontWeight:700, color:'var(--gray-600)', whiteSpace:'nowrap', fontSize:'0.72rem' }}>
                              <div>{fmtDate(d)}</div>
                              <button onClick={() => deleteAttendance(d)} disabled={deletingDate===d}
                                title={`Delete attendance for ${d}`}
                                style={{ marginTop:3, background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:5, padding:'2px 5px', fontSize:'0.62rem', cursor:'pointer', fontWeight:700, display:'block', width:'100%' }}>
                                {deletingDate===d ? '…' : '🗑'}
                              </button>
                            </th>
                          ))}
                          <th style={{ padding:'10px 8px', textAlign:'center', fontWeight:700, color:'var(--gray-600)', whiteSpace:'nowrap' }}>P/T</th>
                          <th style={{ padding:'10px 8px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s,i) => (
                          <tr key={s.rollNo} style={{ borderBottom:'1px solid var(--gray-100)', background:i%2===0?'#fff':'var(--gray-50)' }}>
                            <td style={{ padding:'8px 12px', color:'var(--gray-500)', fontSize:'0.78rem', whiteSpace:'nowrap' }}>{s.rollNo}</td>
                            <td style={{ padding:'8px 12px', fontWeight:600, whiteSpace:'nowrap' }}>{s.name}</td>
                            {allDates.map(d => (
                              <td key={d} style={{ padding:'6px 4px', textAlign:'center' }}>
                                <span style={{
                                  display:'inline-block', width:22, height:22, borderRadius:5, lineHeight:'22px', fontSize:'0.68rem', fontWeight:700,
                                  background:s.dateMap[d]==='P'?'#dcfce7':s.dateMap[d]==='A'?'#fef2f2':'#f1f5f9',
                                  color:s.dateMap[d]==='P'?'#16a34a':s.dateMap[d]==='A'?'#dc2626':'#94a3b8',
                                }}>{s.dateMap[d]}</span>
                              </td>
                            ))}
                            <td style={{ padding:'8px 8px', textAlign:'center', fontWeight:600, fontSize:'0.82rem', whiteSpace:'nowrap' }}>{s.present}/{s.total}</td>
                            <td style={{ padding:'8px 8px', textAlign:'center' }}>
                              <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99, background:pctBg(s.pct), color:pctColor(s.pct), fontWeight:700, fontSize:'0.78rem' }}>
                                {s.pct!==null?s.pct+'%':'—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background:'#f8fafc', borderTop:'2px solid var(--gray-200)' }}>
                          <td colSpan={2} style={{ padding:'10px 12px', fontWeight:700, fontSize:'0.82rem', color:'var(--gray-600)' }}>CLASS TOTAL</td>
                          {allDates.map(d => (
                            <td key={d} style={{ padding:'8px 4px', textAlign:'center', fontWeight:700, fontSize:'0.82rem', color:'#2563c8' }}>
                              {dateTotals[d]}
                            </td>
                          ))}
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══ SEMESTER-WISE MODE (admin only) ══ */}
      {mode === 'semester' && isAdmin && (
        <>
          {/* Selector */}
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
              <div className="field" style={{ margin:0 }}>
                <label>Department</label>
                <select value={swDept} onChange={e=>{ setSwDept(e.target.value); setSwLoaded(false) }}>
                  <option value="">Select dept</option>
                  {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin:0 }}>
                <label>Semester</label>
                <select value={swSem} onChange={e=>{ setSwSem(Number(e.target.value)); setSwLoaded(false) }}>
                  {SEMESTERS.map(s=><option key={s} value={s}>Sem {s}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin:0, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={fetchSwData} disabled={!swDept||swLoading}>
                  {swLoading ? 'Loading…' : 'Load'}
                </button>
              </div>
            </div>
          </div>

          {!swLoaded && !swLoading && <div className="empty-state">Select department and semester then click Load.</div>}
          {swLoading && (
            <div style={{ textAlign:'center', padding:40 }}>
              <Spinner />
              <p style={{ color:'var(--gray-400)', marginTop:12, fontSize:'0.88rem' }}>Fetching attendance for all subjects…</p>
            </div>
          )}

          {swLoaded && (
            <>
              {/* Sort + filter + download */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--gray-600)', whiteSpace:'nowrap' }}>Sort</label>
                  <select value={swSortBy} onChange={e=>setSwSortBy(e.target.value)}
                    style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }}>
                    <option value="rollno">🔢 Roll No (A→Z)</option>
                    <option value="rollno-desc">🔢 Roll No (Z→A)</option>
                    <option value="pct-desc">📈 Overall % (High→Low)</option>
                    <option value="pct-asc">📉 Overall % (Low→High)</option>
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--gray-600)', whiteSpace:'nowrap' }}>Filter</label>
                  <select value={swFilter} onChange={e=>setSwFilter(e.target.value)}
                    style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }}>
                    <option value="all">All Students</option>
                    <option value="above75">✅ Above 75%</option>
                    <option value="50to75">⚠️ 50% – 75%</option>
                    <option value="below50">❌ Below 50%</option>
                  </select>
                </div>
                <button className="btn btn-outline" onClick={downloadSwExcel} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>⬇ Excel</button>
              </div>

              {/* Stats strip */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:12, marginBottom:16 }}>
                {[
                  { label:'Total Students', val:swStats.length,                                                    color:'#2563c8', bg:'#eff6ff' },
                  { label:'Above 75%',      val:swStats.filter(s=>s.overallPct!==null&&s.overallPct>=75).length,  color:'#16a34a', bg:'#dcfce7' },
                  { label:'50% – 75%',      val:swStats.filter(s=>s.overallPct!==null&&s.overallPct>=50&&s.overallPct<75).length, color:'#d97706', bg:'#fef3c7' },
                  { label:'Below 50%',      val:swStats.filter(s=>s.overallPct!==null&&s.overallPct<50).length,   color:'#dc2626', bg:'#fef2f2' },
                ].map(item => (
                  <div key={item.label} style={{ background:item.bg, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:'1.2rem', fontWeight:700, color:item.color }}>{item.val}</div>
                    <div style={{ fontSize:'0.7rem', color:item.color, fontWeight:600 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Semester-wise table */}
              <div className="card" style={{ padding:0 }}>
                <div className="card-header" style={{ padding:'14px 16px' }}>
                  <div className="card-title">Semester-wise Attendance — {swDept}, Sem {swSem}</div>
                  <span className="badge badge-blue">{swFiltered.length} students</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem', minWidth: 300 + swSubjects.length * 120 }}>
                    <thead>
                      {/* Subject name row */}
                      <tr style={{ background:'#1e3a8a' }}>
                        <th rowSpan={2} style={{ padding:'10px 12px', textAlign:'left', color:'#fff', fontWeight:700, whiteSpace:'nowrap', verticalAlign:'middle', borderRight:'1px solid rgba(255,255,255,0.15)' }}>Roll No</th>
                        <th rowSpan={2} style={{ padding:'10px 12px', textAlign:'left', color:'#fff', fontWeight:700, whiteSpace:'nowrap', verticalAlign:'middle', borderRight:'1px solid rgba(255,255,255,0.15)' }}>Name</th>
                        {swSubjects.map(subj => (
                          <th key={subj} colSpan={2} style={{ padding:'8px 6px', textAlign:'center', color:'#93c5fd', fontWeight:700, fontSize:'0.72rem', borderRight:'1px solid rgba(255,255,255,0.15)', whiteSpace:'nowrap', overflow:'hidden', maxWidth:120, textOverflow:'ellipsis' }}>
                            {subj}
                          </th>
                        ))}
                        <th rowSpan={2} style={{ padding:'10px 8px', textAlign:'center', color:'#fbbf24', fontWeight:800, verticalAlign:'middle', whiteSpace:'nowrap' }}>Overall %</th>
                      </tr>
                      {/* Sub-column headers */}
                      <tr style={{ background:'#1e40af' }}>
                        {swSubjects.map(subj => (
                          <>
                            <th key={`${subj}-pt`} style={{ padding:'6px 4px', textAlign:'center', color:'#bfdbfe', fontWeight:600, fontSize:'0.68rem', borderRight:'1px solid rgba(255,255,255,0.1)' }}>P/T</th>
                            <th key={`${subj}-pct`} style={{ padding:'6px 4px', textAlign:'center', color:'#bfdbfe', fontWeight:600, fontSize:'0.68rem', borderRight:'1px solid rgba(255,255,255,0.15)' }}>%</th>
                          </>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {swFiltered.map((stu, i) => (
                        <tr key={stu.rollNo} style={{ borderBottom:'1px solid var(--gray-100)', background:i%2===0?'#fff':'var(--gray-50)' }}>
                          <td style={{ padding:'8px 12px', color:'var(--gray-500)', fontSize:'0.78rem', whiteSpace:'nowrap', borderRight:'1px solid var(--gray-100)' }}>{stu.rollNo}</td>
                          <td style={{ padding:'8px 12px', fontWeight:600, whiteSpace:'nowrap', borderRight:'1px solid var(--gray-100)' }}>{stu.name}</td>
                          {swSubjects.map(subj => {
                            const d = swData[subj]?.[stu.rollNo]
                            const pct = d && d.total > 0 ? Math.round((d.present/d.total)*100) : null
                            return (
                              <>
                                <td key={`${stu.rollNo}-${subj}-pt`} style={{ padding:'8px 6px', textAlign:'center', fontSize:'0.78rem', fontWeight:600, color:'var(--gray-600)', borderRight:'1px solid var(--gray-100)' }}>
                                  {d && d.total > 0 ? `${d.present}/${d.total}` : '—'}
                                </td>
                                <td key={`${stu.rollNo}-${subj}-pct`} style={{ padding:'8px 4px', textAlign:'center', borderRight:'1px solid var(--gray-100)' }}>
                                  {pct !== null
                                    ? <span style={{ display:'inline-block', padding:'2px 6px', borderRadius:99, background:pctBg(pct), color:pctColor(pct), fontWeight:700, fontSize:'0.72rem' }}>{pct}%</span>
                                    : <span style={{ color:'var(--gray-300)' }}>—</span>
                                  }
                                </td>
                              </>
                            )
                          })}
                          <td style={{ padding:'8px 10px', textAlign:'center' }}>
                            {stu.overallPct !== null
                              ? <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:99, background:pctBg(stu.overallPct), color:pctColor(stu.overallPct), fontWeight:800, fontSize:'0.82rem' }}>{stu.overallPct}%</span>
                              : <span style={{ color:'var(--gray-300)' }}>—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding:'10px 16px', fontSize:'0.72rem', color:'var(--gray-400)', borderTop:'1px solid var(--gray-100)' }}>
                  🟢 ≥75% &nbsp;•&nbsp; 🟡 60–74% &nbsp;•&nbsp; 🔴 &lt;60% &nbsp;•&nbsp; Overall % is calculated across all subjects combined.
                </div>
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  )
}