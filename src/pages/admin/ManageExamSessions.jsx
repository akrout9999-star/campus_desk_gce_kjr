import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'

export default function ManageExamSessions() {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'settings', 'examSessions'))
      setSessions(snap.exists() ? (snap.data().sessions || []) : [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const saveSessions = async (updated) => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'examSessions'), { sessions: updated })
      setSessions(updated)
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 2500)
    } catch(e) { console.error(e); setError('Failed to save.') }
    finally { setSaving(false) }
  }

  const addSession = () => {
    setError('')
    const label = newLabel.trim()
    if (!label) return setError('Please enter a session name.')
    if (sessions.includes(label)) return setError('Session already exists.')
    const updated = [label, ...sessions]
    setNewLabel('')
    saveSessions(updated)
  }

  const removeSession = (s) => {
    if (!window.confirm(`Remove "${s}"? Students won't see this option anymore.`)) return
    saveSessions(sessions.filter(x => x !== s))
  }

  const moveUp = (i) => {
    if (i === 0) return
    const updated = [...sessions]
    ;[updated[i - 1], updated[i]] = [updated[i], updated[i - 1]]
    saveSessions(updated)
  }

  const moveDown = (i) => {
    if (i === sessions.length - 1) return
    const updated = [...sessions]
    ;[updated[i], updated[i + 1]] = [updated[i + 1], updated[i]]
    saveSessions(updated)
  }

  return (
    <AppShell title="Exam Sessions">
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">BPUT Exam Sessions</div>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--gray-500)', marginBottom: 20 }}>
            These sessions appear in the BPUT Result dropdown for students and teachers.
            The top item will be selected by default.
          </p>

          {error   && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">✅ {success}</div>}

          {/* Add new */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="e.g. Odd-(2025-26)"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSession()}
              style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}
            />
            <button className="btn btn-primary" onClick={addSession} disabled={saving}>
              + Add
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: 20 }}>
            Format: <code>Odd-(2025-26)</code> or <code>Even-(2024-25)</code>
          </div>

          {/* List */}
          {loading ? <Spinner /> : sessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No sessions added yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: i === 0 ? 'var(--blue-50)' : 'var(--gray-50)', border: `1px solid ${i === 0 ? 'var(--blue-100)' : 'var(--gray-200)'}` }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--blue-900)' }}>{s}</span>
                    {i === 0 && <span style={{ marginLeft: 8, fontSize: '0.7rem', background: '#2563c8', color: '#fff', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>DEFAULT</span>}
                  </div>
                  {/* Reorder */}
                  <button onClick={() => moveUp(i)} disabled={i === 0 || saving}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1rem', padding: '2px 4px' }} title="Move up">▲</button>
                  <button onClick={() => moveDown(i)} disabled={i === sessions.length - 1 || saving}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1rem', padding: '2px 4px' }} title="Move down">▼</button>
                  <button onClick={() => removeSession(s)}
                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 7, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--blue-700)' }}>
            <strong>💡 Tip:</strong> Add the latest exam session at the top so students see it as default.
            Remove old sessions once they're no longer needed.
          </div>
        </div>

      </div>
    </AppShell>
  )
}