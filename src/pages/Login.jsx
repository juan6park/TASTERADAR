import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../services/supabase'

export default function Login() {
  const navigate = useNavigate()
  const signIn   = useAuthStore(s => s.signIn)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [forgot,   setForgot]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await signIn(email, password)
      navigate('/main')
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', background: 'var(--color-bg)' }}>
      <div style={{ width: '100%', maxWidth: 340 }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none', letterSpacing: '-0.3px' }}>
            Taste Radar
          </Link>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            계정에 로그인하세요
          </p>
        </div>

        <div style={{ padding: '24px', borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="이메일" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>비밀번호</label>
                <button type="button" onClick={() => setForgot(true)}
                        style={{ fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  비밀번호 찾기
                </button>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                     placeholder="••••••••" required
                     style={inputStyle}
                     onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            {error && <ErrBox msg={error} />}

            <button type="submit" disabled={loading} style={submitStyle(loading)}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 16 }}>
            계정이 없으신가요?{' '}
            <Link to="/register" style={{ color: 'var(--color-text-secondary)' }}>회원가입</Link>
          </p>
        </div>
      </div>

      {forgot && <ForgotModal onClose={() => setForgot(false)} />}
    </div>
  )
}

function ForgotModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [sent,  setSent]  = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault(); setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true); setLoading(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', background: 'rgba(0,0,0,0.35)', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 300, padding: 20, borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 12 }}>비밀번호 재설정</p>
        {sent ? (
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>으로<br />
            재설정 링크를 보냈습니다.
          </p>
        ) : (
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                   placeholder="가입한 이메일" required style={inputStyle} />
            <button type="submit" disabled={loading} style={submitStyle(loading)}>
              {loading ? '전송 중...' : '링크 보내기'}
            </button>
          </form>
        )}
        <button onClick={onClose} style={{ marginTop: 12, width: '100%', textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          닫기
        </button>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
             placeholder={placeholder} required style={inputStyle}
             onFocus={focusStyle} onBlur={blurStyle} />
    </div>
  )
}

function ErrBox({ msg }) {
  return (
    <p style={{ fontSize: 11, padding: '8px 10px', borderRadius: 6, background: 'rgba(180,40,40,0.08)', color: '#e07070', border: '0.5px solid rgba(180,40,40,0.25)' }}>
      {msg}
    </p>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 5, fontSize: 12,
  outline: 'none', background: 'var(--color-bg)',
  border: '1px solid var(--color-border-secondary)',
  color: 'var(--color-text-primary)', boxSizing: 'border-box',
}
const focusStyle = e => { e.currentTarget.style.borderColor = 'var(--color-text-secondary)' }
const blurStyle  = e => { e.currentTarget.style.borderColor = 'var(--color-border-secondary)' }
const submitStyle = (loading) => ({
  width: '100%', padding: '9px', borderRadius: 5, fontSize: 12, fontWeight: 500,
  color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
  background: loading ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
  border: '1px solid transparent',
})
