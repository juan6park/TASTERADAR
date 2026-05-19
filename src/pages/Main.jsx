import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import GraphCanvas from '../components/canvas/GraphCanvas'

export default function Main() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100svh',
      background: 'var(--color-bg)',
    }}>
      {/* Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 44,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', letterSpacing: '-0.2px' }}>
          Taste Radar
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/profile')}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 5,
              padding: '4px 12px',
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            프로필
          </button>
        </div>
      </header>

      {/* Canvas fills remaining space */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <GraphCanvas />
      </div>
    </div>
  )
}
