import { create } from 'zustand'

// ─── Genre color palette ──────────────────────────────────────────────────────
export const GENRE_COLORS = [
  '#534AB7', '#0F6E56', '#993C1D', '#993556', '#185FA5', '#3B6D11',
  '#7B4312', '#1A6B7C', '#5E2D79', '#1C5E7E', '#8B4513', '#2E6B4F',
  '#6B3A2E', '#1E5A6B', '#7A3B5F', '#3B6B2E',
]

// ─── Dummy data (prototype-identical) ────────────────────────────────────────
export const DUMMY_GENRES = [
  { id: 'g0',        name: 'electronic', color: '#534AB7' },
  { id: 'g1',        name: 'jazz',       color: '#0F6E56' },
  { id: 'g2',        name: 'hip-hop',    color: '#993C1D' },
  { id: 'g3',        name: 'indie rock', color: '#993556' },
  { id: 'g4',        name: 'rnb',        color: '#185FA5' },
  { id: 'g5',        name: 'ambient',    color: '#3B6D11' },
  { id: 'g_unknown', name: '장르 미상',  color: '#6B6B6B' },
]

const DUMMY_ARTISTS = [
  { id: 'a0',  name: 'Aphex Twin',       gids: ['g0']       },
  { id: 'a1',  name: 'Four Tet',         gids: ['g0', 'g5'] },
  { id: 'a2',  name: 'Floating Points',  gids: ['g0', 'g1'] },
  { id: 'a3',  name: 'Caribou',          gids: ['g5', 'g3'] },
  { id: 'a4',  name: 'Miles Davis',      gids: ['g1']       },
  { id: 'a5',  name: 'John Coltrane',    gids: ['g1']       },
  { id: 'a6',  name: 'Herbie Hancock',   gids: ['g1', 'g4'] },
  { id: 'a7',  name: 'Kendrick Lamar',   gids: ['g2']       },
  { id: 'a8',  name: 'J Dilla',          gids: ['g2', 'g4'] },
  { id: 'a9',  name: 'Radiohead',        gids: ['g3']       },
  { id: 'a10', name: 'Arcade Fire',      gids: ['g3']       },
  { id: 'a11', name: 'Frank Ocean',      gids: ['g4', 'g2'] },
  { id: 'a12', name: 'Brian Eno',        gids: ['g5', 'g0'] },
  { id: 'a13', name: 'Boards of Canada', gids: ['g5']       },
]

export function buildInitialNodes() {
  return DUMMY_ARTISTS.map(a => ({
    ...a,
    type:             'artist',
    added:            false,
    isRecommendation: true,
    imageUrl:         '',
    previewUrl:       null,
  }))
}

// ─── Immediate DB save (for destructive actions) ─────────────────────────────
async function _saveNow() {
  try {
    const state = useGraphStore.getState()
    const nodes = enrichNodesWithPositions(state.nodes)
    const { useAuthStore } = await import('./useAuthStore')
    const userId = useAuthStore.getState()?.user?.id
    if (!userId) return
    const { supabase } = await import('../services/supabase')
    await supabase.from('canvas_state').upsert(
      { user_id: userId, nodes, links: state.links, genres: state.genres },
      { onConflict: 'user_id' }
    )
  } catch {}
}

// ─── Simulation position cache (updated by GraphCanvas on sim end) ───────────
const _posCache = new Map()

export function updateSimPositions(simNodes) {
  simNodes.forEach(n => { if (n.x != null) _posCache.set(n.id, { x: n.x, y: n.y }) })
}

export function enrichNodesWithPositions(nodes) {
  return nodes.map(n => {
    const pos = _posCache.get(n.id)
    return pos ? { ...n, x: pos.x, y: pos.y } : n
  })
}

// ─── Snapshot helper ─────────────────────────────────────────────────────────
const snapshot = (state) => ({
  nodes: JSON.parse(JSON.stringify(state.nodes)),
  links: JSON.parse(JSON.stringify(state.links)),
  genres: JSON.parse(JSON.stringify(state.genres)),
})

