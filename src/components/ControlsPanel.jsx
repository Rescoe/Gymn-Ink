import React, { useState } from 'react'

function Slider({ label, value, min, max, step = 0.01, onChange, display }) {
  return (
    <div style={styles.row}>
      <span style={styles.paramLabel}>{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={styles.slider}
      />
      <span style={styles.paramVal}>{display ? display(value) : value.toFixed(2)}</span>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={styles.section}>
      <button style={styles.sectionHeader} onClick={() => setOpen(o => !o)}>
        <span style={styles.sectionTitle}>{title}</span>
        <span style={{ color: '#444456', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={styles.sectionBody}>{children}</div>}
    </div>
  )
}

export default function ControlsPanel({ params, onParamChange, trajectories, onTrajectoryUpdate, sceneData }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>GYMNAST INK</span>
        <span style={styles.panelSub}>Trajectory Art Studio</span>
      </div>

      <div style={styles.scroll}>

        {/* ── RENDER STYLE ── */}
        <Section title="RENDER STYLE">
          <div style={styles.styleGrid}>
            {['ink', 'brush', 'ghost', 'neon', 'dust'].map(style => (
              <button
                key={style}
                onClick={() => onParamChange('renderStyle', style)}
                style={{
                  ...styles.styleBtn,
                  ...(params.renderStyle === style ? styles.styleBtnActive : {}),
                }}
              >
                {style}
              </button>
            ))}
          </div>
        </Section>

        {/* ── STROKE ── */}
        <Section title="STROKE">
          <Slider label="Width" value={params.lineWidth} min={0.5} max={20} step={0.5}
            display={v => v.toFixed(1) + 'px'} onChange={v => onParamChange('lineWidth', v)} />
          <Slider label="Opacity" value={params.opacity} min={0.05} max={1}
            display={v => Math.round(v * 100) + '%'} onChange={v => onParamChange('opacity', v)} />
          <Slider label="Blur" value={params.blur} min={0} max={20} step={0.5}
            display={v => v.toFixed(1) + 'px'} onChange={v => onParamChange('blur', v)} />
          <Slider label="Smooth" value={params.smoothing} min={0} max={32} step={1}
            display={v => v === 0 ? 'off' : String(Math.round(v))} onChange={v => onParamChange('smoothing', v)} />
          {params.renderStyle === 'ink' && (
            <div style={styles.checkRow}>
              <input type="checkbox" id="inkDots" checked={params.inkDots}
                onChange={e => onParamChange('inkDots', e.target.checked)} />
              <label htmlFor="inkDots" style={styles.checkLabel}>Ink pooling dots</label>
            </div>
          )}
          {params.renderStyle === 'ghost' && (
            <Slider label="Persist" value={params.persistence} min={0.1} max={1}
              display={v => Math.round(v * 100) + '%'} onChange={v => onParamChange('persistence', v)} />
          )}
        </Section>

        {/* ── BACKGROUND ── */}
        <Section title="BACKGROUND">
          <div style={styles.styleGrid}>
            {[['dark', 'Dark'], ['paper', 'Rice Paper'], ['void', 'Void']].map(([val, label]) => (
              <button key={val}
                onClick={() => onParamChange('bgStyle', val)}
                style={{ ...styles.styleBtn, ...(params.bgStyle === val ? styles.styleBtnActive : {}) }}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── DETECTION ── */}
        <Section title="DETECTION ZONE" defaultOpen={false}>
          <div style={styles.checkRow}>
            <input type="checkbox" id="showPoly" checked={params.showPolygon}
              onChange={e => onParamChange('showPolygon', e.target.checked)} />
            <label htmlFor="showPoly" style={styles.checkLabel}>Show polygon</label>
          </div>
          <div style={styles.checkRow}>
            <input type="checkbox" id="clipPoly" checked={params.clipToPolygon}
              onChange={e => onParamChange('clipToPolygon', e.target.checked)} />
            <label htmlFor="clipPoly" style={styles.checkLabel}>Clip to polygon</label>
          </div>
          {sceneData?.polygon?.length > 0 && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>{sceneData.polygon.length} vertices</span>
            </div>
          )}
        </Section>

        {/* ── TRANSFORM (per trajectory) ── */}
        {trajectories && trajectories.length > 0 && (
          <Section title="TRANSFORM" defaultOpen={false}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Select a trajectory color to transform it individually (coming soon)</span>
            </div>
            <Slider label="Global Scale" value={params.globalScale} min={0.1} max={3} step={0.05}
              display={v => v.toFixed(2) + '×'} onChange={v => onParamChange('globalScale', v)} />
            <Slider label="Rotation" value={params.globalRotation} min={-Math.PI} max={Math.PI} step={0.05}
              display={v => Math.round(v * 180 / Math.PI) + '°'} onChange={v => onParamChange('globalRotation', v)} />
          </Section>
        )}

        {/* ── GENERATIVE ── */}
        <Section title="GENERATIVE" defaultOpen={false}>
          <div style={styles.checkRow}>
            <input type="checkbox" id="genMode" checked={params.generative}
              onChange={e => onParamChange('generative', e.target.checked)} />
            <label htmlFor="genMode" style={styles.checkLabel}>Perturbations aléatoires</label>
          </div>
          {params.generative && (
            <>
              <Slider label="Amplitude" value={params.genAmplitude} min={0} max={40} step={1}
                display={v => Math.round(v) + 'px'} onChange={v => onParamChange('genAmplitude', v)} />
              <Slider label="Frequency" value={params.genFrequency} min={0.005} max={0.1} step={0.005}
                display={v => v.toFixed(3)} onChange={v => onParamChange('genFrequency', v)} />
              <div style={styles.checkRow}>
                <input type="checkbox" id="genSeed" checked={params.genReseed}
                  onChange={e => onParamChange('genReseed', e.target.checked)} />
                <label htmlFor="genSeed" style={styles.checkLabel}>Reseed on render</label>
              </div>
            </>
          )}
        </Section>

        {/* ── DATA INFO ── */}
        {sceneData && (
          <Section title="DATA" defaultOpen={false}>
            <div style={styles.infoGrid}>
              <span style={styles.infoKey}>Tracks</span>
              <span style={styles.infoVal}>{sceneData.trajectories.length}</span>
              <span style={styles.infoKey}>Frames</span>
              <span style={styles.infoVal}>{sceneData.totalFrames}</span>
              <span style={styles.infoKey}>Bounds</span>
              <span style={styles.infoVal}>
                {Math.round(sceneData.bounds.maxX - sceneData.bounds.minX)}×
                {Math.round(sceneData.bounds.maxY - sceneData.bounds.minY)}
              </span>
            </div>
          </Section>
        )}

      </div>
    </div>
  )
}

const styles = {
  panel: {
    width: 'var(--panel-width)',
    display: 'flex',
    flexDirection: 'column',
    background: '#0d0d18',
    borderRight: '1px solid #1e1e2e',
    height: '100%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  panelHeader: {
    padding: '14px 16px 10px',
    borderBottom: '1px solid #1e1e2e',
  },
  panelTitle: {
    display: 'block',
    fontFamily: 'var(--font-serif)',
    fontSize: 22,
    fontWeight: 300,
    letterSpacing: '0.12em',
    color: '#e8e4dc',
    fontStyle: 'italic',
  },
  panelSub: {
    display: 'block',
    color: '#444456',
    fontSize: 9,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  section: {
    borderBottom: '1px solid #1a1a28',
  },
  sectionHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 16px',
    cursor: 'pointer',
    color: '#888898',
    background: 'none',
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: '0.14em',
    color: '#666676',
  },
  sectionBody: {
    padding: '4px 16px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  paramLabel: {
    color: '#666676',
    fontSize: 10,
    letterSpacing: '0.06em',
    minWidth: 52,
  },
  slider: {
    flex: 1,
  },
  paramVal: {
    color: '#8888a0',
    fontSize: 10,
    minWidth: 36,
    textAlign: 'right',
    fontFamily: 'var(--font-mono)',
  },
  styleGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  styleBtn: {
    padding: '4px 10px',
    background: '#1a1a26',
    color: '#666676',
    border: '1px solid #2a2a3a',
    borderRadius: 2,
    fontSize: 10,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'var(--font-mono)',
  },
  styleBtnActive: {
    background: '#1e2230',
    color: '#c9a84c',
    borderColor: '#c9a84c55',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  checkLabel: {
    color: '#666676',
    fontSize: 10,
    cursor: 'pointer',
  },
  infoRow: {
    padding: '2px 0',
  },
  infoLabel: {
    color: '#444456',
    fontSize: 10,
    fontStyle: 'italic',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '3px 12px',
  },
  infoKey: {
    color: '#444456',
    fontSize: 10,
  },
  infoVal: {
    color: '#6688aa',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
  },
}
