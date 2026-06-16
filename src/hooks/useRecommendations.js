import { useGraphStore, resolveGenreIds } from '../stores/useGraphStore'
import { searchSpotify } from '../services/spotify'
import { getArtistGenres } from '../services/lastfm'

export async function loadRecommendations() {
  const { nodes, genres } = useGraphStore.getState()
  const addedArtists = nodes.filter(
    n => n.type === 'artist' && n.added && !n.id.match(/^a\d+$/)
  )

  console.log('[추천] added 아티스트 (더미 제외):', addedArtists.map(n => `${n.name}(${n.id})`))

  if (!addedArtists.length) {
    console.log('[추천] added 아티스트 없음 → 스킵')
    return
  }

  const recMap = new Map()
  await Promise.all(
    addedArtists.slice(0, 3).map(async ar => {
      try {
        const genreName = genres.find(g => g.id === ar.gids?.[0])?.name
        if (!genreName) {
          console.log('[추천] 장르 없음 → 스킵:', ar.name)
          return
        }
        console.log('[추천] 장르 검색:', ar.name, '→', genreName)
        const { artists } = await searchSpotify(genreName, 'artist')
        console.log('[추천] 검색 결과:', genreName, '→', artists.length, '개')
        const { nodes: cur } = useGraphStore.getState()
        artists.forEach(a => {
          if (!recMap.has(a.id) && !cur.find(n => n.id === a.id) && a.id !== ar.id) {
            recMap.set(a.id, a)
          }
        })
      } catch (e) {
        console.error('[추천] 검색 실패:', ar.name, e.message)
      }
    })
  )

  console.log('[추천] recMap 크기:', recMap.size)
  const recArtistData = [...recMap.values()].slice(0, 5)
  console.log('[추천] 아티스트 후보:', recArtistData.map(r => r.name))

  if (!recArtistData.length) {
    console.log('[추천] 후보 없음 → 종료')
    return
  }

  const { nodes: currentNodes, links: currentLinks } = useGraphStore.getState()
  const nonRec    = currentNodes.filter(n => !n.isRecommendation)
  const oldRecIds = new Set(currentNodes.filter(n => n.isRecommendation).map(n => n.id))

  const newRecs = await Promise.all(
    recArtistData.map(async r => {
      const artistGenres = await getArtistGenres(r.name)
      const gids = artistGenres.length ? resolveGenreIds(artistGenres) : ['g_unknown']
      return {
        id:               r.id,
        type:             'artist',
        name:             r.name,
        gids,
        imageUrl:         r.imageUrl ?? r.images?.[0]?.url ?? '',
        previewUrl:       null,
        added:            false,
        isRecommendation: true,
      }
    })
  )

  console.log('[추천] setState: 아티스트', newRecs.length, '개')
  useGraphStore.setState({
    nodes: [...nonRec, ...newRecs],
    links: currentLinks.filter(l => !oldRecIds.has(l.source) && !oldRecIds.has(l.target)),
  })
  console.log('[추천] 완료')
}
