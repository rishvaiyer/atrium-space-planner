import type { Door, PlacedItem, Room, WallSide, WindowSpec } from './types'
import { catalogItem } from './catalog'

export function snapTo(value: number, snap: number): number {
  if (snap <= 0) return value
  return Math.round(value / snap) * snap
}

export function rotatedExtents(w: number, d: number, rotation: number): { w: number; d: number } {
  const c = Math.abs(Math.cos(rotation))
  const s = Math.abs(Math.sin(rotation))
  return { w: w * c + d * s, d: w * s + d * c }
}

export function itemAabb(item: PlacedItem) {
  const def = catalogItem(item.catalogId)
  const { w, d } = rotatedExtents(def.w, def.d, item.rotation)
  return {
    minX: item.x - w / 2,
    maxX: item.x + w / 2,
    minZ: item.z - d / 2,
    maxZ: item.z + d / 2,
    w,
    d,
  }
}

export function formatMm(meters: number): string {
  const mm = Math.round(meters * 1000)
  return mm.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface Opening {
  start: number
  end: number
}

export function openingsOnWall(room: Room, wall: WallSide): Opening[] {
  const openings: Opening[] = []
  const add = (offset: number, width: number) => {
    openings.push({ start: offset, end: offset + width })
  }
  for (const door of room.doors) {
    if (door.wall === wall) add(door.offset, door.width)
  }
  for (const win of room.windows) {
    if (win.wall === wall) add(win.offset, win.width)
  }
  openings.sort((a, b) => a.start - b.start)
  return openings
}

export function wallLength(room: Room, wall: WallSide): number {
  return wall === 'n' || wall === 's' ? room.width : room.depth
}

export function wallSegments(room: Room, wall: WallSide): Opening[] {
  const length = wallLength(room, wall)
  const holes = openingsOnWall(room, wall)
  const segments: Opening[] = []
  let cursor = 0
  for (const hole of holes) {
    if (hole.start > cursor + 0.01) segments.push({ start: cursor, end: hole.start })
    cursor = Math.max(cursor, hole.end)
  }
  if (cursor < length - 0.01) segments.push({ start: cursor, end: length })
  return segments
}

export function doorWorld(room: Room, door: Door): { x: number; z: number; inwardX: number; inwardZ: number } {
  switch (door.wall) {
    case 's':
      return { x: door.offset + door.width / 2, z: 0, inwardX: 0, inwardZ: 1 }
    case 'n':
      return { x: door.offset + door.width / 2, z: room.depth, inwardX: 0, inwardZ: -1 }
    case 'w':
      return { x: 0, z: door.offset + door.width / 2, inwardX: 1, inwardZ: 0 }
    case 'e':
      return { x: room.width, z: door.offset + door.width / 2, inwardX: -1, inwardZ: 0 }
  }
}

export function windowWorld(room: Room, win: WindowSpec): { x: number; z: number; rot: number } {
  switch (win.wall) {
    case 's':
      return { x: win.offset + win.width / 2, z: 0, rot: 0 }
    case 'n':
      return { x: win.offset + win.width / 2, z: room.depth, rot: 0 }
    case 'w':
      return { x: 0, z: win.offset + win.width / 2, rot: Math.PI / 2 }
    case 'e':
      return { x: room.width, z: win.offset + win.width / 2, rot: Math.PI / 2 }
  }
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}
