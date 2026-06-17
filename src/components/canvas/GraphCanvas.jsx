import { useEffect, useRef, useState, useCallback } from 'react'
import { useGraphStore, updateSimPositions } from '../../stores/useGraphStore'
import { buildSimulation, getGenreCenters, initNodePositions } from './ForceGraph'
import { buildHeatmap } from './HeatmapLayer'
import NodeTooltip from './NodeTooltip'

const W = 680, H = 460
const TEXT_COL  = '#1c1a17'
const MUTED_COL = 'rgba(28,26,23,0.3)'
// 노드에서 툴팁으로 이동할 때의 허용 지연(ms)
const HIDE_DELAY = 140

function hex2rgb(h) {
  return { r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) }
}

function rgba(hex, a) {
  const { r, g, b } = hex2rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

export default function GraphCanvas() {
  const canvasRef         = useRef(null)
  const simRef            = useRef(null)
  const simNodesRef       = useRef([])
  const simLinksRef       = useRef([])
  const heatRef           = useRef(null)
  const heatDirty         = useRef(true)
  const hovId             = useRef(null)
  const drawRef           = useRef(null)
  // 툴팁 sticky 상태 관리
  const tooltipHoveredRef = useRef(false)
  const hideTimerRef      = useRef(null)

  const {
    nodes: storeNodes, genres,
    mode, setMode, setAdded, removeNode, setRating,
    undo, redo,
  } = useGraphStore()

  const addedCount = useGraphStore(s => s.nodes.filter(n => n.added).length)
  const canUndo    = useGraphStore(s => s.history.past.length > 0)
  const canRedo    = useGraphStore(s => s.history.future.length > 0)

  const modeRef   = useRef(mode)
  const genresRef = useRef(genres)
  useEffect(() => { modeRef.current = mode; heatDirty.current = true; drawRef.current?.() }, [mode])
  useEffect(() => { genresRef.current = genres }, [genres])

  const [tooltipData, setTooltipData] = useState(null)
  const tooltipNode = tooltipData
    ? storeNodes.find(n => n.id === tooltipData.nodeId)
    : null
  const [simDone, setSimDone] = useState(false)

  const nodeMap      = useRef(new Map())
  const getNode      = (id) => nodeMap.current.get(id)
  const getGenre     = (gid) => genresRef.current.find(g => g.id === gid)
  const prevCountRef = useRef({ nodes: -1, links: -1, genres: -1 })

  // ── Draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv  = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const sN  = simNodesRef.current
    const sL  = simLinksRef.current
    console.log('[draw] sL 길이:', sL.length)
    const m            = modeRef.current
    const effectiveMode = m === 'memo' ? 'view' : m
    const gs           = genresRef.current

    ctx.clearRect(0, 0, W, H)

    if (heatDirty.current) {
      heatRef.current = buildHeatmap(sN, gs, effectiveMode, W, H)
      heatDirty.current = false
    }
    if (heatRef.current) ctx.drawImage(heatRef.current, 0, 0)

    // 장르 레이블 — 노드당 상위 1개 장르만, 중복 없이
    const drawnGenreIds = new Set()
    sN.forEach(n => {
      if (n.type !== 'artist') return
      if (effectiveMode === 'view' && !n.added) return
      if (!n.x || !n.y) return
      const topGid = n.gids?.[0]
      if (!topGid || drawnGenreIds.has(topGid)) return
      drawnGenreIds.add(topGid)
      const g = gs.find(g => g.id === topGid)
      if (!g) return
      ctx.font = '500 9px sans-serif'
      ctx.fillStyle = rgba(g.color, 0.55)
      ctx.textAlign = 'center'
      ctx.fillText(g.name.toUpperCase(), n.x, n.y - 18)
      ctx.textAlign = 'left'
    })

    sL.forEach(({ source, target }) => {
      const sid = typeof source === 'object' ? source.id : source
      const tid = typeof target === 'object' ? target.id : target
      const n1 = getNode(sid), n2 = getNode(tid)
      if (!n1 || !n2 || n1.x == null || n2.x == null) return
      // 아티스트-아티스트 간선만 여기서 그림
      // 트랙-부모 연결은 아래 별도 블록에서 처리
      if (n1.type !== 'artist' || n2.type !== 'artist') return
      if (effectiveMode === 'view' && (!n1.added || !n2.added)) return
      const both = n1.added && n2.added
      const gc = getGenre(n1.gids?.[0]) ?? { color: '#888888' }
      ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y)
      ctx.strokeStyle = rgba(gc.color, both ? 0.5 : 0.2)
      ctx.lineWidth   = both ? 1.2 : 0.6
      ctx.setLineDash(both ? [] : [3, 4])
      ctx.stroke(); ctx.setLineDash([])
    })

    const visTracks = effectiveMode === 'view'
      ? sN.filter(n => n.type === 'track' && n.added)
      : sN.filter(n => n.type === 'track')

    visTracks.forEach(t => {
      if (t.x == null) return
      const parent  = getNode(t.artistId)
      const gc      = getGenre(t.gids?.[0]) ?? { color: '#9b9b9b' }
      const isHov   = hovId.current === t.id
      const nodeVis = t.added                    // 노드 선명도: 트랙 자체 added 여부
      const linkVis = t.added && parent?.added   // 간선 표시: 트랙 + 부모 둘 다 added
      const r       = nodeVis ? 3.5 : 2.5

      if (isHov) {
        ctx.beginPath(); ctx.arc(t.x, t.y, r + 4, 0, Math.PI * 2)
        ctx.fillStyle = rgba(gc.color, 0.18); ctx.fill()
      }
      ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
      ctx.fillStyle = rgba(gc.color, nodeVis ? 0.82 : 0.28); ctx.fill()
      if (nodeVis) {
        ctx.strokeStyle = rgba(gc.color, 0.4); ctx.lineWidth = 1; ctx.stroke()
      } else if (effectiveMode === 'add') {
        ctx.beginPath(); ctx.arc(t.x, t.y, r + 3, 0, Math.PI * 2)
        ctx.strokeStyle = rgba(gc.color, 0.16); ctx.lineWidth = 0.6; ctx.stroke()
      }
      if (isHov || nodeVis) {
        ctx.font      = `${nodeVis ? '500' : '400'} ${nodeVis ? 10 : 9}px sans-serif`
        ctx.fillStyle = nodeVis ? TEXT_COL : MUTED_COL
        ctx.fillText(t.name, t.x + r + 4, t.y + 4)
      }

      if (parent && parent.x != null && linkVis) {
        ctx.beginPath()
        ctx.moveTo(parent.x, parent.y)
        ctx.lineTo(t.x, t.y)
        ctx.strokeStyle = rgba(gc.color, 0.28)
        ctx.lineWidth = 0.8
        ctx.setLineDash([])
        ctx.stroke()
      }
    })

    const visArtists = effectiveMode === 'view'
      ? sN.filter(n => n.type === 'artist' && n.added)
      : sN.filter(n => n.type === 'artist')

    visArtists.forEach(ar => {
      if (ar.x == null) return
      const gc = getGenre(ar.gids?.[0]) ?? { color: '#9b9b9b' }
      const isHov = hovId.current === ar.id
      const r     = ar.added ? 7 : 5
      const multi = ar.gids?.length > 1

      if (isHov) {
        ctx.beginPath(); ctx.arc(ar.x, ar.y, r + 6, 0, Math.PI * 2)
        ctx.fillStyle = rgba(gc.color, 0.15); ctx.fill()
      }
      if (multi && ar.added) {
        const gc2 = getGenre(ar.gids[1])
        if (gc2) {
          ctx.beginPath(); ctx.arc(ar.x, ar.y, r + 3.5, 0, Math.PI * 2)
          ctx.strokeStyle = rgba(gc2.color, 0.55)
          ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([])
        }
      }
      ctx.beginPath(); ctx.arc(ar.x, ar.y, r, 0, Math.PI * 2)
      if (ar.added) {
        ctx.fillStyle   = gc.color; ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.stroke()
      } else {
        ctx.fillStyle = rgba(gc.color, 0.3); ctx.fill()
        if (effectiveMode === 'add') {
          ctx.beginPath(); ctx.arc(ar.x, ar.y, r + 4, 0, Math.PI * 2)
          ctx.strokeStyle = rgba(gc.color, 0.16); ctx.lineWidth = 0.7; ctx.stroke()
        }
      }
      if (ar.added || isHov) {
        ctx.font      = `${ar.added ? '500' : '400'} ${ar.added ? 11 : 10}px sans-serif`
        ctx.fillStyle = ar.added ? TEXT_COL : MUTED_COL
        ctx.fillText(ar.name, ar.x + r + 5, ar.y + 4)
      }
    })
  }, [])

  useEffect(() => { drawRef.current = draw }, [draw])

  // ── 툴팁 hide 지연 헬퍼 ──────────────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (!tooltipHoveredRef.current) {
        setTooltipData(null)
        hovId.current = null
        drawRef.current?.()
      }
    }, HIDE_DELAY)
  }, [])

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimerRef.current)
  }, [])

  // ── Hit test ─────────────────────────────────────────────────────────────
  const hitTest = useCallback((mx, my) => {
    const sN = simNodesRef.current
    const m  = modeRef.current
    const em   = m === 'memo' ? 'view' : m
    const visA = em === 'view' ? sN.filter(n => n.type === 'artist' && n.added) : sN.filter(n => n.type === 'artist')
    for (const ar of visA) {
      if (ar.x == null) continue
      const dx = mx - ar.x, dy = my - ar.y
      if (dx*dx + dy*dy < 16*16) return { type: 'artist', node: ar }
    }
    const visT = em === 'view'
      ? sN.filter(n => n.type === 'track' && n.added)
      : sN.filter(n => n.type === 'track')
    for (const t of visT) {
      if (t.x == null) continue
      const dx = mx - t.x, dy = my - t.y
      if (dx*dx + dy*dy < 9*9) return { type: 'track', node: t }
    }
    return null
  }, [])

  // ── Selectors for detecting store additions (search nodes) ───────────────
  const storeNodeCount  = useGraphStore(s => s.nodes.length)
  const storeGenreCount = useGraphStore(s => s.genres.length)
  const storeLinks      = useGraphStore(s => s.links)
  const storeNodeIds    = useGraphStore(s => s.nodes.map(n => n.id).join(','))

  // ── Init simulation (once on mount) ──────────────────────────────────────
  useEffect(() => {
    const gc = getGenreCenters(W, H, genres)
    prevCountRef.current = { 
      nodeIds: storeNodes.map(n => n.id).join(','), 
      genres: genres.length 
    }
    simNodesRef.current = storeNodes.map(n => ({ ...n }))
    initNodePositions(simNodesRef.current, gc, W, H)

    const nMap = new Map(simNodesRef.current.map(n => [n.id, n]))
    nodeMap.current = nMap
    simNodesRef.current.filter(n => n.type === 'track').forEach(t => {
      const parent = nMap.get(t.artistId)
      if (parent) {
        t.x = parent.x + (Math.random() - 0.5) * 30
        t.y = parent.y + (Math.random() - 0.5) * 30
      }
    })

    simLinksRef.current = storeLinks.map(l => ({ ...l }))
    simRef.current = buildSimulation({ nodes: simNodesRef.current, links: simLinksRef.current, genreCenters: gc, W, H })
    simRef.current.on('tick', () => { heatDirty.current = true; drawRef.current?.() })
    simRef.current.on('end',  () => { updateSimPositions(simNodesRef.current); setSimDone(true); drawRef.current?.() })
    simRef.current.alpha(1).restart()
    return () => { simRef.current?.stop(); setSimDone(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync new search-added nodes / genres → full simulation rebuild ───────
  useEffect(() => {
    if (!simRef.current) return
    const gc = storeGenreCount
    const prev = prevCountRef.current
    if (storeNodeIds === prev.nodeIds && gc === prev.genres) return
    
    prevCountRef.current = { nodeIds: storeNodeIds, genres: gc }
    console.log('[GraphCanvas] sync: nodeIds 변경 | genres', prev.genres, '→', gc)

    const state = useGraphStore.getState()
    const existingPosMap = new Map(
      simNodesRef.current.map(n => [n.id, { x: n.x, y: n.y, vx: n.vx ?? 0, vy: n.vy ?? 0 }])
    )

    // 새 노드가 없으면 (added만 바뀐 경우 또는 삭제) rebuild 없이 동기화만
    const novelIds = state.nodes.map(n => n.id).filter(id => !existingPosMap.has(id))
    if (novelIds.length === 0) {
      // 삭제된 노드를 simNodesRef에서 제거 (Bug 4)
      simNodesRef.current = simNodesRef.current.filter(sn => state.nodes.find(n => n.id === sn.id))
      nodeMap.current = new Map(simNodesRef.current.map(n => [n.id, n]))
      simNodesRef.current.forEach(sn => {
        const found = state.nodes.find(n => n.id === sn.id)
        if (found) {
          sn.added = found.added
          sn.gids  = found.gids?.length ? found.gids : sn.gids
        }
      })
      genresRef.current = state.genres
      heatDirty.current = true
      drawRef.current?.()
      return
    }

    const newSimNodes = state.nodes.map(n => {
      const pos = existingPosMap.get(n.id)
      return pos ? { ...n, ...pos } : { ...n }
    })
    const genreCenters = getGenreCenters(W, H, state.genres)
    const novelNodes   = newSimNodes.filter(n => !existingPosMap.has(n.id))
    initNodePositions(novelNodes, genreCenters, W, H)

    simRef.current.stop()
    simNodesRef.current = newSimNodes
    nodeMap.current     = new Map(newSimNodes.map(n => [n.id, n]))
    simLinksRef.current = state.links.map(l => ({ ...l }))
    console.log('[simLinks] 링크 수:', simLinksRef.current.length)
    console.log('[simLinks] 첫 5개:', simLinksRef.current.slice(0, 5))
    genresRef.current   = state.genres

    simRef.current = buildSimulation({ nodes: simNodesRef.current, links: simLinksRef.current, genreCenters, W, H })
    simRef.current.on('tick', () => { heatDirty.current = true; drawRef.current?.() })
    simRef.current.on('end',  () => { updateSimPositions(simNodesRef.current); setSimDone(true); drawRef.current?.() })
    simRef.current.alpha(0.3).restart()
    console.log('[sim] alpha:', simRef.current.alpha())
    heatDirty.current = true
  }, [storeNodeIds, storeGenreCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── added 상태 변화 → sim 노드 동기화 + 새 노드 추가 ───────────────────────
  useEffect(() => {
    if (!simRef.current) return
    const state = useGraphStore.getState()
    const storeN = state.nodes
    let needRebuild = false

    // 1. 기존 simNode 동기화
    simNodesRef.current.forEach(sn => {
      const found = storeN.find(n => n.id === sn.id)
      if (!found) return
      sn.added = found.added
      if (found.gids?.length &&
          JSON.stringify(found.gids) !== JSON.stringify(sn.gids)) {
        sn.gids = found.gids
        needRebuild = true
      }
    })

    // 2. simNodesRef에 없는 새 노드 추가
    const simIds = new Set(simNodesRef.current.map(n => n.id))
    const novelNodes = storeN.filter(n => !simIds.has(n.id))

    if (novelNodes.length) {
      const genreCenters = getGenreCenters(W, H, state.genres)
      initNodePositions(novelNodes, genreCenters, W, H)
      simNodesRef.current.push(...novelNodes)
      novelNodes.forEach(n => nodeMap.current.set(n.id, n))
      needRebuild = true
      console.log('[addedCount] 새 노드 추가:', novelNodes.map(n => n.name))
    }

    if (needRebuild) {
      const genreCenters = getGenreCenters(W, H, state.genres)
      simLinksRef.current = state.links.map(l => ({ ...l }))
      genresRef.current   = state.genres
      nodeMap.current     = new Map(simNodesRef.current.map(n => [n.id, n]))
      simRef.current.stop()
      simRef.current = buildSimulation({
        nodes: simNodesRef.current,
        links: simLinksRef.current,
        genreCenters,
        W, H,
      })
      simRef.current.on('tick', () => { heatDirty.current = true; drawRef.current?.() })
      simRef.current.on('end',  () => { updateSimPositions(simNodesRef.current); setSimDone(true); drawRef.current?.() })
      simRef.current.alpha(0.3).restart()
      console.log('[sim] alpha:', simRef.current.alpha())
    }

    console.log('[addedCount sync] added 노드:', simNodesRef.current.filter(n => n.added).map(n => n.name))
    heatDirty.current = true
    drawRef.current?.()
  }, [addedCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Links 변경 감지 → simulation에 반영 (경량 업데이트) ───────────────────
  const skipFirstLinksRun = useRef(true)
  useEffect(() => {
    // 마운트 시 첫 실행은 init effect가 이미 링크를 설정했으므로 스킵
    if (skipFirstLinksRun.current) { skipFirstLinksRun.current = false; return }
    if (!simRef.current) return
    // artistLinkForce가 클로저로 참조하는 배열을 in-place 업데이트
    simLinksRef.current.length = 0
    storeLinks.forEach(l => simLinksRef.current.push({ ...l }))
    console.log('[GraphCanvas] links 업데이트 →', simLinksRef.current.length, '개')
    simRef.current.alpha(0.3).restart()
    heatDirty.current = true
  }, [storeLinks]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 노드 삭제 감지 → sim에서 즉시 제거 (Bug 4 보조) ──────────────────────
  useEffect(() => {
    if (!simRef.current) return
    const storeN = useGraphStore.getState().nodes
    simNodesRef.current = simNodesRef.current.filter(n => storeN.find(s => s.id === n.id))
    nodeMap.current = new Map(simNodesRef.current.map(n => [n.id, n]))
    heatDirty.current = true
    drawRef.current?.()
  }, [storeNodeIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Undo/Redo — simNodes와 store 동기화 ──────────────────────────────────
  const syncSimNodes = useCallback(() => {
    const storeN = useGraphStore.getState().nodes
    simNodesRef.current.forEach(sn => {
      const found = storeN.find(n => n.id === sn.id)
      if (found) sn.added = found.added
    })
    heatDirty.current = true
    drawRef.current?.()
  }, [])

  const handleUndo = useCallback(() => {
    if (!canUndo) return
    undo()
    syncSimNodes()
  }, [canUndo, undo, syncSimNodes])

  const handleRedo = useCallback(() => {
    if (!canRedo) return
    redo()
    syncSimNodes()
  }, [canRedo, redo, syncSimNodes])

  const handleSnapshot = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const tmp = document.createElement('canvas')
    tmp.width = cv.width; tmp.height = cv.height
    const ctx = tmp.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, tmp.width, tmp.height)
    ctx.drawImage(cv, 0, 0)
    const link = document.createElement('a')
    link.download = `taste-radar-${new Date().toISOString().slice(0, 10)}.png`
    link.href = tmp.toDataURL('image/png')
    link.click()
  }, [])

  // Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z)
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleUndo, handleRedo])

  // ── 노드 추가/삭제 ────────────────────────────────────────────────────────
  const handleAddById = useCallback((id) => {
    const node = simNodesRef.current.find(n => n.id === id)
    if (!node || node.added) return
    node.added = true
    heatDirty.current = true
    setAdded(id, true)
    draw()
    setTooltipData(t => t ? { ...t, node: { ...t.node, added: true } } : null)
  }, [setAdded, draw])

  const handleRemoveById = useCallback((id) => {
    const node = simNodesRef.current.find(n => n.id === id)
    if (!node || !node.added) return
    heatDirty.current = true

    if (node.isRecommendation) {
      // 추천 노드: added만 false (sim에 ghost로 유지)
      node.added = false
      setAdded(id, false)
      draw()
      setTooltipData(t => t ? { ...t, node: { ...t.node, added: false } } : null)
    } else {
      // 일반 노드: sim + store에서 완전 삭제
      simNodesRef.current = simNodesRef.current.filter(n => n.id !== id)
      nodeMap.current.delete(id)
      removeNode(id)
      draw()
      setTooltipData(null)
    }
  }, [setAdded, removeNode, draw])

  // ── Mouse events ─────────────────────────────────────────────────────────
  const getCanvasCoords = (e) => {
    const rect  = canvasRef.current.getBoundingClientRect()
    const scale = W / rect.width
    return { mx: (e.clientX - rect.left) * scale, my: (e.clientY - rect.top) * scale, scale: rect.width / W }
  }

  const isSimIdle = () => !simRef.current || simRef.current.alpha() < 0.01

  const handleMouseMove = useCallback((e) => {
    const { mx, my, scale } = getCanvasCoords(e)
    const hit   = hitTest(mx, my)
    const newId = hit ? hit.node.id : null

    if (hit) {
      cancelHide()
      if (newId !== hovId.current) {
        hovId.current = newId
        canvasRef.current.style.cursor = 'pointer'
        if (simDone || isSimIdle()) draw()
      }
      const n = hit.node
      setTooltipData({
        nodeId: n.id,
        nodeType: hit.type,
        x: n.x * scale,
        y: n.y * scale,
      })
    } else {
      // 노드 바깥 — 툴팁에 마우스가 없을 때만 지연 후 닫기
      if (!tooltipHoveredRef.current) {
        scheduleHide()
        if (hovId.current !== null) {
          hovId.current = null
          canvasRef.current.style.cursor = 'default'
          if (simDone || isSimIdle()) draw()
        }
      }
    }
  }, [hitTest, draw, simDone, cancelHide, scheduleHide])

  // canvas mouseleave: 툴팁 쪽으로 나갔을 수도 있으니 지연 후 닫기
  const handleCanvasLeave = useCallback(() => {
    hovId.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    if (simDone || isSimIdle()) draw()
    if (!tooltipHoveredRef.current) scheduleHide()
  }, [draw, simDone, scheduleHide])

  const handleClick = useCallback((e) => {
    if (modeRef.current !== 'add') return
    const { mx, my } = getCanvasCoords(e)
    const hit = hitTest(mx, my)
    if (!hit || hit.node.added) return
    handleAddById(hit.node.id)
  }, [hitTest, handleAddById])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: '100%', background: 'var(--color-bg)' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 16px', height: 42, flexShrink: 0,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {/* 모드 버튼 — pill, active=검정 fill */}
        {[['add', '추가 모드'], ['view', '뷰 모드'], ['memo', '메모 모드']].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
                  style={{
                    padding: '4px 14px', borderRadius: 20, fontSize: 11,
                    fontFamily: 'inherit', letterSpacing: '0.01em',
                    cursor: 'pointer', transition: 'all .15s',
                    ...(mode === m
                      ? { background: 'var(--color-text-primary)', color: '#fff', border: '1px solid var(--color-text-primary)' }
                      : { background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-secondary)' }
                    ),
                  }}>
            {label}
          </button>
        ))}

        <div style={{ width: 1, height: 14, background: 'var(--color-border)', margin: '0 2px' }} />

        {/* Undo / Redo */}
        <UndoRedoBtn onClick={handleUndo} disabled={!canUndo} title="실행 취소 (Ctrl+Z)">↩</UndoRedoBtn>
        <UndoRedoBtn onClick={handleRedo} disabled={!canRedo} title="다시 실행 (Ctrl+Y)">↪</UndoRedoBtn>

        <div style={{ width: 1, height: 14, background: 'var(--color-border)', margin: '0 2px' }} />

        <button
          onClick={handleSnapshot}
          title="캔버스를 PNG로 저장"
          style={{
            padding: '4px 10px', borderRadius: 4, fontSize: 10,
            background: 'transparent', border: '1px solid var(--color-border-secondary)',
            color: 'var(--color-text-secondary)', cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.01em',
          }}
        >
          스냅샷
        </button>

        {!simDone && (
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 6, letterSpacing: '0.02em' }}>
            수렴 중…
          </span>
        )}
      </div>

      {/* Canvas 영역 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: W, maxWidth: '100%' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{
              width: '100%', display: 'block',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              backgroundColor: '#fff',
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleCanvasLeave}
            onClick={handleClick}
          />

          {/* 빈 상태 안내 — added:true 노드 없을 때만 표시 */}
          {addedCount === 0 && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.01em' }}>
                캔버스가 비어있어요
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', letterSpacing: '0.02em' }}>
                노드를 추가해서 아카이브를 시작하세요
              </span>
            </div>
          )}

          {/* 툴팁 */}
          {tooltipData && tooltipNode && (
            <NodeTooltip
              node={{
                ...tooltipNode,
                parentName: tooltipData.nodeType === 'track'
                  ? (nodeMap.current.get(tooltipNode.artistId)?.name ?? '')
                  : ''
              }}
              nodeType={tooltipData.nodeType}
              x={tooltipData.x}
              y={tooltipData.y}
              genres={genres}
              mode={mode}
              onAdd={() => handleAddById(tooltipNode.id)}
              onRemove={() => handleRemoveById(tooltipNode.id)}
              onRate={setRating}
              onMouseEnter={() => { tooltipHoveredRef.current = true; cancelHide() }}
              onMouseLeave={() => { tooltipHoveredRef.current = false; scheduleHide() }}
            />
          )}
        </div>
      </div>

      {/* 장르 레전드 */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
          padding: '6px 16px 10px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}>
          {genres
            .filter(g => {
              // added:true 노드에서 실제 사용된 장르만
              return storeNodes.some(n => 
                n.added && n.gids?.includes(g.id)
              )
            })
            .map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.color, display: 'inline-block', flexShrink: 0 }} />
                {g.name}
              </div>
            ))
          }
        </div>
    </div>
  )
}

// ── Undo/Redo 버튼 ─────────────────────────────────────────────────────────
function UndoRedoBtn({ onClick, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 26, height: 22, borderRadius: 4,
        background: 'transparent',
        border: `1px solid ${disabled ? 'var(--color-border)' : 'var(--color-border-secondary)'}`,
        color: disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
        fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.4 : 1, transition: 'opacity .15s',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}
