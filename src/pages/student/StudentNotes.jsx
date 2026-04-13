import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'

export default function StudentNotes() {
  const { profile } = useAuth()
  const [notesBySubject, setNotesBySubject] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeSubject, setActiveSubject] = useState(null)

  useEffect(() => {
    if (!profile) return
    async function fetchNotes() {
      try {
        const q = query(
          collection(db, 'notes'),
          where('department', '==', profile.department),
          where('semester', '==', profile.semester)
        )
        const snap = await getDocs(q)
        const grouped = {}
        snap.forEach(docSnap => {
          const d = docSnap.data()
          if (!grouped[d.subject]) grouped[d.subject] = []
          ;(d.links || []).forEach(link => grouped[d.subject].push(link))
        })
        setNotesBySubject(grouped)
        const subjects = Object.keys(grouped)
        if (subjects.length > 0) setActiveSubject(subjects[0])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchNotes()
  }, [profile])

  const subjects = Object.keys(notesBySubject)

  return (
    <AppShell title="Study Notes">
      {loading ? <Spinner /> : subjects.length === 0 ? (
        <div className="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.75 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p>No notes uploaded yet for your class.</p>
        </div>
      ) : (
        <div>
          {/* Subject tabs */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:20, paddingBottom:4 }}>
            {subjects.map(subj => (
              <button
                key={subj}
                onClick={() => setActiveSubject(subj)}
                style={{
                  padding:'8px 18px', borderRadius:99, border:'none', cursor:'pointer',
                  whiteSpace:'nowrap', fontFamily:'var(--font-sans)', fontWeight:600, fontSize:'0.85rem',
                  transition:'all 0.2s',
                  background: activeSubject === subj ? 'linear-gradient(135deg,var(--blue-600),var(--blue-700))' : '#fff',
                  color: activeSubject === subj ? '#fff' : 'var(--gray-600)',
                  boxShadow: activeSubject === subj ? '0 4px 12px rgba(37,99,200,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                }}
              >
                {subj}
                <span style={{ marginLeft:6, fontSize:'0.72rem', opacity:0.75 }}>({notesBySubject[subj].length})</span>
              </button>
            ))}
          </div>

          {/* Notes for active subject */}
          {activeSubject && (
            <div>
              <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                {notesBySubject[activeSubject].length} note{notesBySubject[activeSubject].length !== 1 ? 's' : ''} • {activeSubject}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {notesBySubject[activeSubject].map((note, i) => (
                  <div key={i} style={{
                    background:'#fff', borderRadius:14, padding:'16px 18px',
                    boxShadow:'0 2px 12px rgba(10,22,40,0.07)',
                    border:'1px solid rgba(226,232,240,0.8)',
                    display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--blue-900)', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {note.title}
                      </div>
                      <div style={{ fontSize:'0.78rem', color:'var(--gray-400)' }}>
                        By: <span style={{ fontWeight:600, color:'var(--gray-600)' }}>{note.uploadedBy || 'Unknown'}</span>
                        {note.uploadedAt && (
                          <span style={{ marginLeft:8 }}>
                            • {new Date(note.uploadedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={note.driveLink} target="_blank" rel="noopener noreferrer"
                      style={{
                        display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
                        background:'linear-gradient(135deg,var(--blue-600),var(--blue-700))',
                        color:'#fff', borderRadius:8, fontSize:'0.8rem', fontWeight:600,
                        textDecoration:'none', whiteSpace:'nowrap', flexShrink:0,
                        boxShadow:'0 2px 8px rgba(37,99,200,0.3)',
                      }}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}