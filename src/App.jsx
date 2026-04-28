import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import CanvasRenderer from './components/CanvasRenderer'
import ControlsPanel from './components/ControlsPanel'
import TimelineEditor from './components/TimelineEditor'
import TrajectoryLayer from './components/TrajectoryLayer'
import DropZone from './components/DropZone'
import { parseTrajectoryJSON, loadDemoData, sliceTrajectory } from './utils/trajectoryUtils'
import { exportPNG, exportSVG } from './utils/renderer'
import { useAnimation } from './hooks/useAnimation'

const DEFAULT_PARAMS = {
  renderStyle: 'ink',
  lineWidth: 3,
  opacity: 0.85,
  blur: 0,
  smoothing: 12,
  inkDots: true,
  persistence: 0.85,
  bgStyle: 'dark',
  showPolygon: true,
  clipToPolygon: false,
  globalScale: 1,
  globalRotation: 0,
  generative: false,
  genAmplitude: 10,
  genFrequency: 0.02,
  genReseed: false,
}

const DEMO_FILES = [
  { label: 'Trajectoire Complet Decoupé', path: '/TrajectoireCompletDecoup.json' },
  { label: 'Trajectoire Complet Uni', path: '/LovinaBrejou.json' },
  { label: 'Video1 Trajectoire 1&2', path: '/Video1 Trajectoire 1&2.json' },
  { label: 'Video2 Trajectoire 3&4', path: '/Video2 Trajectoire 3&4.json' },
]



export default function App() {
  const canvasRef = useRef(null)
  const [rawData, setRawData] = useState(null)
  const [trajectories, setTrajectories] = useState([])
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [frameRange, setFrameRange] = useState([0, 0])
  const totalFrames = rawData?.totalFrames || 0

  const { currentFrame, isPlaying, play, pause, stop, speed, setSpeed, setCurrentFrame } =
    useAnimation(frameRange[1] - frameRange[0] + 1)

  // Load JSON
  const handleLoad = useCallback((json) => {
    const parsed = parseTrajectoryJSON(json)
    setRawData(parsed)
    setTrajectories(parsed.trajectories)
    setFrameRange([0, Math.max(0, parsed.totalFrames - 1)])
    stop()
  }, [stop])

  const handleLoadPreset = useCallback(async (path) => {
  try {
    const response = await fetch(path)
    if (!response.ok) throw new Error(`Failed to load ${path}`)
    const raw = await response.json()
    handleLoad(raw)
  } catch (err) {
    console.error('Unable to load preset file:', err)
  }
}, [handleLoad])



const handleLoadDemo = useCallback(async () => {
  const raw = await loadDemoData()
  handleLoad(raw)
}, [handleLoad])

  // Update a trajectory property
  const handleTrajectoryUpdate = useCallback((id, patch) => {
    setTrajectories(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }, [])

  // Update a single param
  const handleParamChange = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }, [])

  // Build scene data from current state (sliced + transformed)
  const sceneData = useMemo(() => {
    if (!rawData) return null
    const slicedTracks = trajectories.map(traj => sliceTrajectory(traj, frameRange[0], frameRange[1]))
    return {
      ...rawData,
      trajectories: slicedTracks,
    }
  }, [rawData, trajectories, frameRange])

  // Generative perturbations
  const perturbedScene = useMemo(() => {
    if (!sceneData || !params.generative) return sceneData
    const seed = params.genReseed ? Math.random() : 42
    const amp = params.genAmplitude
    const freq = params.genFrequency
    return {
      ...sceneData,
      trajectories: sceneData.trajectories.map(traj => ({
        ...traj,
        points: traj.points.map((pt, i) => ({
          x: pt.x + Math.sin(i * freq + seed) * amp * (Math.random() * 0.5 + 0.5),
          y: pt.y + Math.cos(i * freq * 1.3 + seed) * amp * (Math.random() * 0.5 + 0.5),
        })),
      }))
    }
  }, [sceneData, params.generative, params.genAmplitude, params.genFrequency])

  // Absolute frame for animation (offset by frameRange start)
  const absFrame = currentFrame !== null ? currentFrame : null

  const handleExportPNG = () => {
    const canvas = canvasRef.current?.getCanvas()
    if (canvas) exportPNG(canvas)
  }
  const handleExportSVG = () => {
    if (perturbedScene) exportSVG(perturbedScene, params, 1920, 1080)
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          {rawData && (
            <button style={styles.headerBtn} onClick={() => { setRawData(null); setTrajectories([]) }}>
              ← new
            </button>
          )}
        </div>
        <div style={styles.headerCenter}>
          {rawData && (
            <span style={styles.headerFile}>
              {rawData.videoPath ? rawData.videoPath.split('/').pop() : 'trajectory data'}
              <span style={styles.headerMeta}> — {trajectories.length} tracks · {totalFrames} frames</span>
            </span>
          )}
        </div>
        <div style={styles.headerRight}>
          {rawData && (
            <>
              <button style={styles.exportBtn} onClick={handleExportPNG}>↓ PNG</button>
              <button style={styles.exportBtn} onClick={handleExportSVG}>↓ SVG</button>
            </>
          )}
        </div>
      </header>

      {/* Main body */}
      <div style={styles.body}>
        {/* Left panel */}
        {rawData && (
          <ControlsPanel
            params={params}
            onParamChange={handleParamChange}
            trajectories={trajectories}
            onTrajectoryUpdate={handleTrajectoryUpdate}
            sceneData={rawData}
          />
        )}

        {/* Canvas area */}
        <div style={styles.canvasWrap}>
          {rawData ? (
            <>
              <CanvasRenderer
                ref={canvasRef}
                sceneData={perturbedScene}
                params={params}
                animFrame={absFrame}
              />
              {/* Trajectory list overlay (top-right) */}
              <div style={styles.layerPanel}>
                <TrajectoryLayer
                  trajectories={trajectories}
                  onUpdate={handleTrajectoryUpdate}
                />
              </div>
            </>
          ) : (
            <DropZone onLoad={handleLoad} />
          )}


          {/* Demo button (when no data) */}


          {!rawData && (
  <div style={styles.demoList}>
            <div style={styles.main}>Fichiers Traités :</div>

    {DEMO_FILES.map(file => (
      <button
        key={file.path}
        style={styles.demoBtn}
        onClick={() => handleLoadPreset(file.path)}
      >
        {file.label}
      </button>
    ))}
  </div>
)}


        </div>
      </div>

      {/* Timeline */}
      {rawData && (
        <TimelineEditor
          totalFrames={totalFrames}
          currentFrame={currentFrame !== null ? currentFrame + frameRange[0] : null}
          frameRange={frameRange}
          onFrameRangeChange={setFrameRange}
          onFrameSeek={f => setCurrentFrame(Math.max(0, f - frameRange[0]))}
          isPlaying={isPlaying}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          speed={speed}
          onSpeedChange={setSpeed}
          trajectories={trajectories}
        />
      )}
    </div>
  )
}

