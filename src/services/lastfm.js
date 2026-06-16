const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY
const BASE = 'https://ws.audioscrobbler.com/2.0'

const BLACKLIST = new Set([
  // 활동 관련
  'seen live', 'favorites', 'favourite', 'favorites on lastfm',
  // 국적/지역
  'american', 'british', 'korean', 'japanese', 'canadian',
  'australian', 'swedish', 'german', 'french', 'norwegian',
  'danish', 'finnish', 'irish', 'scottish', 'english',
  'united states', 'uk', 'north carolina', 'atlanta', 'pittsburgh',
  'west coast', 'compton', 'bay area',
  // 성별/인구통계
  'male vocalists', 'female vocalists', 'vocals',
  // 아티스트명 태그
  'travis scott', 'jason derulo', 'canada',
  // 장르 중복/이상 태그
  'pop', 'rap', 'rnb', 'r&b', 'bts', 'kpop', 'k pop',
  'Kpop', 'Korean', 'khh', 'korean hip-hop',
  'singer-songwriter', 'composers',
  'black metal', 'dubstep', 'motown', 'crunk', 'swag',
  'g-funk', 'gangsta rap', 'west coast rap', 'soft rock',
  'hipster rap', 'neo-soul', 'dirty south', 'southern rap',
  'underground hip-hop', 'alternative rnb', 'cloud rap',
  'trap', 'reggaeton', 'latin', 'funk', 'soul', 'british',
  'alternative', 'prog-rnb', 'ofwgkta', 'house', 'dance',
  'urban', '70s', 'chillout', 'slow jams', 'romantic',
  'martin', 'canadian', 'classical', 'instrumental',
  'japanese', 'r&b', 'male vocalists', 'dubstep',
])

// 허용할 장르 화이트리스트 (이것만 통과)
const WHITELIST = new Set([
  'electronic', 'jazz', 'hip-hop', 'indie rock', 'ambient',
  'k-pop', 'r&b', 'alternative rock', 'lo-fi', 'chillwave',
  'post-rock', 'experimental', 'folk', 'blues', 'metal',
  'punk', 'reggae', 'country', 'classical music', 'opera',
  'psychedelic', 'dream pop', 'shoegaze', 'noise rock',
  'post-punk', 'new wave', 'synthpop', 'idm', 'techno',
  'house music', 'drum and bass', 'trip-hop', 'downtempo',
  'bossa nova', 'afrobeats', 'soul music', 'funk music',
  'gospel', 'emo', 'hardcore', 'indie pop', 'art rock',
  'progressive rock', 'math rock', 'bedroom pop',
])

export async function getArtistGenres(artistName) {
  try {
    const res = await fetch(
      `${BASE}/?method=artist.getinfo` +
      `&artist=${encodeURIComponent(artistName)}` +
      `&api_key=${LASTFM_KEY}&format=json`
    )
    const data = await res.json()
    const tags = data.artist?.tags?.tag ?? []
    const artistLower = artistName.toLowerCase()

    const normalized = tags
      .map(t => t.name.toLowerCase().trim())
      .filter(t => t !== artistLower)
      .filter(t => t.length > 2)
      .filter(t => !BLACKLIST.has(t))
      .map(t => {
        if (['kpop', 'k pop', 'korean pop', 'korean music'].includes(t)) return 'k-pop'
        if (['hiphop', 'hip hop'].includes(t)) return 'hip-hop'
        if (['r and b', 'rhythm and blues'].includes(t)) return 'r&b'
        if (['electronica', 'electronic music'].includes(t)) return 'electronic'
        if (['indie'].includes(t)) return 'indie rock'
        if (['soul'].includes(t)) return 'soul music'
        if (['funk'].includes(t)) return 'funk music'
        return t
      })
      // 화이트리스트에 있는 것만 통과
      .filter(t => WHITELIST.has(t))

    return [...new Set(normalized)].slice(0, 3)
  } catch {
    return []
  }
}