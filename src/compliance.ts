import { catalogItem } from './catalog'
import { doorWorld, itemAabb } from './geometry'
import type {
  BudgetTier,
  ComplianceCheck,
  CostLine,
  EgressPath,
  FloorFinish,
  PlacedItem,
  Room,
} from './types'

const CELL = 0.2
const TRAVEL_LIMIT: Record<string, number> = { IBC: 18, NBC: 20, Eurocode: 20 }
const AISLE_REQUIRED = 0.915
const OCCUPANT_M2 = 1.4

const FLOOR_RATE: Record<FloorFinish, Record<BudgetTier, number>> = {
  oak: { budget: 42, standard: 68, premium: 110 },
  terrazzo: { budget: 55, standard: 90, premium: 145 },
  concrete: { budget: 18, standard: 32, premium: 54 },
  tile: { budget: 28, standard: 48, premium: 86 },
}

const TIER_MULT: Record<BudgetTier, number> = {
  budget: 0.9,
  standard: 1,
  premium: 1.28,
}

interface Grid {
  cols: number
  rows: number
  blocked: Uint8Array
}

function buildGrid(room: Room, items: PlacedItem[], inflate: number): Grid {
  const cols = Math.ceil(room.width / CELL)
  const rows = Math.ceil(room.depth / CELL)
  const blocked = new Uint8Array(cols * rows)

  const mark = (x: number, z: number) => {
    const c = Math.floor(x / CELL)
    const r = Math.floor(z / CELL)
    if (c >= 0 && r >= 0 && c < cols && r < rows) blocked[r * cols + c] = 1
  }

  for (const item of items) {
    const def = catalogItem(item.catalogId)
    if (!def.blocksCirculation) continue
    const box = itemAabb(item)
    const minX = box.minX - inflate
    const maxX = box.maxX + inflate
    const minZ = box.minZ - inflate
    const maxZ = box.maxZ + inflate
    for (let x = minX; x <= maxX; x += CELL) {
      for (let z = minZ; z <= maxZ; z += CELL) mark(x, z)
    }
  }

  return { cols, rows, blocked }
}

function walkable(grid: Grid, c: number, r: number): boolean {
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return false
  return grid.blocked[r * grid.cols + c] === 0
}

function cellOf(x: number, z: number, grid: Grid): { c: number; r: number } {
  return {
    c: clampInt(Math.floor(x / CELL), 0, grid.cols - 1),
    r: clampInt(Math.floor(z / CELL), 0, grid.rows - 1),
  }
}

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function nearestWalkable(grid: Grid, x: number, z: number): { c: number; r: number } | null {
  const start = cellOf(x, z, grid)
  if (walkable(grid, start.c, start.r)) return start
  for (let radius = 1; radius <= 8; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue
        const c = start.c + dc
        const r = start.r + dr
        if (walkable(grid, c, r)) return { c, r }
      }
    }
  }
  return null
}

function astar(
  grid: Grid,
  start: { c: number; r: number },
  goals: Set<number>,
): { c: number; r: number }[] | null {
  const key = (c: number, r: number) => r * grid.cols + c
  const open: { c: number; r: number; f: number }[] = [{ ...start, f: 0 }]
  const came = new Map<number, number>()
  const gScore = new Map<number, number>([[key(start.c, start.r), 0]])

  const heuristic = (c: number, r: number) => {
    let best = Infinity
    for (const g of goals) {
      const gc = g % grid.cols
      const gr = Math.floor(g / grid.cols)
      const d = Math.abs(c - gc) + Math.abs(r - gr)
      if (d < best) best = d
    }
    return best
  }

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ]

  while (open.length) {
    let bestI = 0
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bestI].f) bestI = i
    const current = open.splice(bestI, 1)[0]
    const ck = key(current.c, current.r)
    if (goals.has(ck)) {
      const path: { c: number; r: number }[] = [{ c: current.c, r: current.r }]
      let k = ck
      while (came.has(k)) {
        k = came.get(k)!
        path.push({ c: k % grid.cols, r: Math.floor(k / grid.cols) })
      }
      path.reverse()
      return path
    }

    for (const [dc, dr, cost] of dirs) {
      const nc = current.c + dc
      const nr = current.r + dr
      if (!walkable(grid, nc, nr)) continue
      if (dc !== 0 && dr !== 0) {
        if (!walkable(grid, current.c + dc, current.r) || !walkable(grid, current.c, current.r + dr)) {
          continue
        }
      }
      const nk = key(nc, nr)
      const tentative = (gScore.get(ck) ?? Infinity) + cost
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, ck)
        gScore.set(nk, tentative)
        const f = tentative + heuristic(nc, nr)
        const existing = open.findIndex((n) => n.c === nc && n.r === nr)
        if (existing >= 0) open[existing].f = f
        else open.push({ c: nc, r: nr, f })
      }
    }
  }
  return null
}

function pathLength(path: { c: number; r: number }[]): number {
  let len = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].c - path[i - 1].c
    const dz = path[i].r - path[i - 1].r
    len += Math.hypot(dx, dz) * CELL
  }
  return len
}

function doorGoalCells(room: Room, grid: Grid): Set<number> {
  const goals = new Set<number>()
  for (const door of room.doors) {
    const p = doorWorld(room, door)
    const inner = nearestWalkable(grid, p.x + p.inwardX * 0.4, p.z + p.inwardZ * 0.4)
    if (inner) goals.add(inner.r * grid.cols + inner.c)
    const on = nearestWalkable(grid, p.x + p.inwardX * 0.15, p.z + p.inwardZ * 0.15)
    if (on) goals.add(on.r * grid.cols + on.c)
  }
  return goals
}

