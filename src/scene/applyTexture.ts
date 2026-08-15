import { Color, Mesh, MeshStandardMaterial, Object3D } from 'three'
import type { PbrSpec } from '../pbr'
import { itemSurface } from '../textures'

export function applyItemTexture(root: Object3D, textureId?: string, tint?: string, pbr?: PbrSpec | null) {
  const canvas = !pbr && textureId ? itemSurface(textureId) : null
  const tintColor = tint && /^#/.test(tint) ? tint : '#ffffff'
  const active = pbr || canvas
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.material) return
    const base = mesh.userData._baseMat ?? mesh.material
    mesh.userData._baseMat = base
    const prev = mesh.userData._texMat as MeshStandardMaterial | MeshStandardMaterial[] | undefined
    if (prev) {
      const list = Array.isArray(prev) ? prev : [prev]
      for (const m of list) m.dispose()
      mesh.userData._texMat = undefined
    }
    if (!active) {
      mesh.material = base
      return
    }
    const sources = Array.isArray(base) ? base : [base]
    const clones = sources.map((mat) => {
      const c = mat.clone() as MeshStandardMaterial
      if ('map' in c) {
        c.map = active.map
        c.map.needsUpdate = true
      }
      if (pbr) {
        if ('normalMap' in c) c.normalMap = pbr.normalMap ?? null
        if ('roughnessMap' in c) c.roughnessMap = pbr.roughnessMap ?? null
        if ('metalnessMap' in c) c.metalnessMap = pbr.metalnessMap ?? null
        if ('bumpMap' in c) c.bumpMap = null
        if ('roughness' in c) c.roughness = pbr.roughness
        if ('metalness' in c) c.metalness = pbr.metalness
      } else if (canvas) {
        if ('roughness' in c) c.roughness = canvas.roughness
        if ('metalness' in c) c.metalness = canvas.metalness
        if ('bumpMap' in c) {
          c.bumpMap = canvas.map
          c.bumpScale = canvas.bumpScale ?? 0.035
        }
      }
      if ('color' in c && c.color) c.color = new Color(tintColor)
      c.needsUpdate = true
      return c
    })
    mesh.userData._texMat = Array.isArray(base) ? clones : clones[0]
    mesh.material = mesh.userData._texMat
  })
}
