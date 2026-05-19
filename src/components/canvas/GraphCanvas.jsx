import { useEffect, useRef, useState, useCallback } from 'react'
import { useGraphStore } from '../../stores/useGraphStore'
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
    nodes: storeNodes, links: storeLinks, genres,
    mode, setMode, setAdded,
    undo, redo,
  } = useGraphStore()

  const addedCount = useGraphStore(s => s.nodes.filter(n => n.added).length)
  const canUndo    = useGraphStore(s => s.history.past.length > 0)
  const canRedo    = useGraphStore(s => s.history.future.length > 0)

  const modeRef   = useRef(mode)
  const genresRef = useRef(genres)
  useEffect(() => { modeRef.current = mode; heatDirty.current = true; drawRef.current?.() }, [mode])
  useEffect(() => { genresRef.current = genres }, [genres])

  const [tooltip, setTooltip] = useState(null)
  const [simDone, setSimDone] = useState(false)

  const nodeMap  = useRef(new Map())
  const getNode  = (id) => nodeMap.current.get(id)
  const getGenre = (gid) => genresRef.current.find(g => g.id === gid)

  // ── Draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv  = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const sN  = simNodesRef.current
    const sL  = simLinksRef.current
    const m   = modeRef.current
    const gs  = genresRef.current

    ctx.clearRect(0, 0, W, H)

    if (heatDirty.current) {
      heatRef.current = buildHeatmap(sN, gs, m, W, H)
      heatDirty.current = false
    }
    if (heatRef.current) ctx.drawImage(heatRef.current, 0, 0)

    gs.forEach(g => {
      const members = m === 'view'
        ? sN.filter(n => n.type === 'artist' && n.added && n.gids.includes(g.id))
        : sN.filter(n => n.type === 'artist' && n.gids.includes(g.id))
      if (!members.length) return
      let cx = 0, cy = 0
      members.forEach(n => { cx += n.x; cy += n.y })
      cx /= members.length; cy /= members.length
      const minY = Math.min(...members.map(n => n.y))
      ctx.font = '500 9px sans-serif'
      ctx.fillStyle = rgba(g.color, 0.55)
      ctx.textAlign = 'center'
      ctx.fillText(g.name.toUpperCase(), cx, minY - 18)
      ctx.textAlign = 'left'
    })

    sL.forEach(({ source, target }) => {
      const sid = typeof source === 'object' ? source.id : source
      const tid = typeof target === 'object' ? target.id : target
      const n1 = getNode(sid), n2 = getNode(tid)
      if (!n1 || !n2 || n1.x == null || n2.x == null) return
      if (m === 'view' && (!n1.added || !n2.added)) return
      const both = n1.added && n2.added
      const gc = getGenre(n1.gids[0])
      if (!gc) return
      ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y)
      ctx.strokeStyle = rgba(gc.color, both ? 0.4 : 0.15)
      ctx.lineWidth   = both ? 1 : 0.5
      ctx.setLineDash(both ? [] : [3, 4])
      ctx.stroke(); ctx.setLineDash([])
    })

    sN.filter(n => n.type === 'track').forEach(t => {
      const parent = getNode(t.artistId)
      if (!parent || t.x == null || parent.x == null) return
      if (m === 'view' && (!parent.added || !t.added)) return
      const gc  = getGenre(t.gids?.[0])
      if (!gc) return
      const vis = parent.added && t.added
      ctx.beginPath(); ctx.moveTo(parent.x, parent.y); ctx.lineTo(t.x, t.y)
      ctx.strokeStyle = rgba(gc.color, vis ? 0.28 : 0.1)
      ctx.lineWidth   = vis ? 0.8 : 0.4
      ctx.setLineDash(vis ? [] : [2, 3])
      ctx.stroke(); ctx.setLineDash([])
    })

    const visTracks = m === 'view'
      ? sN.filter(n => n.type === 'track' && getNode(n.artistId)?.added && n.added)
      : sN.filter(n => n.type === 'track')

    visTracks.forEach(t => {
      if (t.x == null) return
      const parent = getNode(t.artistId)
      const gc  = getGenre(t.gids?.[0])
      if (!gc) return
      const isHov = hovId.current === t.id
      const vis   = parent?.added && t.added
      const r     = vis ? 3.5 : 2.5

      if (isHov) {
        ctx.beginPath(); ctx.arc(t.x, t.y, r + 4, 0, Math.PI * 2)
        ctx.fillStyle = rgba(gc.color, 0.18); ctx.fill()
      }
      ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
      ctx.fillStyle = rgba(gc.color, vis ? 0.82 : 0.28); ctx.fill()
      if (vis) {
        ctx.strokeStyle = rgba(gc.color, 0.4); ctx.lineWidth = 1; ctx.stroke()
      } else if (m === 'add') {
        ctx.beginPath(); ctx.arc(t.x, t.y, r + 3, 0, Math.PI * 2)
        ctx.strokeStyle = rgba(gc.color, 0.16); ctx.lineWidth = 0.6; ctx.stroke()
      }
      if (isHov || vis) {
        ctx.font      = `${vis ? '500' : '400'} ${vis ? 10 : 9}px sans-serif`
        ctx.fillStyle = vis ? TEXT_COL : MUTED_COL
        ctx.fillText(t.name, t.x + r + 4, t.y + 4)
      }
    })

    const visArtists = m === 'view'
      ? sN.filter(n => n.type === 'artist' && n.added)
      : sN.filter(n => n.type === 'artist')

    visArtists.forEach(ar => {
      if (ar.x == null) return
      const gc    = getGenre(ar.gids?.[0])
      if (!gc) return
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
        if (m === 'add') {
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
        setTooltip(null)
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
    const visA = m === 'view' ? sN.filter(n => n.type === 'artist' && n.added) : sN.filter(n => n.type === 'artist')
    for (const ar of visA) {
      if (ar.x == null) continue
      const dx = mx - ar.x, dy = my - ar.y
      if (dx*dx + dy*dy < 16*16) return { type: 'artist', node: ar }
    }
    const visT = m === 'view'
      ? sN.filter(n => n.type === 'track' && nodeMap.current.get(n.artistId)?.added && n.added)
      : sN.filter(n => n.type === 'track')
    for (const t of visT) {
      if (t.x == null) continue
      const dx = mx - t.x, dy = my - t.y
      if (dx*dx + dy*dy < 9*9) return { type: 'track', node: t }
    }
    return null
  }, [])

  // ── Init simulation (once on mount) ──────────────────────────────────────
  useEffect(() => {
    const gc = getGenreCenters(W, H)
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
    simRef.current.on('end',  () => { setSimDone(true); drawRef.current?.() })
    simRef.current.alpha(1).restart()
    return () => { simRef.current?.stop(); setSimDone(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setTooltip(t => t ? { ...t, node: { ...t.node, added: true } } : null)
  }, [setAdded, draw])

  const handleRemoveById = useCallback((id) => {
    const node = simNodesRef.current.find(n => n.id === id)
    if (!node || !node.added) return
    node.added = false
    heatDirty.current = true
    setAdded(id, false)
    draw()
    setTooltip(t => {
      if (!t) return null
      if (modeRef.current === 'view') return null
      return { ...t, node: { ...t.node, added: false } }
    })
  }, [setAdded, draw])

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
      setTooltip({
        node: { ...n, parentName: hit.type === 'track' ? (nodeMap.current.get(n.artistId)?.name ?? '') : '' },
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
        {['add', 'view'].map(m => (
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
            {m === 'add' ? '추가 모드' : '뷰 모드'}
          </button>
        ))}

        <div style={{ width: 1, height: 14, background: 'var(--color-border)', margin: '0 2px' }} />

        {/* Undo / Redo */}
        <UndoRedoBtn onClick={handleUndo} disabled={!canUndo} title="실행 취소 (Ctrl+Z)">↩</UndoRedoBtn>
        <UndoRedoBtn onClick={handleRedo} disabled={!canRedo} title="다시 실행 (Ctrl+Y)">↪</UndoRedoBtn>

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

          {/* 빈 상태 안내 */}
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
          {tooltip && (
            <NodeTooltip
              node={tooltip.node}
              nodeType={tooltip.nodeType}
              x={tooltip.x}
              y={tooltip.y}
              genres={genres}
              mode={mode}
              onAdd={() => handleAddById(tooltip.node.id)}
              onRemove={() => handleRemoveById(tooltip.node.id)}
              onMouseEnter={() => { tooltipHoveredRef.current = true;  cancelHide() }}
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
        {genres.map(g => (
          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.color, display: 'inline-block', flexShrink: 0 }} />
            {g.name}
          </div>
        ))}
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
