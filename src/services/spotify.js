import axios from 'axios'

const BASE = 'https://api.spotify.com/v1'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('spotify_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const searchSpotify = (query) =>
  api.get('/search', { params: { q: query, type: 'artist,track', limit: 20 } })

export const getArtist = (id) => api.get(`/artists/${id}`)

export const getRelatedArtists = (id) => api.get(`/artists/${id}/related-artists`)

export const getMyTopTracks = () =>
  api.get('/me/top/tracks', { params: { limit: 20 } })

export const getMyTopArtists = () =>
  api.get('/me/top/artists', { params: { limit: 20 } })

export const createPlaylist = (userId, name) =>
  api.post(`/users/${userId}/playlists`, { name, public: false })

export const addTracksToPlaylist = (playlistId, uris) =>
  api.post(`/playlists/${playlistId}/tracks`, { uris })

export const buildAuthUrl = () => {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI
  const scopes = [
    'user-top-read',
    'playlist-modify-private',
    'streaming',
    'user-read-email',
    'user-read-private',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: scopes,
  })
  return `https://accounts.spotify.com/authorize?${params}`
}
