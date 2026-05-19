import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

export default function Register() {
  const navigate = useNavigate()
  const signUp   = useAuthStore(s => s.signUp)

  const [nickname, setNickname] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다.')
    if (password !== confirm)  return setError('비밀번호가 일치하지 않습니다.')
    setLoading(true)
    try {
      await signUp(email, password, nickname)
      setDone(true)
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center', maxWidth: 300, padding: 28, borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>이메일을 확인해주세요</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.6, marginBottom: 18 }}>
            <strong style={{ color: 'var(--color-text-secondary)' }}>{email}</strong>으로<br />인증 링크를 보냈습니다.
          </p>
          <Link to="/login" style={{
            display: 'inline-block', padding: '8px 20px', borderRadius: 5,
            fontSize: 12, fontWeight: 500, color: '#fff',
            background: 'var(--color-text-primary)', textDecoration: 'none',
          }}>
            로그인하러 가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', background: 'var(--color-bg)' }}>
      <div style={{ width: '100%', maxWidth: 340 }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none', letterSpacing: '-0.3px' }}>
            Taste Radar
          </Link>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            계정을 만들어 시작하세요
          </p>
        </div>

        <div style={{ padding: '24px', borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="닉네임"      type="text"     value={nickname} onChange={setNickname} placeholder="나만의 이름" />
            <Field label="이메일"      type="email"    value={email}    onChange={setEmail}    placeholder="you@example.com" />
            <Field label="비밀번호"    type="password" value={password} onChange={setPassword} placeholder="6자 이상" />
            <Field label="비밀번호 확인" type="password" value={confirm}  onChange={setConfirm}  placeholder="••••••••" />

            {error && <ErrBox msg={error} />}

            <button type="submit" disabled={loading} style={submitStyle(loading)}>
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 16 }}>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" style={{ color: 'var(--color-text-secondary)' }}>로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
             placeholder={placeholder} required
             style={inputStyle}
             onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-text-secondary)' }}
             onBlur={e  => { e.currentTarget.style.borderColor = 'var(--color-border-secondary)' }} />
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

const submitStyle = (loading) => ({
  width: '100%', padding: '9px', borderRadius: 5, fontSize: 12, fontWeight: 500,
  color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
  background: loading ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
  border: '1px solid transparent',
})
