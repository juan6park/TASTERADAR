import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { exchangeToken } from '../services/spotify'
import { useAuthStore } from '../stores/useAuthStore'

export default function Callback() {
  const navigate  = useNavigate()
  const called    = useRef(false)
  const { saveSpotifyTokensToDb } = useAuthStore()

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) { navigate('/profile'); return }

    exchangeToken(code)
      .then(async ({ access_token, refresh_token, expires_in }) => {
        const { data: me } = await axios.get('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
        console.log('[Callback] me.id:', me.id)
        console.log('[Callback] me.display_name:', me.display_name)
        await saveSpotifyTokensToDb(access_token, refresh_token, expires_in, {
          id:           me.id,
          display_name: me.display_name,
          imageUrl:     me.images?.[0]?.url ?? null,
        })
        navigate('/profile')
      })
      .catch(() => navigate('/profile'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', flexDirection: 'column', gap: 12,
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
        Spotify 연결 중…
      </span>
      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
        잠시만 기다려주세요.
      </span>
    </div>
  )
}
