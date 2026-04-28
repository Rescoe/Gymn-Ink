import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { renderScene } from '../utils/renderer'

const CanvasRenderer = forwardRef(function CanvasRenderer(
  { sceneData, params, animFrame, style },
  ref
) {
  const canvasRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }))

  const draw = useCallback(() => {
    if (!canvasRef.current || !sceneData) return
    renderScene(canvasRef.current, sceneData, params, animFrame)
  }, [sceneData, params, animFrame])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = Math.floor(width * window.devicePixelRatio)
        canvas.height = Math.floor(height * window.devicePixelRatio)
        const ctx = canvas.getContext('2d')
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        draw()
      }
    })
    ro.observe(canvas.parentElement || canvas)
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => { draw() }, [draw])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        ...style,
      }}
    />
  )
})

export default CanvasRenderer
