function hex2rgb(h) {
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  }
}

// 라이트 배경 기준으로 opacity 상향 조정
export function buildHeatmap(nodes, genres, mode, W, H) {
  const hc = document.createElement('canvas')
  hc.width = W; hc.height = H
  const ctx = hc.getContext('2d')

  const visArtists = mode === 'view'
    ? nodes.filter(n => n.type === 'artist' && n.added)
    : nodes.filter(n => n.type === 'artist')

  genres.forEach(g => {
    const members = visArtists.filter(n => n.gids.includes(g.id))
    if (!members.length) return
    const { r, g: gv, b } = hex2rgb(g.color)

    members.forEach(n => {
      if (n.x == null) return
      const weight = n.added ? 1.0 : 0.45
      const radius = mode === 'view' ? 72 : 88
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius)
      grad.addColorStop(0,    `rgba(${r},${gv},${b},${0.20 * weight})`)
      grad.addColorStop(0.4,  `rgba(${r},${gv},${b},${0.10 * weight})`)
      grad.addColorStop(0.75, `rgba(${r},${gv},${b},${0.04 * weight})`)
      grad.addColorStop(1,    `rgba(${r},${gv},${b},0)`)
      ctx.beginPath()
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    })
  })

  return hc
}
