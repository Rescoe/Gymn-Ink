import React, { useRef, useState, useCallback } from 'react'

export default function TimelineEditor({
  totalFrames,
  currentFrame,
  frameRange,
  onFrameRangeChange,
  onFrameSeek,
  isPlaying,
  onPlay,
  onPause,
  onStop,
  speed,
  onSpeedChange,
  trajectories,
}) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(null) // 'start' | 'end' | 'playhead'

  const getFrameFromX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * (totalFrames - 1))
  }, [totalFrames])

  const handleMouseDown = useCallback((e, handle) => {
    e.preventDefault()
    setDragging(handle)

    const onMove = (me) => {
      const frame = getFrameFromX(me.clientX)
      if (handle === 'start') {
        onFrameRangeChange([Math.min(frame, frameRange[1] - 1), frameRange[1]])
      } else if (handle === 'end') {
        onFrameRangeChange([frameRange[0], Math.max(frame, frameRange[0] + 1)])
      } else if (handle === 'track') {
        onFrameSeek(frame)
      }
    }
    const onUp = () => {
      setDragging(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [frameRange, getFrameFromX, onFrameRangeChange, onFrameSeek])

  const toPercent = (frame) => `${(frame / Math.max(totalFrames - 1, 1)) * 100}%`

  const startPct = toPercent(frameRange[0])
  const endPct = toPercent(frameRange[1])
  const headPct = currentFrame !== null ? toPercent(currentFrame) : null

  // Minimap: draw sparklines per trajectory
  const maxPts = Math.max(...(trajectories?.map(t => t.points.length) || [1]), 1)

  return (
    <div style={styles.container}>
      {/* Transport controls */}
      <div style={styles.transport}>
        <button onClick={onStop} style={styles.btn} title="Stop">
          ■
        </button>
        <button
          onClick={isPlaying ? onPause : onPlay}
          style={{ ...styles.btn, ...styles.btnPlay }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={styles.frameInfo}>
          <span style={styles.frameNum}>
            {currentFrame !== null ? String(currentFrame).padStart(4, '0') : '----'}
          </span>
          <span style={styles.frameSep}>/</span>
          <span style={styles.frameTot}>{String(totalFrames).padStart(4, '0')}</span>
        </div>

        <div style={styles.speedGroup}>
          <span style={styles.speedLabel}>×</span>
          <select
            value={speed}
            onChange={e => onSpeedChange(parseFloat(e.target.value))}
            style={styles.speedSelect}
          >
            <option value={0.25}>0.25</option>
            <option value={0.5}>0.5</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </div>

        <div style={styles.rangeInfo}>
          <span style={styles.rangeLabel}>RANGE</span>
          <span style={styles.rangeVal}>{frameRange[0]}–{frameRange[1]}</span>
        </div>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        style={styles.track}
        onMouseDown={e => handleMouseDown(e, 'track')}
      >
        {/* Trajectory density heatmap */}
        {trajectories && <TrackHeatmap trajectories={trajectories} totalFrames={totalFrames} />}

        {/* Selected range highlight */}
        <div style={{
          ...styles.rangeHighlight,
          left: startPct,
          width: `calc(${endPct} - ${startPct})`,
        }} />

        {/* Playhead */}
        {headPct && (
          <div style={{ ...styles.playhead, left: headPct }} />
        )}

        {/* Range handles */}
        <div
          style={{ ...styles.handle, ...styles.handleStart, left: startPct }}
          onMouseDown={e => { e.stopPropagation(); handleMouseDown(e, 'start') }}
        />
        <div
          style={{ ...styles.handle, ...styles.handleEnd, left: endPct }}
          onMouseDown={e => { e.stopPropagation(); handleMouseDown(e, 'end') }}
        />
      </div>

      {/* Range sliders (fallback / fine control) */}
      <div style={styles.sliders}>
        <div style={styles.sliderGroup}>
          <span style={styles.sliderLabel}>IN</span>
          <input
            type="range" min={0} max={Math.max(0, frameRange[1] - 1)}
            value={frameRange[0]}
            onChange={e => onFrameRangeChange([+e.target.value, frameRange[1]])}
            style={styles.slider}
          />
          <span style={styles.sliderVal}>{frameRange[0]}</span>
        </div>
        <div style={styles.sliderGroup}>
          <span style={styles.sliderLabel}>OUT</span>
          <input
            type="range" min={Math.min(frameRange[0] + 1, totalFrames - 1)} max={totalFrames - 1}
            value={frameRange[1]}
            onChange={e => onFrameRangeChange([frameRange[0], +e.target.value])}
            style={styles.slider}
          />
          <span style={styles.sliderVal}>{frameRange[1]}</span>
        </div>
      </div>
    </div>
  )
}

function TrackHeatmap({ trajectories, totalFrames }) {
  const BINS = 120
  const counts = new Array(BINS).fill(0)
  trajectories?.forEach(t => {
    t.points.forEach((_, fi) => {
      const bin = Math.floor((fi / Math.max(t.points.length, 1)) * BINS)
      if (bin < BINS) counts[bin]++
    })
  })
  const max = Math.max(...counts, 1)

  return (
    <div style={styles.heatmap}>
      {counts.map((c, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(c / max) * 100}%`,
            background: `rgba(100,136,170,${0.15 + (c / max) * 0.5})`,
            alignSelf: 'flex-end',
          }}
        />
      ))}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 12px 10px',
    background: '#0e0e18',
    borderTop: '1px solid #2a2a3a',
    userSelect: 'none',
  },
  transport: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  btn: {
    color: '#888898',
    padding: '2px 6px',
    fontSize: 12,
    borderRadius: 2,
    transition: 'color 0.15s',
    background: '#1a1a26',
    border: '1px solid #2a2a3a',
  },
  btnPlay: {
    color: '#c9a84c',
    borderColor: '#c9a84c55',
  },
  frameInfo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 3,
    fontFamily: 'var(--font-mono)',
  },
  frameNum: {
    color: '#c9a84c',
    fontSize: 13,
    letterSpacing: '0.05em',
  },
  frameSep: {
    color: '#444456',
    fontSize: 10,
  },
  frameTot: {
    color: '#555566',
    fontSize: 11,
  },
  speedGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  speedLabel: {
    color: '#555566',
    fontSize: 10,
  },
  speedSelect: {
    fontSize: 10,
    padding: '2px 4px',
    background: '#1a1a26',
    color: '#888898',
    border: '1px solid #2a2a3a',
  },
  rangeInfo: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
  },
  rangeLabel: {
    color: '#444456',
    fontSize: 9,
    letterSpacing: '0.1em',
  },
  rangeVal: {
    color: '#6688aa',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
  },
  track: {
    position: 'relative',
    height: 32,
    background: '#12121a',
    border: '1px solid #2a2a3a',
    borderRadius: 2,
    cursor: 'crosshair',
    overflow: 'hidden',
  },
  heatmap: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 0,
  },
  rangeHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    background: 'rgba(100,136,170,0.18)',
    borderLeft: '1px solid rgba(100,136,170,0.5)',
    borderRight: '1px solid rgba(100,136,170,0.5)',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    background: '#c9a84c',
    pointerEvents: 'none',
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    background: 'rgba(100,136,170,0.7)',
    cursor: 'ew-resize',
    zIndex: 2,
  },
  handleStart: { marginLeft: -3 },
  handleEnd: { marginLeft: -3 },
  sliders: {
    display: 'flex',
    gap: 12,
  },
  sliderGroup: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  sliderLabel: {
    color: '#444456',
    fontSize: 9,
    letterSpacing: '0.1em',
    minWidth: 20,
  },
  slider: {
    flex: 1,
  },
  sliderVal: {
    color: '#6688aa',
    fontSize: 10,
    minWidth: 30,
    textAlign: 'right',
  },
}
