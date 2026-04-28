/**
 * Parse an Ultralytics tracking JSON file
 * Supports both raw format and extended format with metadata
 */
export function parseTrajectoryJSON(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json

  // Normalize to internal format
  const trajectories = (data.trajectories || []).map((pts, i) => ({
    id: i,
    points: pts.map(([x, y]) => ({ x, y })),
    visible: true,
    color: null, // auto-assigned by renderer
    segments: [], // populated by timeline slicing
  }))

  // Compute bounding box of all trajectories
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  trajectories.forEach(traj => {
    traj.points.forEach(({ x, y }) => {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    })
  })

  // Include polygon in bounds if present
  const polygon = data.detection_polygon || []
  polygon.forEach(([x, y]) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  })

  return {
    videoPath: data.video_path || '',
    polygon: polygon.map(([x, y]) => ({ x, y })),
    trajectories,
    bounds: { minX, minY, maxX, maxY },
    totalFrames: Math.max(...trajectories.map(t => t.points.length), 0),
  }
}

/**
 * Compute per-point velocity (distance to next point)
 */
export function computeVelocities(points) {
  return points.map((pt, i) => {
    if (i === points.length - 1) return 0
    const dx = points[i + 1].x - pt.x
    const dy = points[i + 1].y - pt.y
    return Math.sqrt(dx * dx + dy * dy)
  })
}

/**
 * Catmull-Rom spline interpolation
 * Returns a dense array of interpolated points
 */
export function catmullRomSpline(points, tension = 0.5, segments = 16) {
  if (points.length < 2) return points
  const result = []

  const getPoint = (i) => {
    const clamped = Math.max(0, Math.min(points.length - 1, i))
    return points[clamped]
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = getPoint(i - 1)
    const p1 = getPoint(i)
    const p2 = getPoint(i + 1)
    const p3 = getPoint(i + 2)

    for (let t = 0; t < segments; t++) {
      const u = t / segments
      const u2 = u * u
      const u3 = u2 * u

      const b0 = -tension * u3 + 2 * tension * u2 - tension * u
      const b1 = (2 - tension) * u3 + (tension - 3) * u2 + 1
      const b2 = (tension - 2) * u3 + (3 - 2 * tension) * u2 + tension * u
      const b3 = tension * u3 - tension * u2

      result.push({
        x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
        y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
      })
    }
  }

  result.push(points[points.length - 1])
  return result
}

/**
 * Slice a trajectory's points by frame range
 */
export function sliceTrajectory(trajectory, startFrame, endFrame) {
  return {
    ...trajectory,
    points: trajectory.points.slice(startFrame, endFrame + 1),
  }
}

/**
 * Apply a 2D transform to a set of points
 */
export function transformPoints(points, { translateX = 0, translateY = 0, scale = 1, rotation = 0, cx = 0, cy = 0 }) {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return points.map(({ x, y }) => {
    // Center
    const rx = x - cx
    const ry = y - cy
    // Scale
    const sx = rx * scale
    const sy = ry * scale
    // Rotate
    const nx = sx * cos - sy * sin
    const ny = sx * sin + sy * cos
    // Translate + re-center
    return { x: nx + cx + translateX, y: ny + cy + translateY }
  })
}

/**
 * Map data coordinates to canvas coordinates
 */
export function makeCoordMapper(bounds, canvasW, canvasH, padding = 40) {
  const rangeX = bounds.maxX - bounds.minX || 1
  const rangeY = bounds.maxY - bounds.minY || 1
  const scaleX = (canvasW - padding * 2) / rangeX
  const scaleY = (canvasH - padding * 2) / rangeY
  const s = Math.min(scaleX, scaleY)
  const offX = (canvasW - rangeX * s) / 2
  const offY = (canvasH - rangeY * s) / 2
  return (pt) => ({
    x: (pt.x - bounds.minX) * s + offX,
    y: (pt.y - bounds.minY) * s + offY,
  })
}

/**
 * Generate a distinct hue for each trajectory
 */
export function trajectoryHue(index, total) {
  return (index / Math.max(total, 1)) * 360
}


/**
 * Load demo data from /public/LovinaBrejou.json
 * Falls back to generated data if fetch fails
 */
export async function loadDemoData() {  // ← Syntaxe correcte
  const response = await fetch('/LovinaBrejou.json')
  if (!response.ok) {
    console.warn('Demo file not found, using generated data')
    return generateDemoData(5, 400) // fallback
  }
  return response.json()
}

