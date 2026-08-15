import { useEffect, useState } from 'react'
import {
  LinearSRGBColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three'

export interface PbrSpec {
  map: Texture
  normalMap?: Texture
  roughnessMap?: Texture
  metalnessMap?: Texture
  roughness: number
  metalness: number
}

const loader = new TextureLoader()
const cache = new Map<string, Promise<PbrSpec | null>>()

export function pbrBase(id: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}tex/${id}/`
}

export function pbrPreview(id: string) {
  return `${pbrBase(id)}color.jpg`
}

function loadMap(url: string, color: boolean, repeat: number) {
  return new Promise<Texture>((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.wrapS = RepeatWrapping
        tex.wrapT = RepeatWrapping
        tex.repeat.set(repeat, repeat)
        tex.anisotropy = 8
        tex.colorSpace = color ? SRGBColorSpace : LinearSRGBColorSpace
        tex.needsUpdate = true
        resolve(tex)
      },
      undefined,
      reject,
    )
  })
}

async function loadOptional(url: string, color: boolean, repeat: number) {
  try {
    return await loadMap(url, color, repeat)
  } catch {
    return undefined
  }
}

export function loadPbr(id: string, repeat = 2): Promise<PbrSpec | null> {
  const key = `${id}:${repeat}`
  const hit = cache.get(key)
  if (hit) return hit
  const job = (async () => {
    const root = pbrBase(id)
    try {
      const map = await loadMap(`${root}color.jpg`, true, repeat)
      const [normalMap, roughnessMap, metalnessMap] = await Promise.all([
        loadOptional(`${root}normal.jpg`, false, repeat),
        loadOptional(`${root}roughness.jpg`, false, repeat),
        loadOptional(`${root}metalness.jpg`, false, repeat),
      ])
      return {
        map,
        normalMap,
        roughnessMap,
        metalnessMap,
        roughness: roughnessMap ? 1 : 0.55,
        metalness: metalnessMap ? 1 : 0.04,
      }
    } catch {
      return null
    }
  })()
  cache.set(key, job)
  return job
}

export function usePbr(id: string | undefined, repeat = 2) {
  const [spec, setSpec] = useState<PbrSpec | null>(null)
  useEffect(() => {
    if (!id) {
      setSpec(null)
      return
    }
    let live = true
    void loadPbr(id, repeat).then((s) => {
      if (live) setSpec(s)
    })
    return () => {
      live = false
    }
  }, [id, repeat])
  return spec
}
