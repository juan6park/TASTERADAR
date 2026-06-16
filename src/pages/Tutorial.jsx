import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

const PREVIEW_NODES = [
  { x: 80,  y: 90,  r: 9, color: '#534AB7', label: 'Four Tet' },
  { x: 148, y: 58,  r: 9, color: '#534AB7', label: 'Aphex Twin' },
  { x: 208, y: 92,  r: 9, color: '#534AB7', label: 'Caribou' },
  { x: 270, y: 68,  r: 9, color: '#0F6E56', label: 'Miles Davis' },
  { x: 240, y: 132, r: 9, color: '#993C1D', label: 'Kendrick' },
  { x: 100, y: 152, r: 5, color: '#534AB7', label: 'Track A' },
  { x: 184, y: 162, r: 5, color: '#993C1D', label: 'Track B' },
]
const PREVIEW_LINKS = [[0, 1], [1, 2], [0, 2], [3, 4]]

export default function Tutorial() {
  const navigate = useNavigate()
  const { spotifyToken, completeTutorial } = useAuthStore()
  const [step,   setStep]   = useState(0)
  const [fading, setFading] = useState(false)

  const goNext = useCallback(() => {
    setFading(true)
    setTimeout(() => { setStep(s => s + 1); setFading(false) }, 180)
  }, [])

  const handleFinish = useCallback(async (toProfile = false) => {
    await completeTutorial()
    navigate(toProfile ? '/profile' : '/main')
  }, [completeTutorial, navigate])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes tr-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(28,26,23,0.22); }
          50%       { box-shadow: 0 0 0 8px rgba(28,26,23,0); }
        }
        @keyframes tr-glow {
          0%, 100% { border-color: var(--color-border); }
          50%       { border-color: rgba(83,74,183,0.5); }
        }
      `}</style>

      {/* Blurred background graph illustration */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        opacity: 0.055, filter: 'blur(3px)', pointerEvents: 'none',
      }}>
        <svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
          <line x1="120" y1="80"  x2="350" y2="120" stroke="#534AB7" strokeWidth="1.5" />
          <line x1="350" y1="120" x2="480" y2="300" stroke="#0F6E56" strokeWidth="1.5" />
          <line x1="200" y1="280" x2="480" y2="300" stroke="#185FA5" strokeWidth="1.5" />
          <line x1="480" y1="300" x2="650" y2="430" stroke="#185FA5" strokeWidth="1.5" />
          <circle cx="120" cy="80"  r="50" fill="#534AB7" />
          <circle cx="350" cy="120" r="64" fill="#0F6E56" />
          <circle cx="600" cy="70"  r="44" fill="#993C1D" />
          <circle cx="200" cy="280" r="54" fill="#185FA5" />
          <circle cx="480" cy="300" r="60" fill="#3B6D11" />
          <circle cx="700" cy="250" r="40" fill="#993556" />
          <circle cx="80"  cy="420" r="48" fill="#0F6E56" />
          <circle cx="380" cy="450" r="44" fill="#534AB7" />
          <circle cx="650" cy="430" r="52" fill="#185FA5" />
        </svg>
      </div>

      {/* Step content */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 400, padding: '0 32px',
        textAlign: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.18s ease',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {step === 0 && <StepWelcome onNext={goNext} />}
        {step === 1 && <StepCanvas  onNext={goNext} />}
        {step === 2 && <StepAddMode onNext={goNext} />}
        {step === 3 && <StepSearch  onNext={goNext} />}
        {step === 4 && <StepDone spotifyConnected={!!spotifyToken} onFinish={handleFinish} />}
      </div>

      {/* Step indicator */}
      <div style={{
        position: 'absolute', bottom: 44,
        display: 'flex', gap: 7, zIndex: 2,
      }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{
            width: i === step ? 18 : 6, height: 6, borderRadius: 3,
            background: i === step ? 'var(--color-text-primary)' : 'var(--color-border)',
            transition: 'all 0.22s ease',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function StepWelcome({ onNext }) {
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
        음악 디깅 아카이브
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', margin: '0 0 14px', lineHeight: 1.1 }}>
        Taste Radar
      </h1>
      <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '0 0 44px' }}>
        당신만의 음악 지형도를<br />만들어보세요
      </p>
      <PrimaryBtn onClick={onNext}>시작하기</PrimaryBtn>
    </>
  )
}

function StepCanvas({ onNext }) {
  return (
    <>
      <div style={{
        background: '#fff', borderRadius: 8,
        border: '1px solid var(--color-border)',
        overflow: 'hidden', width: 300, height: 190,
        marginBottom: 24,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        <svg width={300} height={190} style={{ display: 'block' }}>
          <ellipse cx="115" cy="105" rx="72" ry="58" fill="rgba(83,74,183,0.07)" />
          <ellipse cx="232" cy="88"  rx="56" ry="46" fill="rgba(15,110,86,0.07)" />
          {PREVIEW_LINKS.map(([i, j], k) => (
            <line key={k}
              x1={PREVIEW_NODES[i].x} y1={PREVIEW_NODES[i].y}
              x2={PREVIEW_NODES[j].x} y2={PREVIEW_NODES[j].y}
              stroke={PREVIEW_NODES[i].color} strokeOpacity={0.35} strokeWidth={1} />
          ))}
          {PREVIEW_NODES.map((n, i) => (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={n.r}
                fill={n.color} stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} />
              <text x={n.x + n.r + 4} y={n.y + 4}
                fontSize={n.r > 6 ? 10 : 9}
                fill="#1c1a17" fontWeight={n.r > 6 ? '500' : '400'}>
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '0 0 36px' }}>
        장르별로 색상이 다른 노드들이<br />취향 지형도를 이뤄요
      </p>
      <PrimaryBtn onClick={onNext}>다음</PrimaryBtn>
    </>
  )
}

function StepAddMode({ onNext }) {
  return (
    <>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 8, padding: '18px 20px', marginBottom: 28,
        display: 'flex', gap: 8, justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <span style={{
          padding: '5px 16px', borderRadius: 20, fontSize: 12,
          background: 'var(--color-text-primary)', color: '#fff',
          border: '1px solid var(--color-text-primary)',
          animation: 'tr-pulse 1.8s ease infinite',
          display: 'inline-block',
        }}>
          추가 모드
        </span>
        <span style={{
          padding: '5px 16px', borderRadius: 20, fontSize: 12,
          background: 'transparent', color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border-secondary)',
          display: 'inline-block',
        }}>
          뷰 모드
        </span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '0 0 36px' }}>
        추가 모드에서 아티스트와 트랙을<br />캔버스에 추가할 수 있어요
      </p>
      <PrimaryBtn onClick={onNext}>다음</PrimaryBtn>
    </>
  )
}

function StepSearch({ onNext }) {
  return (
    <>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 8, padding: '16px', marginBottom: 28,
        width: '100%', boxSizing: 'border-box',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <input
          readOnly
          placeholder="아티스트 또는 트랙 검색…"
          style={{
            width: '100%', padding: '8px 12px', fontSize: 12,
            border: '1px solid var(--color-border)', borderRadius: 5,
            background: 'var(--color-bg)', color: 'var(--color-text-tertiary)',
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            animation: 'tr-glow 2s ease infinite',
          }}
        />
      </div>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '0 0 36px' }}>
        Spotify 검색으로 좋아하는<br />아티스트와 트랙을 찾아보세요
      </p>
      <PrimaryBtn onClick={onNext}>다음</PrimaryBtn>
    </>
  )
}

function StepDone({ spotifyConnected, onFinish }) {
  return (
    <>
      <div style={{ fontSize: 40, marginBottom: 20, lineHeight: 1 }}>🎵</div>
      <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>
        이제 시작할 준비가 됐어요!
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '0 0 36px' }}>
        {spotifyConnected
          ? 'Spotify가 연결됐어요. 캔버스에서 바로 시작해보세요.'
          : 'Spotify를 연동하면 아티스트·트랙을 검색할 수 있어요.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {!spotifyConnected && (
          <PrimaryBtn onClick={() => onFinish(true)}>Spotify 연동하기</PrimaryBtn>
        )}
        <SecondaryBtn onClick={() => onFinish(false)}>
          {spotifyConnected ? '캔버스로 이동' : '나중에 연동하기'}
        </SecondaryBtn>
      </div>
    </>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function PrimaryBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '11px', borderRadius: 6,
      fontSize: 13, fontWeight: 500,
      background: 'var(--color-text-primary)', color: '#fff',
      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      letterSpacing: '0.01em',
    }}>
      {children}
    </button>
  )
}

function SecondaryBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '11px', borderRadius: 6, fontSize: 13,
      background: 'transparent', color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border-secondary)',
      cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
    }}>
      {children}
    </button>
  )
}
