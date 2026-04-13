import { useState } from 'react'
import Papa from 'papaparse'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import AppShell from '../../components/AppShell'

export default function ImportCSV() {
  const { user, profile } = useAuth()
  const [rows,     setRows]     = useState([])
  const [fileName, setFileName] = useState('')
  const [status,   setStatus]   = useState([])
  const [running,  setRunning]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [showPassField, setShowPassField] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setDone(false)
    setStatus([])
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data)
        setShowPassField(true)
      },
    })
  }

  const importAll = async () => {
    if (!adminPass) {
      alert('Please enter your admin password to continue.')
      return
    }
    setRunning(true)
    setDone(false)
    const auth = getAuth()
    const adminEmail = user.email
    const newStatus = Array(rows.length).fill('pending')
    setStatus([...newStatus])

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const { name, rollNo, department, semester, role, password } = row

      if (!name || !rollNo || !department || !role || !password) {
        newStatus[i] = 'error: missing fields'
        setStatus([...newStatus])
        continue
      }

      const departments = department.split('|').map(d => d.trim()).filter(Boolean)
      const email = `${rollNo.toLowerCase().trim()}@campusdesk.edu`

      try {
        // Create the new user
        const cred = await createUserWithEmailAndPassword(auth, email, password.trim())
        await setDoc(doc(db, 'users', cred.user.uid), {
          name:        name.trim(),
          rollNo:      rollNo.trim().toUpperCase(),
          department:  departments[0],
          departments: departments,
          semester:    Number(semester) || 1,
          role:        role.trim().toLowerCase(),
          email,
          createdAt:   serverTimestamp(),
        })
        newStatus[i] = 'success'
        setStatus([...newStatus])

        // Immediately sign admin back in
        await signInWithEmailAndPassword(auth, adminEmail, adminPass)

      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          newStatus[i] = 'skipped (already exists)'
        } else {
          newStatus[i] = `error: ${err.message}`
        }
        setStatus([...newStatus])

        // Re-sign in admin even on error
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPass)
        } catch (e) {}
      }
    }
    setRunning(false)
    setDone(true)
  }

  const successCount = status.filter(s => s === 'success').length
  const skipCount    = status.filter(s => s.startsWith('skipped')).length
  const errorCount   = status.filter(s => s.startsWith('error')).length

  return (
    <AppShell title="Import Users (CSV)">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 20, background: 'var(--blue-50)', border: '1px solid var(--blue-100)' }}>
          <div style={{ fontWeight: 700, color: 'var(--blue-800)', marginBottom: 8 }}>📋 CSV Format</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: 'var(--white)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--blue-100)', color: 'var(--gray-700)', lineHeight: 1.8 }}>
            name,rollNo,department,semester,role,password<br />
            Ravi Kumar,2301CSE001,Computer Science & Engineering,3,student,Pass@1234<br />
            Priya Das,2301CSE002,Computer Science & Engineering,3,cr,Pass@5678<br />
            Dr. Mohan,TCH001,Computer Science & Engineering|Civil Engineering,1,teacher,Teacher@123
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--blue-700)', marginTop: 10 }}>
            ⚠️ For teachers with multiple departments, separate with <strong>|</strong><br />
            ⚠️ Passwords must be at least 6 characters<br />
            ⚠️ Role must be: <strong>student</strong>, <strong>cr</strong>, <strong>teacher</strong>, or <strong>admin</strong>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Upload CSV File</div></div>

          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '32px 20px', borderRadius: 'var(--radius)',
            border: '2px dashed var(--gray-300)', cursor: 'pointer',
            background: 'var(--gray-50)', marginBottom: 20,
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue-400)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-300)'}
          >
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--gray-400)" strokeWidth={1.5} style={{ marginBottom: 8 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span style={{ fontWeight: 600, color: 'var(--blue-600)' }}>Click to choose CSV file</span>
            {fileName && <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 4 }}>{fileName}</span>}
            <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>

          {showPassField && rows.length > 0 && !running && !done && (
            <>
              <div className="field">
                <label>Your Admin Password (needed to stay logged in during import)</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                />
              </div>

              <div className="alert alert-warn" style={{ marginBottom: 16 }}>
                {rows.length} users found. Review before importing.
              </div>

              <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
                <table style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Roll No</th>
                      <th>Department(s)</th>
                      <th>Sem</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.name}</td>
                        <td>{r.rollNo}</td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.department?.split('|').join(', ')}
                        </td>
                        <td>{r.semester}</td>
                        <td><span className="badge badge-blue">{r.role}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="btn btn-primary btn-lg" onClick={importAll} disabled={!adminPass}>
                Import {rows.length} Users
              </button>
            </>
          )}

          {running && (
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: 'var(--blue-800)' }}>
                Importing… {status.filter(s => s !== 'pending').length} / {rows.length}
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.85rem' }}>
                    <span>{r.name} ({r.rollNo})</span>
                    <span className={`badge ${
                      status[i] === 'success' ? 'badge-green' :
                      status[i] === 'pending' ? 'badge-gray' :
                      status[i]?.startsWith('skipped') ? 'badge-gold' : 'badge-red'
                    }`}>
                      {status[i] || 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done && (
            <div className="alert alert-success">
              ✅ Import complete — {successCount} created, {skipCount} skipped, {errorCount} errors
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}