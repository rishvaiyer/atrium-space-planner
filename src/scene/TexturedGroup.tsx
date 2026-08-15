import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Group } from 'three'
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

  return <group ref={ref}>{children}</group>
}
