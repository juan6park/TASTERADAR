import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { setTokenProvider, refreshAccessToken } from '../services/spotify'
import { loadRecommendations } from '../hooks/useRecommendations'
import { useGraphStore, DUMMY_GENRES } from './useGraphStore'

export const useAuthStore = create((set, get) => ({
  user:                null,
  loading:             true,
  canvasLoaded:        false,
  tutorialCompleted:   null,   // null = 미로드, true/false = 로드됨
  spotifyToken:        null,
  spotifyRefreshToken: null,
  tokenExpiry:         null,
  spotifyUser:         null,

  init: async () => {
    // 토큰 프로바이더를 먼저 등록 (lazy getter — 항상 최신 store 값을 반환)
    setTokenProvider(
      () => get().spotifyToken,
      () => get().refreshSpotifyToken(),
    )

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    set({ user, loading: false })

    if (user) {
      // Spotify 토큰을 먼저 await — canvasLoaded 전에 토큰이 준비되어야 함
      await get().loadSpotifyTokenFromDb()
      await get().loadCanvasState()
      await get().loadTutorialStatus()
      // 저장된 추천 노드가 없을 때만 로드 (새로고침 후 깜빡임 방지)
      const { nodes: canvasNodes } = useGraphStore.getState()
      loadRecommendations().catch(() => {})
    }
    set({ canvasLoaded: true })

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
    // GraphStore 초기화 — 이전 유저 캔버스 제거
    useGraphStore.setState({
      nodes: buildInitialNodes(), // 더미 노드로 리셋
      links: [],
      genres: DUMMY_GENRES,
      history: { past: [], future: [] },
    })
    set({ 
      user: null, 
      spotifyToken: null, 
      spotifyRefreshToken: null, 
      tokenExpiry: null, 
      spotifyUser: null,
      tutorialCompleted: null,
      canvasLoaded: false,
    })
  },

  // ── Spotify token management ──────────────────────────────────────────────
  loadSpotifyTokenFromDb: async () => {
    const { user } = get()
    if (!user) return
    const { data, error: loadErr } = await supabase
      .from('profiles')
      .select('spotify_access_token, spotify_refresh_token, spotify_connected_at')
      .eq('id', user.id)
      .maybeSingle()

    if (loadErr) { console.error('[loadSpotifyTokenFromDb] 조회 오류:', loadErr.message); return }
    if (!data?.spotify_access_token) return

    // 55분 기준 만료 체크 후 자동 갱신
    const connectedAt = data.spotify_connected_at
      ? new Date(data.spotify_connected_at).getTime()
      : 0
    const isExpired = Date.now() - connectedAt > 55 * 60 * 1000

    if (isExpired && data.spotify_refresh_token) {
      try {
        const fresh = await refreshAccessToken(data.spotify_refresh_token)
        await supabase.from('profiles').update({
          spotify_access_token: fresh.access_token,
          spotify_connected_at: new Date().toISOString(),
          ...(fresh.refresh_token ? { spotify_refresh_token: fresh.refresh_token } : {}),
        }).eq('id', user.id)
        set({
          spotifyToken:        fresh.access_token,
          spotifyRefreshToken: fresh.refresh_token ?? data.spotify_refresh_token,
        })
        return
      } catch {
        // refresh 실패 시 기존 토큰으로 시도
      }
    }

    set({
      spotifyToken:        data.spotify_access_token,
      spotifyRefreshToken: data.spotify_refresh_token ?? null,
    })
  },

  saveSpotifyTokensToDb: async (accessToken, refreshToken, expiresIn, spotifyUser) => {
    let { user } = get()
    // Callback 페이지에서 init()보다 먼저 호출될 수 있으므로 세션에서 직접 조회
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession()
      user = session?.user ?? null
      if (user) set({ user, loading: false })
    }
    if (!user) { console.error('[saveSpotifyTokensToDb] user가 null — 저장 불가'); return }

    const expiry = Date.now() + expiresIn * 1000
    const { error, count } = await supabase
      .from('profiles')
      .update({
        spotify_access_token:  accessToken,
        spotify_refresh_token: refreshToken,
        spotify_connected_at:  new Date().toISOString(),
      }, { count: 'exact' })
      .eq('id', user.id)

    if (error) {
      console.error('[saveSpotifyTokensToDb] Supabase 오류:', error.message, '| code:', error.code)
      console.error('→ Supabase profiles 테이블에 spotify_access_token, spotify_refresh_token, spotify_connected_at 컬럼이 있는지 확인하세요.')
    } else if (!count) {
      console.warn('[saveSpotifyTokensToDb] 업데이트된 행이 없습니다. RLS UPDATE 정책 또는 profiles 행 누락을 확인하세요. user.id:', user.id)
    } else {
      console.log('[saveSpotifyTokensToDb] Supabase 저장 완료 ✓')
    }

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
          spotify_connected_at: new Date().toISOString(),
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
    console.log('[loadCanvas] user.id:', user?.id)
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('canvas_state')
        .select('nodes, links, genres')
        .eq('user_id', user.id)
        .maybeSingle()
      console.log('[loadCanvas] error:', error?.message)
      console.log('[loadCanvas] data 있음:', !!data?.nodes)
      if (data?.nodes) {
        const { loadCanvas } = useGraphStore.getState()
        const nodes = data.nodes.map(({ fx, fy, index, vx, vy, ...rest }) => ({ ...rest, vx: 0, vy: 0 }))
        loadCanvas(nodes, data.links ?? [], data.genres ?? [])
      }
    } catch (err) {
      console.warn('[loadCanvasState] 불러오기 실패:', err.message)
    }
  },

  loadTutorialStatus: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('tutorial_completed')
      .eq('id', user.id)
      .maybeSingle()
    set({ tutorialCompleted: data?.tutorial_completed ?? false })
  },

  completeTutorial: async () => {
    const { user } = get()
    if (user) {
      await supabase.from('profiles')
        .update({ tutorial_completed: true })
        .eq('id', user.id)
    }
    set({ tutorialCompleted: true })
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
