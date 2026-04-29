import { catmullRomSpline, computeVelocities, makeCoordMapper } from './trajectoryUtils'

/**
 * ═══════════════════════════════════════════════════════
 *  GYMNAST INK — Canvas Renderer
 *  All artistic rendering modes live here.
 * ═══════════════════════════════════════════════════════
 */

const PALETTE = [
  '#c0392b', '#c9a84c', '#5b8ca8', '#7c9c6e',
  '#a86b5b', '#7a5ba8', '#5ba88c', '#a85b88',
]

// ─── Main render entry point ─────────────────────────────
export function renderScene(canvas, sceneData, params, animFrame = null, view2D = null) {
  if (!canvas || !sceneData) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  const W = Math.max(1, rect.width)
  const H = Math.max(1, rect.height)

  const { trajectories, bounds, polygon } = sceneData
  const baseCoordMap = makeCoordMapper(bounds, W, H, 60)

  const zoom = view2D?.zoom ?? 1
  const panX = view2D?.panX ?? 0
  const panY = view2D?.panY ?? 0

  const coordMap = (pt) => {
    const mapped = baseCoordMap(pt)
    return {
      x: mapped.x * zoom + panX,
      y: mapped.y * zoom + panY,
    }
  }

  ctx.clearRect(0, 0, W, H)

  if (params.bgStyle === 'paper') {
    drawPaperTexture(ctx, W, H)
  } else if (params.bgStyle === 'dark') {
    ctx.fillStyle = '#08080f'
    ctx.fillRect(0, 0, W, H)
    drawNoiseTexture(ctx, W, H, 0.03)
  } else {
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, W, H)
  }

  let clipping = false
  if (params.clipToPolygon && polygon.length > 2) {
    const mapped = polygon.map(coordMap)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(mapped[0].x, mapped[0].y)
    mapped.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    ctx.closePath()
    ctx.clip()
    clipping = true
  }

  trajectories.forEach((traj, i) => {
    if (!traj.visible) return

    let pts = traj.points
    if (animFrame !== null) {
      pts = pts.slice(0, animFrame + 1)
    }
    if (pts.length < 2) return

    let mappedPts = pts.map(coordMap)
    if (traj.transform) {
      mappedPts = applyTransform(mappedPts, traj.transform)
    }

    const smoothed = params.smoothing > 0
      ? catmullRomSpline(mappedPts, 0.5, Math.max(4, params.smoothing))
      : mappedPts

    const color = traj.color || PALETTE[i % PALETTE.length]
    const velocities = computeVelocities(smoothed)
    const maxVel = Math.max(...velocities, 1)

    switch (params.renderStyle) {
      case 'ink': drawInk(ctx, smoothed, velocities, maxVel, color, params); break
      case 'brush': drawBrush(ctx, smoothed, velocities, maxVel, color, params); break
      case 'ghost': drawGhost(ctx, smoothed, velocities, maxVel, color, params); break
      case 'neon': drawNeon(ctx, smoothed, velocities, maxVel, color, params); break
      case 'dust': drawDust(ctx, smoothed, velocities, maxVel, color, params); break
      default: drawInk(ctx, smoothed, velocities, maxVel, color, params)
    }
  })

  if (clipping) ctx.restore()

  if (params.showPolygon && polygon.length > 2) {
    drawPolygon(ctx, polygon.map(coordMap), params)
  }
}


