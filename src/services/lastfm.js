const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY
const BASE = 'https://ws.audioscrobbler.com/2.0'

const BLACKLIST = [
  'seen live', 'favorites', 'favourite',
  'american', 'british', 'korean', 'japanese',
  'canadian', 'australian', 'swedish',
  'male vocalists', 'female vocalists',
  'singer-songwriter', 'bts', 'kpop', 'k pop',
  'pop', 'rap', 'rnb', 'r&b',
]

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

    const filtered = tags
      .map(t => t.name.toLowerCase().trim())
      .filter(t => t !== artistLower)
      .filter(t => t.length > 2)
      .filter(t => !BLACKLIST.includes(t))
      .map(t => {
        if (['kpop', 'k pop', 'korean pop', 'korean music'].includes(t)) return 'k-pop'
        if (['hiphop', 'hip hop', 'rap'].includes(t)) return 'hip-hop'
        if (['rnb', 'r and b', 'rhythm and blues'].includes(t)) return 'r&b'
        if (['electronica', 'electronic music'].includes(t)) return 'electronic'
        if (['indie'].includes(t)) return 'indie rock'
        return t
      })

    return [...new Set(filtered)].slice(0, 3)
  } catch {
    return []
  }
}