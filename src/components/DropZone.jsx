import React, { useRef, useState } from 'react'

export default function DropZone({ onLoad }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  const readFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.json')) {
      setError('Please select a .json file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result)
        onLoad(json)
        setError(null)
      } catch (err) {
        setError('Invalid JSON: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div
      style={{ ...styles.zone, ...(dragging ? styles.zoneDrag : {}) }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        readFile(e.dataTransfer.files[0])
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={e => readFile(e.target.files[0])}
      />

      <div style={styles.inner}>
        <div style={styles.icon}>⬡</div>
        <div style={styles.main}>Ajouter un fichier</div>
        <div style={styles.sub}>Selectionner une trajectoire.json</div>
        <div style={styles.format}>Ultralytics YOLO tracking format</div>
        {error && <div style={styles.error}>{error}</div>}
      </div>
    </div>
  )
}

const styles = {
  zone: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
    background: 'radial-gradient(ellipse at center, #0f0f1e 0%, #08080f 100%)',
  },
  zoneDrag: {
    background: 'radial-gradient(ellipse at center, #14142a 0%, #0a0a18 100%)',
  },
  inner: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    maxWidth: 360,
    padding: 40,
    border: '1px solid #2a2a3a',
    borderRadius: 4,
    animation: 'fadeIn 0.6s ease',
  },
  icon: {
    fontSize: 42,
    color: '#2a2a3a',
    lineHeight: 1,
    marginBottom: 4,
  },
  main: {
    fontFamily: 'var(--font-serif)',
    fontSize: 26,
    fontStyle: 'italic',
    fontWeight: 300,
    color: '#c8c4bc',
    letterSpacing: '0.04em',
  },
  sub: {
    color: '#555566',
    fontSize: 11,
    letterSpacing: '0.08em',
  },
  format: {
    color: '#3a3a50',
    fontSize: 9,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  error: {
    color: '#c0392b',
    fontSize: 11,
    marginTop: 8,
    padding: '6px 12px',
    background: 'rgba(192,57,43,0.1)',
    border: '1px solid rgba(192,57,43,0.3)',
    borderRadius: 2,
  },
}
