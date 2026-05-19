import { create } from 'zustand'

// ─── Dummy data (prototype-identical) ────────────────────────────────────────
export const DUMMY_GENRES = [
  { id: 'g0', name: 'Electronic', color: '#534AB7' },
  { id: 'g1', name: 'Jazz',       color: '#0F6E56' },
  { id: 'g2', name: 'Hip-hop',    color: '#993C1D' },
  { id: 'g3', name: 'Indie Rock', color: '#993556' },
  { id: 'g4', name: 'R&B / Soul', color: '#185FA5' },
  { id: 'g5', name: 'Ambient',    color: '#3B6D11' },
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

const DUMMY_TRACKS = [
  { id: 't0',  name: 'Windowlicker',       artistId: 'a0'  },
  { id: 't1',  name: 'Come to Daddy',      artistId: 'a0'  },
  { id: 't2',  name: 'Kilo',               artistId: 'a1'  },
  { id: 't3',  name: 'Baby',               artistId: 'a1'  },
  { id: 't4',  name: 'LesAlpx',            artistId: 'a2'  },
  { id: 't5',  name: "Can't Do Without",   artistId: 'a3'  },
  { id: 't6',  name: 'So What',            artistId: 'a4'  },
  { id: 't7',  name: 'Blue in Green',      artistId: 'a4'  },
  { id: 't8',  name: 'A Love Supreme',     artistId: 'a5'  },
  { id: 't9',  name: 'Chameleon',          artistId: 'a6'  },
  { id: 't10', name: 'HUMBLE.',            artistId: 'a7'  },
  { id: 't11', name: 'DNA.',               artistId: 'a7'  },
  { id: 't12', name: 'Donuts intro',       artistId: 'a8'  },
  { id: 't13', name: 'Karma Police',       artistId: 'a9'  },
  { id: 't14', name: 'Exit Music',         artistId: 'a9'  },
  { id: 't15', name: 'Wake Up',            artistId: 'a10' },
  { id: 't16', name: 'Nights',             artistId: 'a11' },
  { id: 't17', name: 'Self Control',       artistId: 'a11' },
  { id: 't18', name: 'Music For Airports', artistId: 'a12' },
  { id: 't19', name: 'Roygbiv',            artistId: 'a13' },
]

const DUMMY_LINKS = [
  { source: 'a0', target: 'a1' }, { source: 'a0', target: 'a2' },
  { source: 'a1', target: 'a2' }, { source: 'a1', target: 'a12' },
  { source: 'a1', target: 'a3' }, { source: 'a4', target: 'a5' },
  { source: 'a4', target: 'a6' }, { source: 'a5', target: 'a6' },
  { source: 'a4', target: 'a2' }, { source: 'a7', target: 'a8' },
  { source: 'a7', target: 'a11' }, { source: 'a8', target: 'a11' },
  { source: 'a9', target: 'a10' }, { source: 'a3', target: 'a9' },
  { source: 'a12', target: 'a13' }, { source: 'a12', target: 'a0' },
  { source: 'a6', target: 'a11' },
]

function buildInitialNodes() {
  const artists = DUMMY_ARTISTS.map(a => ({
    ...a, type: 'artist', added: false, imageUrl: '', previewUrl: null,
  }))
  const tracks = DUMMY_TRACKS.map(t => {
    const parent = DUMMY_ARTISTS.find(a => a.id === t.artistId)
    return {
      ...t, type: 'track', added: false, imageUrl: '', previewUrl: null,
      gids: parent?.gids ?? [],
    }
  })
  return [...artists, ...tracks]
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
  links: DUMMY_LINKS,
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
    if (state.nodes.find(n => n.id === node.id)) return state
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

  loadCanvas: (nodes, links, genres) => set({ nodes, links, genres }),
}))
