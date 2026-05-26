import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { useCanvasPersist } from '../hooks/useCanvasPersist'
import GraphCanvas from '../components/canvas/GraphCanvas'
import SidePanel   from '../components/panel/SidePanel'

export default function Main() {
  const { user, canvasLoaded } = useAuthStore()
  const navigate  = useNavigate()
  useCanvasPersist()
  const [panelOpen, setPanelOpen] = useState(true)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', letterSpacing: '-0.2px' }}>
            Taste Radar
          </span>
          <button
            onClick={() => setPanelOpen(p => !p)}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 5,
              padding: '4px 12px',
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {panelOpen ? '← 닫기' : '검색'}
          </button>
        </div>
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
            fontFamily: 'inherit',
          }}
        >
          프로필
        </button>
      </header>

      {/* Body: side panel + canvas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {panelOpen && <SidePanel />}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {canvasLoaded
            ? <GraphCanvas />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>불러오는 중…</span>
              </div>
          }
        </div>
      </div>
    </div>
  )
}
