import { useGraphStore, resolveGenreIds } from '../stores/useGraphStore'
import { getArtistGenres } from '../services/lastfm'

const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0'

async function getTagTopArtists(tag) {
  const res = await fetch(
    `${LASTFM_BASE}/?method=tag.gettopartists` +
    `&tag=${encodeURIComponent(tag)}` +
    `&api_key=${LASTFM_KEY}&format=json&limit=20`
  )
  const data = await res.json()
  return data.topartists?.artist ?? []
}

async function getTagTopTracks(tag) {
  const res = await fetch(
    `${LASTFM_BASE}/?method=tag.gettoptracks` +
    `&tag=${encodeURIComponent(tag)}` +
    `&api_key=${LASTFM_KEY}&format=json&limit=20`
  )
  const data = await res.json()
  return data.tracks?.track ?? []
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export async function loadRecommendations() {
  const { nodes, genres } = useGraphStore.getState()
  const addedArtists = nodes.filter(n => n.type === 'artist' && n.added)

  if (!addedArtists.length) return

  // 추가된 아티스트들의 상위 장르 수집
  const tagSet = new Set()
  addedArtists.forEach(ar => {
    ar.gids?.slice(0, 2).forEach(gid => {
      const name = genres.find(g => g.id === gid)?.name
      if (name && name !== '장르 미상') tagSet.add(name)
    })
  })

  if (!tagSet.size) return

  const tags = [...tagSet].slice(0, 3)
  const { nodes: cur } = useGraphStore.getState()

  const recArtistMap = new Map()
  const recTrackMap  = new Map()

  await Promise.all(
    tags.map(async tag => {
      try {
        const [artists, tracks] = await Promise.all([
          getTagTopArtists(tag),
          getTagTopTracks(tag),
        ])

        // 랜덤 셔플 후 추출
        shuffle(artists).forEach(a => {
          if (recArtistMap.size >= 5) return
          if (!a.name) return
          const alreadyInCanvas = cur.find(
            n => n.name?.toLowerCase() === a.name?.toLowerCase()
          )
          if (!alreadyInCanvas && !recArtistMap.has(a.name)) {
            recArtistMap.set(a.name, a)
          }
        })

        shuffle(tracks).forEach(t => {
          if (recTrackMap.size >= 4) return
          if (!t.name || !t.artist?.name) return
          const alreadyInCanvas = cur.find(n => n.name === t.name)
          if (!alreadyInCanvas && !recTrackMap.has(t.name)) {
            recTrackMap.set(t.name, { track: t, tag })
          }
        })
      } catch (e) {
        console.error('[추천] Last.fm 실패:', tag, e.message)
      }
    })
  )

  if (!recArtistMap.size && !recTrackMap.size) return

  const { nodes: currentNodes, links: currentLinks } =
    useGraphStore.getState()

  const nonRec = currentNodes.filter(n => !n.isRecommendation)
  const oldRecIds = new Set(
    currentNodes.filter(n => n.isRecommendation).map(n => n.id)
  )

  // 아티스트 추천 노드
  const newArtistRecs = await Promise.all(
    [...recArtistMap.values()].map(async a => {
      const g = await getArtistGenres(a.name)
      const gids = g.length ? resolveGenreIds(g) : ['g_unknown']
      return {
        id:               `rec_artist_${a.name.replace(/\s/g, '_')}`,
        type:             'artist',
        name:             a.name,
        gids,
        imageUrl:         a.image?.find(i => i.size === 'large')?.['#text'] ?? '',
        previewUrl:       null,
        added:            false,
        isRecommendation: true,
      }
    })
  )

  // 트랙 추천 노드
  const newTrackRecs = [...recTrackMap.values()].map(
    ({ track: t, tag }) => {
      const parentGid = genres.find(
        g => g.name.toLowerCase() === tag.toLowerCase()
      )?.id ?? 'g_unknown'
      return {
        id:               `rec_track_${t.name.replace(/\s/g, '_')}`,
        type:             'track',
        name:             t.name,
        artistId:         `rec_artist_${t.artist?.name?.replace(/\s/g, '_')}`,
        artistName:       t.artist?.name ?? '',
        gids:             [parentGid],
        imageUrl:         t.image?.find(i => i.size === 'large')?.['#text'] ?? '',
        previewUrl:       null,
        added:            false,
        isRecommendation: true,
      }
    }
  )

  useGraphStore.setState({
    nodes: [...nonRec, ...newArtistRecs, ...newTrackRecs],
    links: currentLinks.filter(
      l => !oldRecIds.has(l.source) && !oldRecIds.has(l.target)
    ),
  })
  console.log('[추천] 완료 — 아티스트:', newArtistRecs.length,
    '트랙:', newTrackRecs.length)
}