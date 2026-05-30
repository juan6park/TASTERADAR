const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY
const BASE = 'https://ws.audioscrobbler.com/2.0'

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
    return tags.slice(0, 3).map(t => t.name)
  } catch {
    return []
  }
}
