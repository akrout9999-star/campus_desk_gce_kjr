import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'
import { DEPARTMENTS, SEMESTERS } from '../../utils/roles'
import * as XLSX from 'xlsx'

export default function ViewMarks() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const teacherDepts = profile?.departments || (profile?.department ? [profile.department] : [])
  const deptList = isAdmin ? DEPARTMENTS : teacherDepts

  const [dept,     setDept]     = useState(isAdmin ? '' : (teacherDepts[0] || ''))
  const [sem,      setSem]      = useState(1)
  const [subject,  setSubject]  = useState('')
  const [subjects, setSubjects] = useState([])
  const [examMode, setExamMode] = useState('both')
  const [minMarks, setMinMarks] = useState('')
  const [sortBy,   setSortBy]   = useState('rank') // rank | rank-asc | rollno | rollno-desc
  const [students, setStudents] = useState([])
  const [marksData,setMarksData]= useState({})
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const [maxMid1,  setMaxMid1]  = useState(15)
  const [maxMid2,  setMaxMid2]  = useState(15)

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
    try {
      const stuSnap = await getDocs(query(collection(db,'users'), where('department','==',dept), where('semester','==',Number(sem)), where('role','in',['student','cr'])))
      const list = []
      stuSnap.forEach(d => list.push({ uid:d.id, ...d.data() }))
      list.sort((a,b) => a.rollNo?.localeCompare(b.rollNo))
      setStudents(list)
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      const mSnap = await getDoc(doc(db,'marks',docId))
      setMarksData(mSnap.exists() ? (mSnap.data().students || {}) : {})
      setLoaded(true)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const getMarks = (rollNo) => {
    const d = marksData[rollNo] || {}
    return { mid1: d.mid1 ?? null, mid2: d.mid2 ?? null }
  }

  const max = examMode === 'mid1' ? maxMid1 : examMode === 'mid2' ? maxMid2 : maxMid1 + maxMid2

  const getScore = (rollNo) => {
    const { mid1, mid2 } = getMarks(rollNo)
    if (examMode === 'mid1') return mid1
    if (examMode === 'mid2') return mid2
    const hasAny = mid1 !== null || mid2 !== null
    return hasAny ? (mid1 ?? 0) + (mid2 ?? 0) : null
  }

  // Build all stats with rank
  const scored = students
    .map(s => ({ ...s, score: getScore(s.rollNo) }))
    .filter(s => s.score !== null)
    .sort((a,b) => b.score - a.score)
  const rankMap = {}
  scored.forEach((s,i) => {
    let rank = i+1
    if (i > 0 && scored[i].score === scored[i-1].score) rank = rankMap[scored[i-1].rollNo]
    rankMap[s.rollNo] = rank
  })

  let allStats = students.map(s => {
    const score = getScore(s.rollNo)
    const pct = score !== null && max > 0 ? Math.round((score/max)*100) : null
    const { mid1, mid2 } = getMarks(s.rollNo)
    return { ...s, score, pct, rank: rankMap[s.rollNo] || null, mid1, mid2 }
  })

  // Apply min filter
  let filtered = minMarks !== '' ? allStats.filter(s => s.score !== null && s.score >= Number(minMarks)) : allStats

  // Apply sort
  filtered = [...filtered].sort((a,b) => {
    if (sortBy === 'rank')       return (a.rank||999) - (b.rank||999)
    if (sortBy === 'rank-asc')   return (b.rank||999) - (a.rank||999) // worst first
    if (sortBy === 'rollno')     return a.rollNo?.localeCompare(b.rollNo)
    if (sortBy === 'rollno-desc')return b.rollNo?.localeCompare(a.rollNo)
    return 0
  })

  // Summary — based on filtered list
  const withScores = filtered.filter(s => s.score !== null)
  const avg = withScores.length > 0 ? (withScores.reduce((a,b)=>a+b.score,0)/withScores.length).toFixed(1) : null
  const maxScore = withScores.length > 0 ? Math.max(...withScores.map(s=>s.score)) : null
  const above50pct = withScores.filter(s=>s.pct>=50).length

  const scoreColor = (s,m) => { if(s===null) return '#94a3b8'; const p=(s/m)*100; return p>=75?'#16a34a':p>=50?'#d97706':'#dc2626' }
  const scoreBg    = (s,m) => { if(s===null) return '#f1f5f9'; const p=(s/m)*100; return p>=75?'#dcfce7':p>=50?'#fef3c7':'#fef2f2' }

  const downloadExcel = () => {
    const examLabel = examMode==='mid1'?'Mid-1':examMode==='mid2'?'Mid-2':'Mid-1+Mid-2'
    const headers = examMode==='both'
      ? ['Rank','Roll No','Name',`Mid-1 (/${maxMid1})`,`Mid-2 (/${maxMid2})`,`Total (/${max})`,'%']
      : ['Rank','Roll No','Name',`${examLabel} (/${max})`,'%']
    const rows = filtered.map(s => {
      if (examMode==='both') return [s.rank||'-', s.rollNo, s.name, s.mid1??'-', s.mid2??'-', s.score??'-', s.pct!==null?s.pct+'%':'-']
      return [s.rank||'-', s.rollNo, s.name, s.score??'-', s.pct!==null?s.pct+'%':'-']
    })
    const ws = XLSX.utils.aoa_to_sheet([headers,...rows])
    ws['!cols'] = [{wch:6},{wch:14},{wch:24},{wch:12},{wch:12},{wch:12},{wch:10}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Marks')
    XLSX.writeFile(wb, `Marks_${dept}_Sem${sem}_${subject}_${examLabel}.xlsx`)
  }

  return (
    <AppShell title="View Marks">
      {/* Filter card */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
          {isAdmin && (
            <div className="field" style={{ margin:0 }}>
              <label>Department</label>
              <select value={dept} onChange={e => { setDept(e.target.value); setLoaded(false) }}>
                <option value="">Select dept</option>
                {deptList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <div className="field" style={{ margin:0 }}>
            <label>Semester</label>
            <select value={sem} onChange={e => { setSem(Number(e.target.value)); setLoaded(false) }}>
              {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin:0 }}>
            <label>Subject</label>
            <select value={subject} onChange={e => { setSubject(e.target.value); setLoaded(false) }}>
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
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
          {/* Exam + max marks row */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center', marginBottom:14 }}>
            <div style={{ display:'flex', gap:6 }}>
              {['mid1','mid2','both'].map(m => (
                <button key={m} className={`btn ${examMode===m?'btn-primary':'btn-outline'}`} onClick={() => setExamMode(m)}>
                  {m==='mid1'?'Mid-1':m==='mid2'?'Mid-2':'Both'}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.78rem', color:'var(--gray-500)' }}>Max Mid-1:</span>
              <input type="number" value={maxMid1} onChange={e=>setMaxMid1(Number(e.target.value))} style={{ width:52, padding:'4px 8px', borderRadius:6, border:'1.5px solid var(--gray-200)', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }} />
              <span style={{ fontSize:'0.78rem', color:'var(--gray-500)' }}>Mid-2:</span>
              <input type="number" value={maxMid2} onChange={e=>setMaxMid2(Number(e.target.value))} style={{ width:52, padding:'4px 8px', borderRadius:6, border:'1.5px solid var(--gray-200)', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }} />
            </div>
          </div>

          {/* Sort + filter row */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--gray-600)', whiteSpace:'nowrap' }}>Sort by</label>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }}>
                <option value="rank">🏆 Rank (Best first)</option>
                <option value="rank-asc">📉 Rank (Worst first)</option>
                <option value="rollno">🔢 Roll No (A→Z)</option>
                <option value="rollno-desc">🔢 Roll No (Z→A)</option>
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--gray-600)', whiteSpace:'nowrap' }}>Min Marks</label>
              <input type="number" placeholder="e.g. 10" value={minMarks} onChange={e=>setMinMarks(e.target.value)}
                style={{ width:70, padding:'6px 10px', borderRadius:8, border:'1.5px solid var(--gray-200)', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }} />
            </div>
            <button className="btn btn-outline" onClick={downloadExcel} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>⬇ Excel</button>
          </div>

          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:12, marginBottom:16 }} className="summary-stats">
            {[
              { label: minMarks ? `≥${minMarks} Marks` : 'Students Shown', val:filtered.length, color:'#2563c8', bg:'#eff6ff' },
              { label:'Avg Marks', val:avg!==null?`${avg}/${max}`:'—', color:'#7c3aed', bg:'#f5f3ff' },
              { label:'Above 50%', val:above50pct, color:'#16a34a', bg:'#dcfce7' },
              { label:'Below 50%', val:withScores.length-above50pct, color:'#dc2626', bg:'#fef2f2' },
            ].map(item => (
              <div key={item.label} style={{ background:item.bg, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:'1.2rem', fontWeight:700, color:item.color }}>{item.val}</div>
                <div style={{ fontSize:'0.7rem', color:item.color, fontWeight:600 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="card" style={{ padding:0 }}>
            <div className="card-header" style={{ padding:'14px 16px' }}>
              <div className="card-title">{subject} — {dept}, Sem {sem}</div>
              <span className="badge badge-blue">{filtered.length} students</span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem', minWidth:480 }}>
                <thead>
                  <tr style={{ background:'var(--gray-50)', borderBottom:'2px solid var(--gray-200)' }}>
                    <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Rank</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Roll No</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Name</th>
                    {(examMode==='mid1'||examMode==='both') && <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Mid-1</th>}
                    {(examMode==='mid2'||examMode==='both') && <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Mid-2</th>}
                    {examMode==='both' && <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Total</th>}
                    <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s,i) => (
                    <tr key={s.rollNo} style={{ borderBottom:'1px solid var(--gray-100)', background:i%2===0?'#fff':'var(--gray-50)' }}>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, fontSize:'1rem' }}>
                        {s.rank===1?'🥇':s.rank===2?'🥈':s.rank===3?'🥉':s.rank||'—'}
                      </td>
                      <td style={{ padding:'10px 12px', color:'var(--gray-500)', fontSize:'0.8rem', whiteSpace:'nowrap' }}>{s.rollNo}</td>
                      <td style={{ padding:'10px 12px', fontWeight:600, whiteSpace:'nowrap' }}>{s.name}</td>
                      {(examMode==='mid1'||examMode==='both') && <td style={{ padding:'10px 12px', textAlign:'center' }}>{s.mid1??'—'}</td>}
                      {(examMode==='mid2'||examMode==='both') && <td style={{ padding:'10px 12px', textAlign:'center' }}>{s.mid2??'—'}</td>}
                      {examMode==='both' && <td style={{ padding:'10px 12px', textAlign:'center', fontWeight:700 }}>{s.score??'—'}</td>}
                      <td style={{ padding:'10px 12px', textAlign:'center' }}>
                        <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:99, background:scoreBg(s.score,max), color:scoreColor(s.score,max), fontWeight:700, fontSize:'0.82rem' }}>
                          {s.pct!==null?s.pct+'%':'—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}