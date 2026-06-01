const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY
const BASE = 'https://ws.audioscrobbler.com/2.0'

const ALIAS_MAP = {
  'kpop': 'k-pop', 'k pop': 'k-pop', 'korean pop': 'k-pop', 'korean music': 'k-pop',
  'hiphop': 'hip-hop', 'hip hop': 'hip-hop', 'rap': 'hip-hop',
  'rnb': 'r&b', 'r and b': 'r&b', 'rhythm and blues': 'r&b',
  'electronic music': 'electronic', 'electronica': 'electronic',
  'indie': 'indie rock', 'alternative': 'alternative rock',
}

export async function getArtistGenres(artistName) {
  try {
    const res = await fetch(
      `${BASE}/?method=artist.getinfo` +
      `&artist=${encodeURIComponent(artistName)}` +
      `&api_key=${LASTFM_KEY}` +
      `&format=json`
    )
    const data = await res.json()
    const tags = data.artist?.tags?.tag ?? []
    const artistLower = artistName.toLowerCase()

    const filtered = tags
      .map(t => t.name.toLowerCase().trim())
      .filter(t => t !== artistLower)           // 아티스트명 제거
      .filter(t => t.length > 2)               // 2글자 이하 제거
      .map(t => ALIAS_MAP[t] ?? t)             // 유사 태그 통합

    return [...new Set(filtered)].slice(0, 3)  // 중복 제거 후 상위 3개
  } catch {
    return []
  }
}
