import { useEffect, useState, useRef } from 'react'
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, deleteField, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import { SEMESTERS } from '../../utils/roles'
import * as XLSX from 'xlsx'

export default function EnterMarks() {
  const { profile } = useAuth()
  const teacherDepts = profile?.departments || (profile?.department ? [profile.department] : [])

  const [mainTab, setMainTab] = useState('enter') // enter | manage

  // Shared
  const [dept,     setDept]     = useState(teacherDepts[0] || '')
  const [sem,      setSem]      = useState(1)
  const [subject,  setSubject]  = useState('')
  const [subjects, setSubjects] = useState([])

  // Enter tab — own exam state
  const [exam,     setExam]     = useState('mid1')
  const [maxMarks, setMaxMarks] = useState(15)

  // Manage tab — own exam state
  const [manageExam, setManageExam] = useState('mid1')

  // Enter tab
  const [students,    setStudents]    = useState([])
  const [marks,       setMarks]       = useState({})
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [step,        setStep]        = useState('setup') // setup | entering | done
  const [mode,        setMode]        = useState('manual')
  const [importRows,  setImportRows]  = useState([])
  const [importError, setImportError] = useState('')
  const fileRef = useRef()

  // Manage tab
  const [manageStudents,   setManageStudents]   = useState([])
  const [manageMarksData,  setManageMarksData]  = useState({})
  const [manageLoading,    setManageLoading]    = useState(false)
  const [manageLoaded,     setManageLoaded]     = useState(false)
  const [deletingRoll,     setDeletingRoll]     = useState(null)
  const [clearingAll,      setClearingAll]      = useState(false)

  // Manage tab has its own dept/sem/subject so it doesn't interfere with Enter tab
  const [manageDept,    setManageDept]    = useState(teacherDepts[0] || '')
  const [manageSem,     setManageSem]     = useState(1)
  const [manageSubject, setManageSubject] = useState('')
  const [manageSubjects, setManageSubjects] = useState([])

  useEffect(() => {
    if (!dept) return
    async function fetchSubjects() {
      const docId = `${dept}_${sem}`.replace(/\s+/g, '_')
      const snap = await getDoc(doc(db, 'subjects', docId))
      setSubjects(snap.exists() ? (snap.data().subjects || []) : [])
      setSubject('')
    }
    fetchSubjects()
  }, [dept, sem])

  useEffect(() => {
    if (!manageDept) return
    async function fetchManageSubjects() {
      const docId = `${manageDept}_${manageSem}`.replace(/\s+/g, '_')
      const snap = await getDoc(doc(db, 'subjects', docId))
      setManageSubjects(snap.exists() ? (snap.data().subjects || []) : [])
      setManageSubject('')
      setManageLoaded(false)
    }
    fetchManageSubjects()
  }, [manageDept, manageSem])

  // ── ENTER TAB functions ──
  const loadStudents = async () => {
    if (!dept || !subject) return
    setLoading(true)
    try {
      const q = query(collection(db,'users'), where('department','==',dept), where('semester','==',Number(sem)), where('role','in',['student','cr']))
      const snap = await getDocs(q)
      const list = []
      snap.forEach(d => list.push({ uid:d.id, ...d.data() }))
      list.sort((a,b) => a.rollNo?.localeCompare(b.rollNo))
      setStudents(list)
      const init = {}
      list.forEach(s => { init[s.rollNo] = '' })
      setMarks(init)
      setStep('entering')
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const saveMarks = async (marksToSave) => {
    setSaving(true)
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      const studentsData = {}
      students.forEach(s => {
        const val = marksToSave[s.rollNo]
        if (val !== '' && val !== undefined && val !== null) {
          studentsData[s.rollNo] = { [exam]: Number(val) }
        }
      })
      await setDoc(doc(db,'marks',docId), { department:dept, semester:Number(sem), subject, updatedAt:serverTimestamp(), students:studentsData }, { merge:true })
      setStep('done')
    } catch(e) { console.error(e); alert('Failed to save.') }
    finally { setSaving(false) }
  }

  const deleteStudentMarksInSession = async (rollNo) => {
    if (!window.confirm(`Clear ${exam==='mid1'?'Mid-1':'Mid-2'} marks for this student?`)) return
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      const docRef = doc(db,'marks',docId)
      const otherExam = exam === 'mid1' ? 'mid2' : 'mid1'
      const snap = await getDoc(docRef)
      const savedStudents = snap.exists() ? (snap.data().students || {}) : {}
      const savedStudentData = savedStudents[rollNo] || {}
      const otherExamExists = savedStudentData[otherExam] !== undefined
      if (otherExamExists) {
        await updateDoc(docRef, { [`students.${rollNo}.${exam}`]: deleteField() })
      } else {
        await updateDoc(docRef, { [`students.${rollNo}`]: deleteField() })
      }
      // If no students have any marks left, delete the whole document
      const remaining = { ...savedStudents }
      if (otherExamExists) { delete remaining[rollNo][exam] } else { delete remaining[rollNo] }
      const hasAnyMarks = Object.values(remaining).some(s => Object.keys(s).length > 0)
      if (!hasAnyMarks) await deleteDoc(docRef)
      setMarks(prev => ({ ...prev, [rollNo]: '' }))
    } catch(e) { console.error(e); alert('Failed to delete.') }
  }

  const clearAllInSession = async () => {
    if (!window.confirm(`Clear ALL ${exam==='mid1'?'Mid-1':'Mid-2'} marks for ${subject}? This cannot be undone.`)) return
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      const docRef = doc(db,'marks',docId)
      const otherExam = exam === 'mid1' ? 'mid2' : 'mid1'
      const snap = await getDoc(docRef)
      const savedStudents = snap.exists() ? (snap.data().students || {}) : {}
      // Check if any student still has the other exam — if not, delete whole doc
      const anyOtherExamExists = students.some(s => savedStudents[s.rollNo]?.[otherExam] !== undefined)
      if (!anyOtherExamExists) {
        await deleteDoc(docRef)
      } else {
        const updates = {}
        students.forEach(s => {
          const otherExamExists = savedStudents[s.rollNo]?.[otherExam] !== undefined
          if (otherExamExists) {
            updates[`students.${s.rollNo}.${exam}`] = deleteField()
          } else {
            updates[`students.${s.rollNo}`] = deleteField()
          }
        })
        await updateDoc(docRef, updates)
      }
      const cleared = {}
      students.forEach(s => { cleared[s.rollNo] = '' })
      setMarks(cleared)
    } catch(e) { console.error(e); alert('Failed to clear marks.') }
  }

  const downloadTemplate = () => {
    const headers = ['Roll No','Name',`${exam==='mid1'?'Mid-1':'Mid-2'} Marks (out of ${maxMarks})`]
    const rows = students.map(s => [s.rollNo, s.name, ''])
    const ws = XLSX.utils.aoa_to_sheet([headers,...rows])
    ws['!cols'] = [{wch:16},{wch:28},{wch:20}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Marks')
    XLSX.writeFile(wb, `MarksTemplate_${subject}_${exam}.xlsx`)
  }

  const handleImport = (e) => {
    setImportError('')
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type:'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header:1 })
        const rows = data.slice(1).filter(r => r[0])
        const parsed = rows.map(r => ({ rollNo:String(r[0]).trim(), marks:r[2] }))
        setImportRows(parsed)
        const newMarks = { ...marks }
        parsed.forEach(r => { if (newMarks.hasOwnProperty(r.rollNo)) newMarks[r.rollNo] = r.marks !== undefined ? r.marks : '' })
        setMarks(newMarks)
      } catch(err) { setImportError('Failed to read Excel file. Make sure it matches the template format.') }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // Jump from "done" screen to Manage tab pre-filled with the just-saved subject
  const goToManageAfterSave = () => {
    setManageDept(dept)
    setManageSem(sem)
    // subjects for this dept/sem will load via useEffect; set subject after a tick
    setManageExam(exam)
    setMainTab('manage')
    // small delay to let subjects load before setting the subject
    setTimeout(() => setManageSubject(subject), 300)
  }

  // ── MANAGE TAB functions ──
  const loadManageData = async () => {
    if (!manageDept || !manageSubject) return
    setManageLoading(true)
    setManageLoaded(false)
    try {
      const q = query(collection(db,'users'), where('department','==',manageDept), where('semester','==',Number(manageSem)), where('role','in',['student','cr']))
      const snap = await getDocs(q)
      const list = []
      snap.forEach(d => list.push({ uid:d.id, ...d.data() }))
      list.sort((a,b) => a.rollNo?.localeCompare(b.rollNo))
      setManageStudents(list)

      const docId = `${manageDept}_${manageSem}_${manageSubject}`.replace(/\s+/g, '_')
      const mSnap = await getDoc(doc(db,'marks',docId))
      setManageMarksData(mSnap.exists() ? (mSnap.data().students || {}) : {})
      setManageLoaded(true)
    } catch(e) { console.error(e) }
    finally { setManageLoading(false) }
  }

  const deleteOneStudentMarks = async (rollNo, name) => {
    const examLabel = manageExam === 'mid1' ? 'Mid-1' : 'Mid-2'
    if (!window.confirm(`Delete ${examLabel} marks for ${name}?`)) return
    setDeletingRoll(rollNo)
    try {
      const docId = `${manageDept}_${manageSem}_${manageSubject}`.replace(/\s+/g, '_')
      const docRef = doc(db,'marks',docId)
      const otherExam = manageExam === 'mid1' ? 'mid2' : 'mid1'
      const studentData = manageMarksData[rollNo] || {}
      const otherExamExists = studentData[otherExam] !== undefined
      if (otherExamExists) {
        await updateDoc(docRef, { [`students.${rollNo}.${manageExam}`]: deleteField() })
      } else {
        await updateDoc(docRef, { [`students.${rollNo}`]: deleteField() })
      }
      // Check if any marks remain across ALL students — if not, delete the whole document
      const updatedData = { ...manageMarksData }
      if (otherExamExists) { if (updatedData[rollNo]) delete updatedData[rollNo][manageExam] }
      else { delete updatedData[rollNo] }
      const hasAnyMarks = Object.values(updatedData).some(s => s && Object.keys(s).length > 0)
      if (!hasAnyMarks) await deleteDoc(docRef)
      setManageMarksData(updatedData)
    } catch(e) { console.error(e); alert('Failed to delete.') }
    finally { setDeletingRoll(null) }
  }

  const clearAllManageMarks = async () => {
    const examLabel = manageExam === 'mid1' ? 'Mid-1' : 'Mid-2'
    if (!window.confirm(`Clear ALL ${examLabel} marks for ${manageSubject}? This cannot be undone.`)) return
    setClearingAll(true)
    try {
      const docId = `${manageDept}_${manageSem}_${manageSubject}`.replace(/\s+/g, '_')
      const docRef = doc(db,'marks',docId)
      const otherExam = manageExam === 'mid1' ? 'mid2' : 'mid1'
      // If no student has the other exam, the whole document will be empty — just delete it
      const anyOtherExamExists = manageStudents.some(s => manageMarksData[s.rollNo]?.[otherExam] !== undefined)
      if (!anyOtherExamExists) {
        await deleteDoc(docRef)
        setManageMarksData({})
      } else {
        const updates = {}
        manageStudents.forEach(s => {
          const studentData = manageMarksData[s.rollNo] || {}
          const otherExamExists = studentData[otherExam] !== undefined
          if (otherExamExists) {
            updates[`students.${s.rollNo}.${manageExam}`] = deleteField()
          } else {
            updates[`students.${s.rollNo}`] = deleteField()
          }
        })
        await updateDoc(docRef, updates)
        setManageMarksData(prev => {
          const updated = { ...prev }
          manageStudents.forEach(s => {
            const otherExamExists = (updated[s.rollNo] || {})[otherExam] !== undefined
            if (otherExamExists) { delete updated[s.rollNo][manageExam] }
            else { delete updated[s.rollNo] }
          })
          return updated
        })
      }
    } catch(e) { console.error(e); alert('Failed to clear.') }
    finally { setClearingAll(false) }
  }

  return (
    <AppShell title="Marks">

      {/* Main tab toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button className={`btn ${mainTab==='enter'?'btn-primary':'btn-outline'}`} onClick={() => setMainTab('enter')}>✏️ Enter Marks</button>
        <button className={`btn ${mainTab==='manage'?'btn-primary':'btn-outline'}`} onClick={() => setMainTab('manage')}>🗑 Manage / Delete Marks</button>
      </div>

      {/* ══ ENTER TAB ══ */}
      {mainTab === 'enter' && (
        <>
          {step === 'setup' && (
            <div style={{ maxWidth:500, margin:'0 auto' }}>
              <div className="card">
                <div className="card-header"><div className="card-title">Class Details</div></div>
                <div className="field">
                  <label>Department</label>
                  <select value={dept} onChange={e => setDept(e.target.value)}>
                    <option value="">Select department</option>
                    {teacherDepts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Semester</label>
                  <select value={sem} onChange={e => setSem(Number(e.target.value))}>
                    {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Subject</label>
                  {subjects.length === 0
                    ? <div className="alert alert-warn" style={{ margin:0 }}>No subjects found. Ask admin to add subjects first.</div>
                    : <select value={subject} onChange={e => setSubject(e.target.value)}>
                        <option value="">Select subject</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  }
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="field">
                    <label>Exam</label>
                    <select value={exam} onChange={e => setExam(e.target.value)}>
                      <option value="mid1">Mid-1</option>
                      <option value="mid2">Mid-2</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Max Marks</label>
                    <input type="number" value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} min={1} max={100} />
                  </div>
                </div>
                <button className="btn btn-primary btn-lg" onClick={loadStudents} disabled={!dept||!subject||loading}>
                  {loading ? 'Loading…' : 'Load Students →'}
                </button>
              </div>
            </div>
          )}

          {step === 'entering' && (
            <div style={{ maxWidth:600, margin:'0 auto' }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Enter {exam==='mid1'?'Mid-1':'Mid-2'} Marks</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span className="badge badge-blue">{subject}</span>
                    <button onClick={clearAllInSession} style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:8, padding:'4px 10px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                      🗑 Clear All
                    </button>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                  <button className={`btn ${mode==='manual'?'btn-primary':'btn-outline'}`} onClick={() => setMode('manual')}>✏️ Manual</button>
                  <button className={`btn ${mode==='import'?'btn-primary':'btn-outline'}`} onClick={() => setMode('import')}>📥 Import Excel</button>
                </div>
                {mode === 'import' && (
                  <div style={{ marginBottom:20, padding:16, background:'var(--blue-50)', borderRadius:12, border:'1px solid var(--blue-100)' }}>
                    <div style={{ fontSize:'0.85rem', color:'var(--blue-700)', fontWeight:600, marginBottom:10 }}>Import from Excel</div>
                    <div style={{ fontSize:'0.8rem', color:'var(--blue-600)', marginBottom:12 }}>Download the template, fill in marks, then upload it back.<br/>Column format: Roll No | Name | Marks</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <button className="btn btn-outline" onClick={downloadTemplate}>⬇ Download Template</button>
                      <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>📂 Upload Excel</button>
                      <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleImport} />
                    </div>
                    {importError && <div className="alert alert-danger" style={{ marginTop:10 }}>{importError}</div>}
                    {importRows.length > 0 && <div className="alert alert-success" style={{ marginTop:10 }}>✅ {importRows.length} rows imported — review below and save.</div>}
                  </div>
                )}
                <div style={{ fontSize:'0.85rem', color:'var(--gray-500)', marginBottom:12 }}>Maximum marks: {maxMarks}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto', marginBottom:20 }}>
                  {students.map(s => (
                    <div key={s.rollNo} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:'var(--radius-sm)', background:'var(--gray-50)', border:'1px solid var(--gray-200)' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{s.name}</div>
                        <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{s.rollNo}</div>
                      </div>
                      <input type="number" min={0} max={maxMarks} placeholder="—"
                        value={marks[s.rollNo]??''}
                        onChange={e => setMarks(prev => ({ ...prev, [s.rollNo]: e.target.value }))}
                        style={{ width:72, padding:'6px 10px', textAlign:'center', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-sm)', fontWeight:700, fontSize:'0.95rem', fontFamily:'var(--font-sans)' }}
                      />
                      <button type="button" onClick={() => deleteStudentMarksInSession(s.rollNo)} title="Clear marks"
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#fca5a5', padding:'4px', borderRadius:6, display:'flex', alignItems:'center' }}
                        onMouseEnter={e => e.currentTarget.style.color='#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.color='#fca5a5'}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <button className="btn btn-outline" onClick={() => setStep('setup')}>← Back</button>
                  <button className="btn btn-primary" style={{ flex:1 }} onClick={() => saveMarks(marks)} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Marks'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ maxWidth:400, margin:'60px auto', textAlign:'center' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--success-bg)', margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--success)" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', color:'var(--blue-900)', marginBottom:8 }}>Marks Saved!</h2>
              <p style={{ color:'var(--gray-500)', fontSize:'0.9rem', marginBottom:24 }}>{exam==='mid1'?'Mid-1':'Mid-2'} marks for <strong>{subject}</strong> saved successfully.</p>
              <p style={{ color:'var(--gray-400)', fontSize:'0.82rem', marginBottom:24 }}>Made a mistake? You can delete or correct marks from the Manage tab.</p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <button className="btn btn-outline" onClick={goToManageAfterSave}>
                  🗑 Manage / Delete These Marks
                </button>
                <button className="btn btn-primary" onClick={() => { setStep('setup'); setSubject('') }}>
                  Enter More Marks
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ MANAGE / DELETE TAB ══ */}
      {mainTab === 'manage' && (
        <div style={{ maxWidth:640, margin:'0 auto' }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Select Class & Exam</div></div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
              <div className="field" style={{ margin:0 }}>
                <label>Department</label>
                <select value={manageDept} onChange={e => { setManageDept(e.target.value); setManageLoaded(false) }}>
                  {teacherDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin:0 }}>
                <label>Semester</label>
                <select value={manageSem} onChange={e => { setManageSem(Number(e.target.value)); setManageLoaded(false) }}>
                  {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin:0 }}>
                <label>Subject</label>
                <select value={manageSubject} onChange={e => { setManageSubject(e.target.value); setManageLoaded(false) }}>
                  <option value="">Select subject</option>
                  {manageSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin:0 }}>
                <label>Exam</label>
                <select value={manageExam} onChange={e => { setManageExam(e.target.value); setManageLoaded(false) }}>
                  <option value="mid1">Mid-1</option>
                  <option value="mid2">Mid-2</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={loadManageData} disabled={!manageDept||!manageSubject||manageLoading}>
              {manageLoading ? 'Loading…' : 'Load Marks'}
            </button>
          </div>

          {manageLoaded && (
            <div className="card" style={{ marginTop:16, padding:0 }}>
              <div className="card-header" style={{ padding:'14px 16px' }}>
                <div className="card-title">{manageExam==='mid1'?'Mid-1':'Mid-2'} Marks — {manageSubject}</div>
                <button onClick={clearAllManageMarks} disabled={clearingAll}
                  style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:8, padding:'6px 14px', fontSize:'0.8rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                  {clearingAll ? 'Clearing…' : '🗑 Clear All'}
                </button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
                  <thead>
                    <tr style={{ background:'var(--gray-50)', borderBottom:'2px solid var(--gray-200)' }}>
                      <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Roll No</th>
                      <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Name</th>
                      <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>{manageExam==='mid1'?'Mid-1':'Mid-2'} Marks</th>
                      <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manageStudents.map((s, i) => {
                      const m = manageMarksData[s.rollNo]?.[manageExam]
                      return (
                        <tr key={s.rollNo} style={{ borderBottom:'1px solid var(--gray-100)', background:i%2===0?'#fff':'var(--gray-50)' }}>
                          <td style={{ padding:'10px 12px', color:'var(--gray-500)', fontSize:'0.8rem' }}>{s.rollNo}</td>
                          <td style={{ padding:'10px 12px', fontWeight:600 }}>{s.name}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center' }}>
                            {m !== undefined
                              ? <span style={{ fontWeight:700, fontSize:'1rem', color:'#2563c8' }}>{m}</span>
                              : <span style={{ color:'var(--gray-300)', fontSize:'0.85rem' }}>Not entered</span>
                            }
                          </td>
                          <td style={{ padding:'10px 12px', textAlign:'center' }}>
                            {m !== undefined
                              ? <button onClick={() => deleteOneStudentMarks(s.rollNo, s.name)} disabled={deletingRoll===s.rollNo}
                                  style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:7, padding:'5px 12px', fontSize:'0.78rem', fontWeight:700, cursor:'pointer' }}>
                                  {deletingRoll===s.rollNo ? '…' : '🗑 Delete'}
                                </button>
                              : <span style={{ color:'var(--gray-300)', fontSize:'0.8rem' }}>—</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:'10px 16px', fontSize:'0.72rem', color:'var(--gray-400)', borderTop:'1px solid var(--gray-100)' }}>
                Deleting marks here removes them from the database immediately.
              </div>
            </div>
          )}
        </div>
      )}

    </AppShell>
  )
}