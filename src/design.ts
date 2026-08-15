import { CATALOG, catalogItem } from './catalog'
import { uid } from './geometry'
import type { ProjectFile } from './project'
import { pointInPoly } from './spaces'
import type { FloorFinish, Note, PlacedItem, WallFinish } from './types'
import { boxRoom, insertWall, nearestWall, withBounds } from './walls'

export interface DesignItem {
  item: string
  x: number
  z: number
  /** Radians. Prefer rotationDeg. */
  rotation?: number
  rotationDeg?: number
}

export interface DesignSpec {
  version: 'design'
  name?: string
  occupancyGroup?: string
  width?: number
  depth?: number
  wallHeight?: number
  floor?: FloorFinish
  walls?: WallFinish
  brand?: string
  partitions?: { ax: number; az: number; bx: number; bz: number }[]
  doors?: { x: number; z: number }[]
  windows?: { x: number; z: number }[]
  names?: { name: string; x: number; z: number }[]
  notes?: { text: string; x: number; z: number }[]
  items: DesignItem[]
}

const ALIASES: Record<string, string> = {
  chair: 'cafe-chair',
  seat: 'cafe-chair',
  stool: 'stool',
  table: 'table-4',
  sofa: 'sofa',
  couch: 'sofa',
  bed: 'bed',
  desk: 'desk',
  lamp: 'floor-lamp',
  light: 'pendant',
  piano: 'piano',
  booth: 'booth',
  bar: 'espresso-bar',
  fridge: 'fridge',
  plant: 'planter',
  bench: 'bench',
  armchair: 'armchair',
}

export function resolveCatalogId(query: string): string | null {
  const raw = query.trim()
  if (!raw) return null
  if (CATALOG.some((i) => i.id === raw)) return raw
  const q = raw.toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
  const compact = q.replace(/\s+/g, '-')
  if (ALIASES[q] || ALIASES[compact]) return ALIASES[q] ?? ALIASES[compact]
  const sku = CATALOG.find((i) => i.sku.toLowerCase() === q)
  if (sku) return sku.id
  const name = CATALOG.find((i) => i.name.toLowerCase() === q)
  if (name) return name.id
  const tagged = CATALOG.find((i) => (i.tags ?? []).some((t) => t.toLowerCase() === q))
  if (tagged) return tagged.id
  const contains = CATALOG.find((i) => i.name.toLowerCase().includes(q) || i.id.includes(compact))
  return contains?.id ?? null
}

export function isDesignSpec(value: unknown): value is DesignSpec {
  if (!value || typeof value !== 'object') return false
  const v = value as DesignSpec
  return v.version === 'design' && Array.isArray(v.items)
}

export const DESIGN_EXAMPLE: DesignSpec = {
  version: 'design',
  name: 'AI lounge',
  occupancyGroup: 'A-2 Assembly',
  width: 8,
  depth: 6,
  partitions: [{ ax: 4, az: 0, bx: 4, bz: 6 }],
  doors: [{ x: 2, z: 0.05 }],
  names: [
    { name: 'Lounge', x: 2, z: 3 },
    { name: 'Bar', x: 6, z: 3 },
  ],
  items: [
    { item: 'sofa', x: 1.6, z: 2.2, rotation: 0 },
    { item: 'armchair', x: 2.8, z: 3.4, rotationDeg: 90 },
    { item: 'coffee-table', x: 1.8, z: 3.2 },
    { item: 'bar', x: 6.6, z: 3 },
    { item: 'stool', x: 5.7, z: 2.4 },
    { item: 'stool', x: 5.7, z: 3.2 },
    { item: 'piano', x: 6.4, z: 5.2 },
  ],
}

export function compileDesign(spec: DesignSpec): ProjectFile {
  const width = Math.min(28, Math.max(3, spec.width ?? 8))
  const depth = Math.min(22, Math.max(3, spec.depth ?? 6))
  let room = boxRoom(width, depth, spec.wallHeight ?? 3, [
    { id: 'door-main', wallId: 's', offset: Math.max(0.6, width / 2 - 0.5), width: 1, swing: 'left' },
  ])
  for (const wall of spec.partitions ?? []) {
    room = insertWall(room, wall.ax, wall.az, wall.bx, wall.bz).room
  }
  for (const door of spec.doors ?? []) {
    const hit = nearestWall(room.walls, door.x, door.z, 0.8)
    if (!hit) continue
    const already = room.doors.some((d) => d.wallId === hit.wall.id && Math.abs(d.offset - (hit.offset - 0.45)) < 0.2)
    if (already) continue
    room = {
      ...room,
      doors: [...room.doors, { id: uid(), wallId: hit.wall.id, offset: Math.max(0.08, hit.offset - 0.45), width: 0.9, swing: 'left' }],
    }
  }
  for (const win of spec.windows ?? []) {
    const hit = nearestWall(room.walls, win.x, win.z, 0.8)
    if (!hit) continue
    room = {
      ...room,
      windows: [...room.windows, { id: uid(), wallId: hit.wall.id, offset: Math.max(0.08, hit.offset - 0.8), width: 1.6, sill: 0.9, head: 2.3 }],
    }
  }
  room = withBounds(room)
  if (spec.names?.length) {
    room = {
      ...room,
      spaces: room.spaces.map((sp) => {
        const label = spec.names!.find((n) => pointInPoly(sp.polygon, n.x, n.z))
        return label ? { ...sp, name: label.name } : sp
      }),
    }
  }
  const items: PlacedItem[] = []
  for (const it of spec.items) {
    const id = resolveCatalogId(it.item)
    if (!id) continue
    catalogItem(id)
    items.push({
      id: uid(),
      catalogId: id,
      x: it.x,
      z: it.z,
      rotation: it.rotationDeg != null ? (it.rotationDeg * Math.PI) / 180 : (it.rotation ?? 0),
    })
  }
  const notes: Note[] = (spec.notes ?? []).map((n) => ({ id: uid(), x: n.x, z: n.z, text: n.text }))
  return {
    version: 1,
    name: spec.name ?? 'AI room',
    templateId: 'ai-design',
    occupancyGroup: spec.occupancyGroup ?? 'B Business',
    room,
    items,
    notes,
    brandColor: spec.brand ?? '#3b82f6',
    floorFinish: spec.floor ?? 'oak',
    wallFinish: spec.walls ?? 'plaster',
    timeOfDay: 16,
    budgetTier: 'standard',
    budgetCap: 20000,
    jurisdiction: 'IBC',
    category: 'home',
  }
}

export function readOpenFile(raw: string): ProjectFile | null {
  try {
    const data = JSON.parse(raw) as unknown
    if (isDesignSpec(data)) return compileDesign(data)
    return null
  } catch {
    return null
  }
}
