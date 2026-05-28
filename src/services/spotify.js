import axios from 'axios'

const CLIENT_ID    = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI
const BASE         = 'https://api.spotify.com/v1'
const ACCOUNTS     = 'https://accounts.spotify.com'

// ── PKCE helpers ──────────────────────────────────────────────
function toBase64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function generateCodeVerifier() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(64)))
}

export async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return toBase64Url(digest)
}

// ── Auth URL ──────────────────────────────────────────────────
export async function getAuthUrl() {
  const verifier  = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('spotify_pkce_verifier', verifier)

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    response_type:         'code',
    redirect_uri:          REDIRECT_URI,
    scope:                 [
      'user-read-private',
      'user-top-read',
      'playlist-modify-public',
      'playlist-modify-private',
      'streaming',
    ].join(' '),
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  })
  return `${ACCOUNTS}/authorize?${params}`
}

// ── Token exchange ─────────────────────────────────────────────
export async function exchangeToken(code) {
  const verifier = sessionStorage.getItem('spotify_pkce_verifier')
  if (!verifier) throw new Error('PKCE verifier not found')

  const { data } = await axios.post(
    `${ACCOUNTS}/api/token`,
    new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     CLIENT_ID,
      code_verifier: verifier,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  sessionStorage.removeItem('spotify_pkce_verifier')
  return data  // { access_token, refresh_token, expires_in }
}

// ── Token refresh ──────────────────────────────────────────────
export async function refreshAccessToken(refreshToken) {
  const { data } = await axios.post(
    `${ACCOUNTS}/api/token`,
    new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return data  // { access_token, expires_in, refresh_token? }
}

// ── Token provider — injected by useAuthStore to avoid circular import ──
let _getToken  = () => null
let _doRefresh = async () => null

export function setTokenProvider(getter, refresher) {
  _getToken  = getter
  _doRefresh = refresher
}

// ── OAuth API (모든 엔드포인트) ────────────────────────────────
const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(async (config) => {
  const token = await _getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true
      const token = await _doRefresh()
      if (token) {
        err.config.headers.Authorization = `Bearer ${token}`
        return api(err.config)
      }
    }
    return Promise.reject(err)
  }
)

// ── Search ─────────────────────────────────────────────────────
/**
 * @param {string} query
 * @param {'all'|'artist'|'track'} type
 */
export async function searchSpotify(query, type = 'all') {
  const searchType =
    type === 'artist' ? 'artist' :
    type === 'track'  ? 'track'  : 'artist,track'

  const { data } = await api.get('/search', {
    params: { q: query, type: searchType, limit: 10, market: 'KR' },
  })

  const artists = (data.artists?.items ?? []).map(a => ({
    id:       a.id,
    name:     a.name,
    genres:   a.genres ?? [],
    imageUrl: a.images?.[0]?.url ?? '',
  }))

  const trackItems = data.tracks?.items ?? []
  const artistGenreMap = {}

  if (trackItems.length) {
    const parentIds = [...new Set(trackItems.map(t => t.artists[0]?.id).filter(Boolean))]
    await Promise.all(
      parentIds.map(id =>
        api.get(`/artists/${id}`)
          .then(r => { artistGenreMap[id] = { name: r.data.name, genres: r.data.genres ?? [] } })
          .catch(() => {})
      )
    )
  }

  const tracks = trackItems.map(t => {
    const parentId   = t.artists[0]?.id ?? ''
    const parentInfo = artistGenreMap[parentId] ?? {}
    return {
      id:         t.id,
      name:       t.name,
      artistId:   parentId,
      artistName: parentInfo.name ?? t.artists[0]?.name ?? '',
      genres:     parentInfo.genres ?? [],
      imageUrl:   t.album?.images?.[0]?.url ?? '',
      previewUrl: t.preview_url ?? null,
    }
  })

  return { artists, tracks }
}

// ── Single resources ───────────────────────────────────────────
export const getArtist         = (id) => api.get(`/artists/${id}`).then(r => r.data)
export const getRelatedArtists = (id) => api.get(`/artists/${id}/related-artists`).then(r => r.data.artists ?? [])

// ── User resources ─────────────────────────────────────────────
export const getSpotifyUser    = ()   => api.get('/me').then(r => r.data)
export const getMyTopTracks    = ()   => api.get('/me/top/tracks',  { params: { limit: 20 } }).then(r => r.data)
export const getMyTopArtists   = ()   => api.get('/me/top/artists', { params: { limit: 20 } }).then(r => r.data)

// ── Playlist export ────────────────────────────────────────────
export const createPlaylist      = (userId, name)     => api.post(`/users/${userId}/playlists`, { name, public: false }).then(r => r.data)
export const addTracksToPlaylist = (playlistId, uris) => api.post(`/playlists/${playlistId}/tracks`, { uris }).then(r => r.data)
