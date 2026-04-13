import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'

export default function Login() {
  const { login, profile } = useAuth()
  const navigate = useNavigate()
  const [userId,   setUserId]   = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!userId.trim() || !password) { setError('Please enter your User ID and password.'); return }
    setLoading(true)
    try {
      await login(userId.trim(), password)
      setTimeout(() => {
        const role = profile?.role
        const map = { student:'/student', cr:'/cr', teacher:'/teacher', admin:'/admin' }
        navigate(map[role] || '/student', { replace: true })
      }, 300)
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
        ? 'Invalid User ID or password.' : 'Something went wrong. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:'var(--font-sans)' }}>

      {/* ══ LEFT PANEL (desktop only) ══ */}
      <div className="auth-left-panel" style={{
        width:'42%', minHeight:'100vh',
        background:'linear-gradient(160deg,#0a1628 0%,#0f2044 55%,#1a3a6e 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'40px 48px', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(37,99,200,0.15)' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:220, height:220, borderRadius:'50%', background:'rgba(200,151,42,0.1)' }} />
        <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          <div style={{ width:120, height:120, borderRadius:'50%', margin:'0 auto 24px', background:'white', border:'2.5px solid rgba(200,151,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.35)' }}>
            <Logo size={88} />
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.75rem', fontWeight:700, color:'#fff', lineHeight:1.25, marginBottom:10 }}>
            Government College of Engineering, Keonjhar
          </h1>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', marginBottom:28 }}>Affiliated to BPUT, Odisha</p>
          <div style={{ display:'inline-block', padding:'7px 18px', borderRadius:99, border:'1.5px solid rgba(200,151,42,0.6)', color:'#f0c96a', fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' }}>CampusDesk Portal</div>
        </div>
      </div>

      {/* ══ RIGHT PANEL (desktop only) ══ */}
      <div className="auth-desktop-right" style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        background:'#f1f5f9', padding:'32px',
      }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 8px 40px rgba(10,22,40,0.12)', padding:'32px 28px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'#0a1628', marginBottom:4, textAlign:'center' }}>Login</h2>
            <p style={{ color:'#94a3b8', fontSize:'0.83rem', textAlign:'center', marginBottom:22 }}>Welcome Back to CampusDesk</p>
            {error && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:8, padding:'10px 14px', fontSize:'0.83rem', fontWeight:500, marginBottom:16 }}>{error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:6, letterSpacing:'0.05em', textTransform:'uppercase' }}>User ID</label>
                <input type="text" placeholder="Enter your User ID" value={userId} onChange={e => setUserId(e.target.value)} autoComplete="username" autoCapitalize="none" className="login-input" />
                <div style={{ fontSize:'0.7rem', color:'#94a3b8', marginTop:4 }}>Students: Roll No | Teachers & Admin: Employee ID</div>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:6, letterSpacing:'0.05em', textTransform:'uppercase' }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="login-input login-input-pass" />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', padding:0 }}>
                    {showPass ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background: loading?'#93c5fd':'linear-gradient(135deg,#2563c8 0%,#1a4a9e 100%)', color:'#fff', fontSize:'0.97rem', fontWeight:700, fontFamily:'var(--font-sans)', cursor: loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: loading?'none':'0 4px 14px rgba(37,99,200,0.35)' }}>
                {loading ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Signing in…</> : 'Sign In →'}
              </button>
            </form>
          </div>
          <p style={{ textAlign:'center', marginTop:14, fontSize:'0.73rem', color:'#94a3b8' }}>Trouble logging in? Contact your department admin.</p>
        </div>
      </div>

      {/* ══ MOBILE LAYOUT ══ */}
      <div className="auth-mobile-layout" style={{
        display:'none', width:'100%', minHeight:'100vh',
        flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'28px 20px', background:'#e8edf5', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(37,99,200,0.06)' }} />
        <div style={{ position:'absolute', bottom:-40, left:-40, width:150, height:150, borderRadius:'50%', background:'rgba(37,99,200,0.04)' }} />

        <div style={{ position:'relative', zIndex:1, textAlign:'center', marginBottom:20 }}>
          <div style={{ width:90, height:90, borderRadius:'50%', background:'white', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'0 8px 24px rgba(10,22,40,0.15)' }}>
            <Logo size={66} />
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.05rem', fontWeight:700, color:'#0a1628', lineHeight:1.3 }}>
            Government College of Engineering, Keonjhar
          </div>
          <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:3 }}>Affiliated to BPUT, Odisha</div>
        </div>

        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:380, background:'#ffffff', borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.12)', padding:'28px 24px' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', color:'#0a1628', marginBottom:4, textAlign:'center' }}>Login</h2>
          <p style={{ color:'#94a3b8', fontSize:'0.82rem', textAlign:'center', marginBottom:20 }}>Enter your credentials to continue</p>
          {error && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:8, padding:'10px 14px', fontSize:'0.83rem', fontWeight:500, marginBottom:16 }}>{error}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:6, letterSpacing:'0.05em', textTransform:'uppercase' }}>User ID</label>
              <input type="text" placeholder="Enter your User ID" value={userId} onChange={e => setUserId(e.target.value)} autoComplete="username" autoCapitalize="none" className="login-input" />
              <div style={{ fontSize:'0.7rem', color:'#94a3b8', marginTop:4 }}>Students: Roll No | Teachers & Admin: Employee ID</div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:6, letterSpacing:'0.05em', textTransform:'uppercase' }}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="login-input login-input-pass" />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', padding:0 }}>
                  {showPass ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background: loading?'#93c5fd':'linear-gradient(135deg,#2563c8 0%,#1a4a9e 100%)', color:'#fff', fontSize:'0.97rem', fontWeight:700, fontFamily:'var(--font-sans)', cursor: loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: loading?'none':'0 4px 14px rgba(37,99,200,0.35)' }}>
              {loading ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Signing in…</> : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ position:'relative', zIndex:1, textAlign:'center', marginTop:14, fontSize:'0.72rem', color:'#94a3b8' }}>
          Trouble logging in? Contact your department admin.
        </p>
      </div>

    </div>
  )
}