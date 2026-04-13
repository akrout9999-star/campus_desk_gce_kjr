import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  collection, getDocs, doc, updateDoc,
  deleteDoc, writeBatch
} from 'firebase/firestore'
import { db } from '../../firebase'
import AppShell from '../../components/AppShell'
import Spinner from '../../components/Spinner'
import { DEPARTMENTS, SEMESTERS } from '../../utils/roles'

const ROLES = ['student', 'cr', 'teacher', 'admin']
const FINAL_SEM = 8

/* ── Bulk action styles ── */
const CSS = `
  .bulk-section {
    background: #fff;
    border-radius: 16px;
    border: 1.5px solid var(--gray-200, #e5e7eb);
    padding: 18px 20px;
    margin-bottom: 20px;
  }
  .bulk-section-title {
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--gray-400, #9ca3af);
    margin-bottom: 14px;
  }
  .bulk-actions-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .bulk-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 18px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    border: 1.5px solid transparent;
    transition: transform 0.1s, opacity 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .bulk-btn:active { transform: scale(0.97); }
  .bulk-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .bulk-btn-upgrade {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1d4ed8;
  }
  .bulk-btn-delete {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #dc2626;
  }

  /* Preview modal */
  .preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 16px;
  }
  .preview-modal {
    background: #fff;
    border-radius: 18px;
    width: 100%;
    max-width: 480px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,0.22);
    overflow: hidden;
  }
  .preview-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--gray-100, #f3f4f6);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .preview-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--gray-900, #111827);
    margin-bottom: 3px;
  }
  .preview-subtitle {
    font-size: 0.82rem;
    color: var(--gray-400, #9ca3af);
    font-weight: 500;
  }
  .preview-close {
    background: none;
    border: none;
    font-size: 1.4rem;
    cursor: pointer;
    color: var(--gray-400);
    line-height: 1;
    flex-shrink: 0;
    padding: 2px 6px;
  }
  .preview-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 20px;
  }
  .preview-dept-select {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--gray-200, #e5e7eb);
    border-radius: 10px;
    font-size: 0.95rem;
    margin-bottom: 14px;
    background: #fff;
    color: var(--gray-900);
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    box-sizing: border-box;
  }
  .preview-dept-select:focus { border-color: #2563eb; }
  .preview-count-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
  }
  .preview-count {
    flex: 1;
    padding: 10px 12px;
    border-radius: 10px;
    text-align: center;
    font-size: 0.82rem;
    font-weight: 700;
  }
  .preview-count-blue  { background: #eff6ff; color: #1d4ed8; }
  .preview-count-red   { background: #fef2f2; color: #dc2626; }
  .preview-count-green { background: #f0fdf4; color: #16a34a; }
  .preview-list-label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--gray-400);
    margin-bottom: 8px;
  }
  .preview-student-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--gray-100, #f3f4f6);
    gap: 10px;
  }
  .preview-student-row:last-child { border-bottom: none; }
  .preview-student-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--gray-900);
  }
  .preview-student-roll {
    font-size: 0.78rem;
    color: var(--gray-400);
    margin-top: 1px;
  }
  .preview-arrow {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--gray-400);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .preview-footer {
    padding: 14px 20px;
    border-top: 1px solid var(--gray-100, #f3f4f6);
    display: flex;
    gap: 10px;
  }
  .preview-cancel-btn {
    flex: 1;
    padding: 14px;
    border: 1.5px solid var(--gray-200);
    border-radius: 10px;
    background: #fff;
    font-size: 0.92rem;
    font-weight: 700;
    cursor: pointer;
    color: var(--gray-700);
  }
  .preview-confirm-btn {
    flex: 2;
    padding: 14px;
    border: none;
    border-radius: 10px;
    font-size: 0.92rem;
    font-weight: 800;
    cursor: pointer;
    color: #fff;
    transition: opacity 0.15s;
  }
  .preview-confirm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .preview-confirm-upgrade { background: #2563eb; }
  .preview-confirm-delete  { background: #dc2626; }
  .preview-empty {
    text-align: center;
    color: var(--gray-400);
    font-size: 0.9rem;
    padding: 28px 0;
  }

  /* Progress bar during operation */
  .bulk-progress-wrap {
    margin: 10px 0 0;
    background: var(--gray-100, #f3f4f6);
    border-radius: 99px;
    height: 6px;
    overflow: hidden;
  }
  .bulk-progress-bar {
    height: 100%;
    border-radius: 99px;
    transition: width 0.2s ease;
  }
  .bulk-progress-bar-blue { background: #2563eb; }
  .bulk-progress-bar-red  { background: #dc2626; }
  .bulk-status-text {
    font-size: 0.8rem;
    color: var(--gray-500);
    margin-top: 6px;
  }
`

