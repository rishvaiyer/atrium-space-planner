import { itemAabb, itemDims } from './geometry'
import { projectOnWall } from './walls'
import type { PlacedItem, Room } from './types'

export function boxesOverlap(
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ
}

export function itemHitsWalls(item: PlacedItem, room: Room) {
  const box = itemAabb(item)
  const thick = (room.wallThickness || 0.12) / 2 + 0.02
  const reach = Math.max(box.w, box.d) / 2 + thick
  for (const wall of room.walls) {
    const hit = projectOnWall(wall, item.x, item.z)
    if (hit.dist > reach) continue
    const pad = Math.min(box.w, box.d) / 2 + thick
    if (hit.dist < pad) return true
    if (
      (hit.x >= box.minX - thick && hit.x <= box.maxX + thick && hit.z >= box.minZ - thick && hit.z <= box.maxZ + thick)
    ) {
      return true
    }
  }
  return false
}

export function itemHitsItems(item: PlacedItem, others: PlacedItem[], skipId?: string) {
  const box = itemAabb(item)
  for (const other of others) {
    if (other.id === item.id || other.id === skipId) continue
    if (boxesOverlap(box, itemAabb(other))) return true
  }
  return false
}

export function itemCollides(item: PlacedItem, items: PlacedItem[], room: Room) {
  return itemHitsWalls(item, room) || itemHitsItems(item, items)
}

/** One pass over the room instead of N² per-item checks while rendering. */
export function collidingItemIds(items: PlacedItem[], room: Room) {
  const ids = new Set<string>()
  const boxes = items.map((it) => ({ it, box: itemAabb(it) }))
  for (const { it } of boxes) {
    if (itemHitsWalls(it, room)) ids.add(it.id)
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (!boxesOverlap(boxes[i].box, boxes[j].box)) continue
      ids.add(boxes[i].it.id)
      ids.add(boxes[j].it.id)
    }
  }
  return ids
}

export function rotateHandleOf(item: PlacedItem) {
  const { w, d } = itemDims(item)
  const dist = Math.max(w, d) / 2 + 0.24
  const c = Math.cos(item.rotation)
  const s = Math.sin(item.rotation)
  return { x: item.x + s * dist, z: item.z - c * dist, dist }
}

export function hitRotateHandle(item: PlacedItem, x: number, z: number, slop = 0.16) {
  const h = rotateHandleOf(item)
  return Math.hypot(h.x - x, h.z - z) <= slop
}

export function itemsInRect(
  items: PlacedItem[],
  a: { x: number; z: number },
  b: { x: number; z: number },
) {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minZ = Math.min(a.z, b.z)
  const maxZ = Math.max(a.z, b.z)
  return items.filter((it) => {
    const box = itemAabb(it)
    return box.maxX >= minX && box.minX <= maxX && box.maxZ >= minZ && box.minZ <= maxZ
  })
}
