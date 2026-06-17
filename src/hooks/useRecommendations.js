import { useGraphStore, resolveGenreIds, shouldLinkByGenre } from '../stores/useGraphStore'
import { getArtistGenres } from '../services/lastfm'

const LASTFM_KEY  = import.meta.env.VITE_LASTFM_API_KEY
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0'

let _isLoading = false

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
  if (_isLoading) return
  _isLoading = true

  try {
    const { nodes, genres } = useGraphStore.getState()
    const addedArtists = nodes.filter(
      n => n.type === 'artist' && n.added && !n.isRecommendation
    )
    if (!addedArtists.length) return

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

    for (const tag of tags) {
      try {
        const [artists, tracks] = await Promise.all([
          getTagTopArtists(tag),
          getTagTopTracks(tag),
        ])

        let tagArtistCount = 0
        shuffle(artists).forEach(a => {
          if (recArtistMap.size >= 5) return
          if (tagArtistCount >= 2) return
          if (!a.name) return
          const alreadyInCanvas = cur.find(
            n => n.name?.toLowerCase() === a.name?.toLowerCase()
          )
          if (!alreadyInCanvas && !recArtistMap.has(a.name)) {
            recArtistMap.set(a.name, a)
            tagArtistCount++
          }
        })

        let tagTrackCount = 0
        shuffle(tracks).forEach(t => {
          if (recTrackMap.size >= 4) return
          if (tagTrackCount >= 2) return
          if (!t.name || !t.artist?.name) return
          const alreadyInCanvas = cur.find(n => n.name === t.name)
          if (!alreadyInCanvas && !recTrackMap.has(t.name)) {
            recTrackMap.set(t.name, { track: t, tag })
            tagTrackCount++
          }
        })
      } catch (e) {
        console.error('[추천] Last.fm 실패:', tag, e.message)
      }
    }

    if (!recArtistMap.size && !recTrackMap.size) return

    const { nodes: currentNodes } = useGraphStore.getState()
    const nonRec = currentNodes.filter(n => !n.isRecommendation || n.added)
    const oldRecIds = new Set(
      currentNodes
        .filter(n => n.isRecommendation && !n.id.match(/^a\d+$/))
        .map(n => n.id)
    )

    // 아티스트 추천 노드 생성
    const newArtistRecs = await Promise.all(
      [...recArtistMap.values()].map(async a => {
        const g = await getArtistGenres(a.name)
        const gids = g.length ? resolveGenreIds(g) : ['g_unknown']
        return {
          id:               `rec_artist_${a.name.replace(/\s/g, '_')}`,
          type:             'artist',
          name:             a.name,
          gids,
          imageUrl:         '',
          previewUrl:       null,
          added:            false,
          isRecommendation: true,
        }
      })
    )

    // 트랙 추천 노드 생성
    const newTrackRecs = [...recTrackMap.values()].map(({ track: t, tag }) => {
      const parentGid = genres.find(
        g => g.name.toLowerCase() === tag.toLowerCase()
      )?.id ?? 'g_unknown'

      const artistName = t.artist?.name?.trim()
      if (!artistName) return null

      const matchedArtist = newArtistRecs.find(
        a => a.name.toLowerCase() === artistName.toLowerCase()
      )
      const { nodes: curNodes } = useGraphStore.getState()
      const canvasArtist = curNodes.find(
        n => n.type === 'artist' &&
             n.name.toLowerCase() === artistName.toLowerCase()
      )
      const artistId = matchedArtist?.id ??
        canvasArtist?.id ??
        `rec_artist_${artistName.replace(/\s/g, '_')}`

      return {
        id:               `rec_track_${t.name.replace(/\s/g, '_')}`,
        type:             'track',
        name:             t.name,
        artistId,
        artistName,
        gids:             [parentGid],
        imageUrl:         '',
        previewUrl:       null,
        added:            false,
        isRecommendation: true,
      }
    }).filter(Boolean)

    const allNodes = [...nonRec, ...newArtistRecs, ...newTrackRecs]

    // setState 직전 최신 링크 읽기
    const { links: freshLinks } = useGraphStore.getState()

    // added 노드 사이 링크만 유지
    const baseLinks = freshLinks.filter(l => {
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      const srcNode = allNodes.find(n => n.id === src)
      const tgtNode = allNodes.find(n => n.id === tgt)
      return srcNode?.added && tgtNode?.added
    })

    const newLinks = [...baseLinks]

    // 추천 아티스트 ↔ 추천 아티스트 링크
    for (let i = 0; i < newArtistRecs.length; i++) {
      for (let j = i + 1; j < newArtistRecs.length; j++) {
        if (shouldLinkByGenre(newArtistRecs[i], newArtistRecs[j])) {
          const exists = newLinks.some(
            l => (l.source === newArtistRecs[i].id && l.target === newArtistRecs[j].id) ||
                 (l.source === newArtistRecs[j].id && l.target === newArtistRecs[i].id)
          )
          if (!exists) newLinks.push({
            source: newArtistRecs[i].id,
            target: newArtistRecs[j].id,
          })
        }
      }
    }

    // 추천 아티스트 ↔ 기존 added 아티스트 링크
    const addedArtistNodes = nonRec.filter(n => n.type === 'artist' && n.added)
    newArtistRecs.forEach(rec => {
      addedArtistNodes.forEach(existing => {
        if (shouldLinkByGenre(rec, existing)) {
          const exists = newLinks.some(
            l => (l.source === rec.id && l.target === existing.id) ||
                 (l.source === existing.id && l.target === rec.id)
          )
          if (!exists) newLinks.push({ source: rec.id, target: existing.id })
        }
      })
    })

    console.log('[추천] 완료 — 아티스트:', newArtistRecs.length,
      '트랙:', newTrackRecs.length, 'baseLinks:', baseLinks.length,
      '총 링크:', newLinks.length)

    useGraphStore.setState({
      nodes: allNodes,
      links: newLinks,
    })

  } finally {
    _isLoading = false
  }
}