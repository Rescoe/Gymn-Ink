# GYMNAST INK — Trajectory Art Studio

> Transform gymnast tracking data into ink field visualizations.

![Gymnast Ink](https://img.shields.io/badge/vite-5.x-646CFF?style=flat-square&logo=vite)
![React](https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react)

## Quick Start

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── App.jsx              # Main shell
│   ├── CanvasRenderer.jsx   # Canvas drawing component
│   ├── ControlsPanel.jsx    # Parameter panel (left sidebar)
│   ├── TimelineEditor.jsx   # Timeline scrubber + animation
│   ├── TrajectoryLayer.jsx  # Track list (visibility, color)
│   └── DropZone.jsx         # File import
├── hooks/
│   └── useAnimation.js      # Animation loop hook
├── utils/
│   ├── renderer.js          # All rendering logic (ink, brush, ghost, neon, dust)
│   └── trajectoryUtils.js   # JSON parsing, splines, transforms
└── styles/
    └── global.css
```

## Input JSON Format

```json
{
  "video_path": "your_video.mp4",
  "detection_polygon": [[x, y], ...],
  "trajectories": [
    [[x, y], [x, y], ...],
    [[x, y], [x, y], ...]
  ]
}
```

Compatible with Ultralytics YOLO tracking output.

## Render Styles

| Style | Description |
|-------|-------------|
| **ink** | Variable-width strokes — thick when slow (ink pooling), thin when fast |
| **brush** | Multi-pass soft painting with gaussian blur halos |
| **ghost** | Accumulating transparent trails — ethereal persistence |
| **neon** | Glowing lines with bloom effect on dark background |
| **dust** | Particle spray distributed along velocity |

## Features

- **Import** — drag & drop or click to load JSON
- **5 render styles** with real-time parameter control
- **Timeline** — frame range selection (in/out points), playback at variable speed
- **Catmull-Rom smoothing** — configurable interpolation segments
- **Trajectory layers** — per-track visibility and color
- **Detection polygon** — overlay and clip
- **Generative mode** — sinusoidal perturbations on top of real trajectories
- **Export** — PNG (full resolution) + SVG

## Generative Mode

Enable in the "GENERATIVE" panel to add controlled noise:
- **Amplitude** — spatial displacement in pixels
- **Frequency** — oscillation frequency
- **Reseed** — regenerate noise on every render

## Export

- **PNG** — exports the canvas at current device pixel ratio
- **SVG** — exports all visible trajectories as vector paths (1920×1080)

## Inspiration

Visual aesthetic inspired by [Aluan Wang's ink field](https://aluanwang.com/).
