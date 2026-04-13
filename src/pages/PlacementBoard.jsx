import { useEffect, useState } from 'react'
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import AppShell from '../components/AppShell'
import Spinner from '../components/Spinner'

export default function PlacementBoard() {
  const { profile } = useAuth()
  const isCR = profile?.role === 'cr'

  const [tab,      setTab]      = useState('view')
  const [posts,    setPosts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Post form
  const [title,   setTitle]   = useState('')
  const [link,    setLink]    = useState('')
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchPosts() }, [])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'placements'), orderBy('createdAt', 'desc')))
      const all = []
      snap.forEach(d => all.push({ id: d.id, ...d.data() }))
      setPosts(all)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Students/teachers see only their department's posts
  const visiblePosts = posts.filter(p => {
    if (profile?.role === 'admin') return true
    const myDept = profile?.department || (profile?.departments?.[0])
    return p.department === myDept
  })

  const postPlacement = async () => {
    setError('')
    if (!title.trim()) return setError('Title is required.')
    if (!link.trim())  return setError('Link is required.')
    if (!link.startsWith('http')) return setError('Please enter a valid link starting with http.')
    setSaving(true)
    try {
      await addDoc(collection(db, 'placements'), {
        title:      title.trim(),
        link:       link.trim(),
        department: profile?.department || '',
        postedBy:   profile?.name || '',
        postedById: profile?.uid  || '',
        createdAt:  serverTimestamp(),
      })
      setTitle(''); setLink('')
      setSuccess('Posted!')
      setTimeout(() => setSuccess(''), 3000)
      fetchPosts()
      setTab('view')
    } catch(e) { console.error(e); setError('Failed to post.') }
    finally { setSaving(false) }
  }

  const deletePost = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    setDeleting(p.id)
    try {
      await deleteDoc(doc(db, 'placements', p.id))
      setPosts(prev => prev.filter(x => x.id !== p.id))
    } catch(e) { console.error(e); alert('Failed to delete.') }
    finally { setDeleting(null) }
  }

  const fmtDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <AppShell title="Placement Board">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Tab toggle — only CR sees Post tab */}
        {isCR && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button className={`btn ${tab === 'view' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('view')}>📋 View Posts</button>
            <button className={`btn ${tab === 'post' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('post')}>➕ Post Opportunity</button>
          </div>
        )}

        {/* ── POST TAB ── */}
        {tab === 'post' && isCR && (
          <div className="card">
            <div className="card-header"><div className="card-title">Post Placement / Internship</div></div>
            <p style={{ fontSize: '0.88rem', color: 'var(--gray-500)', marginBottom: 20 }}>
              This will be visible to all students and teachers of <strong>{profile?.department}</strong>.
            </p>

            {error   && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">✅ {success}</div>}

            <div className="field">
              <label>Title</label>
              <input type="text" placeholder="e.g. TCS NQT Registration Open — Batch 2025" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Link</label>
              <input type="url" placeholder="https://drive.google.com/… or https://company.com/apply" value={link} onChange={e => setLink(e.target.value)} />
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>Google Drive link or company/form link</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => setTab('view')}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={postPlacement} disabled={saving}>
                {saving ? 'Posting…' : '📌 Post'}
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW TAB ── */}
        {tab === 'view' && (
          <>
            {loading ? <Spinner /> : visiblePosts.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💼</div>
                <div style={{ fontWeight: 700, color: 'var(--blue-900)', marginBottom: 6 }}>No opportunities posted yet</div>
                <div style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>
                  {isCR ? 'Post placement and internship opportunities for your department.' : 'Check back later for placement and internship opportunities.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visiblePosts.map(p => (
                  <div key={p.id} className="card" style={{ borderLeft: '4px solid #7c3aed', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--blue-900)', marginBottom: 8 }}>{p.title}</div>
                        <a href={p.link} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#7c3aed', fontWeight: 700, textDecoration: 'none', background: '#f5f3ff', padding: '6px 14px', borderRadius: 8, border: '1px solid #ddd6fe' }}>
                          🔗 Open Link →
                        </a>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 10 }}>
                          Posted by <strong>{p.postedBy}</strong> · {fmtDate(p.createdAt)} · {p.department}
                        </div>
                      </div>
                      {/* Only poster or admin can delete */}
                      {(profile?.uid === p.postedById || profile?.role === 'admin') && (
                        <button onClick={() => deletePost(p)} disabled={deleting === p.id}
                          style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 7, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          {deleting === p.id ? '…' : '🗑'}
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