import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'center',
      background: 'var(--color-bg)',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Golden record — static image as non-interactive background subtexture */}
      <img
        src="/golden-record.png"
        aria-hidden="true"
        alt=""
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(88vw, 640px)',
          height: 'auto',
          opacity: 0.10,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      />

      {/* Hero copy anchored to the bottom */}
      <div style={{
        textAlign: 'center',
        padding: '0 24px 52px',
        width: '100%',
        maxWidth: 480,
        position: 'relative',
        zIndex: 1,
      }}>
        <h1 style={{
          fontSize: 42, fontWeight: 700, letterSpacing: '-1.2px',
          margin: '0 0 10px', color: 'var(--color-text-primary)', lineHeight: 1.1,
        }}>
          Taste Radar
        </h1>
        <p style={{
          fontSize: 13, color: 'var(--color-text-secondary)',
          lineHeight: 1.65, margin: '0 auto 24px', maxWidth: 360,
        }}>
          아티스트와 트랙을 Force-Directed 그래프로 탐색하고<br />
          나만의 취향 지형도를 만들어보세요.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link to="/register" style={{
            padding: '8px 22px', borderRadius: 5, fontSize: 12, fontWeight: 500,
            color: '#fff', background: 'var(--color-text-primary)',
            textDecoration: 'none', border: '1px solid var(--color-text-primary)',
          }}>
            시작하기
          </Link>
          <Link to="/login" style={{
            padding: '8px 22px', borderRadius: 5, fontSize: 12,
            color: 'var(--color-text-secondary)', background: 'transparent',
            textDecoration: 'none', border: '1px solid var(--color-border-secondary)',
          }}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
