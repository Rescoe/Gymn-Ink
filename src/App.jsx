import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import CanvasRenderer from './components/CanvasRenderer'
import ThreeTrajectoryViewer from './components/ThreeTrajectoryViewer'
import ControlsPanel from './components/ControlsPanel'
import TimelineEditor from './components/TimelineEditor'
import TrajectoryLayer from './components/TrajectoryLayer'
import DropZone from './components/DropZone'
import { parseTrajectoryJSON, sliceTrajectory } from './utils/trajectoryUtils'
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
  const threeViewRef = useRef(null)

  const [rawData, setRawData] = useState(null)
  const [trajectories, setTrajectories] = useState([])
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [frameRange, setFrameRange] = useState([0, 0])
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState('2d')

  const [mobileControlsOpen, setMobileControlsOpen] = useState(false)
  const [mobileLayersOpen, setMobileLayersOpen] = useState(false)
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false)

  const [view2D, setView2D] = useState({
    zoom: 1,
    panX: 0,
    panY: 0,
  })

  const reset2DView = useCallback(() => {
    setView2D({
      zoom: 1,
      panX: 0,
      panY: 0,
    })
  }, [])

  const totalFrames = rawData?.totalFrames || 0

  const { currentFrame, isPlaying, play, pause, stop, speed, setSpeed, setCurrentFrame } =
    useAnimation(frameRange[1] - frameRange[0] + 1)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const closeMobilePanels = useCallback(() => {
    setMobileControlsOpen(false)
    setMobileLayersOpen(false)
    setMobileTimelineOpen(false)
  }, [])

  const handleLoad = useCallback((json) => {
    const parsed = parseTrajectoryJSON(json)
    setRawData(parsed)
    setTrajectories(parsed.trajectories)
    setFrameRange([0, Math.max(0, parsed.totalFrames - 1)])
    stop()
    closeMobilePanels()
  }, [stop, closeMobilePanels])

  const handleLoadPreset = useCallback(async (path) => {
    try {
      const response = await fetch(path)
      const json = await response.json()
      handleLoad(json)
    } catch (error) {
      console.error('Erreur chargement preset:', error)
    }
  }, [handleLoad])

  const handleTrajectoryUpdate = useCallback((id, patch) => {
    setTrajectories(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const handleParamChange = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }, [])

  const sceneData = useMemo(() => {
    if (!rawData) return null
    const slicedTracks = trajectories.map(traj =>
      sliceTrajectory(traj, frameRange[0], frameRange[1])
    )
    return {
      ...rawData,
      trajectories: slicedTracks,
    }
  }, [rawData, trajectories, frameRange])

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
      })),
    }
  }, [
    sceneData,
    params.generative,
    params.genAmplitude,
    params.genFrequency,
    params.genReseed,
  ])

  const absFrame = currentFrame !== null ? currentFrame : null

  const handleExportPNG = () => {
    if (viewMode === '3d') return
    const canvas = canvasRef.current?.getCanvas?.()
    if (canvas) exportPNG(canvas)
  }

  const handleExportSVG = () => {
    if (perturbedScene) exportSVG(perturbedScene, params, 1920, 1080)
  }

  const togglePanel = useCallback((panel) => {
    if (panel === 'controls') {
      setMobileControlsOpen(v => !v)
      setMobileLayersOpen(false)
      setMobileTimelineOpen(false)
    }

    if (panel === 'layers') {
      setMobileLayersOpen(v => !v)
      setMobileControlsOpen(false)
      setMobileTimelineOpen(false)
    }

    if (panel === 'timeline') {
      setMobileTimelineOpen(v => !v)
      setMobileControlsOpen(false)
      setMobileLayersOpen(false)
    }
  }, [])

  const reset3DView = useCallback(() => {
    threeViewRef.current?.resetView?.()
  }, [])

  const resetProject = useCallback(() => {
    setRawData(null)
    setTrajectories([])
    setFrameRange([0, 0])
    setViewMode('2d')
    closeMobilePanels()
  }, [closeMobilePanels])

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          {rawData && (
            <button style={styles.headerBtn} onClick={resetProject}>
              ← new
            </button>
          )}
        </div>

        <div style={styles.headerCenter}>
          {rawData && !isMobile && (
            <span style={styles.headerFile}>
              {rawData.videoPath ? rawData.videoPath.split('/').pop() : 'trajectory data'}
              <span style={styles.headerMeta}>
                {' '}— {trajectories.length} tracks · {totalFrames} frames
              </span>
            </span>
          )}
        </div>

        <div style={styles.headerRight}>
          {rawData && (
            <>
              <button
                style={styles.modeBtn}
                onClick={() => setViewMode(prev => (prev === '2d' ? '3d' : '2d'))}
              >
                {viewMode === '2d' ? '3D' : '2D'}
              </button>

              {viewMode === '3d' && (
                <button style={styles.modeBtn} onClick={reset3DView}>
                  R à Z
                </button>
              )}

              {viewMode === '2d' && (
                <button style={styles.modeBtn} onClick={reset2DView}>
                  R à Z
                </button>
              )}

              <button
                style={{
                  ...styles.exportBtn,
                  ...(viewMode === '3d' ? styles.exportBtnDisabled : null),
                }}
                onClick={handleExportPNG}
                disabled={viewMode === '3d'}
                title={viewMode === '3d' ? 'PNG disponible en vue 2D uniquement' : 'Exporter en PNG'}
              >
                ↓ PNG
              </button>

              <button style={styles.exportBtn} onClick={handleExportSVG}>
                ↓ SVG
              </button>
            </>
          )}
        </div>
      </header>

      <div style={styles.body}>
        {rawData && !isMobile && (
          <div style={styles.desktopPanel}>
            <ControlsPanel
              params={params}
              onParamChange={handleParamChange}
              trajectories={trajectories}
              onTrajectoryUpdate={handleTrajectoryUpdate}
              sceneData={rawData}
            />
          </div>
        )}

        <div style={styles.canvasWrap}>
          {rawData ? (
            <>
              {viewMode === '2d' ? (
                <CanvasRenderer
                  ref={canvasRef}
                  sceneData={perturbedScene}
                  params={params}
                  animFrame={absFrame}
                  view2D={view2D}
                  onViewChange={setView2D}
                />
              ) : (
                <ThreeTrajectoryViewer
                  ref={threeViewRef}
                  sceneData={perturbedScene}
                  params={params}
                  animFrame={absFrame}
                />
              )}

              {!isMobile && (
                <div style={styles.layerPanel}>
                  <TrajectoryLayer
                    trajectories={trajectories}
                    onUpdate={handleTrajectoryUpdate}
                  />
                </div>
              )}

              {isMobile && (
                <>
                  <div style={styles.mobileFabBar}>
                    <button
                      style={styles.mobileFab}
                      onClick={() => togglePanel('controls')}
                    >
                      réglages
                    </button>

                    <button
                      style={styles.mobileFab}
                      onClick={() => togglePanel('layers')}
                    >
                      calques
                    </button>

                    <button
                      style={styles.mobileFab}
                      onClick={() => togglePanel('timeline')}
                    >
                      timeline
                    </button>
                  </div>

                  {(mobileControlsOpen || mobileLayersOpen || mobileTimelineOpen) && (
                    <div style={styles.mobileOverlay} onClick={closeMobilePanels} />
                  )}

                  {mobileControlsOpen && (
                    <div style={styles.mobileSidePanel} onClick={(e) => e.stopPropagation()}>
                      <div style={styles.mobilePanelHeader}>
                        <span>Réglages</span>
                        <button style={styles.mobileCloseBtn} onClick={closeMobilePanels}>
                          ✕
                        </button>
                      </div>

                      <div style={styles.mobilePanelContent}>
                        <ControlsPanel
                          params={params}
                          onParamChange={handleParamChange}
                          trajectories={trajectories}
                          onTrajectoryUpdate={handleTrajectoryUpdate}
                          sceneData={rawData}
                        />
                      </div>
                    </div>
                  )}

                  {mobileLayersOpen && (
                    <div style={styles.mobileSmallPanel} onClick={(e) => e.stopPropagation()}>
                      <div style={styles.mobilePanelHeader}>
                        <span>Calques</span>
                        <button style={styles.mobileCloseBtn} onClick={closeMobilePanels}>
                          ✕
                        </button>
                      </div>

                      <div style={styles.mobilePanelContent}>
                        <TrajectoryLayer
                          trajectories={trajectories}
                          onUpdate={handleTrajectoryUpdate}
                        />
                      </div>
                    </div>
                  )}

                  {mobileTimelineOpen && (
                    <div style={styles.mobileBottomSheet} onClick={(e) => e.stopPropagation()}>
                      <div style={styles.mobilePanelHeader}>
                        <span>Timeline</span>
                        <button style={styles.mobileCloseBtn} onClick={closeMobilePanels}>
                          ✕
                        </button>
                      </div>

                      <div style={styles.mobileTimelineContent}>
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
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <DropZone
              onLoad={handleLoad}
              demoFiles={DEMO_FILES}
              onLoadPreset={handleLoadPreset}
            />
          )}
        </div>
      </div>

      {rawData && !isMobile && (
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
    padding: '0 10px',
    background: '#11131a',
    borderBottom: '1px solid #2f3442',
    flexShrink: 0,
    gap: 8,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 56,
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    overflow: 'hidden',
    padding: '0 8px',
  },
  headerRight: {
    display: 'flex',
    gap: 6,
    minWidth: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headerFile: {
    fontFamily: 'var(--font-mono)',
    color: '#e3e8ef',
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
  },
  headerMeta: {
    color: '#a8b1bf',
    fontSize: 11,
  },
  exportBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  headerBtn: {
    color: '#c3cad6',
    fontSize: 10,
    letterSpacing: '0.06em',
    padding: '4px 8px',
    minHeight: 30,
    background: '#1a1f2a',
    border: '1px solid #343b4d',
    borderRadius: 4,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  modeBtn: {
    padding: '4px 8px',
    minHeight: 30,
    background: '#1a1f2a',
    color: '#9fd3ff',
    border: '1px solid rgba(159,211,255,0.35)',
    borderRadius: 4,
    fontSize: 10,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  exportBtn: {
    padding: '4px 8px',
    minHeight: 30,
    background: '#1a1f2a',
    color: '#e2c26b',
    border: '1px solid rgba(226,194,107,0.35)',
    borderRadius: 4,
    fontSize: 10,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
    minWidth: 0,
  },
  desktopPanel: {
    width: 'var(--panel-width)',
    minWidth: 'var(--panel-width)',
    maxWidth: 'var(--panel-width)',
    overflow: 'auto',
    borderRight: '1px solid #2f3442',
    background: '#11131a',
  },
  canvasWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
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
    color: '#dbe2ea',
    zIndex: 3,
  },
  mobileFabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    zIndex: 5,
    pointerEvents: 'auto',
    flexWrap: 'wrap',
  },
  mobileFab: {
    minHeight: 40,
    padding: '0 12px',
    borderRadius: 999,
    background: 'rgba(17,19,26,0.92)',
    color: '#e3e8ef',
    border: '1px solid #343b4d',
    backdropFilter: 'blur(10px)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    cursor: 'pointer',
  },
  mobileOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.36)',
    zIndex: 6,
  },
  mobileSidePanel: {
    position: 'absolute',
    top: 12,
    left: 12,
    bottom: 64,
    width: 'min(86vw, 340px)',
    background: '#11131a',
    border: '1px solid #2f3442',
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 7,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
  },
  mobileSmallPanel: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 'min(72vw, 260px)',
    maxHeight: '50%',
    background: '#11131a',
    border: '1px solid #2f3442',
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 7,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
  },
  mobileBottomSheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    background: '#11131a',
    border: '1px solid #2f3442',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 7,
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
    maxHeight: '52%',
  },
  mobilePanelHeader: {
    height: 42,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    borderBottom: '1px solid #2f3442',
    background: '#151924',
    color: '#e3e8ef',
    flexShrink: 0,
  },
  mobileCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: '#1a1f2a',
    border: '1px solid #343b4d',
    color: '#c3cad6',
    cursor: 'pointer',
  },
  mobilePanelContent: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
  },
  mobileTimelineContent: {
    overflow: 'auto',
    maxHeight: 'calc(52vh - 42px)',
  },
}