const styles = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#0b0c10',
  },

  header: {
    height: 'var(--header-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    background: '#11131a',
    borderBottom: '1px solid #2f3442',
    flexShrink: 0,
    gap: 12,
  },

  headerLeft: { display: 'flex', alignItems: 'center', minWidth: 80 },
  headerCenter: { flex: 1, textAlign: 'center' },
  headerRight: { display: 'flex', gap: 8, minWidth: 120, justifyContent: 'flex-end' },

  headerBtn: {
    color: '#c3cad6',
    fontSize: 11,
    letterSpacing: '0.08em',
    padding: '4px 9px',
    background: '#1a1f2a',
    border: '1px solid #343b4d',
    borderRadius: 3,
    cursor: 'pointer',
  },

  headerFile: {
    fontFamily: 'var(--font-mono)',
    color: '#e3e8ef',
    fontSize: 12,
  },

  headerMeta: {
    color: '#a8b1bf',
    fontSize: 11,
  },

  exportBtn: {
    padding: '5px 12px',
    background: '#1a1f2a',
    color: '#e2c26b',
    border: '1px solid rgba(226,194,107,0.35)',
    borderRadius: 3,
    fontSize: 11,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  },

  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
  },

  canvasWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: '#0b0c10',
  },

  layerPanel: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(20,24,34,0.92)',
    border: '1px solid #31384a',
    borderRadius: 4,
    padding: '8px 10px',
    minWidth: 180,
    maxWidth: 220,
    backdropFilter: 'blur(8px)',
    animation: 'fadeIn 0.3s ease',
    color: '#dbe2ea',
  },

  demoBtn: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '9px 24px',
    background: 'rgba(26,31,42,0.9)',
    color: '#c4ccda',
    border: '1px solid #353d50',
    borderRadius: 3,
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    transition: 'color 0.2s, border-color 0.2s, background 0.2s',
  },

  demoList: {
  position: 'absolute',
  bottom: 30,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'center',
  maxWidth: '80%',
},

}