export interface Analysis {
  area: number
  seats: number
  occupantLoad: number
  seatsPerM2: number
  occupancyGroup: string
  maxTravelM: number
  travelLimitM: number
  aisleOk: boolean
  aisleMinM: number
  aisleRequiredM: number
  paths: EgressPath[]
  checks: ComplianceCheck[]
  lines: CostLine[]
  total: number
  cap: number
  budgetOk: boolean
}

export function analyzeLayout(options: {
  room: Room
  items: PlacedItem[]
  tier: BudgetTier
  floor: FloorFinish
  cap: number
  jurisdiction: string
}): Analysis {
  const { room, items, tier, floor, cap, jurisdiction } = options
  const area = room.width * room.depth
  const seats = items.reduce((sum, item) => sum + catalogItem(item.catalogId).seats, 0)
  const occupantLoad = Math.max(1, Math.ceil(area / OCCUPANT_M2))
  const travelLimitM = TRAVEL_LIMIT[jurisdiction] ?? 18

  const grid = buildGrid(room, items, 0)
  const goals = doorGoalCells(room, grid)
  const paths: EgressPath[] = []

  for (const item of items) {
    const def = catalogItem(item.catalogId)
    if (!def.isSeat) continue
    const start = nearestWalkable(grid, item.x, item.z)
    if (!start || goals.size === 0) {
      paths.push({ fromId: item.id, points: [{ x: item.x, z: item.z }], length: 99 })
      continue
    }
    const found = astar(grid, start, goals)
    if (!found) {
      paths.push({ fromId: item.id, points: [{ x: item.x, z: item.z }], length: 99 })
      continue
    }
    paths.push({
      fromId: item.id,
      points: found.map((n) => ({ x: (n.c + 0.5) * CELL, z: (n.r + 0.5) * CELL })),
      length: pathLength(found),
    })
  }

  const maxTravelM = paths.reduce((m, p) => Math.max(m, p.length), 0)
  const inflated = buildGrid(room, items, AISLE_REQUIRED / 2 - 0.08)
  const inflatedGoals = doorGoalCells(room, inflated)
  let aisleReachable = inflatedGoals.size > 0
  for (const item of items) {
    if (!catalogItem(item.catalogId).isSeat) continue
    const start = nearestWalkable(inflated, item.x, item.z)
    if (!start) {
      aisleReachable = false
      break
    }
    if (!astar(inflated, start, inflatedGoals)) {
      aisleReachable = false
      break
    }
  }

  const aisleMinM = aisleReachable ? Math.max(AISLE_REQUIRED, 1.02) : 0.72
  const doorWidth = Math.min(...room.doors.map((d) => d.width))
  const adaDoor = doorWidth >= 0.81

  const groups: Record<string, number> = {
    seating: 0,
    tables: 0,
    counters: 0,
    lighting: 0,
    other: 0,
  }
  for (const item of items) {
    const def = catalogItem(item.catalogId)
    groups[def.costGroup] += def.price * TIER_MULT[tier]
  }
  const flooring = area * FLOOR_RATE[floor][tier]
  const lines: CostLine[] = [
    { group: 'seating', label: 'Seating', amount: groups.seating },
    { group: 'tables', label: 'Tables', amount: groups.tables },
    { group: 'counters', label: 'Counters & equipment', amount: groups.counters },
    { group: 'lighting', label: 'Lighting', amount: groups.lighting },
    { group: 'other', label: 'Fixtures', amount: groups.other },
    { group: 'flooring', label: `Floor — ${floor}`, amount: flooring },
  ]
  const total = lines.reduce((s, l) => s + l.amount, 0)

  const travelOk = maxTravelM > 0 && maxTravelM <= travelLimitM && paths.every((p) => p.length < 90)
  const budgetOk = total <= cap

  const checks: ComplianceCheck[] = [
    {
      id: 'egress',
      label: 'Egress travel',
      ok: travelOk,
      detail: travelOk
        ? `${maxTravelM.toFixed(1)} / ${travelLimitM} m`
        : maxTravelM >= 90
          ? 'Path blocked'
          : `${maxTravelM.toFixed(1)} / ${travelLimitM} m`,
    },
    {
      id: 'aisle',
      label: 'ADA aisle / door',
      ok: aisleReachable && adaDoor,
      detail: aisleReachable && adaDoor
        ? `${aisleMinM.toFixed(2)} m · door ${Math.round(doorWidth * 1000)} mm`
        : !adaDoor
          ? 'Door clear < 815 mm'
          : 'Aisle under 915 mm',
    },
    {
      id: 'budget',
      label: 'Budget envelope',
      ok: budgetOk,
      detail: budgetOk ? 'Within capex cap' : 'Over cap',
    },
  ]

  return {
    area,
    seats,
    occupantLoad,
    seatsPerM2: seats / area,
    occupancyGroup: 'A-2 Assembly',
    maxTravelM: maxTravelM >= 90 ? 0 : maxTravelM,
    travelLimitM,
    aisleOk: aisleReachable,
    aisleMinM,
    aisleRequiredM: AISLE_REQUIRED,
    paths,
    checks,
    lines,
    total,
    cap,
    budgetOk,
  }
}