// ─── STYLE: INK ──────────────────────────────────────────
// Variable-width stroke — thick when slow, thin when fast
function drawInk(ctx, pts, velocities, maxVel, color, params) {
  if (pts.length < 2) return

  const baseW = params.lineWidth
  const opacity = params.opacity

  // Parse color to rgb
  const rgb = hexToRgb(color)

  for (let i = 0; i < pts.length - 1; i++) {
    const vel = velocities[i] / maxVel
    // Slow = thick, fast = thin (ink splatter logic)
    const w = baseW * (1.0 - vel * 0.75) + 0.5
    const alpha = opacity * (0.4 + 0.6 * (1 - vel))

    ctx.beginPath()
    ctx.moveTo(pts[i].x, pts[i].y)
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y)
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
    ctx.lineWidth = w
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  // Ink dots at slow points (pooling effect)
  if (params.inkDots) {
    for (let i = 0; i < pts.length; i++) {
      const vel = velocities[i] / maxVel
      if (vel < 0.15) {
        const r = baseW * (1.2 - vel * 4)
        ctx.beginPath()
        ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity * 0.7})`
        ctx.fill()
      }
    }
  }
}

// ─── STYLE: BRUSH ────────────────────────────────────────
// Soft painted strokes with gaussian blur and feathered edges
function drawBrush(ctx, pts, velocities, maxVel, color, params) {
  if (pts.length < 2) return
  const rgb = hexToRgb(color)
  const baseW = params.lineWidth * 2.5

  // Multiple passes: glow outer + sharp inner
  const passes = [
    { scale: 3.5, alphaFactor: 0.08, blur: params.blur * 2 },
    { scale: 2.0, alphaFactor: 0.18, blur: params.blur },
    { scale: 1.0, alphaFactor: 0.55, blur: 0 },
  ]

  passes.forEach(({ scale, alphaFactor, blur }) => {
    if (blur > 0) ctx.filter = `blur(${blur}px)`

    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)

    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2
      const my = (pts[i].y + pts[i + 1].y) / 2
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)

    const grad = ctx.createLinearGradient(
      pts[0].x, pts[0].y,
      pts[pts.length - 1].x, pts[pts.length - 1].y
    )
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
    grad.addColorStop(0.1, `rgba(${rgb.r},${rgb.g},${rgb.b},${params.opacity * alphaFactor})`)
    grad.addColorStop(0.9, `rgba(${rgb.r},${rgb.g},${rgb.b},${params.opacity * alphaFactor})`)
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)

    ctx.strokeStyle = grad
    ctx.lineWidth = baseW * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    if (blur > 0) ctx.filter = 'none'
  })
}

// ─── STYLE: GHOST TRAILS ─────────────────────────────────
// Accumulating transparency layers — ethereal persistence
function drawGhost(ctx, pts, velocities, maxVel, color, params) {
  if (pts.length < 2) return
  const rgb = hexToRgb(color)
  const persistence = params.persistence || 0.85
  const segLen = Math.max(8, Math.floor(pts.length / 12))

  for (let s = 0; s < pts.length - 1; s += Math.max(1, Math.floor(segLen * 0.3))) {
    const end = Math.min(s + segLen, pts.length)
    const segment = pts.slice(s, end)
    if (segment.length < 2) continue

    const progress = s / pts.length
    const alpha = params.opacity * (1 - progress) * 0.35 * persistence

    ctx.beginPath()
    ctx.moveTo(segment[0].x, segment[0].y)
    for (let i = 1; i < segment.length - 1; i++) {
      const mx = (segment[i].x + segment[i + 1].x) / 2
      const my = (segment[i].y + segment[i + 1].y) / 2
      ctx.quadraticCurveTo(segment[i].x, segment[i].y, mx, my)
    }
    ctx.lineTo(segment[segment.length - 1].x, segment[segment.length - 1].y)

    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
    ctx.lineWidth = params.lineWidth * (1 + (1 - progress) * 2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  // Bright head of the trail
  const head = pts.slice(-20)
  if (head.length > 1) {
    ctx.beginPath()
    ctx.moveTo(head[0].x, head[0].y)
    head.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${params.opacity * 0.9})`
    ctx.lineWidth = params.lineWidth * 0.7
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

// ─── STYLE: NEON ─────────────────────────────────────────
function drawNeon(ctx, pts, velocities, maxVel, color, params) {
  if (pts.length < 2) return
  const rgb = hexToRgb(color)

  const path = () => {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2
      const my = (pts[i].y + pts[i + 1].y) / 2
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  }

  // Outer glow
  ctx.filter = `blur(${params.blur * 3 + 6}px)`
  path()
  ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${params.opacity * 0.3})`
  ctx.lineWidth = params.lineWidth * 8
  ctx.lineCap = 'round'
  ctx.stroke()

  ctx.filter = `blur(${params.blur + 2}px)`
  path()
  ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${params.opacity * 0.6})`
  ctx.lineWidth = params.lineWidth * 3
  ctx.stroke()

  ctx.filter = 'none'
  path()
  ctx.strokeStyle = `rgba(255,255,255,${params.opacity * 0.95})`
  ctx.lineWidth = params.lineWidth * 0.5
  ctx.stroke()
}

// ─── STYLE: DUST ─────────────────────────────────────────
function drawDust(ctx, pts, velocities, maxVel, color, params) {
  if (pts.length < 2) return
  const rgb = hexToRgb(color)

  for (let i = 0; i < pts.length; i++) {
    const vel = velocities[i] / maxVel
    const numParticles = Math.floor(4 + vel * 12)
    const spread = params.lineWidth * (1 + vel * 3)

    for (let j = 0; j < numParticles; j++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * spread
      const px = pts[i].x + Math.cos(angle) * dist
      const py = pts[i].y + Math.sin(angle) * dist
      const r = Math.random() * params.lineWidth * 0.5 + 0.3
      const a = params.opacity * Math.random() * 0.6 * (1 - dist / spread)
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`
      ctx.fill()
    }
  }
}

// ─── POLYGON OVERLAY ─────────────────────────────────────
function drawPolygon(ctx, pts, params) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
  ctx.closePath()
  ctx.strokeStyle = 'rgba(200,168,76,0.5)'
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  ctx.stroke()
  ctx.setLineDash([])

  // Corner dots
  pts.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200,168,76,0.8)'
    ctx.fill()
  })
}

// ─── BACKGROUNDS ─────────────────────────────────────────
function drawPaperTexture(ctx, W, H) {
  ctx.fillStyle = '#f2ece0'
  ctx.fillRect(0, 0, W, H)
  // Add subtle noise
  const imageData = ctx.getImageData(0, 0, W, H)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18
    data[i] = Math.max(0, Math.min(255, data[i] + n))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * 0.9))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n * 0.7))
  }
  ctx.putImageData(imageData, 0, 0)
}

function drawNoiseTexture(ctx, W, H, intensity) {
  const imageData = ctx.getImageData(0, 0, W, H)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * intensity * 255
    data[i] = Math.max(0, Math.min(255, data[i] + n))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n))
  }
  ctx.putImageData(imageData, 0, 0)
}

// ─── TRANSFORM ───────────────────────────────────────────
function applyTransform(pts, transform) {
  const { translateX = 0, translateY = 0, scale = 1, rotation = 0 } = transform
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return pts.map(({ x, y }) => {
    const rx = (x - cx) * scale
    const ry = (y - cy) * scale
    return {
      x: rx * cos - ry * sin + cx + translateX,
      y: rx * sin + ry * cos + cy + translateY,
    }
  })
}

// ─── EXPORT ──────────────────────────────────────────────
export function exportPNG(canvas, filename = 'gymnast-ink.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function exportSVG(sceneData, params, W, H) {
  const { trajectories, bounds, polygon } = sceneData
  const coordMap = makeCoordMapper(bounds, W, H, 60)
  let paths = ''

  trajectories.forEach((traj, i) => {
    if (!traj.visible) return
    const pts = traj.points.map(coordMap)
    const smoothed = catmullRomSpline(pts, 0.5, 12)
    const color = traj.color || PALETTE[i % PALETTE.length]
    if (smoothed.length < 2) return

    let d = `M ${smoothed[0].x.toFixed(2)} ${smoothed[0].y.toFixed(2)}`
    for (let j = 1; j < smoothed.length; j++) {
      d += ` L ${smoothed[j].x.toFixed(2)} ${smoothed[j].y.toFixed(2)}`
    }
    paths += `<path d="${d}" stroke="${color}" stroke-width="${params.lineWidth}" fill="none" stroke-opacity="${params.opacity}" stroke-linecap="round" stroke-linejoin="round"/>\n`
  })

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0f"/>
  ${paths}
</svg>`

  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const link = document.createElement('a')
  link.download = 'gymnast-ink.svg'
  link.href = URL.createObjectURL(blob)
  link.click()
}

// ─── HELPERS ─────────────────────────────────────────────
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 255, g: 255, b: 255 }
}
