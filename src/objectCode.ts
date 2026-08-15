import { catalogItem } from './catalog'
import { itemDims } from './geometry'
import type { PlacedItem } from './types'
import { ITEM_TEXTURES } from './textures'

export const OBJECT_TEXTURES = ITEM_TEXTURES.map((t) => t.id)

export function objectCode(item: PlacedItem) {
  const { def, w, d, h } = itemDims(item)
  return {
    catalogId: item.catalogId,
    name: def.name,
    x: Number(item.x.toFixed(3)),
    z: Number(item.z.toFixed(3)),
    rotationDeg: Math.round(((item.rotation * 180) / Math.PI) % 360),
    w: Number(w.toFixed(3)),
    d: Number(d.toFixed(3)),
    h: Number(h.toFixed(3)),
    color: item.finish ?? null,
    texture: item.texture ?? null,
    extra: item.extra ?? null,
  }
}

export function applyObjectCode(item: PlacedItem, raw: string): { item: PlacedItem } | { error: string } {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    if (!data || typeof data !== 'object') return { error: 'JSON must be an object.' }
    const catalogId = typeof data.catalogId === 'string' ? data.catalogId : item.catalogId
    try {
      catalogItem(catalogId)
    } catch {
      return { error: `Unknown catalogId: ${catalogId}` }
    }
    const num = (key: string) => {
      const v = data[key]
      return typeof v === 'number' && Number.isFinite(v) ? v : undefined
    }
    const rotation =
      num('rotationDeg') != null
        ? ((num('rotationDeg') as number) * Math.PI) / 180
        : num('rotation') != null
          ? (num('rotation') as number)
          : item.rotation
    const color = typeof data.color === 'string' ? data.color : data.color === null ? undefined : item.finish
    const texture = typeof data.texture === 'string' ? data.texture : data.texture === null ? undefined : item.texture
    const extra = typeof data.extra === 'string' ? data.extra : data.extra === null ? undefined : item.extra
    return {
      item: {
        ...item,
        catalogId,
        x: num('x') ?? item.x,
        z: num('z') ?? item.z,
        rotation,
        w: num('w'),
        d: num('d'),
        h: num('h'),
        finish: color,
        texture,
        extra,
      },
    }
  } catch {
    return { error: 'Invalid JSON.' }
  }
}
