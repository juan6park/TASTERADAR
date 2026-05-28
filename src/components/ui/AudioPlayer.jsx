import { useAudioStore } from '../../stores/useAudioStore'

export default function AudioPlayer() {
  const { currentTrackId, currentTrackName, currentArtistName, isPlaying, pause, resume, stop } = useAudioStore()

  if (!currentTrackId) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 20px', height: 50, flexShrink: 0,
      background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
    }}>
      {/* 트랙 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500,
          color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {currentTrackName}
        </div>
        <div style={{
          fontSize: 10, color: 'var(--color-text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {currentArtistName}
        </div>
      </div>

      {/* 재생/일시정지 */}
      <PlayerBtn onClick={isPlaying ? pause : resume} title={isPlaying ? '일시정지' : '재생'}>
        {isPlaying ? '⏸' : '▶'}
      </PlayerBtn>

      {/* 정지 */}
      <PlayerBtn onClick={stop} title="닫기" muted>✕</PlayerBtn>
    </div>
  )
}

function PlayerBtn({ onClick, title, muted, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: '50%', border: 'none',
        background: muted ? 'transparent' : 'var(--color-text-primary)',
        color: muted ? 'var(--color-text-tertiary)' : '#fff',
        fontSize: muted ? 14 : 11,
        cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}
