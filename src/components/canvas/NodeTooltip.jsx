function rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

/**
 * @param {{ node, nodeType, x, y, genres, mode,
 *           onAdd, onRemove, onMouseEnter, onMouseLeave }} props
 */
export default function NodeTooltip({
  node, nodeType, x, y, genres, mode,
  onAdd, onRemove, onMouseEnter, onMouseLeave,
}) {
  const getGenre  = (gid) => genres.find(g => g.id === gid)
  const isArtist  = nodeType === 'artist'
  const typeLabel = isArtist ? '아티스트' : `트랙 · ${node.parentName ?? ''}`

  const showAdd    = mode === 'add' && !node.added
  const showRemove = node.added && (mode === 'add' || mode === 'view')

  const W_TIP = 180
  const left  = Math.min(x + 12, 680 - W_TIP - 4)
  const top   = Math.max(y - 115, 4)

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

      <div style={{ marginBottom: (showAdd || showRemove) ? 7 : 0 }}>
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

function TipBtn({ label, variant, onClick }) {
  const isRemove = variant === 'remove'
  return (
    <button
      style={{
        display: 'block', width: '100%',
        padding: '4px 8px', borderRadius: 4,
        background: isRemove ? 'transparent' : 'var(--color-text-primary)',
        border: isRemove ? '1px solid rgba(200,50,50,0.25)' : '1px solid var(--color-text-primary)',
        fontSize: 10, textAlign: 'left',
        color: isRemove ? 'rgba(200,50,50,0.85)' : '#fff',
        cursor: 'pointer',
        letterSpacing: '0.01em',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
