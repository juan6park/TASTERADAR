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
        // 추천 노드 중 added:false는 저장 제외
        const nodesToSave = state.nodes.filter(n => 
          !n.isRecommendation || n.added
        )

        // 추천 노드(added:false) 관련 링크 제외
        const recIds = new Set(
          state.nodes
            .filter(n => n.isRecommendation && !n.added && !n.id.match(/^a\d+$/))
            .map(n => n.id)
        )
        console.log('[persist] recIds:', [...recIds])
        console.log('[persist] state.links 첫 3개:', state.links.slice(0, 3))
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