import { Box3, DirectionalLight, Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const loader = new GLTFLoader()

export async function measureGlb(url: string): Promise<{ w: number; d: number; h: number; thumb?: string }> {
  const gltf = await loader.loadAsync(url)
  const root = gltf.scene
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root)
  const size = new Vector3()
  box.getSize(size)
  const w = Math.max(0.08, size.x)
  const d = Math.max(0.08, size.z)
  const h = Math.max(0.08, size.y)
  let thumb: string | undefined
  try {
    thumb = renderThumb(root, box, size)
  } catch {
    thumb = undefined
  }
  return { w, d, h, thumb }
}

function renderThumb(object: Object3D, box: Box3, size: Vector3) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(128, 128, false)
  renderer.setClearColor(0x000000, 0)
  const scene = new Scene()
  scene.background = null
  const clone = object.clone(true)
  const center = new Vector3()
  box.getCenter(center)
  clone.position.sub(center)
  scene.add(clone)
  scene.add(new DirectionalLight('#fff8ee', 2.2))
  const fill = new DirectionalLight('#c8d4e8', 0.8)
  fill.position.set(-2, 1, -1)
  scene.add(fill)
  const cam = new PerspectiveCamera(32, 1, 0.02, 40)
  const span = Math.max(size.x, size.y, size.z, 0.4)
  cam.position.set(span * 1.35, span * 0.95, span * 1.35)
  cam.lookAt(0, 0, 0)
  renderer.render(scene, cam)
  const url = canvas.toDataURL('image/jpeg', 0.72)
  renderer.dispose()
  return url
}