function StyleTag() { return <style>{CSS}</style> }

/* ══════════════════════════════════════════════════════════════════ */
export default function AdminUsers() {
  const [users,       setUsers]      = useState([])
  const [filtered,    setFiltered]   = useState([])
  const [search,      setSearch]     = useState('')
  const [roleFilter,  setRoleFilter] = useState('all')
  const [deptFilter,  setDeptFilter] = useState('all')
  const [loading,     setLoading]    = useState(true)
  const [editUser,    setEditUser]   = useState(null)
  const [saving,      setSaving]     = useState(false)
  const [deleting,    setDeleting]   = useState(null)

  // Bulk state
  const [bulkModal,   setBulkModal]  = useState(null)  // 'upgrade' | 'delete' | null
  const [bulkDept,    setBulkDept]   = useState('')
  const [bulkSem,     setBulkSem]    = useState('')
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkTotal,   setBulkTotal]  = useState(0)
  const [bulkDone,    setBulkDone]   = useState(false)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const list = []
      snap.forEach(d => list.push({ uid: d.id, ...d.data() }))
      list.sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || ''))
      setUsers(list)
      setFiltered(list)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let result = users
    if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter)
    if (deptFilter !== 'all') result = result.filter(u =>
      u.department === deptFilter ||
      (Array.isArray(u.departments) && u.departments.includes(deptFilter))
    )
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.rollNo?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [search, roleFilter, deptFilter, users])

  /* ── Edit user ── */
  const openEdit = (u) => {
    const isTeacher = u.role === 'teacher' || u.role === 'admin'
    setEditUser({
      ...u,
      department:  u.department  || '',
      departments: u.departments || (u.department ? [u.department] : []),
      _isTeacher:  isTeacher,
    })
  }

  const toggleTeacherDept = (dept) => {
    setEditUser(prev => {
      const cur  = prev.departments || []
      const next = cur.includes(dept) ? cur.filter(d => d !== dept) : [...cur, dept]
      return { ...prev, departments: next, department: next[0] || '' }
    })
  }

  const handleRoleChange = (newRole) => {
    const isTeacher = newRole === 'teacher' || newRole === 'admin'
    setEditUser(prev => ({
      ...prev,
      role:        newRole,
      _isTeacher:  isTeacher,
      department:  isTeacher ? (prev.departments?.[0] || prev.department || '') : prev.department || '',
      departments: isTeacher ? (prev.departments?.length ? prev.departments : (prev.department ? [prev.department] : [])) : [],
    }))
  }

  const saveEdit = async () => {
    if (!editUser) return
    if (!editUser.name?.trim()) return alert('Name is required.')
    if (!editUser.role)         return alert('Role is required.')
    setSaving(true)
    try {
      const isTeacher = editUser.role === 'teacher' || editUser.role === 'admin'
      const updateData = {
        name:     editUser.name.trim(),
        role:     editUser.role,
        rollNo:   editUser.rollNo?.trim() || '',
        semester: Number(editUser.semester) || 1,
      }
      if (isTeacher) {
        updateData.departments = editUser.departments || []
        updateData.department  = editUser.departments?.[0] || ''
      } else {
        updateData.department  = editUser.department || ''
        updateData.departments = []
      }
      await updateDoc(doc(db, 'users', editUser.uid), updateData)
      setUsers(prev => prev.map(u => u.uid === editUser.uid ? { ...u, ...updateData } : u))
      setEditUser(null)
    } catch(e) { console.error(e); alert('Failed to save.') }
    finally { setSaving(false) }
  }

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete "${user.name}" (${user.rollNo || user.email})? This cannot be undone.`)) return
    setDeleting(user.uid)
    try {
      await deleteDoc(doc(db, 'users', user.uid))
      setUsers(prev => prev.filter(u => u.uid !== user.uid))
    } catch(e) { console.error(e); alert('Failed to delete user.') }
    finally { setDeleting(null) }
  }

  /* ── Bulk helpers ── */

  // Students in selected dept+sem eligible for upgrade
  const upgradePreview = (bulkDept && bulkSem)
    ? users.filter(u =>
        (u.role === 'student' || u.role === 'cr') &&
        u.department === bulkDept &&
        Number(u.semester) === Number(bulkSem) &&
        Number(u.semester) < FINAL_SEM
      )
    : []

  // Students in final sem for selected dept (eligible for deletion)
  const deletePreview = bulkDept
    ? users.filter(u =>
        (u.role === 'student' || u.role === 'cr') &&
        u.department === bulkDept &&
        Number(u.semester) === FINAL_SEM
      )
    : []

  const openBulkModal = (type) => {
    setBulkModal(type)
    setBulkDept('')
    setBulkSem('')
    setBulkRunning(false)
    setBulkProgress(0)
    setBulkTotal(0)
    setBulkDone(false)
  }

  const closeBulkModal = () => {
    if (bulkRunning) return
    setBulkModal(null)
    setBulkDone(false)
  }

  // Firestore max batch size is 500
  const runInBatches = async (items, operation) => {
    const BATCH_SIZE = 400
    let done = 0
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = writeBatch(db)
      const chunk = items.slice(i, i + BATCH_SIZE)
      chunk.forEach(item => operation(batch, item))
      await batch.commit()
      done += chunk.length
      setBulkProgress(done)
    }
  }

  const confirmUpgrade = async () => {
    if (!upgradePreview.length) return
    setBulkRunning(true)
    setBulkTotal(upgradePreview.length)
    setBulkProgress(0)
    try {
      await runInBatches(upgradePreview, (batch, u) => {
        batch.update(doc(db, 'users', u.uid), { semester: Number(u.semester) + 1 })
      })
      // Update local state
      setUsers(prev => prev.map(u => {
        if (upgradePreview.find(p => p.uid === u.uid)) {
          return { ...u, semester: Number(u.semester) + 1 }
        }
        return u
      }))
      setBulkDone(true)
    } catch(e) {
      console.error(e)
      alert('Something went wrong during upgrade. Please try again.')
    } finally {
      setBulkRunning(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletePreview.length) return
    setBulkRunning(true)
    setBulkTotal(deletePreview.length)
    setBulkProgress(0)
    try {
      await runInBatches(deletePreview, (batch, u) => {
        batch.delete(doc(db, 'users', u.uid))
      })
      // Update local state
      const deletedUids = new Set(deletePreview.map(u => u.uid))
      setUsers(prev => prev.filter(u => !deletedUids.has(u.uid)))
      setBulkDone(true)
    } catch(e) {
      console.error(e)
      alert('Something went wrong during deletion. Please try again.')
    } finally {
      setBulkRunning(false)
    }
  }

  /* ── Misc ── */
  const badgeClass = role =>
    role==='admin'?'badge-red':role==='teacher'?'badge-gold':role==='cr'?'badge-blue':'badge-green'

  const displayDept = (u) => {
    if (Array.isArray(u.departments) && u.departments.length > 0) return u.departments.join(', ')
    return u.department || '—'
  }

  const progressPct = bulkTotal > 0 ? Math.round((bulkProgress / bulkTotal) * 100) : 0

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <AppShell title="Manage Users">
      <StyleTag />
      {loading ? <Spinner /> : (
        <>
          {/* ── Bulk Actions Section ── */}
          <div className="bulk-section">
            <div className="bulk-section-title">⚡ Bulk Actions</div>
            <div className="bulk-actions-row">
              <button className="bulk-btn bulk-btn-upgrade" onClick={() => openBulkModal('upgrade')}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Semester Upgrade
              </button>
              <button className="bulk-btn bulk-btn-delete" onClick={() => openBulkModal('delete')}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                Remove Passout Students
              </button>
            </div>
          </div>

          {/* ── Search + filters ── */}
          <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <input type="search" placeholder="Search name, roll no, email…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex:2, minWidth:200, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-sans)', fontSize:'0.9rem' }}
            />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              style={{ padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-sans)', fontSize:'0.9rem', background:'var(--white)' }}>
              <option value="all">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              style={{ padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-sans)', fontSize:'0.9rem', background:'var(--white)' }}>
              <option value="all">All Depts</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ marginBottom:12, fontSize:'0.85rem', color:'var(--gray-500)' }}>
            Showing {filtered.length} of {users.length} users
          </div>

          {/* ── Users table ── */}
          <div className="card" style={{ padding:0, overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem', minWidth:560 }}>
              <thead>
                <tr style={{ background:'var(--gray-50)', borderBottom:'2px solid var(--gray-200)' }}>
                  <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Name</th>
                  <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Roll No</th>
                  <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--gray-600)' }}>Dept</th>
                  <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Sem</th>
                  <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Role</th>
                  <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'var(--gray-600)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--gray-400)', padding:32 }}>No users found</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.uid} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                    <td style={{ padding:'10px 12px', fontWeight:600 }}>{u.name}</td>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:'0.82rem' }}>{u.rollNo || '—'}</td>
                    <td style={{ padding:'10px 12px', fontSize:'0.82rem', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayDept(u)}</td>
                    <td style={{ padding:'10px 12px', textAlign:'center' }}>{u.semester || '—'}</td>
                    <td style={{ padding:'10px 12px', textAlign:'center' }}>
                      <span className={`badge ${badgeClass(u.role)}`}>{u.role}</span>
                    </td>
                    <td style={{ padding:'10px 12px', textAlign:'center' }}>
                      <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                        <button onClick={() => openEdit(u)}
                          style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563c8', borderRadius:7, padding:'5px 10px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer' }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteUser(u)} disabled={deleting === u.uid}
                          style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:7, padding:'5px 10px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer' }}>
                          {deleting === u.uid ? '…' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ EDIT USER MODAL ══ */}
      {editUser && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) setEditUser(null) }}
          style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', color:'var(--blue-900)', margin:0 }}>Edit User</h3>
              <button onClick={() => setEditUser(null)}
                style={{ background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'var(--gray-400)', lineHeight:1 }}>×</button>
            </div>
            <div className="field">
              <label>Full Name</label>
              <input type="text" value={editUser.name || ''} onChange={e => setEditUser(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Roll No</label>
              <input type="text" value={editUser.rollNo || ''} onChange={e => setEditUser(p => ({ ...p, rollNo: e.target.value }))} />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={editUser.role} onChange={e => handleRoleChange(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>
                Department
                {editUser._isTeacher && (
                  <span style={{ fontSize:'0.75rem', color:'var(--gray-400)', fontWeight:400, marginLeft:6 }}>(select all that apply)</span>
                )}
              </label>
              {editUser._isTeacher ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {DEPARTMENTS.map(d => (
                    <label key={d} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                      <input type="checkbox" checked={(editUser.departments || []).includes(d)} onChange={() => toggleTeacherDept(d)} />
                      <span style={{ fontSize:'0.88rem' }}>{d}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <select value={editUser.department || ''} onChange={e => setEditUser(p => ({ ...p, department: e.target.value }))}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </div>
            {!editUser._isTeacher && (
              <div className="field">
                <label>Semester</label>
                <select value={editUser.semester || 1} onChange={e => setEditUser(p => ({ ...p, semester: Number(e.target.value) }))}>
                  {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            )}
            {editUser.email && (
              <div className="field">
                <label>Email (read only)</label>
                <input type="text" value={editUser.email} disabled style={{ background:'var(--gray-50)', color:'var(--gray-400)', cursor:'not-allowed' }} />
              </div>
            )}
            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button className="btn btn-outline" style={{ flex:1 }} onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ══ BULK ACTION MODAL ══ */}
      {bulkModal && createPortal(
        <div className="preview-overlay" onClick={e => { if (e.target === e.currentTarget) closeBulkModal() }}>
          <div className="preview-modal">

            {/* Header */}
            <div className="preview-header">
              <div>
                <div className="preview-title">
                  {bulkModal === 'upgrade' ? '⬆️ Semester Upgrade' : '🎓 Remove Passout Students'}
                </div>
                <div className="preview-subtitle">
                  {bulkModal === 'upgrade'
                    ? 'Moves all students up by one semester'
                    : `Permanently deletes all Sem ${FINAL_SEM} students`}
                </div>
              </div>
              {!bulkRunning && (
                <button className="preview-close" onClick={closeBulkModal}>×</button>
              )}
            </div>

            {/* Body */}
            <div className="preview-body">

              {/* Done state */}
              {bulkDone ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
                    {bulkModal === 'upgrade' ? '✅' : '🎓'}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--gray-900)', marginBottom: 6 }}>
                    {bulkModal === 'upgrade' ? 'Upgrade Complete!' : 'Students Removed!'}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--gray-400)' }}>
                    {bulkProgress} student{bulkProgress !== 1 ? 's' : ''} {bulkModal === 'upgrade' ? 'upgraded' : 'deleted'} successfully.
                  </div>
                </div>
              ) : (
                <>
                  {/* Dept selector */}
                  <select
                    className="preview-dept-select"
                    value={bulkDept}
                    onChange={e => { setBulkDept(e.target.value); setBulkSem('') }}
                    disabled={bulkRunning}
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  {/* Semester selector — only for upgrade, shown after dept is picked */}
                  {bulkModal === 'upgrade' && bulkDept && (
                    <select
                      className="preview-dept-select"
                      value={bulkSem}
                      onChange={e => setBulkSem(e.target.value)}
                      disabled={bulkRunning}
                    >
                      <option value="">Select Semester to Upgrade</option>
                      {SEMESTERS.filter(s => s < FINAL_SEM).map(s => (
                        <option key={s} value={s}>Semester {s} → Semester {s + 1}</option>
                      ))}
                    </select>
                  )}

                  {((bulkModal === 'upgrade' && bulkDept && bulkSem) ||
                    (bulkModal === 'delete'  && bulkDept)) && (
                    <>
                      {/* Count summary */}
                      <div className="preview-count-bar">
                        {bulkModal === 'upgrade' ? (
                          <div className="preview-count preview-count-blue" style={{ flex: 1 }}>
                            <div style={{ fontSize:'1.3rem', fontWeight:800 }}>{upgradePreview.length}</div>
                            <div>Sem {bulkSem} → Sem {Number(bulkSem) + 1}</div>
                          </div>
                        ) : (
                          <div className="preview-count preview-count-red" style={{ flex: 1 }}>
                            <div style={{ fontSize:'1.3rem', fontWeight:800 }}>{deletePreview.length}</div>
                            <div>Will be Deleted</div>
                          </div>
                        )}
                      </div>

                      {/* Progress bar while running */}
                      {bulkRunning && (
                        <div style={{ marginBottom: 14 }}>
                          <div className="bulk-progress-wrap">
                            <div
                              className={`bulk-progress-bar ${bulkModal === 'upgrade' ? 'bulk-progress-bar-blue' : 'bulk-progress-bar-red'}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="bulk-status-text">
                            {bulkModal === 'upgrade' ? 'Upgrading' : 'Deleting'} {bulkProgress} / {bulkTotal}…
                          </div>
                        </div>
                      )}

                      {/* Preview list */}
                      <div className="preview-list-label">
                        {bulkModal === 'upgrade' ? 'Students to upgrade' : `Sem ${FINAL_SEM} students to remove`}
                      </div>

                      {(bulkModal === 'upgrade' ? upgradePreview : deletePreview).length === 0 ? (
                        <div className="preview-empty">
                          {bulkModal === 'upgrade'
                            ? `No students eligible for upgrade in ${bulkDept}`
                            : `No Sem ${FINAL_SEM} students found in ${bulkDept}`}
                        </div>
                      ) : (
                        (bulkModal === 'upgrade' ? upgradePreview : deletePreview).map(u => (
                          <div key={u.uid} className="preview-student-row">
                            <div>
                              <div className="preview-student-name">{u.name}</div>
                              <div className="preview-student-roll">{u.rollNo || '—'}</div>
                            </div>
                            {bulkModal === 'upgrade' ? (
                              <div className="preview-arrow">
                                Sem {u.semester} → Sem {Number(u.semester) + 1}
                              </div>
                            ) : (
                              <span style={{ fontSize:'0.75rem', fontWeight:700, background:'#fef2f2', color:'#dc2626', padding:'3px 10px', borderRadius:99 }}>
                                Sem {u.semester}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="preview-footer">
              {bulkDone ? (
                <button className="preview-cancel-btn" style={{ flex: 1 }} onClick={closeBulkModal}>
                  Close
                </button>
              ) : (
                <>
                  <button className="preview-cancel-btn" onClick={closeBulkModal} disabled={bulkRunning}>
                    Cancel
                  </button>
                  <button
                    className={`preview-confirm-btn ${bulkModal === 'upgrade' ? 'preview-confirm-upgrade' : 'preview-confirm-delete'}`}
                    onClick={bulkModal === 'upgrade' ? confirmUpgrade : confirmDelete}
                    disabled={
                      bulkRunning ||
                      !bulkDept ||
                      (bulkModal === 'upgrade' && !bulkSem) ||
                      (bulkModal === 'upgrade' ? upgradePreview.length === 0 : deletePreview.length === 0)
                    }
                  >
                    {bulkRunning
                      ? `${bulkModal === 'upgrade' ? 'Upgrading' : 'Deleting'}… ${progressPct}%`
                      : bulkModal === 'upgrade'
                        ? `Upgrade ${upgradePreview.length} Students`
                        : `Delete ${deletePreview.length} Students`}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      , document.body)}
    </AppShell>
  )
}