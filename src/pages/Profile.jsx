import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../services/supabase'
import { getAuthUrl, getSpotifyUser } from '../services/spotify'

export default function Profile() {
  const navigate = useNavigate()
  const { user, spotifyToken, spotifyUser, disconnectSpotify } = useAuthStore()

  // Spotify
  const [resolvedUser,  setResolvedUser]  = useState(spotifyUser)
  const [connecting,    setConnecting]    = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // 프로필
  const [nickname,      setNickname]      = useState('')
  const [nicknameInput, setNicknameInput] = useState('')
  const [editingNick,   setEditingNick]   = useState(false)
  const [savingNick,    setSavingNick]    = useState(false)
  const [avatarUrl,     setAvatarUrl]     = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  // Spotify 연동 시 resolvedUser 처리
  useEffect(() => {
    if (spotifyUser) { setResolvedUser(spotifyUser); return }
    if (!spotifyToken) return
    getSpotifyUser()
      .then(me => setResolvedUser({ id: me.id, display_name: me.display_name, imageUrl: me.images?.[0]?.url ?? null }))
      .catch(() => {})
  }, [spotifyToken, spotifyUser])

  // 프로필 로드 (nickname, avatar_url)
  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('nickname, avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const nick = data.nickname ?? ''
        setNickname(nick)
        setNicknameInput(nick)
        setAvatarUrl(data.avatar_url ?? null)
      })
  }, [user])

  const handleConnect = async () => {
    setConnecting(true)
    try { window.location.href = await getAuthUrl() }
    catch { setConnecting(false) }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    await disconnectSpotify()
    setResolvedUser(null)
    setDisconnecting(false)
  }

  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim()
    if (!trimmed) return
    setSavingNick(true)
    await supabase.from('profiles').update({ nickname: trimmed }).eq('id', user.id)
    setNickname(trimmed)
    setEditingNick(false)
    setSavingNick(false)
  }

  const handleNicknameKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveNickname()
    if (e.key === 'Escape') { setEditingNick(false); setNicknameInput(nickname) }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const path = `${user.id}/avatar.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(urlWithBust)
    } catch (err) {
      console.error('[Avatar] 업로드 실패:', err.message)
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const isConnected = !!spotifyToken
  const avatarInitial = (nickname || user?.email || '?')[0].toUpperCase()

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

          {/* 계정 */}
          <Section title="계정">
            {/* 아바타 + 닉네임 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              {/* 아바타 */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 600, color: 'var(--color-text-secondary)',
                    }}>
                      {avatarInitial}
                    </div>
                }
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="프로필 이미지 변경"
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--color-text-primary)', color: '#fff',
                    fontSize: 9, border: '1.5px solid var(--color-surface)',
                    cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'inherit',
                  }}
                >
                  {uploadingAvatar ? '…' : '✎'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* 닉네임 편집 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingNick
                  ? <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        value={nicknameInput}
                        onChange={e => setNicknameInput(e.target.value)}
                        onKeyDown={handleNicknameKeyDown}
                        autoFocus
                        maxLength={20}
                        style={{
                          flex: 1, fontSize: 13, padding: '4px 8px',
                          borderRadius: 4, border: '1px solid var(--color-border)',
                          background: 'var(--color-bg)', color: 'var(--color-text-primary)',
                          fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleSaveNickname}
                        disabled={savingNick}
                        style={{
                          fontSize: 10, padding: '4px 9px', borderRadius: 4,
                          background: 'var(--color-text-primary)', color: '#fff',
                          border: 'none', cursor: savingNick ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', flexShrink: 0,
                        }}
                      >
                        {savingNick ? '…' : '저장'}
                      </button>
                      <button
                        onClick={() => { setEditingNick(false); setNicknameInput(nickname) }}
                        style={{
                          fontSize: 10, padding: '4px 9px', borderRadius: 4,
                          background: 'transparent', border: '1px solid var(--color-border)',
                          color: 'var(--color-text-secondary)', cursor: 'pointer',
                          fontFamily: 'inherit', flexShrink: 0,
                        }}
                      >
                        취소
                      </button>
                    </div>
                  : <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {nickname || '닉네임 없음'}
                      </span>
                      <button
                        onClick={() => { setEditingNick(true); setNicknameInput(nickname) }}
                        style={{
                          fontSize: 10, color: 'var(--color-text-tertiary)',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', fontFamily: 'inherit', padding: '0 2px',
                        }}
                      >
                        수정
                      </button>
                    </div>
                }
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                  {user?.email}
                </div>
              </div>
            </div>
          </Section>

          {/* Spotify 연동 */}
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
                  background: 'transparent', border: '1px solid rgba(200,50,50,0.3)',
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

          {/* 로그아웃 */}
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
