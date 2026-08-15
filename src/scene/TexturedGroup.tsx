import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Group } from 'three'
import { loadPbr } from '../pbr'
import { applyItemTexture } from './applyTexture'

export function TexturedGroup({
  textureId,
  tint,
  children,
}: {
  textureId?: string
  tint?: string
  children: ReactNode
}) {
  const ref = useRef<Group>(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    applyItemTexture(root, textureId, tint)
  }, [textureId, tint])

  useEffect(() => {
    const root = ref.current
    if (!root || !textureId) return
    let live = true
    void loadPbr(textureId).then((pbr) => {
      if (!live || !pbr || !ref.current) return
      applyItemTexture(ref.current, textureId, tint, pbr)
    })
    return () => {
      live = false
    }
  }, [textureId, tint])

  return <group ref={ref}>{children}</group>
}