// ─── Store ───────────────────────────────────────────────────────────────────
export const useGraphStore = create((set) => ({
  mode: 'add',
  nodes: buildInitialNodes(),
  links: [],
  genres: DUMMY_GENRES,
  history: { past: [], future: [] },

  setMode: (mode) => set({ mode }),

  setAdded: (id, value = true) => set((state) => {
    const past = [...state.history.past, snapshot(state)]
    if (!value) setTimeout(_saveNow, 100)
    return {
      nodes: state.nodes.map(n => n.id === id ? { ...n, added: value } : n),
      history: { past, future: [] },
    }
  }),

  addNode: (node) => set((state) => {
    console.log('[GraphStore] addNode:', node.id, node.name, '| gids:', node.gids, '| added:', node.added)

    // 1. id로 먼저 찾기
    const existingById = state.nodes.find(n => n.id === node.id)
    if (existingById) {
      if (existingById.added) {
        console.log('[GraphStore] addNode: 이미 추가됨 → 스킵')
        return state
      }
      console.log('[GraphStore] addNode: 기존 노드 added→true, gids:', node.gids)
      const past = [...state.history.past, snapshot(state)]
      return {
        nodes: state.nodes.map(n => n.id === node.id
          ? { ...n, gids: node.gids?.length ? node.gids : n.gids, added: true }
          : n),
        history: { past, future: [] },
      }
    }

    // 2. 아티스트 이름으로 중복 체크 (더미 id → Spotify id 교체)
    if (node.type === 'artist') {
      const existingByName = state.nodes.find(
        n => n.type === 'artist' &&
             n.name.toLowerCase() === node.name.toLowerCase()
      )
      if (existingByName) {
        console.log('[GraphStore] addNode: 이름 매칭 → 더미 교체', existingByName.id, '→', node.id)
        const oldPos = _posCache.get(existingByName.id)
        if (oldPos) { _posCache.set(node.id, oldPos); _posCache.delete(existingByName.id) }
        const past = [...state.history.past, snapshot(state)]
        return {
          nodes: state.nodes.map(n =>
            n.id === existingByName.id
              ? {
                  ...n,
                  id:               node.id,
                  gids:             node.gids?.length ? node.gids : n.gids,
                  imageUrl:         node.imageUrl || n.imageUrl,
                  added:            true,
                  isRecommendation: false,
                }
              : n
          ),
          links: state.links.map(l => ({
            source: l.source === existingByName.id ? node.id : l.source,
            target: l.target === existingByName.id ? node.id : l.target,
          })),
          history: { past, future: [] },
        }
      }
    }

    // 3. 새 노드 추가
    const past = [...state.history.past, snapshot(state)]
    return {
      nodes: [...state.nodes, node],
      history: { past, future: [] },
    }
  }),

  removeNode: (id) => set((state) => {
    const past = [...state.history.past, snapshot(state)]
    setTimeout(_saveNow, 100)
    return {
      nodes: state.nodes.filter(n => n.id !== id),
      links: state.links.filter(l => l.source !== id && l.target !== id),
      history: { past, future: [] },
    }
  }),

  undo: () => set((state) => {
    const { past, future } = state.history
    if (!past.length) return state
    const prev = past[past.length - 1]
    return { ...prev, history: { past: past.slice(0, -1), future: [snapshot(state), ...future] } }
  }),

  redo: () => set((state) => {
    const { past, future } = state.history
    if (!future.length) return state
    const next = future[0]
    return { ...next, history: { past: [...past, snapshot(state)], future: future.slice(1) } }
  }),

  loadCanvas: (nodes, links, genres) => {
    if (!nodes?.length) return
    const initialNodes = buildInitialNodes()

    const mergedNodes = [
      ...initialNodes.map(dummy => {
        const savedById = nodes.find(n => n.id === dummy.id)
        if (savedById) return savedById
        const savedByName = nodes.find(
          n => n.name?.toLowerCase() === dummy.name?.toLowerCase()
        )
        if (savedByName) return savedByName
        return dummy
      }),
      // 더미에 없는 노드 — added:true인 것만 복원
      // (추천 노드 added:true 포함)
      ...nodes.filter(n => {
        const matchById = initialNodes.find(d => d.id === n.id)
        const matchByName = initialNodes.find(
          d => d.name?.toLowerCase() === n.name?.toLowerCase()
        )
        return !matchById && !matchByName && n.added
      }),
    ]

    const mergedGenres = [
      ...DUMMY_GENRES,
      ...genres.filter(g => !DUMMY_GENRES.find(d => d.id === g.id)),
    ]
    set({ nodes: mergedNodes, links, genres: mergedGenres })
  },

  addGenre: (name) => {
    const state = useGraphStore.getState()
    const existing = state.genres.find(g => g.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing.id
    const numericIds = state.genres
      .map(g => parseInt(g.id.replace('g', ''), 10))
      .filter(n => !isNaN(n))
    const nextId = numericIds.length ? Math.max(...numericIds) + 1 : 0
    const gid = `g${nextId}`
    const color = GENRE_COLORS[state.genres.length % GENRE_COLORS.length]
    useGraphStore.setState({ genres: [...state.genres, { id: gid, name, color }] })
    return gid
  },

  addLink: (source, target) => set((state) => {
    const exists = state.links.some(
      l => (l.source === source && l.target === target) ||
           (l.source === target && l.target === source)
    )
    if (exists) return state
    return { links: [...state.links, { source, target }] }
  }),
}))

// ─── Standalone helpers ───────────────────────────────────────────────────────
export function resolveGenreIds(genreNames) {
  const { addGenre, genres } = useGraphStore.getState()
  return genreNames.slice(0, 3).map(name => {
    const normalized = name.toLowerCase().trim()
    // 기존 장르에서 normalize 비교 후 있으면 재사용, 없으면 신규 추가
    const existing = genres.find(g => g.name.toLowerCase().trim() === normalized)
    if (existing) return existing.id
    return addGenre(normalized)
  })
}

const normalize = s => s.replace(/[\s\-\/]/g, '')

export function shouldLinkByGenre(n1, n2) {
  const { genres } = useGraphStore.getState()
  if (!n1 || !n2) return false
  if (n1.type !== 'artist' || n2.type !== 'artist') return false
  const getNames = (gids) => (gids ?? [])
    .slice(0, 2)
    .map(gid => genres.find(g => g.id === gid)?.name?.toLowerCase().trim())
    .filter(Boolean)
  const norm1 = getNames(n1.gids).map(normalize)
  const norm2 = getNames(n2.gids).map(normalize)
  return norm1.some(n => norm2.includes(n))
}
