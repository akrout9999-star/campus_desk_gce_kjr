import { useState, useEffect } from 'react'
import { doc, setDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import { SEMESTERS } from '../../utils/roles'

export default function UploadNotes() {
  const { profile } = useAuth()

  const [dept,       setDept]       = useState(profile?.department || '')
  const [sem,        setSem]        = useState(profile?.semester   || 1)
  const [subject,    setSubject]    = useState('')
  const [subjects,   setSubjects]   = useState([])
  const [title,      setTitle]      = useState('')
  const [driveLink,  setDriveLink]  = useState('')
  const [uploadedBy, setUploadedBy] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')
  const [tab,        setTab]        = useState('upload') // upload | manage
  const [existingNotes, setExistingNotes] = useState([])
  const [loadingNotes,  setLoadingNotes]  = useState(false)
  const [deletingIdx,   setDeletingIdx]   = useState(null)

  useEffect(() => {
    if (!dept || !sem) return
    async function fetchSubjects() {
      const docId = `${dept}_${sem}`.replace(/\s+/g, '_')
      const snap = await getDoc(doc(db, 'subjects', docId))
      setSubjects(snap.exists() ? (snap.data().subjects || []) : [])
      setSubject('')
    }
    fetchSubjects()
  }, [dept, sem])

  // Load existing notes when subject changes in manage tab
  useEffect(() => {
    if (tab === 'manage' && subject) loadNotes()
  }, [tab, subject])

  const loadNotes = async () => {
    if (!subject) return
    setLoadingNotes(true)
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      const snap = await getDoc(doc(db, 'notes', docId))
      setExistingNotes(snap.exists() ? (snap.data().links || []) : [])
    } catch(e) { console.error(e) }
    finally { setLoadingNotes(false) }
  }

  const isValidDriveLink = (url) =>
    url.startsWith('https://drive.google.com') || url.startsWith('https://docs.google.com')

  const handleSubmit = async () => {
    setError('')
    if (!dept || !subject || !title || !driveLink || !uploadedBy.trim()) {
      setError('Please fill in all fields.'); return
    }
    if (!isValidDriveLink(driveLink)) {
      setError('Please enter a valid Google Drive or Docs link.'); return
    }
    setSaving(true)
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      await setDoc(doc(db, 'notes', docId), {
        department: dept, semester: Number(sem), subject,
        links: arrayUnion({ title, driveLink, uploadedBy: uploadedBy.trim(), uploadedAt: new Date().toISOString() }),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setSuccess(true)
      setTitle('')
      setDriveLink('')
      setUploadedBy('')
      setTimeout(() => setSuccess(false), 4000)
    } catch(e) {
      console.error(e)
      setError('Failed to upload. Please try again.')
    } finally { setSaving(false) }
  }

  const deleteNote = async (note, idx) => {
    if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return
    setDeletingIdx(idx)
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      await updateDoc(doc(db, 'notes', docId), {
        links: arrayRemove(note)
      })
      setExistingNotes(prev => prev.filter((_, i) => i !== idx))
    } catch(e) {
      console.error(e)
      alert('Failed to delete. Please try again.')
    } finally { setDeletingIdx(null) }
  }

  return (
    <AppShell title="Notes">
      <div style={{ maxWidth: 540, margin: '0 auto' }}>

        {/* Tab toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <button className={`btn ${tab==='upload'?'btn-primary':'btn-outline'}`} onClick={() => setTab('upload')}>📤 Upload Notes</button>
          <button className={`btn ${tab==='manage'?'btn-primary':'btn-outline'}`} onClick={() => { setTab('manage'); if(subject) loadNotes() }}>🗑 Manage Notes</button>
        </div>

        {/* ── UPLOAD TAB ── */}
        {tab === 'upload' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Share Study Material</div></div>
            <p style={{ fontSize:'0.88rem', color:'var(--gray-500)', marginBottom:20 }}>Share Google Drive notes with your classmates.</p>

            {error   && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">✅ Notes uploaded successfully!</div>}

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
            <div className="field">
              <label>Note Title</label>
              <input type="text" placeholder="e.g. Unit 3 – Trees & Graphs" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Notes Provided By</label>
              <input type="text" placeholder="e.g. Dr. Mohan Sir / Rahul (CSE-6A)" value={uploadedBy} onChange={e => setUploadedBy(e.target.value)} />
              <div style={{ fontSize:'0.75rem', color:'var(--gray-400)', marginTop:5 }}>Enter the teacher's name or student who gave these notes</div>
            </div>
            <div className="field">
              <label>Google Drive Link</label>
              <input type="url" placeholder="https://drive.google.com/..." value={driveLink} onChange={e => setDriveLink(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Uploading…' : 'Upload Notes'}
            </button>
          </div>
        )}

        {/* ── MANAGE TAB ── */}
        {tab === 'manage' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Delete Notes</div></div>
            <p style={{ fontSize:'0.88rem', color:'var(--gray-500)', marginBottom:16 }}>Select a subject to see and delete uploaded notes.</p>

            <div className="field">
              <label>Semester</label>
              <select value={sem} onChange={e => setSem(Number(e.target.value))}>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom:20 }}>
              <label>Subject</label>
              {subjects.length === 0
                ? <div className="alert alert-warn" style={{ margin:0 }}>No subjects found.</div>
                : <select value={subject} onChange={e => { setSubject(e.target.value) }}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              }
            </div>

            {subject && (
              <button className="btn btn-outline" onClick={loadNotes} style={{ marginBottom:16 }}>🔄 Refresh</button>
            )}

            {loadingNotes && <div style={{ color:'var(--gray-400)', fontSize:'0.88rem' }}>Loading notes…</div>}

            {!loadingNotes && subject && existingNotes.length === 0 && (
              <div className="empty-state" style={{ padding:'24px 0' }}>
                <p>No notes uploaded for this subject yet.</p>
              </div>
            )}

            {!loadingNotes && existingNotes.map((note, idx) => (
              <div key={idx} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:10, background:'var(--gray-50)', border:'1px solid var(--gray-200)', marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--blue-900)' }}>{note.title}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--gray-400)', marginTop:2 }}>
                    By {note.uploadedBy} &nbsp;•&nbsp; {note.uploadedAt ? new Date(note.uploadedAt).toLocaleDateString('en-IN') : ''}
                  </div>
                  <a href={note.driveLink} target="_blank" rel="noreferrer"
                    style={{ fontSize:'0.78rem', color:'#2563c8', textDecoration:'none', marginTop:4, display:'inline-block' }}>
                    🔗 Open Link
                  </a>
                </div>
                <button
                  onClick={() => deleteNote(note, idx)}
                  disabled={deletingIdx === idx}
                  style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:8, padding:'6px 12px', fontSize:'0.78rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                  {deletingIdx === idx ? '…' : '🗑 Delete'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ marginTop:16, background:'var(--blue-50)', border:'1px solid var(--blue-100)' }}>
          <div style={{ fontSize:'0.82rem', color:'var(--blue-700)' }}>
            <strong>How to get a Drive link:</strong><br />
            Open file in Google Drive → Right click → Get link → "Anyone with the link can view" → Copy
          </div>
        </div>
      </div>
    </AppShell>
  )
}