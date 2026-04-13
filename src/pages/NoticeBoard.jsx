import { useEffect, useState } from 'react'
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import AppShell from '../components/AppShell'
import Spinner from '../components/Spinner'
import { DEPARTMENTS } from '../utils/roles'

export default function NoticeBoard() {
  const { profile } = useAuth()
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin'
  const teacherDepts = profile?.departments || (profile?.department ? [profile.department] : [])

  const [tab,      setTab]      = useState('view')
  const [notices,  setNotices]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Post form
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [link,     setLink]     = useState('')
  const [scope,    setScope]    = useState('all') // 'all' | dept name
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  useEffect(() => { fetchNotices() }, [])

  const fetchNotices = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc')))
      const all = []
      snap.forEach(d => all.push({ id: d.id, ...d.data() }))
      setNotices(all)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Filter notices visible to current user
  const visibleNotices = notices.filter(n => {
    if (n.scope === 'all') return true
    // dept-wide notice
    if (profile?.role === 'teacher' || profile?.role === 'admin') {
      const myDepts = profile?.departments || (profile?.department ? [profile.department] : [])
      return myDepts.includes(n.scope) || n.scope === profile?.department
    }
    return n.scope === profile?.department
  })

  const postNotice = async () => {
    setError('')
    if (!title.trim()) return setError('Title is required.')
    if (!body.trim())  return setError('Description is required.')
    setSaving(true)
    try {
      await addDoc(collection(db, 'notices'), {
        title:     title.trim(),
        body:      body.trim(),
        link:      link.trim(),
        scope,
        postedBy:  profile?.name || '',
        postedById: profile?.uid || '',
        createdAt: serverTimestamp(),
      })
      setTitle(''); setBody(''); setLink(''); setScope('all')
      setSuccess('Notice posted!')
      setTimeout(() => setSuccess(''), 3000)
      fetchNotices()
      setTab('view')
    } catch(e) { console.error(e); setError('Failed to post notice.') }
    finally { setSaving(false) }
  }

  const deleteNotice = async (n) => {
    if (!window.confirm(`Delete notice "${n.title}"?`)) return
    setDeleting(n.id)
    try {
      await deleteDoc(doc(db, 'notices', n.id))
      setNotices(prev => prev.filter(x => x.id !== n.id))
    } catch(e) { console.error(e); alert('Failed to delete.') }
    finally { setDeleting(null) }
  }

  const fmtDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const scopeLabel = (s) => s === 'all' ? '🏫 College Wide' : `🎓 ${s}`

  return (
    <AppShell title="Notice Board">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Tab toggle — only teachers see Post tab */}
        {isTeacher && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button className={`btn ${tab === 'view' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('view')}>📋 View Notices</button>
            <button className={`btn ${tab === 'post' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('post')}>📢 Post Notice</button>
          </div>
        )}

        {/* ── POST TAB ── */}
        {tab === 'post' && isTeacher && (
          <div className="card">
            <div className="card-header"><div className="card-title">Post a Notice</div></div>

            {error   && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">✅ {success}</div>}

            <div className="field">
              <label>Visible To</label>
              <select value={scope} onChange={e => setScope(e.target.value)}>
                <option value="all">🏫 All — College Wide</option>
                {teacherDepts.map(d => <option key={d} value={d}>🎓 {d} Department only</option>)}
              </select>
            </div>
            <div className="field">
              <label>Title</label>
              <input type="text" placeholder="e.g. Holiday on 15th August" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={4} placeholder="Write notice details here…" value={body}
                onChange={e => setBody(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', resize: 'vertical' }} />
            </div>
            <div className="field">
              <label>Link <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
              <input type="url" placeholder="https://…" value={link} onChange={e => setLink(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setTab('view')}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={postNotice} disabled={saving}>
                {saving ? 'Posting…' : '📢 Post Notice'}
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW TAB ── */}
        {tab === 'view' && (
          <>
            {loading ? <Spinner /> : visibleNotices.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 700, color: 'var(--blue-900)', marginBottom: 6 }}>No notices yet</div>
                <div style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>Check back later for announcements.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visibleNotices.map(n => (
                  <div key={n.id} className="card" style={{ borderLeft: '4px solid #2563c8', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--blue-900)' }}>{n.title}</span>
                          <span style={{ fontSize: '0.7rem', background: n.scope === 'all' ? '#dbeafe' : '#dcfce7', color: n.scope === 'all' ? '#1d4ed8' : '#16a34a', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>
                            {scopeLabel(n.scope)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 8 }}>{n.body}</div>
                        {n.link && (
                          <a href={n.link} target="_blank" rel="noreferrer"
                            style={{ fontSize: '0.82rem', color: '#2563c8', fontWeight: 600, textDecoration: 'none' }}>
                            🔗 View Link →
                          </a>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 8 }}>
                          Posted by <strong>{n.postedBy}</strong> · {fmtDate(n.createdAt)}
                        </div>
                      </div>
                      {/* Only poster can delete */}
                      {(profile?.uid === n.postedById || profile?.role === 'admin') && (
                        <button onClick={() => deleteNotice(n)} disabled={deleting === n.id}
                          style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 7, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          {deleting === n.id ? '…' : '🗑'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}