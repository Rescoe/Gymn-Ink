import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const PALETTE = [
  '#c0392b', '#c9a84c', '#5b8ca8', '#7c9c6e',
  '#a86b5b', '#7a5ba8', '#5ba88c', '#a85b88',
]

const ThreeTrajectoryViewer = forwardRef(function ThreeTrajectoryViewer(
  { sceneData, params, animFrame },
  ref
) {
  const mountRef = useRef(null)

  const threeRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    group: null,
    frameId: null,
  })

  const resetView = useCallback(() => {
    const { controls } = threeRef.current
    if (!controls) return
    controls.reset()
    controls.update()
  }, [])

  useImperativeHandle(ref, () => ({
    resetView,
  }), [resetView])

  const fitCameraToObject = useCallback(() => {
    const { camera, controls, group, renderer } = threeRef.current
    if (!camera || !controls || !group || !renderer) return

    const box = new THREE.Box3().setFromObject(group)
    if (box.isEmpty()) return

    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    controls.target.copy(center)

    const canvas = renderer.domElement
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    const aspect = width / height || 1

    const margin = 1.15
    const objectWidth = Math.max(size.x, 1)
    const objectHeight = Math.max(size.y, 1)
    const frustumHeight = objectHeight * margin
    const frustumWidth = objectWidth * margin

    camera.left = -frustumWidth / 2
    camera.right = frustumWidth / 2
    camera.top = frustumHeight / 2
    camera.bottom = -frustumHeight / 2

    if (frustumWidth / frustumHeight < aspect) {
      const adjustedWidth = frustumHeight * aspect
      camera.left = -adjustedWidth / 2
      camera.right = adjustedWidth / 2
    } else {
      const adjustedHeight = frustumWidth / aspect
      camera.top = adjustedHeight / 2
      camera.bottom = -adjustedHeight / 2
    }

    const maxDepth = Math.max(size.z, 1)
    const distance = Math.max(size.x, size.y, maxDepth) * 2.2

    camera.position.set(center.x, center.y, center.z + distance)
    camera.near = 0.1
    camera.far = distance * 10
    camera.zoom = 1
    camera.updateProjectionMatrix()

    controls.update()
    controls.saveState()
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = Math.max(1, mount.clientWidth)
    const height = Math.max(1, mount.clientHeight)
    const aspect = width / height

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(params?.bgStyle === 'paper' ? '#f2ece0' : '#08080f')

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      10000
    )
    camera.position.set(0, 0, 1000)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableRotate = true
    controls.screenSpacePanning = true

    const ambient = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambient)

    const dir = new THREE.DirectionalLight(0xffffff, 0.7)
    dir.position.set(0, 0, 1000)
    scene.add(dir)

    const group = new THREE.Group()
    scene.add(group)

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      group,
      frameId: null,
    }

    const animate = () => {
      threeRef.current.frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      const aspect = width / height

      renderer.setSize(width, height)

      const currentFrustumHeight = camera.top - camera.bottom
      const currentFrustumWidth = currentFrustumHeight * aspect

      camera.left = -currentFrustumWidth / 2
      camera.right = currentFrustumWidth / 2
      camera.top = currentFrustumHeight / 2
      camera.bottom = -currentFrustumHeight / 2
      camera.updateProjectionMatrix()

      controls.update()
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(mount)

    return () => {
      ro.disconnect()
      if (threeRef.current.frameId) cancelAnimationFrame(threeRef.current.frameId)
      controls.dispose()
      renderer.dispose()
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.())
          else obj.material.dispose?.()
        }
      })
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [params?.bgStyle])

  useEffect(() => {
    const { scene, group } = threeRef.current
    if (!scene || !group || !sceneData) return

    while (group.children.length) {
      const child = group.children[0]
      group.remove(child)
      child.geometry?.dispose?.()
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose?.())
      else child.material?.dispose?.()
    }

    const trajectories = sceneData.trajectories || []

    trajectories.forEach((traj, i) => {
      if (!traj.visible) return

      let pts = traj.points || []
      if (animFrame !== null && animFrame !== undefined) {
        pts = pts.slice(0, animFrame + 1)
      }
      if (pts.length < 2) return

      const color = traj.color || PALETTE[i % PALETTE.length]

      const vertices = pts.map((p, idx) => {
        const z = idx
        return new THREE.Vector3(p.x, -p.y, z)
      })

      const geometry = new THREE.BufferGeometry().setFromPoints(vertices)
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: params?.opacity ?? 0.9,
      })

      const line = new THREE.Line(geometry, material)
      group.add(line)
    })

    const box = new THREE.Box3().setFromObject(group)
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3())
      group.position.sub(center)
    }

    fitCameraToObject()
  }, [sceneData, params?.opacity, animFrame, fitCameraToObject])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  )
})

export default ThreeTrajectoryViewer