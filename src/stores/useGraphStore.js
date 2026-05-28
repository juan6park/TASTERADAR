import { create } from 'zustand'

// ─── Genre color palette ──────────────────────────────────────────────────────
export const GENRE_COLORS = [
  '#534AB7', '#0F6E56', '#993C1D', '#993556', '#185FA5', '#3B6D11',
  '#7B4312', '#1A6B7C', '#5E2D79', '#1C5E7E', '#8B4513', '#2E6B4F',
  '#6B3A2E', '#1E5A6B', '#7A3B5F', '#3B6B2E',
]

// ─── Dummy data (prototype-identical) ────────────────────────────────────────
export const DUMMY_GENRES = [
  { id: 'g0',        name: 'Electronic', color: '#534AB7' },
  { id: 'g1',        name: 'Jazz',       color: '#0F6E56' },
  { id: 'g2',        name: 'Hip-hop',    color: '#993C1D' },
  { id: 'g3',        name: 'Indie Rock', color: '#993556' },
  { id: 'g4',        name: 'R&B / Soul', color: '#185FA5' },
  { id: 'g5',        name: 'Ambient',    color: '#3B6D11' },
  { id: 'g_unknown', name: '장르 미상',  color: '#6B6B6B' },
]

function buildInitialNodes() {
  return []
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
    return {
      nodes: state.nodes.map(n => n.id === id ? { ...n, added: value } : n),
      history: { past, future: [] },
    }
  }),

  addNode: (node) => set((state) => {
    console.log('[GraphStore] addNode:', node.id, node.name, '| gids:', node.gids, '| added:', node.added)
    const existing = state.nodes.find(n => n.id === node.id)
    if (existing) {
      if (existing.added) {
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
    const past = [...state.history.past, snapshot(state)]
    return {
      nodes: [...state.nodes, node],
      history: { past, future: [] },
    }
  }),

  removeNode: (id) => set((state) => {
    const past = [...state.history.past, snapshot(state)]
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
    const merged = [
      ...DUMMY_GENRES,
      ...genres.filter(g => !DUMMY_GENRES.find(d => d.id === g.id)),
    ]
    set({ nodes, links, genres: merged })
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

// ─── Standalone helper ────────────────────────────────────────────────────────
export function resolveGenreIds(genreNames) {
  const { addGenre } = useGraphStore.getState()
  const gids = genreNames.slice(0, 3).map(name => addGenre(name))
  console.log('[resolveGenreIds] input:', genreNames.slice(0, 3), '→ gids:', gids,
    '| 현재 genres:', useGraphStore.getState().genres.map(g => `${g.id}:${g.name}`))
  return gids
}
