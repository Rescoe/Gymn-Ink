import React from 'react'

const PALETTE = [
  '#c0392b', '#c9a84c', '#5b8ca8', '#7c9c6e',
  '#a86b5b', '#7a5ba8', '#5ba88c', '#a85b88',
]

export default function TrajectoryLayer({ trajectories, onUpdate }) {
  if (!trajectories || trajectories.length === 0) return null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>TRAJECTORIES</span>
        <span style={styles.count}>{trajectories.length}</span>
      </div>
      <div style={styles.list}>
        {trajectories.map((traj, i) => (
          <TrajectoryItem
            key={traj.id}
            traj={traj}
            index={i}
            defaultColor={PALETTE[i % PALETTE.length]}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  )
}

function TrajectoryItem({ traj, index, defaultColor, onUpdate }) {
  const color = traj.color || defaultColor

  return (
    <div style={{ ...styles.item, opacity: traj.visible ? 1 : 0.4 }}>
      {/* Color dot + visibility toggle */}
      <button
        onClick={() => onUpdate(traj.id, { visible: !traj.visible })}
        style={{ ...styles.dot, background: color, boxShadow: traj.visible ? `0 0 6px ${color}` : 'none' }}
        title="Toggle visibility"
      />

      {/* Label */}
      <span style={styles.label}>
        Track {index + 1}
        <span style={styles.pts}>{traj.points.length}pts</span>
      </span>

      {/* Color picker */}
      <input
        type="color"
        value={color}
        onChange={e => onUpdate(traj.id, { color: e.target.value })}
        style={styles.colorPicker}
        title="Color"
      />
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0 4px',
    borderBottom: '1px solid #2a2a3a',
    marginBottom: 4,
  },
  title: {
    color: '#888898',
    fontSize: 10,
    letterSpacing: '0.12em',
  },
  count: {
    background: '#2a2a3a',
    color: '#c9a84c',
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 2,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: 200,
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 6px',
    background: '#12121a',
    borderRadius: 3,
    transition: 'opacity 0.2s',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'box-shadow 0.2s',
  },
  label: {
    flex: 1,
    color: '#c8c4bc',
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  pts: {
    color: '#555566',
    fontSize: 10,
  },
  colorPicker: {
    width: 22,
    height: 16,
    padding: 0,
    border: '1px solid #2a2a3a',
    cursor: 'pointer',
    background: 'none',
  },
}
