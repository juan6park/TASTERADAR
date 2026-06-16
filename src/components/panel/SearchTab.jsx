import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraphStore, resolveGenreIds, shouldLinkByGenre } from '../../stores/useGraphStore'
import { useAuthStore }  from '../../stores/useAuthStore'
import { useAudioStore } from '../../stores/useAudioStore'
import { searchSpotify } from '../../services/spotify'
import { getArtistGenres } from '../../services/lastfm'
import { loadRecommendations } from '../../hooks/useRecommendations'

const TYPE_LABELS = { all: '전체', artist: '아티스트', track: '트랙' }

export default function SearchTab() {
  const navigate         = useNavigate()
  const spotifyConnected = useAuthStore(s => !!s.spotifyToken)

  const [query,   setQuery]   = useState('')
  const [type,    setType]    = useState('all')
  const [results, setResults] = useState({ artists: [], tracks: [] })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const debounceRef        = useRef(null)
  const storeNodes                    = useGraphStore(s => s.nodes)
  const { addNode, addLink, setAdded } = useGraphStore()

  const runSearch = useCallback(async (q, t) => {
    if (!q.trim()) { setResults({ artists: [], tracks: [] }); return }
    setLoading(true); setError(null)
    try {
      const res = await searchSpotify(q, t)
      setResults(res)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(q, type), 350)
  }

  const handleTypeChange = (t) => {
    setType(t)
    clearTimeout(debounceRef.current)
    if (query.trim()) runSearch(query, t)
  }

  const isAdded = (id) => storeNodes.some(n => n.id === id && n.added)

  const linkByGenre = useCallback((id, gids) => {
    const { nodes, genres: storeGenres } = useGraphStore.getState()
    const src = nodes.find(n => n.id === id)
    if (src?.type !== 'artist') return
    nodes.forEach(n => {
      if (n.id === id || !n.added || n.type !== 'artist') return
      if (shouldLink(src, n, storeGenres)) addLink(id, n.id)
    })
  }, [addLink])

  const handleAddArtist = useCallback(async (artist) => {
    const genres = await getArtistGenres(artist.name)
    const gids = genres.length ? resolveGenreIds(genres) : ['g_unknown']

    console.log('=== handleAddArtist ===')
    console.log('추가할 아티스트:', artist.name)
    console.log('genres:', genres)
    console.log('gids:', gids)

    addNode({ id: artist.id, type: 'artist', name: artist.name, gids, imageUrl: artist.imageUrl, previewUrl: null, added: true })

    setTimeout(() => {
      const { nodes: cur, genres: storeGenres } = useGraphStore.getState()
      const newNode = cur.find(n => n.id === artist.id)

      console.log('newNode gids:', newNode?.gids)
      console.log('storeGenres:', storeGenres.map(g => g.id + ':' + g.name))

      const candidates = cur.filter(n => n.type === 'artist' && n.added && n.id !== artist.id)
      console.log('링크 후보 아티스트:', candidates.map(n => n.name + ' ' + JSON.stringify(n.gids)))

      if (!newNode) return
      candidates.forEach(n => {
        const result = shouldLinkByGenre(newNode, n)
        console.log(`shouldLink(${artist.name}, ${n.name}):`, result, '| gids1:', newNode.gids, '| gids2:', n.gids)
        if (result) addLink(artist.id, n.id)
      })
    }, 50)

    if (spotifyConnected) {
      console.log('[handleAddArtist] loadRecommendations 호출 시작')
      loadRecommendations()
        .then(() => console.log('[handleAddArtist] 추천 완료'))
        .catch(e => console.error('[handleAddArtist] 추천 실패:', e))
    }
  }, [addNode, addLink, spotifyConnected])

  const handleAddTrack = useCallback(async (track) => {
    const genres = await getArtistGenres(track.artistName)
    console.log('[Last.fm] track genres:', track.artistName, '→', genres)
    const gids = genres.length ? resolveGenreIds(genres) : ['g_unknown']

    const { nodes } = useGraphStore.getState()
    const parentExists = nodes.find(n => n.id === track.artistId)

    if (!parentExists) {
      addNode({ id: track.artistId, type: 'artist', name: track.artistName, gids, imageUrl: '', previewUrl: null, added: true })
    } else if (!parentExists.added) {
      setAdded(track.artistId, true)
    }

    addNode({ id: track.id, type: 'track', name: track.name, artistId: track.artistId, artistName: track.artistName, gids, imageUrl: track.imageUrl, previewUrl: track.previewUrl, added: true })
  }, [addNode, setAdded])

  const showArtists = type !== 'track'  && results.artists.length > 0
  const showTracks  = type !== 'artist' && results.tracks.length  > 0
  const empty       = !loading && !error && query.trim() && !showArtists && !showTracks

  if (!spotifyConnected) return (
    <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
        검색하려면 Spotify 연동이 필요해요
      </p>
      <button
        onClick={() => navigate('/profile')}
        style={{
          padding: '6px 16px', borderRadius: 20, fontSize: 11,
          background: '#1DB954', color: '#fff', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
        }}
      >
        Spotify 연동하기
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Search input */}
      <div style={{ padding: '10px 12px 0' }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="아티스트 또는 트랙 검색…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 10px', fontSize: 12,
            border: '1px solid var(--color-border)',
            borderRadius: 5, background: 'var(--color-bg)',
            color: 'var(--color-text-primary)', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px 0' }}>
        {Object.entries(TYPE_LABELS).map(([t, label]) => (
          <button key={t} onClick={() => handleTypeChange(t)} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 10,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
            transition: 'all .12s',
            ...(type === t
              ? { background: 'var(--color-text-primary)', color: '#fff', border: '1px solid var(--color-text-primary)' }
              : { background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-secondary)' }
            ),
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', marginTop: 4 }}>
        {error && (
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 24 }}>
            검색 중 오류가 발생했습니다.
          </p>
        )}

        {loading && (
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 24 }}>
            검색 중…
          </p>
        )}

        {empty && (
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 24 }}>
            결과가 없습니다.
          </p>
        )}

        {showArtists && (
          <>
            <SectionLabel>아티스트</SectionLabel>
            {results.artists.map(a => (
              <ResultItem key={a.id} item={a} kind="artist"
                added={isAdded(a.id)} onAdd={() => handleAddArtist(a)} />
            ))}
          </>
        )}

        {showTracks && (
          <>
            <SectionLabel>트랙</SectionLabel>
            {results.tracks.map(t => (
              <ResultItem key={t.id} item={t} kind="track"
                added={isAdded(t.id)} onAdd={() => handleAddTrack(t)}
                previewUrl={t.previewUrl} artistName={t.artistName} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '6px 0 4px' }}>
      {children}
    </p>
  )
}

function ResultItem({ item, kind, added, onAdd, previewUrl, artistName }) {
  const { play, currentTrackId, isPlaying } = useAudioStore()
  const isTrack      = kind === 'track'
  const hasPreview   = isTrack && !!previewUrl
  const trackPlaying = currentTrackId === item.id && isPlaying

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0',
      borderBottom: '1px solid var(--color-border-tertiary)',
    }}>
      {item.imageUrl
        ? <img src={item.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: kind === 'artist' ? '50%' : 3, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 32, height: 32, borderRadius: kind === 'artist' ? '50%' : 3, background: 'var(--color-border)', flexShrink: 0 }} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        {isTrack && (
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.artistName}
          </div>
        )}
      </div>

      {/* 미리듣기 버튼 (트랙만) */}
      {isTrack && (
        <button
          onClick={() => hasPreview && play(item.id, previewUrl, item.name, artistName ?? item.artistName)}
          title={hasPreview ? (trackPlaying ? '일시정지' : '미리듣기') : '미리보기 없음'}
          style={{
            width: 22, height: 22, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: trackPlaying ? 'var(--color-text-primary)' : hasPreview ? 'var(--color-border-secondary)' : 'var(--color-border)',
            color: hasPreview ? '#fff' : 'var(--color-text-tertiary)',
            fontSize: 9, cursor: hasPreview ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {trackPlaying ? '⏸' : '▶'}
        </button>
      )}

      {/* 추가 버튼 */}
      <button
        onClick={() => !added && onAdd()}
        style={{
          padding: '3px 9px', borderRadius: 4, fontSize: 10,
          background: added ? 'transparent' : 'var(--color-text-primary)',
          border: added ? '1px solid var(--color-border)' : '1px solid var(--color-text-primary)',
          color: added ? 'var(--color-muted)' : '#fff',
          cursor: added ? 'not-allowed' : 'pointer', flexShrink: 0, fontFamily: 'inherit',
        }}
      >
        {added ? '추가됨' : '추가'}
      </button>
    </div>
  )
}
