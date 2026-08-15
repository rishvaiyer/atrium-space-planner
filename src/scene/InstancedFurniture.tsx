import { useLayoutEffect, useMemo, useRef } from 'react'
import { catalogItem } from '../catalog'
import { itemDims } from '../geometry'
import { usePlanner } from '../store'
import { woodTexture } from '../textures'
import type { PlacedItem } from '../types'
import type { InstanceBatch, InstancePart } from './instanceRecipes'
import * as THREE from 'three'

const dummy = new THREE.Object3D()
const part = new THREE.Object3D()

export function InstancedCatalog({ batch }: { batch: InstanceBatch }) {
  const ids = batch.items.map((it) => it.id)
  return (
    <group>
      {batch.parts.map((spec, i) => (
        <InstancedPart key={i} spec={spec} items={batch.items} ids={ids} />
      ))}
    </group>
  )
}

function InstancedPart({
  spec,
  items,
  ids,
}: {
  spec: InstancePart
  items: PlacedItem[]
  ids: string[]
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const count = items.length
  const wood = useMemo(() => (spec.woodTint ? woodTexture(spec.woodTint) : null), [spec.woodTint])
  const fingerprint = items.map((it) => `${it.id}:${it.x}:${it.z}:${it.rotation}:${it.w}:${it.d}:${it.h}`).join('|')

  useLayoutEffect(() => {
    const inst = mesh.current
    if (!inst) return
    const def = catalogItem(items[0].catalogId)
    const rot = spec.rot ?? [0, 0, 0]
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const { w, d, h } = itemDims(it)
      dummy.position.set(it.x, 0, it.z)
      dummy.rotation.set(0, it.rotation, 0)
      dummy.scale.set(w / def.w, h / def.h, d / def.d)
      dummy.updateMatrix()
      part.position.set(spec.pos[0], spec.pos[1], spec.pos[2])
      part.rotation.set(rot[0], rot[1], rot[2])
      part.scale.set(1, 1, 1)
      part.updateMatrix()
      dummy.matrix.multiply(part.matrix)
      inst.setMatrixAt(i, dummy.matrix)
    }
    inst.instanceMatrix.needsUpdate = true
    inst.computeBoundingSphere()
  }, [fingerprint, items, spec.pos, spec.rot])

  return (
    <instancedMesh
      ref={mesh}
      args={[null as unknown as THREE.BufferGeometry, null as unknown as THREE.Material, count]}
      frustumCulled={false}
      castShadow={count < 48}
      receiveShadow={count < 48}
      onPointerDown={(e) => {
        e.stopPropagation()
        const index = e.instanceId
        if (index == null) return
        const id = ids[index]
        const state = usePlanner.getState()
        if (state.pendingCatalogId) {
          state.placeItem(state.pendingCatalogId, e.point.x, e.point.z, e.shiftKey)
          return
        }
        state.select(id, e.shiftKey)
      }}
    >
      <PartGeo kind={spec.kind} args={spec.args} />
      <meshStandardMaterial
        map={wood}
        color={spec.woodTint ? '#ffffff' : spec.color}
        roughness={spec.roughness ?? 0.55}
        metalness={spec.metalness ?? 0.02}
      />
    </instancedMesh>
  )
}

function PartGeo({ kind, args }: { kind: InstancePart['kind']; args: number[] }) {
  if (kind === 'box') return <boxGeometry args={args as [number, number, number]} />
  if (kind === 'cyl') return <cylinderGeometry args={args as [number, number, number, number]} />
  if (kind === 'sphere') return <sphereGeometry args={args as [number, number, number]} />
  return <torusGeometry args={args as [number, number, number, number]} />
}
