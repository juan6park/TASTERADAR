import { useGraphStore, resolveGenreIds } from '../stores/useGraphStore'
import { getRelatedArtists, getArtistTopTracks } from '../services/spotify'
import { getArtistGenres }   from '../services/lastfm'

export async function loadRecommendations() {
  const { nodes } = useGraphStore.getState()
  const addedArtists = nodes.filter(n => n.type === 'artist' && n.added)

  // added 아티스트 없으면 더미 유지, 추천 스킵
  if (!addedArtists.length) return

  // ── 아티스트 추천 (최대 5개) ────────────────────────────────────
  const relatedMap = new Map()
  await Promise.all(
    addedArtists.slice(0, 5).map(async ar => {
      try {
        const related = await getRelatedArtists(ar.id)
        const { nodes: cur } = useGraphStore.getState()
        related.forEach(r => {
          if (!relatedMap.has(r.id) && !cur.find(n => n.id === r.id)) {
            relatedMap.set(r.id, r)
          }
        })
      } catch {}
    })
  )

  const recArtistData = [...relatedMap.values()].slice(0, 5)

  // ── 트랙 추천 (최대 4개) ────────────────────────────────────────
  const recTrackBuffer = []
  await Promise.all(
    addedArtists.slice(0, 3).map(async ar => {
      try {
        const tracks = await getArtistTopTracks(ar.id)
        const { nodes: cur } = useGraphStore.getState()
        tracks.slice(0, 2).forEach(t => {
          if (!recTrackBuffer.find(r => r.id === t.id) &&
              !cur.find(n => n.id === t.id)) {
            recTrackBuffer.push({ track: t, parentAr: ar })
          }
        })
      } catch {}
    })
  )
  const recTrackData = recTrackBuffer.slice(0, 4)

  if (!recArtistData.length && !recTrackData.length) return

  const { nodes: currentNodes, links: currentLinks } = useGraphStore.getState()
  const nonRecommendation = currentNodes.filter(n => !n.isRecommendation)
  const oldRecIds = new Set(
    currentNodes.filter(n => n.isRecommendation).map(n => n.id)
  )

  // 아티스트 추천 노드 생성
  const newArtistRecs = await Promise.all(
    recArtistData.map(async r => {
      const genres = await getArtistGenres(r.name)
      const gids = genres.length ? resolveGenreIds(genres) : ['g_unknown']
      return {
        id:               r.id,
        type:             'artist',
        name:             r.name,
        gids,
        imageUrl:         r.images?.[0]?.url ?? '',
        previewUrl:       null,
        added:            false,
        isRecommendation: true,
      }
    })
  )

  // 트랙 추천 노드 생성 (부모 아티스트 gids 상속)
  const newTrackRecs = recTrackData.map(({ track: t, parentAr }) => ({
    id:               t.id,
    type:             'track',
    name:             t.name,
    artistId:         t.artists[0]?.id ?? '',
    artistName:       t.artists[0]?.name ?? '',
    gids:             parentAr.gids,
    imageUrl:         t.album?.images?.[0]?.url ?? '',
    previewUrl:       t.preview_url ?? null,
    added:            false,
    isRecommendation: true,
  }))

  useGraphStore.setState({
    nodes: [...nonRecommendation, ...newArtistRecs, ...newTrackRecs],
    links: currentLinks.filter(l => !oldRecIds.has(l.source) && !oldRecIds.has(l.target)),
  })
}
