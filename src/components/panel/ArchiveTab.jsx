import { useState, useMemo } from 'react'
import { useGraphStore } from '../../stores/useGraphStore'
import { useAuthStore }  from '../../stores/useAuthStore'
import { useAudioStore } from '../../stores/useAudioStore'
import { getSpotifyUser, createPlaylist, addTracksToPlaylist } from '../../services/spotify'

function rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

export default function ArchiveTab() {
  const nodes      = useGraphStore(s => s.nodes)
  const genres     = useGraphStore(s => s.genres)
  const removeNode = useGraphStore(s => s.removeNode)
  const setAdded   = useGraphStore(s => s.setAdded)
  const addedNodes = useMemo(() => nodes.filter(n => n.added), [nodes])

  const handleRemove = (node) => {
    if (node.isRecommendation) setAdded(node.id, false)
    else removeNode(node.id)
  }

  const { spotifyToken, spotifyUser } = useAuthStore()
  const { play, currentTrackId, isPlaying } = useAudioStore()

  const [sort,      setSort]      = useState('name')   // 'name' | 'genre'
  const [exporting, setExporting] = useState(false)
  const [toast,     setToast]     = useState(null)     // { msg, ok }

  const artists = addedNodes.filter(n => n.type === 'artist')
  const tracks  = addedNodes.filter(n => n.type === 'track')

  const getGenreName = (node) => {
    const g = genres.find(g => g.id === node.gids?.[0])
    return g?.name ?? '￿'  // 장르 없는 노드를 맨 뒤로
  }

  const sortFn = sort === 'genre'
    ? (a, b) => getGenreName(a).localeCompare(getGenreName(b)) || a.name.localeCompare(b.name)
    : (a, b) => a.name.localeCompare(b.name)

  const sortedArtists = [...artists].sort(sortFn)
  const sortedTracks  = [...tracks].sort(sortFn)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleExport = async () => {
    if (!spotifyToken) { showToast('Spotify 연동 후 이용 가능해요', false); return }
    if (!tracks.length) return
    setExporting(true)
    try {
      const uid = spotifyUser?.id ?? (await getSpotifyUser()).id
      const pl  = await createPlaylist(uid, 'Taste Radar')
      const uris = tracks.map(t => `spotify:track:${t.id}`)
      await addTracksToPlaylist(pl.id, uris)
      showToast('플레이리스트가 저장됐어요')
    } catch {
      showToast('내보내기에 실패했어요', false)
    } finally {
      setExporting(false)
    }
  }

  if (!addedNodes.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.7, margin: 0 }}>
          아직 추가한 항목이 없어요.<br />
          검색 탭에서 아티스트·트랙을 추가해보세요.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 정렬 토글 */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', flexShrink: 0 }}>
        {[['name', '이름순'], ['genre', '장르순']].map(([v, label]) => (
          <button key={v} onClick={() => setSort(v)} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 10,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
            ...(sort === v
              ? { background: 'var(--color-text-primary)', color: '#fff', border: '1px solid var(--color-text-primary)' }
              : { background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-secondary)' }
            ),
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        {sortedArtists.length > 0 && (
          <>
            <SectionLabel>아티스트 ({sortedArtists.length})</SectionLabel>
            {sortedArtists.map(n => (
              <ArchiveRow
                key={n.id} node={n} genres={genres}
                onRemove={() => handleRemove(n)}
              />
            ))}
          </>
        )}
        {sortedTracks.length > 0 && (
          <>
            <SectionLabel>트랙 ({sortedTracks.length})</SectionLabel>
            {sortedTracks.map(n => (
              <ArchiveRow
                key={n.id} node={n} genres={genres}
                onRemove={() => handleRemove(n)}
                isPlaying={currentTrackId === n.id && isPlaying}
                onPlay={() => play(n.id, n.previewUrl, n.name, n.artistName)}
              />
            ))}
          </>
        )}
      </div>

      {/* Spotify 내보내기 */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
        {toast && (
          <div style={{
            marginBottom: 8, padding: '6px 10px', borderRadius: 4, fontSize: 10,
            background: toast.ok ? 'rgba(29,185,84,0.08)' : 'rgba(200,50,50,0.08)',
            color: toast.ok ? '#0f6e36' : 'rgba(180,40,40,0.9)',
            border: `0.5px solid ${toast.ok ? 'rgba(29,185,84,0.3)' : 'rgba(200,50,50,0.25)'}`,
          }}>
            {toast.msg}
          </div>
        )}
        <button
          onClick={handleExport}
          disabled={!tracks.length || exporting}
          style={{
            width: '100%', padding: '7px', borderRadius: 5, fontSize: 11,
            fontFamily: 'inherit', fontWeight: 500, letterSpacing: '0.01em',
            border: 'none', cursor: !tracks.length || exporting ? 'not-allowed' : 'pointer',
            background: !tracks.length || exporting ? 'var(--color-border)' : '#1DB954',
            color: !tracks.length || exporting ? 'var(--color-text-tertiary)' : '#fff',
            transition: 'background .15s',
          }}
        >
          {exporting ? '저장 중…' : 'Spotify로 내보내기'}
        </button>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 600, color: 'var(--color-text-tertiary)',
      letterSpacing: '0.08em', textTransform: 'uppercase', margin: '8px 0 4px',
    }}>
      {children}
    </p>
  )
}

function ArchiveRow({ node, genres, onRemove, isPlaying, onPlay }) {
  const gc = genres.find(g => g.id === node.gids?.[0])
  const hasPreview = !!node.previewUrl

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '5px 0',
      borderBottom: '1px solid var(--color-border-tertiary)',
    }}>
      {node.imageUrl
        ? <img src={node.imageUrl} alt="" style={{
            width: 28, height: 28, flexShrink: 0, objectFit: 'cover',
            borderRadius: node.type === 'artist' ? '50%' : 3,
          }} />
        : <div style={{
            width: 28, height: 28, flexShrink: 0,
            borderRadius: node.type === 'artist' ? '50%' : 3,
            background: gc ? rgba(gc.color, 0.15) : 'var(--color-border)',
          }} />
      }

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </div>
        {node.type === 'track' && node.artistName && (
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.artistName}
          </div>
        )}
        {gc && (
          <span style={{
            display: 'inline-block', marginTop: 2,
            fontSize: 9, padding: '1px 5px', borderRadius: 2,
            background: rgba(gc.color, 0.1),
            color: gc.color,
            border: `0.5px solid ${rgba(gc.color, 0.22)}`,
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {gc.name}
          </span>
        )}
      </div>

      {/* 재생 버튼 (트랙만) */}
      {node.type === 'track' && (
        <button
          onClick={hasPreview ? onPlay : undefined}
          title={hasPreview ? (isPlaying ? '일시정지' : '미리듣기') : '미리보기 없음'}
          style={{
            width: 22, height: 22, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: isPlaying ? 'var(--color-text-primary)' : hasPreview ? 'var(--color-border-secondary)' : 'var(--color-border)',
            color: hasPreview ? '#fff' : 'var(--color-text-tertiary)',
            fontSize: 9, cursor: hasPreview ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      )}

      {/* 삭제 버튼 */}
      <button
        onClick={onRemove}
        title="삭제"
        style={{
          width: 20, height: 20, borderRadius: 3, border: 'none', flexShrink: 0,
          background: 'transparent', color: 'var(--color-text-tertiary)',
          fontSize: 14, lineHeight: 1, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </div>
  )
}
