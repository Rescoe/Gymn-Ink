import { useRef, useState, useCallback, useEffect } from 'react'

export function useAnimation(totalFrames) {
  const [currentFrame, setCurrentFrame] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)
  const frameRef = useRef(0)

  const stop = useCallback(() => {
    setIsPlaying(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setCurrentFrame(null)
  }, [])

  const play = useCallback(() => {
    if (totalFrames === 0) return
    frameRef.current = 0
    setCurrentFrame(0)
    setIsPlaying(true)
  }, [totalFrames])

  const pause = useCallback(() => {
    setIsPlaying(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    const FPS = 30 * speed

    const tick = (time) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time
      const elapsed = time - lastTimeRef.current

      if (elapsed > 1000 / FPS) {
        lastTimeRef.current = time
        frameRef.current += 1
        if (frameRef.current >= totalFrames) {
          frameRef.current = 0
        }
        setCurrentFrame(frameRef.current)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    lastTimeRef.current = null
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, totalFrames, speed])

  return { currentFrame, isPlaying, play, pause, stop, speed, setSpeed, setCurrentFrame }
}
