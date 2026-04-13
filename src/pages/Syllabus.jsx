import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import AppShell from '../components/AppShell'
import Spinner from '../components/Spinner'
import { SEMESTERS } from '../utils/roles'

export default function Syllabus() {
  const { profile } = useAuth()
  const isCR = profile?.role === 'cr'

  const [dept,     setDept]     = useState(profile?.department || '')
  const [sem,      setSem]      = useState(profile?.semester   || 1)
  const [subject,  setSubject]  = useState('')
  const [subjects, setSubjects] = useState([])

  const [syllabus,  setSyllabus]  = useState(null)  // { driveLink, embedUrl, addedBy }
  const [loading,   setLoading]   = useState(false)
  const [loaded,    setLoaded]    = useState(false)

  // Edit/add form
  const [showForm,  setShowForm]  = useState(false)
  const [driveLink, setDriveLink] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  // Load subjects when dept/sem changes
  useEffect(() => {
    if (!dept || !sem) return
    async function fetchSubjects() {
      const docId = `${dept}_${sem}`.replace(/\s+/g, '_')
      const snap = await getDoc(doc(db, 'subjects', docId))
      setSubjects(snap.exists() ? (snap.data().subjects || []) : [])
      setSubject('')
      setSyllabus(null)
      setLoaded(false)
    }
    fetchSubjects()
  }, [dept, sem])

  const toEmbedUrl = (url) => {
    try {
      // Google Drive file: drive.google.com/file/d/FILE_ID/view
      const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`

      // Google Docs: docs.google.com/document/d/DOC_ID/edit
      const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)
      if (docsMatch) return `https://docs.google.com/document/d/${docsMatch[1]}/preview`

      // Google Sheets: docs.google.com/spreadsheets/d/ID/edit
      const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
      if (sheetsMatch) return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`

      // Google Slides: docs.google.com/presentation/d/ID/edit
      const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/)
      if (slidesMatch) return `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`

      return null
    } catch { return null }
  }

  const loadSyllabus = async () => {
    if (!subject) return
    setLoading(true)
    setSyllabus(null)
    setLoaded(false)
    setShowForm(false)
    setError('')
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      const snap = await getDoc(doc(db, 'syllabus', docId))
      setSyllabus(snap.exists() ? snap.data() : null)
      setLoaded(true)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const saveSyllabus = async () => {
    setError('')
    if (!driveLink.trim()) return setError('Please paste a Google Drive link.')
    const embedUrl = toEmbedUrl(driveLink.trim())
    if (!embedUrl) return setError('Invalid link. Paste a Google Drive or Google Docs link.')
    setSaving(true)
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      await setDoc(doc(db, 'syllabus', docId), {
        driveLink: driveLink.trim(),
        embedUrl,
        subject,
        department: dept,
        semester: Number(sem),
        addedBy: profile?.name || '',
        updatedAt: new Date().toISOString(),
      })
      setSyllabus({ driveLink: driveLink.trim(), embedUrl, addedBy: profile?.name })
      setDriveLink('')
      setShowForm(false)
      setSuccess('Syllabus saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch(e) { console.error(e); setError('Failed to save.') }
    finally { setSaving(false) }
  }

  const deleteSyllabus = async () => {
    if (!window.confirm(`Delete syllabus for ${subject}?`)) return
    setDeleting(true)
    try {
      const docId = `${dept}_${sem}_${subject}`.replace(/\s+/g, '_')
      await deleteDoc(doc(db, 'syllabus', docId))
      setSyllabus(null)
    } catch(e) { console.error(e); alert('Failed to delete.') }
    finally { setDeleting(false) }
  }

  const openEdit = () => {
    setDriveLink(syllabus?.driveLink || '')
    setError('')
    setShowForm(true)
  }

  return (
    <AppShell title="Syllabus">
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Selector card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Select Subject</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Department</label>
              {isCR ? (
                <input type="text" value={dept} disabled
                  style={{ background: 'var(--gray-50)', color: 'var(--gray-500)', cursor: 'not-allowed' }} />
              ) : (
                <input type="text" value={dept} disabled
                  style={{ background: 'var(--gray-50)', color: 'var(--gray-500)', cursor: 'not-allowed' }} />
              )}
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Semester</label>
              {isCR ? (
                <input type="text" value={`Semester ${sem}`} disabled
                  style={{ background: 'var(--gray-50)', color: 'var(--gray-500)', cursor: 'not-allowed' }} />
              ) : (
                <select value={sem} onChange={e => { setSem(Number(e.target.value)); setLoaded(false); setSyllabus(null) }}>
                  {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              )}
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Subject</label>
              {subjects.length === 0
                ? <div className="alert alert-warn" style={{ margin: 0, fontSize: '0.8rem' }}>No subjects found.</div>
                : <select value={subject} onChange={e => { setSubject(e.target.value); setLoaded(false); setSyllabus(null) }}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              }
            </div>
            <div className="field" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={loadSyllabus} disabled={!subject || loading}>
                {loading ? 'Loading…' : 'View Syllabus →'}
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>}

        {/* Result */}
        {!loading && loaded && (
          <>
            {/* Success message */}
            {success && <div className="alert alert-success" style={{ marginBottom: 12 }}>✅ {success}</div>}

            {syllabus ? (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div className="card-header" style={{ padding: '14px 16px', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div className="card-title">{subject}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>
                      {dept} · Semester {sem}
                      {syllabus.addedBy && ` · Added by ${syllabus.addedBy}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a href={syllabus.driveLink} target="_blank" rel="noreferrer"
                      className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 14px', textDecoration: 'none' }}>
                      🔗 Open in Drive
                    </a>
                    {isCR && (
                      <>
                        <button onClick={openEdit}
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563c8', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                          ✏️ Edit Link
                        </button>
                        <button onClick={deleteSyllabus} disabled={deleting}
                          style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                          {deleting ? '…' : '🗑 Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit form */}
                {showForm && isCR && (
                  <div style={{ padding: '16px 20px', background: 'var(--blue-50)', borderBottom: '1px solid var(--blue-100)' }}>
                    {error && <div className="alert alert-danger" style={{ marginBottom: 10 }}>{error}</div>}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <input type="url" placeholder="https://drive.google.com/file/d/…" value={driveLink}
                        onChange={e => setDriveLink(e.target.value)}
                        style={{ flex: 1, minWidth: 200, padding: '9px 14px', border: '1.5px solid var(--blue-200)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }} />
                      <button className="btn btn-primary" onClick={saveSyllabus} disabled={saving}>
                        {saving ? 'Saving…' : '💾 Save'}
                      </button>
                      <button className="btn btn-outline" onClick={() => { setShowForm(false); setError('') }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* PDF Embed */}
                <iframe
                  src={syllabus.embedUrl}
                  style={{ width: '100%', height: 'min(75vh, 650px)', border: 'none', display: 'block' }}
                  allow="autoplay"
                  title={`Syllabus — ${subject}`}
                />
              </div>
            ) : (
              /* No syllabus uploaded yet */
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 700, color: 'var(--blue-900)', marginBottom: 6 }}>
                  No syllabus uploaded for {subject} yet
                </div>
                <div style={{ color: 'var(--gray-400)', fontSize: '0.88rem', marginBottom: 20 }}>
                  {isCR ? 'Upload the BPUT syllabus Drive link below.' : 'Ask your CR to upload the syllabus.'}
                </div>

                {/* CR add form */}
                {isCR && !showForm && (
                  <button className="btn btn-primary" onClick={() => { setShowForm(true); setDriveLink('') }}>
                    + Add Syllabus Link
                  </button>
                )}

                {isCR && showForm && (
                  <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'left' }}>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <div className="field">
                      <label>Google Drive Link</label>
                      <input type="url" placeholder="https://drive.google.com/… or https://docs.google.com/…" value={driveLink}
                        onChange={e => setDriveLink(e.target.value)} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>
                        Drive/Docs → Share → "Anyone with link can view" → Copy link
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-outline" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSyllabus} disabled={saving}>
                        {saving ? 'Saving…' : '💾 Save Syllabus'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}