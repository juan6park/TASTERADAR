import { useEffect, useRef } from 'react'
import { useGraphStore, enrichNodesWithPositions } from '../stores/useGraphStore'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../services/supabase'

export function useCanvasPersist() {
  const timerRef = useRef(null)
  const userId   = useAuthStore(s => s.user?.id)

  useEffect(() => {
    if (!userId) return

    const unsub = useGraphStore.subscribe((state, prev) => {
      if (state.nodes === prev.nodes && 
          state.links === prev.links && 
          state.genres === prev.genres) return

      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        // 추천 노드 제외하고 저장
        const nodesToSave = state.nodes.filter(n => 
          !n.isRecommendation || n.added
        )
        const enrichedNodes = enrichNodesWithPositions(nodesToSave)
        try {
          await supabase.from('canvas_state').upsert(
            { 
              user_id: userId, 
              nodes: enrichedNodes, 
              links: state.links, 
              genres: state.genres 
            },
            { onConflict: 'user_id' }
          )
          console.log('[useCanvasPersist] 저장 완료')
        } catch (err) {
          console.warn('[useCanvasPersist] 저장 실패:', err.message)
        }
      }, 2000)
    })

    return () => {
      unsub()
      clearTimeout(timerRef.current)
    }
  }, [userId])
}
