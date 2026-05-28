import { create } from 'zustand'

const audioEl = typeof window !== 'undefined' ? new Audio() : null

export const useAudioStore = create((set, get) => ({
  currentTrackId:    null,
  currentTrackName:  null,
  currentArtistName: null,
  isPlaying:         false,

  play: (id, url, name, artistName) => {
    if (!audioEl || !url) return
    const { currentTrackId, isPlaying } = get()

    if (currentTrackId === id) {
      if (isPlaying) { audioEl.pause(); set({ isPlaying: false }) }
      else           { audioEl.play().catch(() => {}); set({ isPlaying: true }) }
      return
    }

    audioEl.pause()
    audioEl.src = url
    audioEl.play().catch(() => {})
    audioEl.onended = () => set({ isPlaying: false })
    set({ currentTrackId: id, currentTrackName: name, currentArtistName: artistName, isPlaying: true })
  },

  pause: () => {
    if (!audioEl) return
    audioEl.pause()
    set({ isPlaying: false })
  },

  resume: () => {
    if (!audioEl || !get().currentTrackId) return
    audioEl.play().catch(() => {})
    set({ isPlaying: true })
  },

  stop: () => {
    if (!audioEl) return
    audioEl.pause()
    audioEl.src = ''
    set({ currentTrackId: null, currentTrackName: null, currentArtistName: null, isPlaying: false })
  },
}))
