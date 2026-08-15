import { Color, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { itemSurface } from '../textures'

export function applyItemTexture(root: Object3D, textureId?: string, tint?: string) {
  const spec = textureId ? itemSurface(textureId) : null
  const tintColor = tint && /^#/.test(tint) ? tint : '#ffffff'
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
    if (!spec) {
      mesh.material = base
      return
    }
    const sources = Array.isArray(base) ? base : [base]
    const clones = sources.map((mat) => {
      const c = mat.clone() as MeshStandardMaterial
      if ('map' in c) {
        c.map = spec.map
        c.map.needsUpdate = true
      }
      if ('roughness' in c) c.roughness = spec.roughness
      if ('metalness' in c) c.metalness = spec.metalness
      if ('bumpMap' in c) {
        c.bumpMap = spec.map
        c.bumpScale = spec.bumpScale ?? 0.035
      }
      if ('color' in c && c.color) c.color = new Color(tintColor)
      c.needsUpdate = true
      return c
    })
    mesh.userData._texMat = Array.isArray(base) ? clones : clones[0]
    mesh.material = mesh.userData._texMat
  })
}
