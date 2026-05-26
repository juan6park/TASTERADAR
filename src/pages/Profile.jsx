import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { getAuthUrl, getSpotifyUser } from '../services/spotify'

export default function Profile() {
  const navigate = useNavigate()
  const { user, spotifyToken, spotifyUser, disconnectSpotify } = useAuthStore()
  const [resolvedUser, setResolvedUser] = useState(spotifyUser)
  const [connecting,   setConnecting]   = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // If token is loaded from DB but spotifyUser not yet in memory, fetch lazily
  useEffect(() => {
    if (spotifyUser) { setResolvedUser(spotifyUser); return }
    if (!spotifyToken) return
    getSpotifyUser()
      .then(me => setResolvedUser({ id: me.id, display_name: me.display_name, imageUrl: me.images?.[0]?.url ?? null }))
      .catch(() => {})
  }, [spotifyToken, spotifyUser])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const url = await getAuthUrl()
      window.location.href = url
    } catch {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    await disconnectSpotify()
    setResolvedUser(null)
    setDisconnecting(false)
  }

  const isConnected = !!spotifyToken

  return (
    <div style={{ minHeight: '100svh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 44, background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', letterSpacing: '-0.2px' }}>
          Taste Radar
        </span>
        <button onClick={() => navigate('/main')} style={{
          background: 'transparent', border: '1px solid var(--color-border-secondary)',
          borderRadius: 5, padding: '4px 12px', fontSize: 11,
          color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ← 캔버스로
        </button>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Account info */}
          <Section title="계정">
            <Row label="이메일" value={user?.email ?? '—'} />
          </Section>

          {/* Spotify connection */}
          <Section title="Spotify 연동">
            {isConnected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  {resolvedUser?.imageUrl && (
                    <img src={resolvedUser.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {resolvedUser?.display_name ?? '연결됨'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-success)', letterSpacing: '0.01em', marginTop: 1 }}>
                      연결됨
                    </div>
                  </div>
                </div>
                <button onClick={handleDisconnect} disabled={disconnecting} style={{
                  width: '100%', padding: '8px 0', borderRadius: 5, fontSize: 12,
                  background: 'transparent',
                  border: '1px solid rgba(200,50,50,0.3)',
                  color: 'rgba(200,50,50,0.85)', cursor: disconnecting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: disconnecting ? 0.6 : 1,
                }}>
                  {disconnecting ? '해제 중…' : 'Spotify 연동 해제'}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 14px' }}>
                  Spotify 계정을 연결하면 아티스트·트랙을 검색해 캔버스에 추가할 수 있어요.
                </p>
                <button onClick={handleConnect} disabled={connecting} style={{
                  width: '100%', padding: '8px 0', borderRadius: 5, fontSize: 12,
                  background: 'var(--color-text-primary)', color: '#fff',
                  border: '1px solid var(--color-text-primary)',
                  cursor: connecting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: connecting ? 0.7 : 1,
                }}>
                  {connecting ? '연결 중…' : 'Spotify 연결하기'}
                </button>
              </>
            )}
          </Section>

          {/* Sign out */}
          <button
            onClick={async () => { await useAuthStore.getState().signOut(); navigate('/') }}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 5, fontSize: 12,
              background: 'transparent', border: '1px solid var(--color-border-secondary)',
              color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 6, padding: '14px 16px',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
