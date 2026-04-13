import { useEffect, useState } from 'react'
import {
  collection, query, where, getDocs,
  doc, setDoc, getDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import { SEMESTERS } from '../../utils/roles'

/* ─── Mobile-first styles injected once ─────────────────────────── */
const CSS = `
  .ta-wrap {
    padding: 12px 16px 100px;
    max-width: 600px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* ── Mode toggle ── */
  .ta-mode-toggle {
    display: flex;
    background: var(--gray-100, #f3f4f6);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 20px;
    gap: 4px;
  }
  .ta-mode-btn {
    flex: 1;
    padding: 12px 8px;
    border: none;
    border-radius: 9px;
    font-size: 0.92rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
    letter-spacing: 0.01em;
  }
  .ta-mode-btn.active {
    background: var(--blue-600, #2563eb);
    color: #fff;
    box-shadow: 0 2px 8px rgba(37,99,235,0.25);
  }
  .ta-mode-btn.inactive {
    background: transparent;
    color: var(--gray-500, #6b7280);
  }

  /* ── Fields ── */
  .ta-field { margin-bottom: 16px; }
  .ta-field label {
    display: block;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--gray-500, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }
  .ta-field select,
  .ta-field input[type="date"] {
    width: 100%;
    padding: 14px 16px;
    font-size: 1rem;
    border: 1.5px solid var(--gray-200, #e5e7eb);
    border-radius: 10px;
    background: #fff;
    color: var(--gray-900, #111827);
    box-sizing: border-box;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    transition: border-color 0.15s;
  }
  .ta-field select:focus,
  .ta-field input[type="date"]:focus {
    border-color: var(--blue-600, #2563eb);
  }

  /* ── Big CTA button ── */
  .ta-cta {
    width: 100%;
    padding: 16px;
    font-size: 1.05rem;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    background: var(--blue-600, #2563eb);
    color: #fff;
    cursor: pointer;
    margin-top: 8px;
    transition: opacity 0.15s, transform 0.1s;
    letter-spacing: 0.01em;
  }
  .ta-cta:active { transform: scale(0.98); opacity: 0.9; }
  .ta-cta:disabled { opacity: 0.45; cursor: not-allowed; }

  /* ── One-by-one card ── */
  .ta-obo-card {
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    padding: 28px 24px 24px;
    text-align: center;
  }
  .ta-obo-counter {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--gray-400, #9ca3af);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
  }
  .ta-obo-progress {
    height: 6px;
    background: var(--gray-100, #f3f4f6);
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 28px;
  }
  .ta-obo-progress-bar {
    height: 100%;
    background: var(--blue-600, #2563eb);
    border-radius: 99px;
    transition: width 0.3s ease;
  }
  .ta-obo-name {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--gray-900, #111827);
    margin-bottom: 6px;
    line-height: 1.2;
  }
  .ta-obo-roll {
    font-size: 0.9rem;
    color: var(--gray-400, #9ca3af);
    font-weight: 600;
    margin-bottom: 32px;
  }
  .ta-obo-btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  .ta-obo-btn {
    padding: 20px 12px;
    border: none;
    border-radius: 14px;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: transform 0.1s, box-shadow 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .ta-obo-btn:active { transform: scale(0.95); }
  .ta-obo-btn svg { width: 28px; height: 28px; }
  .ta-obo-btn-present {
    background: var(--success-bg, #dcfce7);
    color: var(--success, #16a34a);
    box-shadow: 0 2px 12px rgba(22,163,74,0.15);
  }
  .ta-obo-btn-absent {
    background: var(--danger-bg, #fee2e2);
    color: var(--danger, #dc2626);
    box-shadow: 0 2px 12px rgba(220,38,38,0.12);
  }
  .ta-obo-back {
    background: none;
    border: none;
    color: var(--gray-400, #9ca3af);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    padding: 10px 20px;
    margin-top: 4px;
  }

  /* ── Count badges ── */
  .ta-counts {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }
  .ta-count {
    flex: 1;
    padding: 11px 8px;
    border-radius: 10px;
    text-align: center;
    font-size: 0.88rem;
    font-weight: 700;
  }
  .ta-count-present { background: var(--success-bg, #dcfce7); color: var(--success, #16a34a); }
  .ta-count-absent  { background: var(--danger-bg, #fee2e2);  color: var(--danger, #dc2626);  }

  /* ── List view ── */
  .ta-list-header { margin-bottom: 12px; }
  .ta-list-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--gray-900, #111827);
    margin-bottom: 2px;
  }
  .ta-list-sub {
    font-size: 0.82rem;
    color: var(--gray-400, #9ca3af);
    font-weight: 500;
  }
  .ta-bulk-btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }
  .ta-bulk-btn {
    padding: 15px 8px;
    border-radius: 12px;
    font-size: 0.92rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition: transform 0.1s;
    border: 2px solid transparent;
    -webkit-tap-highlight-color: transparent;
  }
  .ta-bulk-btn:active { transform: scale(0.97); }
  .ta-bulk-btn-present {
    background: var(--success-bg, #dcfce7);
    color: var(--success, #16a34a);
    border-color: var(--success, #16a34a);
  }
  .ta-bulk-btn-absent {
    background: var(--danger-bg, #fee2e2);
    color: var(--danger, #dc2626);
    border-color: var(--danger, #dc2626);
  }

  /* Student rows */
  .ta-student-list {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    margin-bottom: 12px;
  }
  .ta-student-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 15px 16px;
    cursor: pointer;
    transition: background 0.15s;
    border-bottom: 1px solid var(--gray-100, #f3f4f6);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  .ta-student-row:last-child { border-bottom: none; }
  .ta-student-row.present { background: var(--success-bg, #dcfce7); }

  .ta-checkbox {
    width: 26px;
    height: 26px;
    min-width: 26px;
    border-radius: 8px;
    border: 2.5px solid var(--gray-300, #d1d5db);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }
  .ta-checkbox.checked {
    background: var(--success, #16a34a);
    border-color: var(--success, #16a34a);
  }

  .ta-student-info { flex: 1; min-width: 0; }
  .ta-student-name {
    font-size: 0.97rem;
    font-weight: 700;
    color: var(--gray-900, #111827);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ta-student-roll {
    font-size: 0.8rem;
    color: var(--gray-400, #9ca3af);
    font-weight: 500;
    margin-top: 2px;
  }
  .ta-status-pill {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 99px;
    flex-shrink: 0;
    letter-spacing: 0.03em;
  }
  .ta-status-pill.present { background: var(--success, #16a34a); color: #fff; }
  .ta-status-pill.absent  { background: var(--gray-200, #e5e7eb); color: var(--gray-500, #6b7280); }

  /* ── Sticky bottom bar ── */
  .ta-sticky-bar {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    padding: 12px 16px;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--gray-100, #f3f4f6);
    z-index: 50;
    box-sizing: border-box;
  }
  .ta-sticky-bar .ta-cta { margin-top: 0; }

  /* ── Review ── */
  .ta-review-counts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  .ta-review-count {
    padding: 16px 12px;
    border-radius: 14px;
    text-align: center;
  }
  .ta-review-count-num {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 4px;
  }
  .ta-review-count-label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .ta-review-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 13px 0;
    border-bottom: 1px solid var(--gray-100, #f3f4f6);
  }
  .ta-review-row:last-child { border-bottom: none; }
  .ta-review-name { font-weight: 600; font-size: 0.92rem; color: var(--gray-900, #111827); }
  .ta-review-roll { font-size: 0.78rem; color: var(--gray-400, #9ca3af); margin-top: 2px; }
  .ta-review-btns { display: flex; gap: 10px; }
  .ta-redo-btn {
    padding: 16px 20px;
    border: 1.5px solid var(--gray-200, #e5e7eb);
    border-radius: 12px;
    background: #fff;
    color: var(--gray-700, #374151);
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .ta-redo-btn:active { background: var(--gray-100, #f3f4f6); }

  /* ── Card ── */
  .ta-card {
    background: #fff;
    border-radius: 18px;
    padding: 20px 16px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.07);
    margin-bottom: 16px;
  }

  /* ── Done ── */
  .ta-done {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 60px 24px;
    min-height: 60vh;
    justify-content: center;
  }
  .ta-done-icon {
    width: 80px; height: 80px;
    border-radius: 50%;
    background: var(--success-bg, #dcfce7);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }
  .ta-done-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--gray-900, #111827);
    margin-bottom: 10px;
  }
  .ta-done-sub {
    font-size: 0.95rem;
    color: var(--gray-500, #6b7280);
    margin-bottom: 32px;
    line-height: 1.7;
  }

  /* ── Alert ── */
  .ta-alert-warn {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 0.88rem;
    color: #92400e;
    margin-bottom: 16px;
    line-height: 1.5;
  }
`

function StyleTag() {
  return <style>{CSS}</style>
}

export default function TakeAttendance() {
  const { profile } = useAuth()
  const teacherDepts = profile?.departments || (profile?.department ? [profile.department] : [])

  const [mode,     setMode]     = useState('oneByOne')
  const [dept,     setDept]     = useState(teacherDepts[0] || '')
  const [sem,      setSem]      = useState(1)
  const [subject,  setSubject]  = useState('')
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [subjects, setSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  const [students,       setStudents]       = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [current,        setCurrent]        = useState(0)
  const [marked,         setMarked]         = useState({})
  const [saving,         setSaving]         = useState(false)
  const [step,           setStep]           = useState('setup')

  useEffect(() => {
    if (!dept) return
    async function fetchSubjects() {
      setLoadingSubjects(true)
      setSubject('')
      try {
        const docId = `${dept}_${sem}`.replace(/\s+/g, '_')
        const snap = await getDoc(doc(db, 'subjects', docId))
        setSubjects(snap.exists() ? (snap.data().subjects || []) : [])
      } catch (e) { console.error(e) }
      finally { setLoadingSubjects(false) }
    }
    fetchSubjects()
  }, [dept, sem])

  const loadStudents = async () => {
    if (!dept || !subject || !date) return
    setLoadingStudents(true)
    try {
      const q = query(
        collection(db, 'users'),
        where('department', '==', dept),
        where('semester',   '==', Number(sem)),
        where('role',       'in', ['student', 'cr'])
      )
      const snap = await getDocs(q)
      const list = []
      snap.forEach(d => list.push({ uid: d.id, ...d.data() }))
      list.sort((a, b) => a.rollNo?.localeCompare(b.rollNo))
      setStudents(list)
      const defaults = {}
      list.forEach(s => { defaults[s.rollNo] = false })
      setMarked(mode === 'listView' ? defaults : {})
      setCurrent(0)
      setStep('taking')
    } catch (e) { console.error(e) }
    finally { setLoadingStudents(false) }
  }

  // One-by-one
  const mark = (present) => {
    const s = students[current]
    setMarked(prev => ({ ...prev, [s.rollNo]: present }))
    if (current + 1 < students.length) setCurrent(c => c + 1)
    else setStep('review')
  }

  // List view
  const toggleStudent = (rollNo) =>
    setMarked(prev => ({ ...prev, [rollNo]: !prev[rollNo] }))

  const markAll = (present) => {
    const all = {}
    students.forEach(s => { all[s.rollNo] = present })
    setMarked(all)
  }

  const saveAttendance = async () => {
    setSaving(true)
    try {
      const docId = `${dept}_${sem}_${subject}_${date}`.replace(/\s+/g, '_')
      await setDoc(doc(db, 'attendance', docId), {
        department: dept,
        semester:   Number(sem),
        subject,
        date,
        students:   marked,
        takenBy:    profile?.name || '',
        createdAt:  serverTimestamp(),
      })
      setStep('done')
    } catch (e) {
      console.error(e)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep('setup'); setStudents([]); setMarked({})
    setCurrent(0); setSubject('')
  }

  const student      = students[current]
  const progress     = students.length > 0 ? (current / students.length) * 100 : 0
  const presentCount = Object.values(marked).filter(Boolean).length
  const absentCount  = Object.values(marked).filter(v => v === false).length

  return (
    <AppShell title="Take Attendance">
      <StyleTag />

      {/* ── SETUP ── */}
      {step === 'setup' && (
        <div className="ta-wrap">
          <div className="ta-card">
            <div className="ta-mode-toggle">
              <button
                className={`ta-mode-btn ${mode === 'oneByOne' ? 'active' : 'inactive'}`}
                onClick={() => setMode('oneByOne')}
              >
                ⟶ One by One
              </button>
              <button
                className={`ta-mode-btn ${mode === 'listView' ? 'active' : 'inactive'}`}
                onClick={() => setMode('listView')}
              >
                ☰ List View
              </button>
            </div>

            <div className="ta-field">
              <label>Department</label>
              <select value={dept} onChange={e => setDept(e.target.value)}>
                <option value="">Select department</option>
                {teacherDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="ta-field">
              <label>Semester</label>
              <select value={sem} onChange={e => setSem(Number(e.target.value))}>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            <div className="ta-field">
              <label>Subject</label>
              {loadingSubjects ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--gray-400)', padding: '10px 0' }}>
                  Loading subjects…
                </div>
              ) : subjects.length === 0 ? (
                <div className="ta-alert-warn">
                  No subjects found for this dept/semester. Ask admin to add subjects first.
                </div>
              ) : (
                <select value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>

            <div className="ta-field">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {teacherDepts.length === 0 && (
              <div className="ta-alert-warn">
                ⚠️ No departments assigned to your profile. Contact admin.
              </div>
            )}

            <button
              className="ta-cta"
              onClick={loadStudents}
              disabled={!dept || !subject || loadingStudents}
            >
              {loadingStudents
                ? 'Loading students…'
                : mode === 'listView' ? '☰ Open List View' : '⟶ Start Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAKING — One by One ── */}
      {step === 'taking' && mode === 'oneByOne' && student && (
        <div className="ta-wrap">
          <div className="ta-obo-card">
            <div className="ta-obo-counter">Student {current + 1} of {students.length}</div>
            <div className="ta-obo-progress">
              <div className="ta-obo-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="ta-obo-name">{student.name}</div>
            <div className="ta-obo-roll">{student.rollNo}</div>
            <div className="ta-obo-btns">
              <button className="ta-obo-btn ta-obo-btn-present" onClick={() => mark(true)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Present
              </button>
              <button className="ta-obo-btn ta-obo-btn-absent" onClick={() => mark(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Absent
              </button>
            </div>
            {current > 0 && (
              <button className="ta-obo-back" onClick={() => setCurrent(c => c - 1)}>
                ← Back
              </button>
            )}
          </div>

          <div className="ta-counts">
            <div className="ta-count ta-count-present">✓ {presentCount} Present</div>
            <div className="ta-count ta-count-absent">✗ {absentCount} Absent</div>
          </div>
        </div>
      )}

      {/* ── TAKING — List View ── */}
      {step === 'taking' && mode === 'listView' && (
        <div className="ta-wrap">
          <div className="ta-list-header">
            <div className="ta-list-title">{subject}</div>
            <div className="ta-list-sub">{dept} · Sem {sem} · {date}</div>
          </div>

          <div className="ta-counts" style={{ marginBottom: 12 }}>
            <div className="ta-count ta-count-present">✓ {presentCount} Present</div>
            <div className="ta-count ta-count-absent">✗ {absentCount} Absent</div>
          </div>

          <div className="ta-bulk-btns">
            <button className="ta-bulk-btn ta-bulk-btn-present" onClick={() => markAll(true)}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              All Present
            </button>
            <button className="ta-bulk-btn ta-bulk-btn-absent" onClick={() => markAll(false)}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              All Absent
            </button>
          </div>

          <div className="ta-student-list">
            {students.map(s => {
              const isPresent = !!marked[s.rollNo]
              return (
                <div
                  key={s.rollNo}
                  className={`ta-student-row ${isPresent ? 'present' : ''}`}
                  onClick={() => toggleStudent(s.rollNo)}
                >
                  <div className={`ta-checkbox ${isPresent ? 'checked' : ''}`}>
                    {isPresent && (
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="ta-student-info">
                    <div className="ta-student-name">{s.name}</div>
                    <div className="ta-student-roll">{s.rollNo}</div>
                  </div>
                  <span className={`ta-status-pill ${isPresent ? 'present' : 'absent'}`}>
                    {isPresent ? 'Present' : 'Absent'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Sticky submit */}
          <div className="ta-sticky-bar">
            <button className="ta-cta" style={{ marginTop: 0 }} onClick={() => setStep('review')}>
              Review & Submit →
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEW ── */}
      {step === 'review' && (
        <div className="ta-wrap">
          <div className="ta-card">
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-900)', marginBottom: 16 }}>
              Review & Submit
            </div>
            <div className="ta-review-counts">
              <div className="ta-review-count" style={{ background: 'var(--success-bg, #dcfce7)' }}>
                <div className="ta-review-count-num" style={{ color: 'var(--success, #16a34a)' }}>{presentCount}</div>
                <div className="ta-review-count-label" style={{ color: 'var(--success, #16a34a)' }}>Present</div>
              </div>
              <div className="ta-review-count" style={{ background: 'var(--danger-bg, #fee2e2)' }}>
                <div className="ta-review-count-num" style={{ color: 'var(--danger, #dc2626)' }}>{absentCount}</div>
                <div className="ta-review-count-label" style={{ color: 'var(--danger, #dc2626)' }}>Absent</div>
              </div>
            </div>

            <div>
              {students.map(s => (
                <div key={s.rollNo} className="ta-review-row">
                  <div>
                    <div className="ta-review-name">{s.name}</div>
                    <div className="ta-review-roll">{s.rollNo}</div>
                  </div>
                  <span className={`ta-status-pill ${marked[s.rollNo] ? 'present' : 'absent'}`}>
                    {marked[s.rollNo] ? 'Present' : 'Absent'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky bottom */}
          <div className="ta-sticky-bar">
            <div className="ta-review-btns">
              <button
                className="ta-redo-btn"
                onClick={() => {
                  if (mode === 'oneByOne') setCurrent(0)
                  setStep('taking')
                }}
              >
                ← Redo
              </button>
              <button
                className="ta-cta"
                style={{ flex: 1, marginTop: 0 }}
                onClick={saveAttendance}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Submit Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {step === 'done' && (
        <div className="ta-done">
          <div className="ta-done-icon">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--success, #16a34a)" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="ta-done-title">Attendance Saved!</div>
          <div className="ta-done-sub">
            {presentCount} present · {absentCount} absent<br />
            <strong>{subject}</strong> on {date}
          </div>
          <button className="ta-cta" style={{ maxWidth: 320 }} onClick={reset}>
            Take Another Attendance
          </button>
        </div>
      )}
    </AppShell>
  )
}