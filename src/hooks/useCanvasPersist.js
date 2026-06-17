import { useEffect, useRef } from 'react'
import { useGraphStore, enrichNodesWithPositions } from '../stores/useGraphStore'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../services/supabase'

export function useCanvasPersist() {
  const timerRef = useRef(null)
  const userId   = useAuthStore(s => s.user?.id)

  useEffect(() => {
    if (!userId) return

    const cancelSave = () => {
      clearTimeout(timerRef.current)
      console.log('[useCanvasPersist] 저장 취소됨 (로그아웃)')
    }
    window.addEventListener('canvas-cancel-save', cancelSave)

    const unsub = useGraphStore.subscribe((state, prev) => {
      if (state.nodes === prev.nodes &&
          state.links === prev.links &&
          state.genres === prev.genres) return

      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        // 저장 직전 userId 재확인 — 로그아웃/계정 전환 시 스킵
        const currentUserId = useAuthStore.getState().user?.id
        if (currentUserId !== userId) {
          console.log('[useCanvasPersist] userId 변경됨 → 저장 스킵')
          return
        }

        const nodesToSave = state.nodes.filter(n =>
          !n.isRecommendation || n.added
        )

        const recIds = new Set(
          state.nodes
            .filter(n => n.isRecommendation && !n.added && !n.id.match(/^a\d+$/))
            .map(n => n.id)
        )
        const linksToSave = state.links.filter(l => {
          const src = typeof l.source === 'object' ? l.source.id : l.source
          const tgt = typeof l.target === 'object' ? l.target.id : l.target
          return !recIds.has(src) && !recIds.has(tgt)
        })

        const enrichedNodes = enrichNodesWithPositions(nodesToSave)
        try {
          await supabase.from('canvas_state').upsert(
            {
              user_id: userId,
              nodes: enrichedNodes,
              links: linksToSave,
              genres: state.genres,
            },
            { onConflict: 'user_id' }
          )
          console.log('[useCanvasPersist] 저장 완료')
        } catch (err) {
          console.warn('[useCanvasPersist] 저장 실패:', err.message)
        }
      }, 500)
    })

    return () => {
      unsub()
      clearTimeout(timerRef.current)
      window.removeEventListener('canvas-cancel-save', cancelSave)
    }
  }, [userId])
}
