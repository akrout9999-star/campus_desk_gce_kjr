import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore'
import { db } from '../../firebase'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'
import { DEPARTMENTS, SEMESTERS } from '../../utils/roles'

export default function ManageTimetable() {
  const [timetables, setTimetables] = useState([]) // [{dept, sem, embedUrl}]
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(null)

  // Add form
  const [dept,     setDept]     = useState('')
  const [sem,      setSem]      = useState(1)
  const [driveUrl, setDriveUrl] = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'timetables'))
      const list = []
      snap.forEach(d => list.push({ docId: d.id, ...d.data() }))
      list.sort((a, b) => a.dept?.localeCompare(b.dept) || a.sem - b.sem)
      setTimetables(list)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Convert Google Drive share link to embed URL
  const toEmbedUrl = (url) => {
    try {
      // Handle both /view and /preview links
      // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
      // https://drive.google.com/file/d/FILE_ID/preview
      const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      if (match) return `https://drive.google.com/file/d/${match[1]}/preview`
      return null
    } catch { return null }
  }

  const saveTimetable = async () => {
    setError('')
    if (!dept) return setError('Please select a department.')
    if (!driveUrl.trim()) return setError('Please enter a Google Drive link.')
    const embedUrl = toEmbedUrl(driveUrl.trim())
    if (!embedUrl) return setError('Invalid Google Drive link. Make sure it\'s a file link like drive.google.com/file/d/…')

    setSaving(true)
    try {
      const docId = `${dept}_${sem}`.replace(/\s+/g, '_')
      await setDoc(doc(db, 'timetables', docId), {
        dept, sem: Number(sem), embedUrl, driveUrl: driveUrl.trim(), updatedAt: new Date().toISOString()
      })
      setDriveUrl('')
      setSuccess(`Timetable saved for ${dept} Sem ${sem}!`)
      setTimeout(() => setSuccess(''), 3000)
      fetchAll()
    } catch(e) { console.error(e); setError('Failed to save.') }
    finally { setSaving(false) }
  }

  const deleteTimetable = async (t) => {
    if (!window.confirm(`Delete timetable for ${t.dept} Sem ${t.sem}?`)) return
    setDeleting(t.docId)
    try {
      await deleteDoc(doc(db, 'timetables', t.docId))
      setTimetables(prev => prev.filter(x => x.docId !== t.docId))
    } catch(e) { console.error(e); alert('Failed to delete.') }
    finally { setDeleting(null) }
  }

  return (
    <AppShell title="Manage Timetables">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Add / Update */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">Add / Update Timetable</div></div>
          <p style={{ fontSize: '0.88rem', color: 'var(--gray-500)', marginBottom: 20 }}>
            Upload the timetable PDF to Google Drive, set sharing to "Anyone with link can view", then paste the link here.
          </p>

          {error   && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">✅ {success}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Department</label>
              <select value={dept} onChange={e => setDept(e.target.value)}>
                <option value="">Select dept</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Semester</label>
              <select value={sem} onChange={e => setSem(Number(e.target.value))}>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Google Drive Link</label>
            <input type="url" placeholder="https://drive.google.com/file/d/…/view" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} />
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>
              Drive → Right click file → Share → "Anyone with link" → Copy link
            </div>
          </div>

          <button className="btn btn-primary btn-lg" onClick={saveTimetable} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Timetable'}
          </button>
        </div>

        {/* Existing timetables */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '14px 16px' }}>
            <div className="card-title">Uploaded Timetables</div>
          </div>

          {loading ? <Spinner /> : timetables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--gray-400)', fontSize: '0.88rem' }}>
              No timetables uploaded yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-600)' }}>Department</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-600)' }}>Sem</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-600)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timetables.map((t, i) => (
                  <tr key={t.docId} style={{ borderBottom: '1px solid var(--gray-100)', background: i % 2 === 0 ? '#fff' : 'var(--gray-50)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{t.dept}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>Sem {t.sem}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <a href={t.driveUrl} target="_blank" rel="noreferrer"
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563c8', borderRadius: 7, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>
                          🔗 View
                        </a>
                        <button onClick={() => deleteTimetable(t)} disabled={deleting === t.docId}
                          style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 7, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          {deleting === t.docId ? '…' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ marginTop: 16, background: 'var(--blue-50)', border: '1px solid var(--blue-100)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--blue-700)' }}>
            <strong>💡 Tip:</strong> If you update the timetable, just upload the new PDF to the same Drive link and it will auto-update for students. No need to update the link here unless it changes.
          </div>
        </div>

      </div>
    </AppShell>
  )
}