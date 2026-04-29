import React, { useRef, useState, useCallback, useMemo } from 'react'

export default function DropZone({ onLoad, demoFiles = [], onLoadPreset }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showDemos, setShowDemos] = useState(false)

  const DEMO_FILES = useMemo(() => [
    { label: 'Trajectoire Complet Decoupé', path: '/TrajectoireCompletDecoup.json' },
    { label: 'Trajectoire Complet Uni', path: '/LovinaBrejou.json' },
    { label: 'Video1 Trajectoire 1&2', path: '/Video1 Trajectoire 1&2.json' },
    { label: 'Video2 Trajectoire 3&4', path: '/Video2 Trajectoire 3&4.json' },
  ], [])

  const hasDemos = useMemo(() => Array.isArray(demoFiles) && demoFiles.length > 0, [demoFiles])

  const handleLoad = useCallback((raw) => {
    onLoad(raw)
    setError(null)
  }, [onLoad])

  const handleLoadPreset = useCallback(async (path) => {
    try {
      const response = await fetch(path)
      if (!response.ok) throw new Error(`Failed to load ${path}`)
      const raw = await response.json()
      handleLoad(raw)
      setShowDemos(false)
    } catch (err) {
      console.error('Unable to load preset file:', err)
      setError('Erreur chargement démo: ' + err.message)
    }
  }, [handleLoad])

  const readFile = useCallback((file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Veuillez sélectionner un fichier .json')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result)
        handleLoad(json)
      } catch (err) {
        setError('JSON invalide : ' + err.message)
      }
    }
    reader.readAsText(file)
  }, [handleLoad])

  return (
    <div
      style={{ ...styles.zone, ...(dragging ? styles.zoneDrag : {}) }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files[0]) {
          readFile(e.dataTransfer.files[0])
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={(e) => readFile(e.target.files[0])}
      />

      <div style={styles.centerWrap}>
        <div style={styles.heroCard}>
          <div style={styles.badge}>Trajectory Visualizer</div>

          <div style={styles.iconWrap}>
            <div style={styles.icon}>⬡</div>
          </div>

          <h1 style={styles.main}>Ajouter une trajectoire JSON</h1>
          <p style={styles.sub}>
            Glisse-dépose ton fichier ici ou ouvre un export de tracking pour visualiser,
            filtrer, rejouer, exporter et explorer les trajectoires en 2D ou en 3D.
          </p>

          <div style={styles.ctaRow}>
            <button
              style={styles.primaryBtn}
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
            >
              Choisir un fichier
            </button>

            <button
              style={styles.secondaryBtn}
              onClick={(e) => {
                e.stopPropagation()
                setShowGuide(true)
              }}
            >
              Guide rapide
            </button>

            <button
              style={styles.secondaryBtn}
              onClick={(e) => {
                e.stopPropagation()
                setShowDemos(true)
              }}
            >
              Démos
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>

      {showDemos && (
        <div style={styles.modalOverlay} onClick={() => setShowDemos(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalEyebrow}>Démonstrations</div>
                <div style={styles.modalTitle}>Choisis une trajectoire de démo</div>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setShowDemos(false)}
                aria-label="Fermer les démos"
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.demoList}>
                {DEMO_FILES.map((file) => (
                  <button
                    key={file.path}
                    style={styles.demoBtn}
                    onClick={() => handleLoadPreset(file.path)}
                  >
                    {file.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.secondaryBtn}
                onClick={() => setShowDemos(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <div style={styles.modalOverlay} onClick={() => setShowGuide(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalEyebrow}>Aide</div>
                <div style={styles.modalTitle}>Prise en main rapide</div>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setShowGuide(false)}
                aria-label="Fermer le guide"
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <section style={styles.guideSection}>
                <h3 style={styles.guideHeading}>Le principe</h3>
                <p style={styles.guideText}>
                  Cette application permet de charger un fichier JSON de trajectoires,
                  d'afficher les courbes, de rejouer leur évolution dans le temps,
                  de modifier leur rendu visuel et d'exporter le résultat en PNG ou SVG.
                </p>
              </section>

              <section style={styles.guideSection}>
                <h3 style={styles.guideHeading}>Charger un fichier</h3>
                <ul style={styles.guideList}>
                  <li style={styles.guideItem}>Glisse-dépose un fichier JSON dans la zone centrale.</li>
                  <li style={styles.guideItem}>Ou clique sur "Choisir un fichier".</li>
                  <li style={styles.guideItem}>Ou utilise le bouton "Démos" pour tester des exemples.</li>
                </ul>
              </section>

              <section style={styles.guideSection}>
                <h3 style={styles.guideHeading}>Les vues</h3>
                <ul style={styles.guideList}>
                  <li style={styles.guideItem}><strong>2D</strong> : vue principale fidèle à la lecture plane des trajectoires.</li>
                  <li style={styles.guideItem}><strong>3D</strong> : vue orbitale pour tourner autour des courbes, zoomer et inspecter la profondeur.</li>
                  <li style={styles.guideItem}><strong>Vue de base</strong> : remet la caméra ou le cadrage à la position d'origine.</li>
                </ul>
              </section>

              <section style={styles.guideSection}>
                <h3 style={styles.guideHeading}>Le panneau de réglages</h3>
                <p style={styles.guideText}>
                  Le panneau de gauche permet d'ajuster le style de rendu :
                  épaisseur, opacité, blur, smoothing, fond, clipping polygonal et
                  paramètres génératifs.
                </p>
              </section>

              <section style={styles.guideSection}>
                <h3 style={styles.guideHeading}>La timeline</h3>
                <p style={styles.guideText}>
                  La timeline sert à explorer l'animation dans le temps :
                  lecture, pause, stop, vitesse, position courante et plage de frames.
                </p>
              </section>

              <section style={styles.guideSection}>
                <h3 style={styles.guideHeading}>Navigation</h3>
                <ul style={styles.guideList}>
                  <li style={styles.guideItem}><strong>En 2D</strong> : zoomer et se déplacer dans la courbe pour inspecter un détail.</li>
                  <li style={styles.guideItem}><strong>En 3D</strong> : orbiter, zoomer et revenir à la vue initiale.</li>
                </ul>
              </section>

              <section style={styles.guideSection}>
                <h3 style={styles.guideHeading}>Exports</h3>
                <ul style={styles.guideList}>
                  <li style={styles.guideItem}><strong>PNG</strong> : capture la vue courante.</li>
                  <li style={styles.guideItem}><strong>SVG</strong> : export vectoriel pratique pour retravailler les courbes.</li>
                </ul>
              </section>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.secondaryBtn} onClick={() => setShowGuide(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  zone: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 72,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 160,
    overflow: 'hidden',
    background: 'radial-gradient(circle at 50% 38%, rgba(22,26,40,0.92) 0%, rgba(10,11,18,0.98) 48%, #07080d 100%)',
  },
  zoneDrag: {
    background: 'radial-gradient(circle at 50% 38%, rgba(30,35,56,0.98) 0%, rgba(12,14,24,1) 52%, #06070b 100%)',
  },
  centerWrap: {
    width: '100%',
    maxWidth: 980,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    position: 'relative',
    zIndex: 1,
  },
  heroCard: {
    width: 'min(92vw, 680px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 14,
    padding: '28px 24px',
    borderRadius: 14,
    border: '1px solid rgba(90,100,128,0.26)',
    background: 'rgba(14,17,27,0.78)',
    boxShadow: '0 18px 60px rgba(0,0,0,0.32)',
    backdropFilter: 'blur(16px)',
  },
  badge: {
    color: '#a7b0c2',
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(95,105,132,0.35)',
    background: 'rgba(20,24,36,0.9)',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 50%, rgba(44,50,77,0.75) 0%, rgba(20,24,36,0.95) 72%)',
    border: '1px solid rgba(95,105,132,0.25)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  icon: {
    fontSize: 34,
    color: '#7f8aa5',
    lineHeight: 1,
  },
  main: {
    fontFamily: 'var(--font-serif)',
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#ece7df',
    lineHeight: 1.1,
    letterSpacing: '0.02em',
  },
  sub: {
    color: '#aab2c0',
    fontSize: 8,
    lineHeight: 1.7,
    maxWidth: 560,
  },
  ctaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtn: {
    minHeight: 42,
    padding: '0 24px',
    borderRadius: 999,
    background: '#d0a85f',
    color: '#15161d',
    border: '1px solid rgba(208,168,95,0.48)',
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(208,168,95,0.16)',
    transition: 'all 0.2s ease',
  },
  secondaryBtn: {
    minHeight: 42,
    padding: '0 16px',
    borderRadius: 999,
    background: 'rgba(24,28,40,0.92)',
    color: '#d7deea',
    border: '1px solid rgba(90,100,128,0.35)',
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  error: {
    color: '#ffb3ab',
    fontSize: 12,
    marginTop: 12,
    padding: '10px 12px',
    background: 'rgba(192,57,43,0.12)',
    border: '1px solid rgba(192,57,43,0.3)',
    borderRadius: 8,
    maxWidth: 520,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    background: 'rgba(5,7,11,0.92)',
    backdropFilter: 'blur(20px)',
  },
  modal: {
    width: 'min(94vw, 560px)',
    maxHeight: 'min(88vh, 700px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 16,
    background: '#10131c',
    border: '1px solid rgba(80,89,110,0.32)',
    boxShadow: '0 32px 100px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(67,76,96,0.28)',
    background: 'rgba(19,23,34,0.98)',
  },
  modalEyebrow: {
    color: '#8d97ab',
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTitle: {
    color: '#f0ebe4',
    fontSize: 22,
    fontFamily: 'var(--font-serif)',
    fontStyle: 'italic',
    lineHeight: 1.1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'rgba(26,31,42,0.94)',
    color: '#d6dce7',
    border: '1px solid rgba(78,88,112,0.3)',
    cursor: 'pointer',
    flexShrink: 0,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    overflowY: 'auto',
    padding: '24px',
    flex: 1,
  },
  demoList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  demoBtn: {
    padding: '12px 16px',
    background: 'rgba(26,31,42,0.8)',
    color: '#c4ccda',
    border: '1px solid #353d50',
    borderRadius: 12,
    fontSize: 13,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap',
    minHeight: 48,
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  guideSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '16px 20px',
    borderRadius: 12,
    background: 'rgba(18,22,33,0.92)',
    border: '1px solid rgba(60,69,88,0.24)',
    marginBottom: 12,
  },
  guideHeading: {
    color: '#ede5da',
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  guideText: {
    color: '#b6bfcd',
    fontSize: 13,
    lineHeight: 1.7,
    margin: 0,
  },
  guideList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingLeft: 20,
margin: '8px 0 0 0',
  },
  guideItem: {
    color: '#b6bfcd',
    fontSize: 13,
    lineHeight: 1.65,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: '1px solid rgba(67,76,96,0.24)',
    background: 'rgba(17,20,30,0.98)',
    gap: 8,
  },
}