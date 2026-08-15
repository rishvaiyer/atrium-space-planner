import { Component, useLayoutEffect, useMemo, useRef, type ErrorInfo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Group, Vector3 } from 'three'

import { applyItemTexture } from './applyTexture'

export function GlbProp({
  url,
  w,
  d,
  h,
  textureId,
  tint,
}: {
  url: string
  w: number
  d: number
  h: number
  textureId?: string
  tint?: string
}) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => scene.clone(true), [scene])
  const ref = useRef<Group>(null)

  useLayoutEffect(() => {
    clone.scale.set(1, 1, 1)
    clone.position.set(0, 0, 0)
    clone.updateMatrixWorld(true)
    const box = new Box3().setFromObject(clone)
    const size = new Vector3()
    box.getSize(size)
    if (size.x < 1e-4 || size.y < 1e-4 || size.z < 1e-4) return
    const s = Math.min(w / size.x, h / size.y, d / size.z)
    clone.scale.setScalar(s)
    clone.updateMatrixWorld(true)
    const fitted = new Box3().setFromObject(clone)
    const center = new Vector3()
    fitted.getCenter(center)
    clone.position.x -= center.x
    clone.position.z -= center.z
    clone.position.y -= fitted.min.y
    applyItemTexture(clone, textureId, tint)
  }, [clone, w, d, h, textureId, tint])

  return (
    <group ref={ref}>
      <primitive object={clone} />
    </group>
  )
}

class GlbErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() {
    return { err: true }
  }
  componentDidCatch(_e: unknown, _info: ErrorInfo) {
    /* keep the rest of the scene */
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children
  }
}

export function GlbSafe({
  url,
  w,
  d,
  h,
  textureId,
  tint,
}: {
  url: string
  w: number
  d: number
  h: number
  textureId?: string
  tint?: string
}) {
  return (
    <GlbErrorBoundary
      fallback={
        <mesh position={[0, h / 2, 0]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#8a8078" roughness={0.7} />
        </mesh>
      }
    >
      <GlbProp url={url} w={w} d={d} h={h} textureId={textureId} tint={tint} />
    </GlbErrorBoundary>
  )
}
