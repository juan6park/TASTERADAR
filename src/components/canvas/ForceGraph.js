import { forceSimulation, forceCenter, forceCollide } from 'd3-force'

const ARTIST_GENRE_STRENGTH = 0.04  // 0.006 → 0.025 (장르 클러스터링 강화)
const TRACK_ARTIST_STRENGTH = 0.08   // 0.06 → 0.08 (트랙-아티스트 거리 강화)
const REPULSION = 900              // 2000 → 1200 (척력 약화, 뭉침 허용)
const LINK_STRENGTH = 0.012          // 0.008 → 0.012 (연결된 노드 인력 강화)
const TRACK_REPULSION = 200          // 300 → 200
const BORDER_PADDING = 40
const VELOCITY_DECAY = 0.25   // 1 - DAMPING(0.82)

// Genre cluster centers as fractions of (W, H) — matches prototype layout
const GCENTER_FRACS = {
  g0: { cx: 160 / 680, cy: 150 / 460 },
  g1: { cx: 430 / 680, cy: 105 / 460 },
  g2: { cx: 565 / 680, cy: 290 / 460 },
  g3: { cx: 310 / 680, cy: 370 / 460 },
  g4: { cx: 120 / 680, cy: 340 / 460 },
  g5: { cx: 330 / 680, cy: 205 / 460 },
}

export function getGenreCenters(W, H, genres = []) {
  const centers = Object.fromEntries(
    Object.entries(GCENTER_FRACS).map(([id, f]) => [
      id, { cx: f.cx * W, cy: f.cy * H }
    ])
  )
  
  // 동적 장르 — 기존 6개 중심점 사이 빈 공간에 배치
  const extras = genres.filter(g => 
    !GCENTER_FRACS[g.id] && g.id !== 'g_unknown'
  )
  
  const extraPositions = [
    { cx: 0.75, cy: 0.15 }, // 우상단
    { cx: 0.85, cy: 0.50 }, // 우중단
    { cx: 0.20, cy: 0.70 }, // 좌하단
    { cx: 0.50, cy: 0.80 }, // 중하단
    { cx: 0.10, cy: 0.20 }, // 좌상단
    { cx: 0.60, cy: 0.50 }, // 중앙
  ]
  
  extras.forEach((g, i) => {
    const pos = extraPositions[i % extraPositions.length]
    centers[g.id] = {
      cx: pos.cx * W,
      cy: pos.cy * H,
    }
  })
  
  return centers
}

export function initNodePositions(nodes, genreCenters, W, H) {
  nodes.forEach((n, i) => {
    if (n.x !== undefined) return

    let cx = W / 2, cy = H / 2
    const gids = n.gids?.length ? n.gids : []

    if (n.type === 'artist' && gids.length) {
      let sx = 0, sy = 0
      gids.forEach(gid => {
        const c = genreCenters[gid] ?? { cx: W / 2, cy: H / 2 }
        sx += c.cx; sy += c.cy
      })
      cx = sx / gids.length
      cy = sy / gids.length
    }

    const angle  = (Math.PI * 2 * i) / nodes.length + Math.random() * 0.5
    const spread = 60 + Math.random() * 80
    n.x  = cx + Math.cos(angle) * spread
    n.y  = cy + Math.sin(angle) * spread
    n.vx = 0; n.vy = 0
  })
}

export function buildSimulation({ nodes, links, genreCenters, W, H }) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  function genreAttractionForce(alpha) {
    nodes.filter(n => n.type === 'artist').forEach(n => {
      if (!n.gids?.length) return
      
      // 상위 첫 번째 장르만 사용 (g_unknown 제외)
      const primaryGid = n.gids.find(gid => gid !== 'g_unknown')
      if (!primaryGid) return
      
      const c = genreCenters[primaryGid]
      if (!c) return
      
      n.vx += (c.cx - n.x) * ARTIST_GENRE_STRENGTH * alpha
      n.vy += (c.cy - n.y) * ARTIST_GENRE_STRENGTH * alpha
    })
  }

  function trackArtistForce(alpha) {
    nodes.filter(n => n.type === 'track').forEach(t => {
      const parent = nodeMap.get(t.artistId)
      if (!parent) return
      const dx = parent.x - t.x, dy = parent.y - t.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const target = 28
      const force = (dist - target) * TRACK_ARTIST_STRENGTH * alpha
      t.vx      += dx / dist * force
      t.vy      += dy / dist * force
      parent.vx -= dx / dist * force * 0.3
      parent.vy -= dy / dist * force * 0.3
    })
  }

  function artistLinkForce(alpha) {
    links.forEach(({ source, target }) => {
      const sid = typeof source === 'object' ? source.id : source
      const tid = typeof target === 'object' ? target.id : target
      const n1 = nodeMap.get(sid), n2 = nodeMap.get(tid)
      if (!n1 || !n2) return
      const dx = n2.x - n1.x, dy = n2.y - n1.y
      n1.vx += dx * LINK_STRENGTH * alpha; n1.vy += dy * LINK_STRENGTH * alpha
      n2.vx -= dx * LINK_STRENGTH * alpha; n2.vy -= dy * LINK_STRENGTH * alpha
    })
  }

  function repulsionForce() {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist2 = dx * dx + dy * dy || 1
        const dist = Math.sqrt(dist2)
        const isTrack = a.type === 'track' || b.type === 'track'
        const rep = isTrack ? TRACK_REPULSION : REPULSION
        const minD = isTrack ? 20 : 35
        if (dist < minD * 2) {
          const f = rep / dist2
          a.vx -= dx / dist * f; a.vy -= dy / dist * f
          b.vx += dx / dist * f; b.vy += dy / dist * f
        }
      }
    }
  }

  function borderForce() {
    nodes.forEach(n => {
      if (n.x < BORDER_PADDING)     n.vx += (BORDER_PADDING - n.x) * 0.08
      if (n.x > W - BORDER_PADDING) n.vx -= (n.x - (W - BORDER_PADDING)) * 0.08
      if (n.y < BORDER_PADDING)     n.vy += (BORDER_PADDING - n.y) * 0.08
      if (n.y > H - BORDER_PADDING) n.vy -= (n.y - (H - BORDER_PADDING)) * 0.08
    })
  }

  return forceSimulation(nodes)
    .velocityDecay(VELOCITY_DECAY)
    .alphaDecay(0.02)
    .alphaMin(0.001)
    .force('genre-attract', genreAttractionForce)
    .force('track-attract', trackArtistForce)
    .force('links',         artistLinkForce)
    .force('repulsion',     repulsionForce)
    .force('collide',       forceCollide(n => n.type === 'artist' ? 45 : 25).strength(0.8))
    .force('center',        forceCenter(W / 2, H / 2).strength(0.03))
    .force('border',        borderForce)
}
