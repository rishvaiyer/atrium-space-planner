import {
  DEFAULT_COST_SETTINGS,
  furnitureSchedule,
  moneyAmount,
  unitPriceFor,
  type CostSettings,
} from './pricing'
import { catalogItem } from './catalog'
import { itemAabb } from './geometry'
import { pointInPoly, polygonArea } from './spaces'
import { doorCenter, wallPieces, pointOnWall } from './walls'
import type {
  BudgetTier,
  ComplianceCheck,
  CostLine,
  EgressPath,
  FloorFinish,
  PlacedItem,
  Room,
} from './types'
import type { WorldId } from './worlds'
import { worldOf } from './worlds'

const CELL = 0.2
const TRAVEL_LIMIT: Record<string, number> = { IBC: 18, NBC: 20, Eurocode: 20 }
const AISLE_REQUIRED = 0.915
const OCCUPANT_M2 = 1.4

const FLOOR_RATE: Record<FloorFinish, Record<BudgetTier, number>> = {
  oak: { budget: 42, standard: 68, premium: 110 },
  walnut: { budget: 48, standard: 78, premium: 128 },
  herringbone: { budget: 55, standard: 92, premium: 150 },
  terrazzo: { budget: 55, standard: 90, premium: 145 },
  marble: { budget: 72, standard: 120, premium: 210 },
  concrete: { budget: 18, standard: 32, premium: 54 },
  tile: { budget: 28, standard: 48, premium: 86 },
  slate: { budget: 36, standard: 64, premium: 108 },
  carpet: { budget: 14, standard: 26, premium: 48 },
  checker: { budget: 22, standard: 38, premium: 64 },
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
  const ox = room.originX
  const oz = room.originZ

  const mark = (x: number, z: number) => {
    const c = Math.floor((x - ox) / CELL)
    const r = Math.floor((z - oz) / CELL)
    if (c >= 0 && r >= 0 && c < cols && r < rows) blocked[r * cols + c] = 1
  }

  const wallRadius = room.wallThickness / 2 + inflate
  for (const wall of room.walls) {
    for (const piece of wallPieces(room, wall)) {
      const a = pointOnWall(wall, piece.s)
      const b = pointOnWall(wall, piece.e)
      const dx = b.x - a.x
      const dz = b.z - a.z
      const lengthSquared = dx * dx + dz * dz
      if (!lengthSquared) continue
      const minC = Math.max(0, Math.floor((Math.min(a.x, b.x) - wallRadius - ox) / CELL))
      const maxC = Math.min(cols - 1, Math.ceil((Math.max(a.x, b.x) + wallRadius - ox) / CELL))
      const minR = Math.max(0, Math.floor((Math.min(a.z, b.z) - wallRadius - oz) / CELL))
      const maxR = Math.min(rows - 1, Math.ceil((Math.max(a.z, b.z) + wallRadius - oz) / CELL))
      for (let c = minC; c <= maxC; c++) {
        for (let r = minR; r <= maxR; r++) {
          const x = ox + (c + 0.5) * CELL
          const z = oz + (r + 0.5) * CELL
          const length = Math.sqrt(lengthSquared)
          const along = ((x - a.x) * dx + (z - a.z) * dz) / length
          const across = Math.abs((x - a.x) * dz - (z - a.z) * dx) / length
          const endDistance = Math.max(0, -along, along - length)
          const sideDistance = Math.max(0, across - room.wallThickness / 2)
          if (Math.hypot(endDistance, sideDistance) <= inflate) blocked[r * cols + c] = 1
        }
      }
    }
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

function cellOf(x: number, z: number, grid: Grid, originX = 0, originZ = 0): { c: number; r: number } {
  return {
    c: clampInt(Math.floor((x - originX) / CELL), 0, grid.cols - 1),
    r: clampInt(Math.floor((z - originZ) / CELL), 0, grid.rows - 1),
  }
}

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function walkableAt(grid: Grid, x: number, z: number, room: Room) {
  if (x < room.originX || z < room.originZ || x > room.originX + room.width || z > room.originZ + room.depth)
    return null
  const cell = cellOf(x, z, grid, room.originX, room.originZ)
  return walkable(grid, cell.c, cell.r) ? cell : null
}

function isExteriorDoor(room: Room, wallId: string) {
  const wall = room.walls.find((wall) => wall.id === wallId)
  if (!wall) return false
  const near = (a: number, b: number) => Math.abs(a - b) < 0.03
  return (
    [room.originX, room.originX + room.width].some((x) => near(wall.ax, x) && near(wall.bx, x)) ||
    [room.originZ, room.originZ + room.depth].some((z) => near(wall.az, z) && near(wall.bz, z))
  )
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
  let steps = 0

  const heuristic = (c: number, r: number) => {
    let best = Infinity
    for (const g of goals) {
      const gc = g % grid.cols
      const gr = Math.floor(g / grid.cols)
      const dx = Math.abs(c - gc)
      const dz = Math.abs(r - gr)
      const d = Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)
      if (d < best) best = d
    }
    return best
  }

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ]

  while (open.length && steps < grid.cols * grid.rows * 2) {
    steps += 1
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

function doorGoalCells(room: Room, grid: Grid, inflate = 0): Set<number> {
  const goals = new Set<number>()
  for (const door of room.doors) {
    if (!isExteriorDoor(room, door.wallId) || door.width < 2 * inflate) continue
    const p = doorCenter(room, door)
    if (!p) continue
    const offset = room.wallThickness / 2 + inflate + CELL
    let approachClear = true
    for (let step = 0.01; step <= offset + CELL / 2; step += CELL / 2) {
      if (!walkableAt(grid, p.x + p.inwardX * step, p.z + p.inwardZ * step, room)) {
        approachClear = false
        break
      }
    }
    if (!approachClear) continue
    const inner = walkableAt(grid, p.x + p.inwardX * offset, p.z + p.inwardZ * offset, room)
    if (inner) goals.add(inner.r * grid.cols + inner.c)
  }
  return goals
}

export interface SpaceReport {
  id: string
  name: string
  area: number
  seats: number
  load: number
}

export interface Analysis {
  area: number
  seats: number
  occupantLoad: number
  seatsPerM2: number
  occupancyGroup: string
  worldId: WorldId
  gravityG: number
  atmosphereKpa: number
  meanK: number
  maxTravelM: number
  travelLimitM: number
  aisleOk: boolean
  aisleMinM: number | null
  aisleRequiredM: number
  paths: EgressPath[]
  checks: ComplianceCheck[]
  lines: CostLine[]
  schedule: ReturnType<typeof furnitureSchedule>
  total: number
  cap: number
  budgetOk: boolean
  spaces: SpaceReport[]
}

export function analyzeLayout(options: {
  room: Room
  items: PlacedItem[]
  tier: BudgetTier
  floor: FloorFinish
  cap: number
  jurisdiction: string
  worldId: WorldId
  occupancyGroup?: string
  costSettings?: CostSettings
}): Analysis {
  const { room, items, tier, floor, cap, jurisdiction, worldId } = options
  const world = worldOf(worldId)
  const occupancyGroup = options.occupancyGroup ?? world.occupancyGroup
  const spaceReports: SpaceReport[] = (room.spaces ?? []).map((sp) => {
    const a = Math.abs(polygonArea(sp.polygon))
    const seatsHere = items.reduce(
      (n, it) => (pointInPoly(sp.polygon, it.x, it.z) ? n + catalogItem(it.catalogId).seats : n),
      0,
    )
    return {
      id: sp.id,
      name: sp.name,
      area: a,
      seats: seatsHere,
      load: Math.max(seatsHere, Math.max(1, Math.ceil(a / OCCUPANT_M2))),
    }
  })
  const area =
    spaceReports.length > 0 ? spaceReports.reduce((s, sp) => s + sp.area, 0) : room.width * room.depth
  const seats = items.reduce((sum, item) => sum + catalogItem(item.catalogId).seats, 0)
  const occupantLoad =
    spaceReports.length > 0
      ? spaceReports.reduce((s, sp) => s + sp.load, 0)
      : Math.max(1, Math.ceil(area / OCCUPANT_M2))
  const travelLimitM = TRAVEL_LIMIT[jurisdiction] ?? 18

  const paths: EgressPath[] = []

  for (const item of items) {
    const def = catalogItem(item.catalogId)
    if (!def.isSeat) continue
    const grid = buildGrid(
      room,
      items.filter((other) => other.id !== item.id),
      0,
    )
    const goals = doorGoalCells(room, grid)
    const start = walkableAt(grid, item.x, item.z, room)
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
      points: found.map((n) => ({
        x: room.originX + (n.c + 0.5) * CELL,
        z: room.originZ + (n.r + 0.5) * CELL,
      })),
      length: pathLength(found),
    })
  }

  const maxTravelM = paths.reduce((m, p) => Math.max(m, p.length), 0)
  let aisleReachable = room.doors.some((door) => isExteriorDoor(room, door.wallId))
  for (const item of items) {
    if (!catalogItem(item.catalogId).isSeat) continue
    const inflated = buildGrid(
      room,
      items.filter((other) => other.id !== item.id),
      AISLE_REQUIRED / 2,
    )
    const inflatedGoals = doorGoalCells(room, inflated, AISLE_REQUIRED / 2)
    const start = walkableAt(inflated, item.x, item.z, room)
    if (!start) {
      aisleReachable = false
      break
    }
    if (!astar(inflated, start, inflatedGoals)) {
      aisleReachable = false
      break
    }
  }

  const aisleMinM = null
  const doorWidth = room.doors.length ? Math.min(...room.doors.map((d) => d.width)) : 0
  const adaDoor = doorWidth >= 0.815

  const groups: Record<string, number> = {
    seating: 0,
    tables: 0,
    counters: 0,
    lighting: 0,
    other: 0,
    habitat: 0,
    power: 0,
    life: 0,
  }
  for (const item of items) {
    const def = catalogItem(item.catalogId)
    groups[def.costGroup] += unitPriceFor(item, tier)
  }
  const settings = options.costSettings ?? DEFAULT_COST_SETTINGS
  const flooring =
    area * (worldId === 'earth' ? (settings.floorRate ?? FLOOR_RATE[floor][tier]) : world.padUsdM2[tier])
  const allLines: CostLine[] = [
    { group: 'seating', label: 'Seating', amount: groups.seating },
    { group: 'tables', label: 'Tables', amount: groups.tables },
    { group: 'counters', label: 'Counters & equipment', amount: groups.counters },
    { group: 'lighting', label: 'Lighting', amount: groups.lighting },
    { group: 'habitat', label: 'Habitat modules', amount: groups.habitat },
    { group: 'life', label: 'Life support', amount: groups.life },
    { group: 'power', label: 'Power', amount: groups.power },
    { group: 'other', label: 'Fixtures', amount: groups.other },
    {
      group: 'flooring',
      label:
        worldId === 'earth'
          ? `Floor — ${floor}${settings.floorRate != null ? ' (your rate)' : ' allowance'}`
          : `Pad / ISRU shell`,
      amount: flooring,
    },
  ]
  const lines = allLines.filter((line) => line.amount > 0 || line.group === 'flooring')
  if (settings.setupAllowance > 0)
    lines.push({
      group: 'setup',
      label: 'Delivery & installation allowance',
      amount: settings.setupAllowance,
    })
  const subtotal = moneyAmount(lines.reduce((sum, line) => sum + line.amount, 0))
  if (settings.contingencyPct > 0)
    lines.push({
      group: 'contingency',
      label: `Contingency (${settings.contingencyPct}%)`,
      amount: moneyAmount((subtotal * settings.contingencyPct) / 100),
    })
  const total = moneyAmount(lines.reduce((sum, line) => sum + line.amount, 0))

  const travelOk = paths.length > 0 && paths.every((p) => p.length < 90)
  const budgetOk = total <= cap
  const count = (id: string) => items.filter((it) => it.catalogId === id).length
  const crew = Math.max(seats, 1)
  const o2Beds = count('greenhouse') * 3 + count('eclss') * 4 + count('isru') * 2
  const powerKw = count('solar-array') * 6 * world.solarFactor + count('rtg') * 8
  const powerNeed = crew * 2.1 + count('greenhouse') * 2.4
  const pressurized = count('hab-mod') * 2 + count('rad-shelter') * 4
  const hasAirlock = count('airlock') > 0
  const shielded =
    world.radiation === 'low' ||
    count('rad-shelter') > 0 ||
    (world.radiation === 'high' && count('hab-mod') >= 2)

  const checks: ComplianceCheck[] =
    worldId === 'earth'
      ? [
          {
            id: 'egress',
            label: 'Routes to exterior doors',
            ok: travelOk,
            detail: travelOk
              ? `Longest route about ${maxTravelM.toFixed(1)} m on a 20 cm grid`
              : maxTravelM >= 90
                ? 'Path blocked'
                : 'No route found',
          },
          {
            id: 'aisle',
            label: 'Route clearance screen',
            ok: aisleReachable && adaDoor,
            detail:
              aisleReachable && adaDoor
                ? `Route found with ${AISLE_REQUIRED} m clearance setting; door opening ${Math.round(doorWidth * 1000)} mm`
                : !adaDoor
                  ? 'Modelled door opening is below the 815 mm setting'
                  : 'No route found with the 915 mm clearance setting',
          },
          {
            id: 'budget',
            label: 'Budget envelope',
            ok: budgetOk,
            detail: budgetOk ? 'Within capex cap' : 'Over cap',
          },
        ]
      : [
          {
            id: 'airlock',
            label: 'Airlock',
            ok: hasAirlock,
            detail: hasAirlock ? 'EVA cycle possible' : 'No pressure vestibule',
          },
          {
            id: 'pressure',
            label: 'Pressurized berths',
            ok: pressurized >= world.crewTarget,
            detail: `${pressurized} / ${world.crewTarget} crew`,
          },
          {
            id: 'eclss',
            label: 'O₂ / ECLSS',
            ok: o2Beds >= world.crewTarget,
            detail: `${o2Beds} crew-days support / ${world.crewTarget} needed`,
          },
          {
            id: 'power',
            label: 'Power budget',
            ok: powerKw >= powerNeed,
            detail: `${powerKw.toFixed(1)} / ${powerNeed.toFixed(1)} kW · insolation ${world.solarFactor}×`,
          },
          {
            id: 'rad',
            label: 'Radiation',
            ok: shielded,
            detail:
              world.radiation === 'low'
                ? 'Magnetosphere / thick air'
                : shielded
                  ? 'Storm shelter online'
                  : 'Unshielded surface dose',
          },
          {
            id: 'budget',
            label: 'Mission capex',
            ok: budgetOk,
            detail: budgetOk ? 'Within envelope' : 'Over cap',
          },
        ]

  return {
    area,
    seats,
    occupantLoad: worldId === 'earth' ? occupantLoad : world.crewTarget,
    seatsPerM2: area > 0 ? seats / area : 0,
    occupancyGroup,
    worldId,
    gravityG: world.gravityG,
    atmosphereKpa: world.atmosphereKpa,
    meanK: world.meanK,
    maxTravelM,
    travelLimitM,
    aisleOk: aisleReachable && adaDoor,
    aisleMinM,
    aisleRequiredM: AISLE_REQUIRED,
    paths,
    checks,
    lines,
    schedule: furnitureSchedule(items, tier),
    total,
    cap,
    budgetOk,
    spaces: spaceReports,
  }
}
