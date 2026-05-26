import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { setTokenProvider, refreshAccessToken } from '../services/spotify'
import { useGraphStore } from './useGraphStore'

export const useAuthStore = create((set, get) => ({
  user:                null,
  loading:             true,
  canvasLoaded:        false,
  spotifyToken:        null,
  spotifyRefreshToken: null,
  tokenExpiry:         null,
  spotifyUser:         null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    set({ user, loading: false })

    if (user) {
      get().loadSpotifyTokenFromDb()
      await get().loadCanvasState()
    }
    set({ canvasLoaded: true })

    setTokenProvider(
      () => get().spotifyToken,
      () => get().refreshSpotifyToken(),
    )

    supabase.auth.onAuthStateChange((_event, session) => {
      const prevUser = get().user
      const newUser  = session?.user ?? null
      set({ user: newUser })
      if (newUser && prevUser?.id !== newUser.id) get().loadSpotifyTokenFromDb()
      if (!newUser) set({ spotifyToken: null, spotifyRefreshToken: null, tokenExpiry: null, spotifyUser: null })
    })
  },

  signUp: async (email, password, nickname) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, nickname, avatar_url: null })
    }
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, spotifyToken: null, spotifyRefreshToken: null, tokenExpiry: null, spotifyUser: null })
  },

  // ── Spotify token management ──────────────────────────────────────────────
  loadSpotifyTokenFromDb: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('spotify_access_token, spotify_refresh_token')
      .eq('id', user.id)
      .maybeSingle()
    if (data?.spotify_access_token) {
      set({
        spotifyToken:        data.spotify_access_token,
        spotifyRefreshToken: data.spotify_refresh_token ?? null,
      })
    }
  },

  saveSpotifyTokensToDb: async (accessToken, refreshToken, expiresIn, spotifyUser) => {
    const { user } = get()
    if (!user) return
    const expiry = Date.now() + expiresIn * 1000
    await supabase.from('profiles').update({
      spotify_access_token:  accessToken,
      spotify_refresh_token: refreshToken,
      spotify_connected_at:  new Date().toISOString(),
    }).eq('id', user.id)
    set({ spotifyToken: accessToken, spotifyRefreshToken: refreshToken, tokenExpiry: expiry, spotifyUser })
  },

  refreshSpotifyToken: async () => {
    const { spotifyRefreshToken } = get()
    if (!spotifyRefreshToken) return null
    try {
      const { access_token, refresh_token, expires_in } = await refreshAccessToken(spotifyRefreshToken)
      const expiry = Date.now() + expires_in * 1000
      const { user } = get()
      if (user) {
        await supabase.from('profiles').update({
          spotify_access_token: access_token,
          ...(refresh_token ? { spotify_refresh_token: refresh_token } : {}),
        }).eq('id', user.id)
      }
      set({
        spotifyToken:  access_token,
        tokenExpiry:   expiry,
        ...(refresh_token ? { spotifyRefreshToken: refresh_token } : {}),
      })
      return access_token
    } catch {
      set({ spotifyToken: null, spotifyRefreshToken: null, tokenExpiry: null })
      return null
    }
  },

  loadCanvasState: async () => {
    const { user } = get()
    if (!user) return
    try {
      const { data } = await supabase
        .from('canvas_state')
        .select('nodes, links, genres')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data?.nodes) {
        const { loadCanvas } = useGraphStore.getState()
        const nodes = data.nodes.map(({ fx, fy, index, vx, vy, ...rest }) => ({ ...rest, vx: 0, vy: 0 }))
        loadCanvas(nodes, data.links ?? [], data.genres ?? [])
      }
    } catch (err) {
      console.warn('[loadCanvasState] 불러오기 실패:', err.message)
    }
  },

  disconnectSpotify: async () => {
    const { user } = get()
    if (user) {
      await supabase.from('profiles').update({
        spotify_access_token:  null,
        spotify_refresh_token: null,
        spotify_connected_at:  null,
      }).eq('id', user.id)
    }
    set({ spotifyToken: null, spotifyRefreshToken: null, tokenExpiry: null, spotifyUser: null })
  },
}))
