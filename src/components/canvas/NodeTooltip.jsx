import { useState, useEffect } from 'react'
import { useAudioStore } from '../../stores/useAudioStore'

function rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

/**
 * @param {{ node, nodeType, x, y, genres, mode,
 *           onAdd, onRemove, onRate, onMouseEnter, onMouseLeave }} props
 */
export default function NodeTooltip({
  node, nodeType, x, y, genres, mode,
  onAdd, onRemove, onRate, onMouseEnter, onMouseLeave,
}) {
  const { play, currentTrackId, isPlaying } = useAudioStore()

  const [hoverStar,     setHoverStar]     = useState(0)
  const [editingReview, setEditingReview] = useState(false)
  const [reviewText,    setReviewText]    = useState(node.review ?? '')

  // 다른 노드로 이동 시 편집 상태 초기화
  useEffect(() => {
    setReviewText(node.review ?? '')
    setEditingReview(false)
    setHoverStar(0)
  }, [node.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const getGenre  = (gid) => genres.find(g => g.id === gid)
  const isArtist  = nodeType === 'artist'
  const typeLabel = isArtist
    ? '아티스트'
    : `트랙 · ${node.artistName || node.parentName || ''}`

  const showRating = mode === 'memo' && node.added
  const showAdd    = !showRating && mode === 'add' && !node.added
  const showRemove = !showRating && node.added && (mode === 'add' || mode === 'view')

  const hasPreview   = !isArtist && !!node.previewUrl
  const trackPlaying = currentTrackId === node.id && isPlaying

  const W_TIP = 190
  const left  = Math.min(x + 12, 680 - W_TIP - 4)
  const top   = Math.max(y - 115, 4)

  const handleStarClick = (star) => {
    const newRating = node.rating === star ? 0 : star
    onRate(node.id, newRating, node.review ?? '')
  }

  const handleReviewSave = () => {
    onRate(node.id, node.rating ?? 0, reviewText)
    setEditingReview(false)
  }

  const handleReviewKeyDown = (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); handleReviewSave() }
    if (e.key === 'Escape') { setEditingReview(false); setReviewText(node.review ?? '') }
  }

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        left, top,
        width: W_TIP,
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 5,
        padding: '9px 11px',
        fontSize: 11,
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      }}
    >
      <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2, fontSize: 12 }}>
        {node.name}
      </div>

      <div style={{ color: 'var(--color-text-secondary)', fontSize: 10, marginBottom: 6, letterSpacing: '0.02em' }}>
        {typeLabel}
      </div>

      <div style={{ marginBottom: (showAdd || showRemove || hasPreview || showRating) ? 7 : 0 }}>
        {(node.gids ?? []).map(gid => {
          const g = getGenre(gid)
          if (!g) return null
          return (
            <span key={gid} style={{
              display: 'inline-block',
              padding: '1px 7px', borderRadius: 3,
              fontSize: 9, marginRight: 3, marginBottom: 3,
              letterSpacing: '0.03em',
              background: rgba(g.color, 0.1),
              color: g.color,
              border: `0.5px solid ${rgba(g.color, 0.25)}`,
            }}>
              {g.name}
            </span>
          )
        })}
      </div>

      {/* 평가 모드 UI */}
      {showRating && (
        <>
          {/* 별점 */}
          <div style={{ display: 'flex', gap: 1, marginBottom: 6 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onMouseEnter={() => setHoverStar(star)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => handleStarClick(star)}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: '1px 2px',
                  fontSize: 16, lineHeight: 1,
                  color: star <= (hoverStar || node.rating || 0)
                    ? '#f5a623'
                    : 'var(--color-border-secondary)',
                }}
              >
                ★
              </button>
            ))}
            {node.rating > 0 && (
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 4, alignSelf: 'center' }}>
                {node.rating}/5
              </span>
            )}
          </div>

          {/* 한줄평 */}
          {editingReview ? (
            <div>
              <input
                autoFocus
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                onKeyDown={handleReviewKeyDown}
                placeholder="한줄평을 남겨보세요…"
                maxLength={60}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '4px 7px', fontSize: 10,
                  border: '1px solid var(--color-border)',
                  borderRadius: 4, outline: 'none',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button
                  onClick={handleReviewSave}
                  style={{
                    flex: 1, padding: '3px 0', fontSize: 9,
                    background: 'var(--color-text-primary)',
                    color: '#fff', border: 'none',
                    borderRadius: 3, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >저장</button>
                <button
                  onClick={() => {
                    setEditingReview(false)
                    setReviewText(node.review ?? '')
                  }}
                  style={{
                    flex: 1, padding: '3px 0', fontSize: 9,
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 3, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >취소</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingReview(true)}
              style={{
                fontSize: 10, padding: '4px 7px',
                borderRadius: 4, cursor: 'text',
                color: node.review
                  ? 'var(--color-text-secondary)'
                  : 'var(--color-text-tertiary)',
                border: '1px solid var(--color-border)',
                minHeight: 24, lineHeight: 1.4,
                background: 'var(--color-bg)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {node.review || '한줄평을 남겨보세요…'}
            </div>
          )}
        </>
      )}

      {/* 미리듣기 버튼 (트랙만, 평가 모드 제외) */}
      {!isArtist && !showRating && (
        <TipBtn
          label={hasPreview
            ? (trackPlaying ? '⏸  일시정지' : '▶  미리듣기')
            : '▶  미리보기 없음'}
          variant="play"
          disabled={!hasPreview}
          onClick={() => hasPreview && play(node.id, node.previewUrl, node.name, node.parentName ?? '')}
          active={trackPlaying}
        />
      )}

      {showAdd && (
        <TipBtn
          label={`+ ${isArtist ? '아티스트' : '트랙'} 추가`}
          variant="add"
          onClick={onAdd}
        />
      )}
      {showRemove && (
        <TipBtn
          label={`− ${isArtist ? '아티스트' : '트랙'} 삭제`}
          variant="remove"
          onClick={onRemove}
        />
      )}
    </div>
  )
}

function TipBtn({ label, variant, onClick, disabled, active }) {
  const isRemove = variant === 'remove'
  const isPlay   = variant === 'play'

  let bg, border, color, cursor
  if (disabled) {
    bg = 'transparent'; border = '1px solid var(--color-border)'; color = 'var(--color-text-tertiary)'; cursor = 'not-allowed'
  } else if (isRemove) {
    bg = 'transparent'; border = '1px solid rgba(200,50,50,0.25)'; color = 'rgba(200,50,50,0.85)'; cursor = 'pointer'
  } else if (isPlay) {
    bg = active ? 'var(--color-text-primary)' : 'transparent'
    border = `1px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border-secondary)'}`
    color = active ? '#fff' : 'var(--color-text-secondary)'
    cursor = 'pointer'
  } else {
    bg = 'var(--color-text-primary)'; border = '1px solid var(--color-text-primary)'; color = '#fff'; cursor = 'pointer'
  }

  return (
    <button
      disabled={disabled}
      style={{
        display: 'block', width: '100%', marginTop: 4,
        padding: '4px 8px', borderRadius: 4,
        background: bg, border, fontSize: 10, textAlign: 'left',
        color, cursor, letterSpacing: '0.01em', fontFamily: 'inherit',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
