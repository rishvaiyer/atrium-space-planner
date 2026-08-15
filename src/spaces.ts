import { uid } from './geometry'
import type { Space, WallSeg } from './types'

const Q = 100

function vk(x: number, z: number): string {
  return `${Math.round(x * Q)}:${Math.round(z * Q)}`
}

export function polygonArea(poly: { x: number; z: number }[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p.x * q.z - q.x * p.z
  }
  return a / 2
}

export function polygonCentroid(poly: { x: number; z: number }[]): { x: number; z: number } {
  const a = polygonArea(poly) || 1
  let x = 0
  let z = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const c = p.x * q.z - q.x * p.z
    x += (p.x + q.x) * c
    z += (p.z + q.z) * c
  }
  return { x: x / (6 * a), z: z / (6 * a) }
}

export function pointInPoly(poly: { x: number; z: number }[], x: number, z: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const zi = poly[i].z
    const xj = poly[j].x
    const zj = poly[j].z
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi
    if (hit) inside = !inside
  }
  return inside
}

interface Node {
  x: number
  z: number
}

interface Out {
  to: string
  wallId: string
  angle: number
}

export function detectLoops(walls: WallSeg[]): { polygon: { x: number; z: number }[]; wallIds: string[]; area: number }[] {
  const usable = walls.filter((w) => Math.hypot(w.bx - w.ax, w.bz - w.az) > 0.2)
  const nodes = new Map<string, Node>()
  const adj = new Map<string, Out[]>()

  const addNode = (x: number, z: number) => {
    const id = vk(x, z)
    if (!nodes.has(id)) nodes.set(id, { x, z })
    if (!adj.has(id)) adj.set(id, [])
    return id
  }

  for (const wall of usable) {
    const a = addNode(wall.ax, wall.az)
    const b = addNode(wall.bx, wall.bz)
    if (a === b) continue
    const na = nodes.get(a)!
    const nb = nodes.get(b)!
    adj.get(a)!.push({ to: b, wallId: wall.id, angle: Math.atan2(nb.z - na.z, nb.x - na.x) })
    adj.get(b)!.push({ to: a, wallId: wall.id, angle: Math.atan2(na.z - nb.z, na.x - nb.x) })
  }

  for (const list of adj.values()) list.sort((p, q) => p.angle - q.angle)

  const used = new Set<string>()
  const faces: { polygon: { x: number; z: number }[]; wallIds: string[]; area: number }[] = []

  const mark = (from: string, to: string) => `${from}>${to}`

  for (const [from, outs] of adj) {
    for (const out of outs) {
      const start = mark(from, out.to)
      if (used.has(start)) continue
      const poly: { x: number; z: number }[] = []
      const wallIds: string[] = []
      let cur = from
      let nxt = out.to
      let guard = 0
      while (guard++ < 80) {
        const edge = mark(cur, nxt)
        if (used.has(edge) && poly.length) break
        used.add(edge)
        poly.push(nodes.get(cur)!)
        wallIds.push(adj.get(cur)?.find((o) => o.to === nxt)?.wallId ?? '')
        const outsHere = adj.get(nxt)
        if (!outsHere?.length) break
        const back = Math.atan2(nodes.get(cur)!.z - nodes.get(nxt)!.z, nodes.get(cur)!.x - nodes.get(nxt)!.x)
        let idx = outsHere.findIndex((o) => o.to === cur)
        if (idx < 0) {
          let best = 0
          let bestD = Infinity
          outsHere.forEach((o, i) => {
            let d = o.angle - back
            while (d < 0) d += Math.PI * 2
            if (d < bestD) {
              bestD = d
              best = i
            }
          })
          idx = best
        }
        const next = outsHere[(idx + 1) % outsHere.length]
        cur = nxt
        nxt = next.to
        if (cur === from && nxt === out.to && poly.length >= 3) break
      }
      if (poly.length < 3) continue
      const area = polygonArea(poly)
      if (area < 0.45) continue
      faces.push({ polygon: poly, wallIds: wallIds.filter(Boolean), area })
    }
  }

  faces.sort((a, b) => b.area - a.area)
  if (faces.length > 1) {
    const outer = faces[0]
    const rest = faces.slice(1)
    const inner = rest.reduce((s, f) => s + f.area, 0)
    if (inner > outer.area * 0.55) return rest
  }
  return faces
}

export function mergeSpaces(prev: Space[] | undefined, walls: WallSeg[]): Space[] {
  const loops = detectLoops(walls)
  const old = prev ?? []
  const used = new Set<string>()
  return loops.map((loop, i) => {
    const c = polygonCentroid(loop.polygon)
    let match: Space | undefined
    let best = Infinity
    for (const s of old) {
      if (used.has(s.id)) continue
      const oc = polygonCentroid(s.polygon)
      const d = Math.hypot(c.x - oc.x, c.z - oc.z)
      if (d < best && (pointInPoly(s.polygon, c.x, c.z) || pointInPoly(loop.polygon, oc.x, oc.z) || d < 1.2)) {
        best = d
        match = s
      }
    }
    if (match) used.add(match.id)
    return {
      id: match?.id ?? uid(),
      name: match?.name ?? (loops.length === 1 ? 'Main' : `Room ${i + 1}`),
      polygon: loop.polygon,
      wallIds: loop.wallIds,
    }
  })
}
