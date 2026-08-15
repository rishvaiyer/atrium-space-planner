import { clamp, snapTo, uid } from './geometry'
import { mergeSpaces } from './spaces'
import type { Door, Room, WallSeg, WindowSpec } from './types'

export function wallLen(wall: WallSeg): number {
  return Math.hypot(wall.bx - wall.ax, wall.bz - wall.az)
}

export function wallDir(wall: WallSeg): { x: number; z: number; len: number } {
  const len = wallLen(wall) || 1
  return { x: (wall.bx - wall.ax) / len, z: (wall.bz - wall.az) / len, len }
}

export function pointOnWall(wall: WallSeg, offset: number): { x: number; z: number } {
  const d = wallDir(wall)
  return { x: wall.ax + d.x * offset, z: wall.az + d.z * offset }
}

export function projectOnWall(
  wall: WallSeg,
  x: number,
  z: number,
): { offset: number; dist: number; x: number; z: number } {
  const d = wallDir(wall)
  const vx = x - wall.ax
  const vz = z - wall.az
  const offset = clamp(vx * d.x + vz * d.z, 0, d.len)
  const p = pointOnWall(wall, offset)
  return { offset, dist: Math.hypot(x - p.x, z - p.z), x: p.x, z: p.z }
}

export function nearestWall(
  walls: WallSeg[],
  x: number,
  z: number,
  maxDist = 0.45,
): { wall: WallSeg; offset: number; dist: number; x: number; z: number } | null {
  let best: { wall: WallSeg; offset: number; dist: number; x: number; z: number } | null = null
  for (const wall of walls) {
    const hit = projectOnWall(wall, x, z)
    if (hit.dist > maxDist) continue
    if (!best || hit.dist < best.dist) best = { wall, ...hit }
  }
  return best
}

export function nearestEndpoint(
  walls: WallSeg[],
  x: number,
  z: number,
  maxDist = 0.25,
): { x: number; z: number } | null {
  let best: { x: number; z: number; dist: number } | null = null
  for (const wall of walls) {
    for (const p of [
      { x: wall.ax, z: wall.az },
      { x: wall.bx, z: wall.bz },
    ]) {
      const dist = Math.hypot(p.x - x, p.z - z)
      if (dist > maxDist) continue
      if (!best || dist < best.dist) best = { ...p, dist }
    }
  }
  return best ? { x: best.x, z: best.z } : null
}

export function orthoFrom(ax: number, az: number, x: number, z: number): { x: number; z: number } {
  if (Math.abs(x - ax) >= Math.abs(z - az)) return { x, z: az }
  return { x: ax, z }
}

export function snapDrawPoint(
  x: number,
  z: number,
  walls: WallSeg[],
  snap: number,
  from?: { x: number; z: number },
  freeAngle = false,
): { x: number; z: number } {
  let px = snap ? snapTo(x, snap) : x
  let pz = snap ? snapTo(z, snap) : z
  if (from && !freeAngle) {
    const o = orthoFrom(from.x, from.z, px, pz)
    px = o.x
    pz = o.z
  }
  const ep = nearestEndpoint(walls, px, pz, 0.22)
  if (ep) return ep
  return { x: px, z: pz }
}

export function boxWalls(width: number, depth: number): WallSeg[] {
  return [
    { id: 's', ax: 0, az: 0, bx: width, bz: 0 },
    { id: 'e', ax: width, az: 0, bx: width, bz: depth },
    { id: 'n', ax: width, az: depth, bx: 0, bz: depth },
    { id: 'w', ax: 0, az: depth, bx: 0, bz: 0 },
  ]
}

export function boxRoom(
  width: number,
  depth: number,
  wallHeight = 3,
  doors: Door[] = [],
  windows: WindowSpec[] = [],
  wallThickness = 0.2,
): Room {
  return {
    width,
    depth,
    originX: 0,
    originZ: 0,
    wallHeight,
    wallThickness,
    walls: boxWalls(width, depth),
    doors,
    windows,
    spaces: mergeSpaces(undefined, boxWalls(width, depth)),
  }
}

export function boundsFromWalls(walls: WallSeg[]): { originX: number; originZ: number; width: number; depth: number } {
  if (!walls.length) return { originX: 0, originZ: 0, width: 8, depth: 6 }
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const w of walls) {
    minX = Math.min(minX, w.ax, w.bx)
    minZ = Math.min(minZ, w.az, w.bz)
    maxX = Math.max(maxX, w.ax, w.bx)
    maxZ = Math.max(maxZ, w.az, w.bz)
  }
  return {
    originX: minX,
    originZ: minZ,
    width: Math.max(1, maxX - minX),
    depth: Math.max(1, maxZ - minZ),
  }
}

export function withBounds(room: Room): Room {
  const b = boundsFromWalls(room.walls)
  return { ...room, ...b, spaces: mergeSpaces(room.spaces, room.walls) }
}

export function wallById(room: Room, id: string): WallSeg | undefined {
  return room.walls.find((w) => w.id === id)
}

export function openingsOnSeg(room: Room, wallId: string): { start: number; end: number }[] {
  const holes: { start: number; end: number }[] = []
  for (const door of room.doors) {
    if (door.wallId === wallId) holes.push({ start: door.offset, end: door.offset + door.width })
  }
  holes.sort((a, b) => a.start - b.start)
  return holes
}

export function wallPieces(room: Room, wall: WallSeg): { s: number; e: number }[] {
  const length = wallLen(wall)
  const holes = openingsOnSeg(room, wall.id)
  const out: { s: number; e: number }[] = []
  let cursor = 0
  for (const hole of holes) {
    if (hole.start > cursor + 0.01) out.push({ s: cursor, e: hole.start })
    cursor = Math.max(cursor, hole.end)
  }
  if (cursor < length - 0.01) out.push({ s: cursor, e: length })
  return out
}

