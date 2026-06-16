import { useMemo } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useGraphStore } from '../../stores/useGraphStore'

export default function AnalysisTab() {
  const nodes  = useGraphStore(s => s.nodes)
  const genres = useGraphStore(s => s.genres)

  const addedArtists = useMemo(
    () => nodes.filter(n => n.type === 'artist' && n.added),
    [nodes]
  )
  const addedTracks = useMemo(
    () => nodes.filter(n => n.type === 'track' && n.added),
    [nodes]
  )

  const artistGenreData = useMemo(() => {
    const map = new Map()
    addedArtists.forEach(n => {
      const gid   = n.gids?.[0] ?? 'g_unknown'
      const genre = genres.find(g => g.id === gid)
      const name  = genre?.name  ?? '장르 미상'
      const color = genre?.color ?? '#6B6B6B'
      map.set(name, { name, color, value: (map.get(name)?.value ?? 0) + 1 })
    })
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [addedArtists, genres])

  const trackGenreData = useMemo(() => {
    const map = new Map()
    addedTracks.forEach(n => {
      const gid   = n.gids?.[0] ?? 'g_unknown'
      const genre = genres.find(g => g.id === gid)
      const name  = genre?.name  ?? '장르 미상'
      const color = genre?.color ?? '#6B6B6B'
      map.set(name, { name, color, value: (map.get(name)?.value ?? 0) + 1 })
    })
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [addedTracks, genres])

  const topGenre = artistGenreData[0]?.name ?? '없음'

  if (!addedArtists.length && !addedTracks.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          아직 추가한 항목이 없어요.
        </p>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', padding: '12px 12px 24px' }}>

      {artistGenreData.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <SectionLabel>아티스트 장르 분포</SectionLabel>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={artistGenreData}
                cx="50%"
                cy="50%"
                outerRadius={75}
                dataKey="value"
                label={({ name, value }) => `${name} ${value}`}
                labelLine={false}
                fontSize={9}
              >
                {artistGenreData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}명`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      )}

      {trackGenreData.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <SectionLabel>트랙 장르 분포</SectionLabel>
          <ResponsiveContainer
            width="100%"
            height={Math.max(trackGenreData.length * 32 + 20, 100)}
          >
            <BarChart
              data={trackGenreData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={70}
                tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              />
              <Tooltip formatter={(value) => [`${value}곡`, '트랙 수']} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {trackGenreData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      <section style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8, padding: '14px 16px',
      }}>
        <div style={{
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          marginBottom: 8,
          letterSpacing: '0.01em',
        }}>
          당신의 상위 장르는
        </div>
        <div style={{
          fontSize: 18, fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: 12,
          letterSpacing: '-0.01em',
        }}>
          {topGenre} 🎵
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}>
          <StatCard label="총 아티스트" value={addedArtists.length} />
          <StatCard label="총 트랙" value={addedTracks.length} />
          <StatCard label="아티스트 1위 장르" value={artistGenreData[0]?.name ?? '-'} small />
          <StatCard label="트랙 1위 장르"     value={trackGenreData[0]?.name  ?? '-'} small />
        </div>
      </section>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 600,
      color: 'var(--color-text-tertiary)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      margin: '0 0 8px',
    }}>
      {children}
    </p>
  )
}

function StatCard({ label, value, small }) {
  return (
    <div style={{
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 6, padding: '8px 10px',
    }}>
      <div style={{
        fontSize: 9,
        color: 'var(--color-text-tertiary)',
        marginBottom: 4,
        letterSpacing: '0.03em',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: small ? 11 : 18,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        letterSpacing: small ? '0.01em' : '-0.01em',
      }}>
        {value}
      </div>
    </div>
  )
}
