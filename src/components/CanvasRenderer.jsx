import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { renderScene } from '../utils/renderer'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 12
const ZOOM_FACTOR = 1.1

const CanvasRenderer = forwardRef(function CanvasRenderer(
  { sceneData, params, animFrame, style, view2D, onViewChange },
  ref
) {
  const canvasRef = useRef(null)
  const dragRef = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
  })

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }))

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement || canvas
    const rect = parent.getBoundingClientRect()
    const dpr = Math.max(1, window.devicePixelRatio || 1)

    const cssWidth = Math.max(1, Math.round(rect.width))
    const cssHeight = Math.max(1, Math.round(rect.height))
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr))
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr))

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !sceneData) return
    resizeCanvas()
    renderScene(canvas, sceneData, params, animFrame, view2D)
  }, [sceneData, params, animFrame, view2D, resizeCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement || canvas
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(draw)
    })

    ro.observe(parent)
    window.addEventListener('resize', draw)
    requestAnimationFrame(draw)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', draw)
    }
  }, [draw])

  useEffect(() => {
    requestAnimationFrame(draw)
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !onViewChange) return

    const getPoint = (e) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const onWheel = (e) => {
      e.preventDefault()

      const pt = getPoint(e)
      const oldZoom = view2D?.zoom ?? 1
      const direction = e.deltaY < 0 ? 1 : -1
      const factor = direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * factor))

      if (newZoom === oldZoom) return

      const panX = view2D?.panX ?? 0
      const panY = view2D?.panY ?? 0

      const worldX = (pt.x - panX) / oldZoom
      const worldY = (pt.y - panY) / oldZoom

      const newPanX = pt.x - worldX * newZoom
      const newPanY = pt.y - worldY * newZoom

      onViewChange({
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY,
      })
    }

    const onPointerDown = (e) => {
      dragRef.current.active = true
      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
      canvas.setPointerCapture?.(e.pointerId)
    }

    const onPointerMove = (e) => {
      if (!dragRef.current.active) return

      const dx = e.clientX - dragRef.current.lastX
      const dy = e.clientY - dragRef.current.lastY

      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY

      onViewChange(prev => ({
        zoom: prev.zoom,
        panX: prev.panX + dx,
        panY: prev.panY + dy,
      }))
    }

    const onPointerUp = (e) => {
      dragRef.current.active = false
      canvas.releasePointerCapture?.(e.pointerId)
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
    }
  }, [view2D, onViewChange])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: dragRef.current.active ? 'grabbing' : 'grab',
        touchAction: 'none',
        ...style,
      }}
    />
  )
})

export default CanvasRenderer