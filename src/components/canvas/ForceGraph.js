import { forceSimulation, forceCenter, forceCollide } from 'd3-force'

const ARTIST_GENRE_STRENGTH = 0.006   // 0.012 → 0.006 (클러스터 뭉침 완화)
const TRACK_ARTIST_STRENGTH = 0.06
const REPULSION = 2000                 // 900 → 2000 (척력 강화)
const LINK_STRENGTH = 0.008
const TRACK_REPULSION = 300
const BORDER_PADDING = 40
const VELOCITY_DECAY = 0.18   // 1 - DAMPING(0.82)

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
    Object.entries(GCENTER_FRACS).map(([id, f]) => [id, { cx: f.cx * W, cy: f.cy * H }])
  )
  // Extra genres beyond the predefined 6 get radial positions
  const extras = genres.filter(g => !GCENTER_FRACS[g.id])
  if (extras.length) {
    extras.forEach((g, i) => {
      const angle = (2 * Math.PI * i) / extras.length - Math.PI / 2
      centers[g.id] = {
        cx: W / 2 + Math.cos(angle) * W * 0.32,
        cy: H / 2 + Math.sin(angle) * H * 0.32,
      }
    })
  }
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
      let tx = 0, ty = 0
      n.gids.forEach(gid => {
        const c = genreCenters[gid]
        if (c) { tx += c.cx; ty += c.cy }
      })
      tx /= n.gids.length; ty /= n.gids.length
      n.vx += (tx - n.x) * ARTIST_GENRE_STRENGTH * alpha
      n.vy += (ty - n.y) * ARTIST_GENRE_STRENGTH * alpha
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