export function doorHinge(room: Room, door: Door): { x: number; z: number; angle: number } | null {
  const wall = wallById(room, door.wallId)
  if (!wall) return null
  const d = wallDir(wall)
  const along = door.swing === 'left' ? door.offset : door.offset + door.width
  const p = pointOnWall(wall, along)
  const angle = Math.atan2(d.z, d.x) + (door.swing === 'left' ? 0 : Math.PI)
  return { x: p.x, z: p.z, angle }
}

export function doorCenter(room: Room, door: Door): { x: number; z: number; inwardX: number; inwardZ: number } | null {
  const wall = wallById(room, door.wallId)
  if (!wall) return null
  const d = wallDir(wall)
  const p = pointOnWall(wall, door.offset + door.width / 2)
  const midX = room.originX + room.width / 2
  const midZ = room.originZ + room.depth / 2
  let nx = -d.z
  let nz = d.x
  const toMidX = midX - p.x
  const toMidZ = midZ - p.z
  if (nx * toMidX + nz * toMidZ < 0) {
    nx = -nx
    nz = -nz
  }
  return { x: p.x, z: p.z, inwardX: nx, inwardZ: nz }
}

export function cloneRoom(room: Room): Room {
  return {
    ...room,
    walls: room.walls.map((w) => ({ ...w })),
    doors: room.doors.map((d) => ({ ...d })),
    windows: room.windows.map((w) => ({ ...w })),
    spaces: (room.spaces ?? []).map((s) => ({ ...s, polygon: s.polygon.map((p) => ({ ...p })), wallIds: [...s.wallIds] })),
  }
}

export function reshapeBox(room: Room, width: number, depth: number): Room {
  const ids = new Set(room.walls.map((w) => w.id))
  if (ids.has('s') && ids.has('e') && ids.has('n') && ids.has('w')) {
    const extras = room.walls.filter((w) => !['s', 'e', 'n', 'w'].includes(w.id))
    return withBounds({
      ...room,
      width,
      depth,
      originX: 0,
      originZ: 0,
      walls: [...boxWalls(width, depth), ...extras],
    })
  }
  return room
}

type LegacyDoor = Door & { wall?: string }
type LegacyWindow = WindowSpec & { wall?: string }
type LegacyRoom = Omit<Room, 'walls' | 'doors' | 'windows' | 'originX' | 'originZ' | 'spaces'> & {
  walls?: WallSeg[]
  doors: LegacyDoor[]
  windows: LegacyWindow[]
  originX?: number
  originZ?: number
  spaces?: Room['spaces']
}

export function migrateRoom(raw: LegacyRoom): Room {
  const doors: Door[] = raw.doors.map((d) => ({
    id: d.id || uid(),
    wallId: d.wallId || d.wall || 's',
    offset: d.offset,
    width: d.width,
    swing: d.swing,
  }))
  const windows: WindowSpec[] = raw.windows.map((w) => ({
    id: w.id || uid(),
    wallId: w.wallId || w.wall || 'n',
    offset: w.offset,
    width: w.width,
    sill: w.sill,
    head: w.head,
  }))
  const walls = raw.walls?.length ? raw.walls : boxWalls(raw.width, raw.depth)
  return withBounds({
    width: raw.width,
    depth: raw.depth,
    originX: raw.originX ?? 0,
    originZ: raw.originZ ?? 0,
    wallHeight: raw.wallHeight,
    wallThickness: raw.wallThickness,
    walls,
    doors,
    windows,
    spaces: mergeSpaces(raw.spaces, walls),
  })
}

function remapOpening<T extends { wallId: string; offset: number; width: number }>(
  op: T,
  oldId: string,
  cut: number,
  newId: string,
): T {
  if (op.wallId !== oldId) return op
  if (op.offset + op.width / 2 <= cut) return op
  return { ...op, wallId: newId, offset: Math.max(0, op.offset - cut) }
}

export function splitRoomAtPoint(room: Room, x: number, z: number, tol = 0.14): Room {
  let walls = room.walls
  let doors = room.doors
  let windows = room.windows
  for (const wall of [...walls]) {
    const hit = projectOnWall(wall, x, z)
    if (hit.dist > tol) continue
    const len = wallLen(wall)
    if (hit.offset < 0.12 || hit.offset > len - 0.12) continue
    const a: WallSeg = { id: wall.id, ax: wall.ax, az: wall.az, bx: hit.x, bz: hit.z }
    const b: WallSeg = { id: uid(), ax: hit.x, az: hit.z, bx: wall.bx, bz: wall.bz }
    walls = walls.flatMap((w) => (w.id === wall.id ? [a, b] : [w]))
    doors = doors.map((d) => remapOpening(d, wall.id, hit.offset, b.id))
    windows = windows.map((w) => remapOpening(w, wall.id, hit.offset, b.id))
  }
  return { ...room, walls, doors, windows }
}

export function insertWall(room: Room, ax: number, az: number, bx: number, bz: number): { room: Room; id: string } {
  let next = splitRoomAtPoint(room, ax, az)
  next = splitRoomAtPoint(next, bx, bz)
  const id = uid()
  next = { ...next, walls: [...next.walls, { id, ax, az, bx, bz }] }
  for (const w of [...next.walls]) {
    if (w.id === id) continue
    next = splitRoomAtPoint(next, w.ax, w.az)
    next = splitRoomAtPoint(next, w.bx, w.bz)
  }
  return { room: withBounds(next), id }
}
