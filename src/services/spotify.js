import axios from 'axios'

const CLIENT_ID     = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET
const REDIRECT_URI  = import.meta.env.VITE_SPOTIFY_REDIRECT_URI
const BASE          = 'https://api.spotify.com/v1'
const ACCOUNTS      = 'https://accounts.spotify.com'

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

// ── Client Credentials token (for public/search endpoints) ────
let _ccToken  = null
let _ccExpiry = 0

async function getClientCredentialsToken() {
  if (_ccToken && Date.now() < _ccExpiry - 60_000) return _ccToken
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET),
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`CC token fetch failed: ${res.status}`)
  const data = await res.json()
  _ccToken  = data.access_token
  _ccExpiry = Date.now() + data.expires_in * 1000
  return _ccToken
}

// ── Public GET helper (Client Credentials) ───────────────────
// Uses fetch() — fully isolated from axios and its interceptors.
async function ccGet(path, params = {}) {
  const token = await getClientCredentialsToken()
  console.log('[ccGet] path:', path, '| CC토큰 앞10자:', token?.slice(0, 10))

  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  let res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log('[ccGet] fetch status:', res.status)

  if (res.status === 401) {
    _ccToken = null
    const fresh = await getClientCredentialsToken()
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${fresh}` },
    })
    console.log('[ccGet] retry status:', res.status)
  }

  if (!res.ok) throw new Error(`Spotify API error ${res.status}: ${path}`)
  return res.json()
}

// ── Token provider — injected by useAuthStore to avoid circular import ──
let _getToken  = () => null
let _doRefresh = async () => null

export function setTokenProvider(getter, refresher) {
  _getToken  = getter
  _doRefresh = refresher
}

// ── OAuth API (user-specific endpoints only) ──────────────────
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

// ── Search (with genre inheritance for tracks) ─────────────────
/**
 * @param {string} query
 * @param {'all'|'artist'|'track'} type
 */
export async function searchSpotify(query, type = 'all') {
  const searchType =
    type === 'artist' ? 'artist' :
    type === 'track'  ? 'track'  : 'artist,track'

  const data = await ccGet('/search', { q: query, type: searchType, limit: 10, market: 'KR' })

  const artists = (data.artists?.items ?? []).map(a => ({
    id:       a.id,
    name:     a.name,
    genres:   a.genres ?? [],
    imageUrl: a.images?.[0]?.url ?? '',
  }))

  // Batch-fetch parent artist genres for tracks
  const trackItems = data.tracks?.items ?? []
  const artistGenreMap = {}

  if (trackItems.length) {
    const parentIds = [...new Set(trackItems.map(t => t.artists[0]?.id).filter(Boolean))]
    for (let i = 0; i < parentIds.length; i += 50) {
      const batch = parentIds.slice(i, i + 50)
      console.log('[artists batch] ids:', batch)
      console.log('[artists batch] CC토큰:', _ccToken?.slice(0, 10))
      try {
        const d = await ccGet('/artists', { ids: batch.join(',') })
        d.artists.forEach(a => { artistGenreMap[a.id] = { name: a.name, genres: a.genres ?? [] } })
      } catch (err) {
        console.warn('[artists batch] 실패, 장르 없이 계속:', err.message)
      }
    }
  }

  const tracks = trackItems.map(t => {
    const parentId   = t.artists[0]?.id ?? ''
    const parentInfo = artistGenreMap[parentId] ?? {}
    return {
      id:         t.id,
      name:       t.name,
      artistId:   parentId,
      artistName: parentInfo.name ?? t.artists[0]?.name ?? '',
      genres:     parentInfo.genres ?? [],  // batch 실패 시 빈 배열
      imageUrl:   t.album?.images?.[0]?.url ?? '',
      previewUrl: t.preview_url ?? null,
    }
  })

  return { artists, tracks }
}

// ── Public single resources (Client Credentials) ──────────────
export const getArtist         = (id) => ccGet(`/artists/${id}`)
export const getRelatedArtists = (id) => ccGet(`/artists/${id}/related-artists`).then(d => d.artists ?? [])

// ── User resources (OAuth required) ───────────────────────────
export const getSpotifyUser    = ()   => api.get('/me').then(r => r.data)
export const getMyTopTracks    = ()   => api.get('/me/top/tracks',  { params: { limit: 20 } }).then(r => r.data)
export const getMyTopArtists   = ()   => api.get('/me/top/artists', { params: { limit: 20 } }).then(r => r.data)

// ── Playlist export (OAuth required) ──────────────────────────
export const createPlaylist      = (userId, name)     => api.post(`/users/${userId}/playlists`, { name, public: false }).then(r => r.data)
export const addTracksToPlaylist = (playlistId, uris) => api.post(`/playlists/${playlistId}/tracks`, { uris }).then(r => r.data)
