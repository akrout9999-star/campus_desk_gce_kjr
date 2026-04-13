import { useEffect, useState } from 'react'
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'
import { DEPARTMENTS, SEMESTERS } from '../../utils/roles'

export default function ManageSubjects() {
  const [dept,     setDept]     = useState(DEPARTMENTS[0])
  const [sem,      setSem]      = useState(1)
  const [subjects, setSubjects] = useState([])
  const [newSubj,  setNewSubj]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  const docId = `${dept}_${sem}`.replace(/\s+/g, '_')

  useEffect(() => {
    async function fetchSubjects() {
      setLoading(true)
      try {
        const snap = await getDoc(doc(db, 'subjects', docId))
        setSubjects(snap.exists() ? (snap.data().subjects || []) : [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchSubjects()
    setSaved(false)
  }, [dept, sem, docId])

  const addSubject = () => {
    const trimmed = newSubj.trim()
    if (!trimmed || subjects.includes(trimmed)) return
    setSubjects(prev => [...prev, trimmed])
    setNewSubj('')
    setSaved(false)
  }

  const removeSubject = (s) => {
    setSubjects(prev => prev.filter(x => x !== s))
    setSaved(false)
  }

  const saveSubjects = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'subjects', docId), {
        department: dept,
        semester:   Number(sem),
        subjects,
        updatedAt:  serverTimestamp(),
      })
      setSaved(true)
    } catch (e) {
      console.error(e)
      alert('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Manage Subjects">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Select Department & Semester</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Department</label>
              <select value={dept} onChange={e => setDept(e.target.value)}>
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

          {loading ? <Spinner /> : (
            <>
              {/* Add subject */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder="e.g. Data Structures"
                  value={newSubj}
                  onChange={e => setNewSubj(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubject()}
                  style={{
                    flex: 1, padding: '10px 14px',
                    border: '1.5px solid var(--gray-200)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-sans)', fontSize: '0.92rem',
                  }}
                />
                <button className="btn btn-primary" onClick={addSubject} disabled={!newSubj.trim()}>
                  + Add
                </button>
              </div>

              {/* Subjects list */}
              {subjects.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 20px' }}>
                  <p>No subjects added yet for this dept/semester.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {subjects.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                    }}>
                      <span style={{ fontWeight: 500, fontSize: '0.92rem' }}>{s}</span>
                      <button
                        onClick={() => removeSubject(s)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--danger)', fontSize: '1.1rem', lineHeight: 1,
                          padding: '2px 6px', borderRadius: 4,
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {saved && (
                <div className="alert alert-success" style={{ marginBottom: 12 }}>
                  ✅ Subjects saved successfully!
                </div>
              )}

              <button
                className="btn btn-primary btn-lg"
                onClick={saveSubjects}
                disabled={saving || subjects.length === 0}
                style={{ width: '100%' }}
              >
                {saving ? 'Saving…' : 'Save Subjects'}
              </button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}