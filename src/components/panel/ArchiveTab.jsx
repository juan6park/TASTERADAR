import { useGraphStore } from '../../stores/useGraphStore'

export default function ArchiveTab() {
  const added = useGraphStore(s => s.nodes.filter(n => n.added))

  if (!added.length) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}>
          아직 추가된 항목이 없어요.<br />
          검색 탭에서 아티스트·트랙을 추가해보세요.
        </p>
      </div>
    )
  }

  const artists = added.filter(n => n.type === 'artist')
  const tracks  = added.filter(n => n.type === 'track')

  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: '8px 12px' }}>
      {artists.length > 0 && (
        <>
          <SectionLabel>아티스트 ({artists.length})</SectionLabel>
          {artists.map(n => <ArchiveRow key={n.id} node={n} />)}
        </>
      )}
      {tracks.length > 0 && (
        <>
          <SectionLabel>트랙 ({tracks.length})</SectionLabel>
          {tracks.map(n => <ArchiveRow key={n.id} node={n} />)}
        </>
      )}
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

function ArchiveRow({ node }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0',
      borderBottom: '1px solid var(--color-border-tertiary)',
    }}>
      {node.imageUrl
        ? <img src={node.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: node.type === 'artist' ? '50%' : 3, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 28, height: 28, borderRadius: node.type === 'artist' ? '50%' : 3, background: 'var(--color-border)', flexShrink: 0 }} />
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
      </div>
    </div>
  )
}
