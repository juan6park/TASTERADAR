import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore }  from '../stores/useAuthStore'
import { useCanvasPersist } from '../hooks/useCanvasPersist'
import GraphCanvas from '../components/canvas/GraphCanvas'
import SidePanel   from '../components/panel/SidePanel'
import AudioPlayer from '../components/ui/AudioPlayer'

export default function Main() {
  const { user, canvasLoaded, spotifyToken } = useAuthStore()
  const navigate  = useNavigate()
  useCanvasPersist()
  const [panelOpen, setPanelOpen] = useState(true)
  const spotifyConnected = !!spotifyToken

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

      {/* Spotify 미연동 배너 */}
      {!spotifyConnected && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: '7px 20px', background: '#fff3cd',
          borderBottom: '1px solid #ffd666', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: '#856404' }}>
            Spotify 연동 후 아티스트·트랙을 검색할 수 있어요
          </span>
          <button
            onClick={() => navigate('/profile')}
            style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 10,
              background: '#1DB954', color: '#fff', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            연동하기
          </button>
        </div>
      )}

      {/* Body: side panel + canvas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 슬라이딩 사이드패널 */}
        <div style={{
          width: panelOpen ? 280 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
        }}>
          <SidePanel />
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {canvasLoaded
            ? <GraphCanvas />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>불러오는 중…</span>
              </div>
          }
        </div>
      </div>

      {/* 오디오 플레이어 (재생 중일 때만 표시) */}
      <AudioPlayer />
    </div>
  )
}
