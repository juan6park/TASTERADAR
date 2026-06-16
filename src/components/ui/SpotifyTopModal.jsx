import { useState } from 'react'
import { getMyTopArtists, getMyTopTracks } from '../../services/spotify'
import { getArtistGenres } from '../../services/lastfm'
import { useGraphStore, resolveGenreIds, shouldLinkByGenre } from '../../stores/useGraphStore'

export default function SpotifyTopModal({ onClose }) {
  const [loading, setLoading] = useState(false)
  const { addNode, addLink } = useGraphStore()

  const handleImport = async () => {
    setLoading(true)
    try {
      const [ar, tr] = await Promise.all([getMyTopArtists(), getMyTopTracks()])
      const artists  = (ar.items ?? []).slice(0, 5)
      const tracks   = (tr.items  ?? []).slice(0, 5)

      for (const a of artists) {
        const genres = await getArtistGenres(a.name)
        const gids   = genres.length ? resolveGenreIds(genres) : ['g_unknown']
        addNode({
          id: a.id, type: 'artist', name: a.name, gids,
          imageUrl: a.images?.[0]?.url ?? '', previewUrl: null, added: true,
        })
      }

      for (const t of tracks) {
        const artistName = t.artists?.[0]?.name ?? ''
        const artistId   = t.artists?.[0]?.id   ?? ''
        const genres     = await getArtistGenres(artistName)
        const gids       = genres.length ? resolveGenreIds(genres) : ['g_unknown']
        if (artistId && !useGraphStore.getState().nodes.find(n => n.id === artistId)) {
          addNode({ id: artistId, type: 'artist', name: artistName, gids, imageUrl: '', previewUrl: null, added: false })
        }
        addNode({
          id: t.id, type: 'track', name: t.name, artistId, artistName, gids,
          imageUrl: t.album?.images?.[0]?.url ?? '',
          previewUrl: t.preview_url ?? null, added: true,
        })
      }

      setTimeout(() => {
        const { nodes } = useGraphStore.getState()
        const addedArtists = nodes.filter(n => n.type === 'artist' && n.added)
        for (let i = 0; i < addedArtists.length; i++) {
          for (let j = i + 1; j < addedArtists.length; j++) {
            if (shouldLinkByGenre(addedArtists[i], addedArtists[j])) {
              addLink(addedArtists[i].id, addedArtists[j].id)
            }
          }
        }
        onClose()
      }, 50)
    } catch (err) {
      console.error('[SpotifyTop] 가져오기 실패:', err)
      onClose()
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8, padding: '24px 28px', width: 300,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Spotify 취향 데이터로 시작할까요?
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
          최근 자주 들은 아티스트·트랙 5개씩을<br />캔버스에 추가해드려요.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleImport}
            disabled={loading}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 5, fontSize: 12,
              background: loading ? 'var(--color-border)' : 'var(--color-text-primary)',
              color: loading ? 'var(--color-text-tertiary)' : '#fff',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            {loading ? '가져오는 중…' : '가져오기'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 5, fontSize: 12,
              background: 'transparent', border: '1px solid var(--color-border-secondary)',
              color: 'var(--color-text-secondary)',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  )
}
