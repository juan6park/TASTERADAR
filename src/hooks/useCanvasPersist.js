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
      if (state.nodes === prev.nodes && state.links === prev.links) return

      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        const enrichedNodes = enrichNodesWithPositions(state.nodes)
        const { error } = await supabase.from('canvas_state').upsert(
          {
            user_id:    userId,
            nodes:      enrichedNodes,
            links:      state.links,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        if (error) console.warn('[useCanvasPersist] 저장 실패:', error.message, error.code)
        else        console.log('[useCanvasPersist] 저장 완료')
      }, 500)
    })

    return () => {
      unsub()
      clearTimeout(timerRef.current)
    }
  }, [userId])
}
