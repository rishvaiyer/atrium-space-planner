import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react'
import { catalogItem } from '../catalog'
import { analyzeLayout } from '../compliance'
import { formatMm, itemAabb } from '../geometry'
import { usePlanner } from '../store'
import type { PlacedItem, WallSeg } from '../types'
import {
  nearestWall,
  pointOnWall,
  snapDrawPoint,
  wallById,
  wallDir,
} from '../walls'

export function FloorPlan2D() {
  const room = usePlanner((s) => s.room)
  const items = usePlanner((s) => s.items)
  const selectedIds = usePlanner((s) => s.selectedIds)
  const showGrid = usePlanner((s) => s.showGrid)
  const showDimensions = usePlanner((s) => s.showDimensions)
  const showFurniture = usePlanner((s) => s.showFurniture)
  const showLighting = usePlanner((s) => s.showLighting)
  const showEgress = usePlanner((s) => s.showEgress)
  const showWalls = usePlanner((s) => s.showWalls)
  const showOpenings = usePlanner((s) => s.showOpenings)
  const showLabels = usePlanner((s) => s.showLabels)
  const showNotesLayer = usePlanner((s) => s.showNotes)
  const showOccupancy = usePlanner((s) => s.showOccupancy)
  const notes = usePlanner((s) => s.notes)
  const brand = usePlanner((s) => s.brandColor)
  const pending = usePlanner((s) => s.pendingCatalogId)
  const tool = usePlanner((s) => s.tool)
  const measure = usePlanner((s) => s.measure)
  const snapOn = usePlanner((s) => s.snapOn)
  const snap = usePlanner((s) => s.snap)
  const floor = usePlanner((s) => s.floorFinish)
  const tier = usePlanner((s) => s.budgetTier)
  const cap = usePlanner((s) => s.budgetCap)
  const jurisdiction = usePlanner((s) => s.jurisdiction)
  const worldId = usePlanner((s) => s.worldId)
  const wallStart = usePlanner((s) => s.wallStart)
  const selectedArch = usePlanner((s) => s.selectedArch)
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null)

  const occupancyGroup = usePlanner((s) => s.occupancyGroup)
  const viewEpoch = usePlanner((s) => s.viewEpoch)

  const analysis = useMemo(() => {
    try {
      return analyzeLayout({ room, items, tier, floor, cap, jurisdiction, worldId, occupancyGroup })
    } catch {
      return null
    }
  }, [room, items, tier, floor, cap, jurisdiction, worldId, occupancyGroup])

  const wrapRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ x: -1.4, y: -1.5, w: room.width + 2.8, h: room.depth + 3 })

  useEffect(() => {
    setView({
      x: room.originX - 1.2,
      y: room.originZ - 1.3,
      w: room.width + 2.4,
      h: room.depth + 2.6,
    })
  }, [viewEpoch, room.width, room.depth, room.originX, room.originZ])
  const drag = useRef<{
    mode: 'pan' | 'item'
    ids: string[]
    originId?: string
    lastX: number
    lastZ: number
    moved: boolean
  } | null>(null)

  const toWorld = (clientX: number, clientY: number) => {
    const el = wrapRef.current
    if (!el) return { x: 0, z: 0 }
    const r = el.getBoundingClientRect()
    const sx = (clientX - r.left) / r.width
    const sy = (clientY - r.top) / r.height
    return { x: view.x + sx * view.w, z: view.y + sy * view.h }
  }

  const onWheel = (e: WheelEvent) => {
    if (e.cancelable) e.preventDefault()
    const factor = e.deltaY > 0 ? 1.1 : 0.9
    const p = toWorld(e.clientX, e.clientY)
    const nw = view.w * factor
    const nh = view.h * factor
    const sx = (p.x - view.x) / view.w
    const sy = (p.z - view.y) / view.h
    setView({ x: p.x - sx * nw, y: p.z - sy * nh, w: nw, h: nh })
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    const p = toWorld(e.clientX, e.clientY)
    const state = usePlanner.getState()

    if (e.button === 1 || e.altKey || e.button === 2 || tool === 'pan') {
      drag.current = { mode: 'pan', ids: [], lastX: e.clientX, lastZ: e.clientY, moved: false }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    if (tool === 'measure') {
      const s = snapOn ? snap : 0
      state.setMeasurePoint({
        x: s ? Math.round(p.x / s) * s : p.x,
        z: s ? Math.round(p.z / s) * s : p.z,
      })
      return
    }

    if (tool === 'note') {
      const hitNote = notes.find((n) => Math.hypot(n.x - p.x, n.z - p.z) < 0.22)
      if (hitNote) state.removeNote(hitNote.id)
      else state.addNote(p.x, p.z)
      return
    }

    if (tool === 'paint') {
      const hit = hitTest(items, p.x, p.z, showFurniture, showLighting)
      if (hit) state.setFinish(hit.id, state.brandColor)
      return
    }

    if (tool === 'stamp') {
      if (state.selectedIds.length) state.stampAt(p.x, p.z)
      return
    }

    if (tool === 'wall') {
      const snap = snapOn ? state.snap : 0
      const pt = snapDrawPoint(p.x, p.z, room.walls, snap, wallStart ?? undefined, e.shiftKey)
      if (!wallStart) {
        state.setWallStart(pt)
        return
      }
      state.addWall(wallStart.x, wallStart.z, pt.x, pt.z)
      return
    }

    if (tool === 'door') {
      state.placeOpening('door', p.x, p.z)
      return
    }

    if (tool === 'window') {
      state.placeOpening('window', p.x, p.z)
      return
    }

    if (pending) {
      state.placeItem(pending, p.x, p.z)
      return
    }

    const hit = hitTest(items, p.x, p.z, showFurniture, showLighting)
    if (hit) {
      state.select(hit.id, e.shiftKey)
      const ids = e.shiftKey
        ? usePlanner.getState().selectedIds
        : [hit.id]
      drag.current = {
        mode: 'item',
        ids,
        originId: hit.id,
        lastX: p.x,
        lastZ: p.z,
        moved: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    } else {
      const arch = hitArch(room, p.x, p.z)
      if (arch) {
        state.selectArch(arch)
        return
      }
      state.select(null)
      drag.current = { mode: 'pan', ids: [], lastX: e.clientX, lastZ: e.clientY, moved: false }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const p = toWorld(e.clientX, e.clientY)
    if (tool === 'wall') {
      const s = snapOn ? snap : 0
      setCursor(snapDrawPoint(p.x, p.z, room.walls, s, wallStart ?? undefined, e.shiftKey))
    }
    const d = drag.current
    if (!d) return
    if (d.mode === 'pan') {
      const el = wrapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const dx = ((e.clientX - d.lastX) / r.width) * view.w
      const dy = ((e.clientY - d.lastZ) / r.height) * view.h
      d.lastX = e.clientX
      d.lastZ = e.clientY
      setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
      return
    }
    if (!d.moved) {
      usePlanner.getState().commitHistory()
      d.moved = true
    }
    usePlanner.getState().moveItems(d.ids, p.x, p.z, d.originId)
  }

  const onPointerUp = () => {
    drag.current = null
  }

  const pad = 0.35

  return (
    <div
      className={`viewport2d world-${worldId} ${pending ? 'placing' : ''} tool-${tool}`}
      ref={wrapRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="view-label">Plan</div>
      <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="plan-svg">
        <defs>
          <pattern id="hatch" width="0.18" height="0.18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="0.18" stroke="#2c2822" strokeWidth="0.04" />
          </pattern>
        </defs>
        <rect x={view.x} y={view.y} width={view.w} height={view.h} className="paper" />

        {showGrid && (
          <g className="grid">
            {ticks(room.originX, room.originX + room.width, 0.2).map((x) => (
              <line
                key={`vx${x}`}
                x1={x}
                y1={room.originZ}
                x2={x}
                y2={room.originZ + room.depth}
                className={Math.abs((x - room.originX) % 1) < 1e-6 ? 'major' : 'minor'}
              />
            ))}
            {ticks(room.originZ, room.originZ + room.depth, 0.2).map((z) => (
              <line
                key={`hz${z}`}
                x1={room.originX}
                y1={z}
                x2={room.originX + room.width}
                y2={z}
                className={Math.abs((z - room.originZ) % 1) < 1e-6 ? 'major' : 'minor'}
              />
            ))}
          </g>
        )}

        {showWalls && (
          <g className="walls">
            {room.walls.map((wall) => (
              <line
                key={wall.id}
                x1={wall.ax}
                y1={wall.az}
                x2={wall.bx}
                y2={wall.bz}
                className={selectedArch?.kind === 'wall' && selectedArch.id === wall.id ? 'wall-sel' : ''}
              />
            ))}
            {showOpenings &&
              room.doors.map((door) => {
                const wall = wallById(room, door.wallId)
                if (!wall) return null
                const a = pointOnWall(wall, door.offset)
                const b = pointOnWall(wall, door.offset + door.width)
                return (
                  <g key={door.id}>
                    <line
                      className={`door-cut ${selectedArch?.kind === 'door' && selectedArch.id === door.id ? 'wall-sel' : ''}`}
                      x1={a.x}
                      y1={a.z}
                      x2={b.x}
                      y2={b.z}
                    />
                    <DoorSwing door={door} wall={wall} />
                  </g>
                )
              })}
            {showOpenings &&
              room.windows.map((win) => {
                const wall = wallById(room, win.wallId)
                if (!wall) return null
                const a = pointOnWall(wall, win.offset)
                const b = pointOnWall(wall, win.offset + win.width)
                return (
                  <line
                    key={win.id}
                    className={`window-cut ${selectedArch?.kind === 'window' && selectedArch.id === win.id ? 'wall-sel' : ''}`}
                    x1={a.x}
                    y1={a.z}
                    x2={b.x}
                    y2={b.z}
                  />
                )
              })}
          </g>
        )}

        {tool === 'wall' && wallStart && cursor && (
          <g className="wall-preview">
            <line x1={wallStart.x} y1={wallStart.z} x2={cursor.x} y2={cursor.z} />
            <circle cx={wallStart.x} cy={wallStart.z} r={0.07} />
            <circle cx={cursor.x} cy={cursor.z} r={0.07} />
          </g>
        )}

        {showEgress &&
          analysis?.paths.map((path) => (
            <polyline
              key={path.fromId}
              className={`egress ${selectedIds.includes(path.fromId) ? 'hot' : ''}`}
              fill="none"
              points={path.points.map((pt) => `${pt.x},${pt.z}`).join(' ')}
            />
          ))}

        {items.map((item) => {
          const def = catalogItem(item.catalogId)
          if (!showLighting && def.costGroup === 'lighting') return null
          if (!showFurniture && def.costGroup !== 'lighting') return null
          return (
            <PlanItem
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              brand={brand}
              showLabel={showLabels}
              showOccupancy={showOccupancy}
            />
          )
        })}

        {showNotesLayer &&
          notes.map((n) => (
            <g key={n.id} className="plan-note" transform={`translate(${n.x}, ${n.z})`}>
              <circle r={0.09} />
              <text x={0.14} y={0.05}>
                {n.text}
              </text>
            </g>
          ))}

        {showDimensions && (
          <g className="dims">
            <Dimension
              x1={room.originX}
              y1={room.originZ + room.depth + pad + 0.15}
              x2={room.originX + room.width}
              y2={room.originZ + room.depth + pad + 0.15}
              label={formatMm(room.width)}
            />
            <Dimension
              x1={room.originX + room.width + pad + 0.15}
              y1={room.originZ}
              x2={room.originX + room.width + pad + 0.15}
              y2={room.originZ + room.depth}
              label={formatMm(room.depth)}
              vertical
            />
            {selectedIds.length === 1 &&
              items.filter((i) => i.id === selectedIds[0]).map((it) => <ItemDims key={it.id} item={it} />)}
          </g>
        )}

        {measure.a && (
          <circle cx={measure.a.x} cy={measure.a.z} r={0.06} className="measure-pt" />
        )}
        {measure.a && measure.b && (
          <g className="measure">
            <line x1={measure.a.x} y1={measure.a.z} x2={measure.b.x} y2={measure.b.z} />
            <circle cx={measure.b.x} cy={measure.b.z} r={0.06} className="measure-pt" />
            <text
              x={(measure.a.x + measure.b.x) / 2}
              y={(measure.a.z + measure.b.z) / 2 - 0.12}
            >
              {formatMm(Math.hypot(measure.b.x - measure.a.x, measure.b.z - measure.a.z))} mm
            </text>
          </g>
        )}

        <g className="north" transform={`translate(${room.originX + room.width - 0.55}, ${room.originZ - 0.85})`}>
          <polygon points="0,-0.28 0.12,0.18 -0.12,0.18" />
          <text y="0.42" textAnchor="middle">
            N
          </text>
        </g>
      </svg>
    </div>
  )
}

function ticks(from: number, to: number, step: number): number[] {
  const out: number[] = []
  for (let v = from; v <= to + 1e-6; v = Math.round((v + step) * 1000) / 1000) out.push(v)
  return out
}

function hitTest(
  items: PlacedItem[],
  x: number,
  z: number,
  furniture: boolean,
  lighting: boolean,
): PlacedItem | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    const def = catalogItem(item.catalogId)
    if (!lighting && def.costGroup === 'lighting') continue
    if (!furniture && def.costGroup !== 'lighting') continue
    const box = itemAabb(item)
    if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) return item
  }
  return undefined
}

function PlanItem({
  item,
  selected,
  brand,
  showLabel,
  showOccupancy,
}: {
  item: PlacedItem
  selected: boolean
  brand: string
  showLabel: boolean
  showOccupancy: boolean
}) {
  const def = catalogItem(item.catalogId)
  const fill =
    item.finish ??
    (def.plan === 'bar'
      ? '#3a4250'
      : def.plan === 'chair' || def.plan === 'stool' || def.plan === 'banquette'
        ? brand
        : '#9aa3ad')
  return (
    <g
      transform={`translate(${item.x}, ${item.z}) rotate(${(item.rotation * 180) / Math.PI})`}
      className={`plan-item ${selected ? 'selected' : ''} ${def.plan}`}
    >
      {def.plan === 'chair' && (
        <>
          <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={def.d} rx={0.04} fill={fill} />
          <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={0.05} fill="#111318" />
        </>
      )}
      {def.plan === 'stool' && <circle r={def.w / 2} fill={fill} />}
      {def.plan === 'round' && <circle r={def.w / 2} fill={fill} />}
      {def.plan === 'rect' && (
        <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={def.d} rx={0.02} fill={fill} />
      )}
      {def.plan === 'desk' && (
        <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={def.d} rx={0.02} fill="#6b7380" />
      )}
      {def.plan === 'bar' && (
        <>
          <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={def.d} fill={fill} />
          <rect x={-def.w / 2} y={def.d / 2 - 0.08} width={def.w} height={0.08} fill="#111318" />
        </>
      )}
      {def.plan === 'banquette' && (
        <>
          <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={def.d} fill={fill} />
          <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={0.08} fill="#111318" />
        </>
      )}
      {def.plan === 'module' && (
        <>
          <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={def.d} rx={0.12} fill={fill} />
          <rect
            x={-def.w / 2 + 0.12}
            y={-def.d / 2 + 0.12}
            width={def.w - 0.24}
            height={def.d - 0.24}
            rx={0.08}
            fill="none"
            stroke="#111318"
            strokeWidth={0.04}
          />
        </>
      )}
      {def.plan === 'pendant' && (
        <>
          <circle r={0.12} fill="none" stroke="#5b8cff" strokeWidth={0.03} />
          <line x1={-0.08} y1={0} x2={0.08} y2={0} stroke="#5b8cff" strokeWidth={0.02} />
          <line x1={0} y1={-0.08} x2={0} y2={0.08} stroke="#5b8cff" strokeWidth={0.02} />
        </>
      )}
      {def.plan === 'fridge' && (
        <>
          <rect x={-def.w / 2} y={-def.d / 2} width={def.w} height={def.d} fill="#cfd5d8" />
          <rect x={-def.w / 2 + 0.06} y={-def.d / 2 + 0.06} width={def.w - 0.12} height={def.d - 0.12} fill="none" stroke="#5a656c" strokeWidth={0.03} />
        </>
      )}
      {showOccupancy && def.isSeat && (
        <circle r={0.08} className="occ" cy={0} />
      )}
      {showLabel && (
        <text className="item-label" y={def.d / 2 + 0.18} textAnchor="middle">
          {def.name}
        </text>
      )}
      {selected && (
        <rect
          className="sel"
          x={-def.w / 2 - 0.04}
          y={-def.d / 2 - 0.04}
          width={def.w + 0.08}
          height={def.d + 0.08}
        />
      )}
    </g>
  )
}

function ItemDims({ item }: { item: PlacedItem }) {
  const box = itemAabb(item)
  return (
    <Dimension
      x1={box.minX}
      y1={box.maxZ + 0.22}
      x2={box.maxX}
      y2={box.maxZ + 0.22}
      label={formatMm(box.w)}
    />
  )
}

function Dimension({
  x1,
  y1,
  x2,
  y2,
  label,
  vertical,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  vertical?: boolean
}) {
  return (
    <g className="dim">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2}
        transform={vertical ? `rotate(90 ${(x1 + x2) / 2} ${(y1 + y2) / 2})` : undefined}
        dy={vertical ? 0 : -0.08}
      >
        {label}
      </text>
    </g>
  )
}

function hitArch(room: ReturnType<typeof usePlanner.getState>['room'], x: number, z: number) {
  for (const door of room.doors) {
    const wall = wallById(room, door.wallId)
    if (!wall) continue
    const c = pointOnWall(wall, door.offset + door.width / 2)
    if (Math.hypot(c.x - x, c.z - z) < 0.28) return { kind: 'door' as const, id: door.id }
  }
  for (const win of room.windows) {
    const wall = wallById(room, win.wallId)
    if (!wall) continue
    const c = pointOnWall(wall, win.offset + win.width / 2)
    if (Math.hypot(c.x - x, c.z - z) < 0.28) return { kind: 'window' as const, id: win.id }
  }
  const hit = nearestWall(room.walls, x, z, Math.max(0.28, room.wallThickness * 1.4))
  if (hit) return { kind: 'wall' as const, id: hit.wall.id }
  return null
}

function DoorSwing({
  door,
  wall,
}: {
  door: { offset: number; width: number; swing: 'left' | 'right' }
  wall: WallSeg
}) {
  const dir = wallDir(wall)
  const angle = (Math.atan2(dir.z, dir.x) * 180) / Math.PI
  const hinge = pointOnWall(wall, door.swing === 'left' ? door.offset : door.offset + door.width)
  const w = door.width
  const sweep = door.swing === 'left' ? 1 : 0
  const end = door.swing === 'left' ? `0,${w}` : `${w},0`
  return (
    <g transform={`translate(${hinge.x}, ${hinge.z}) rotate(${angle})`}>
      <path d={`M 0 0 L ${w} 0 A ${w} ${w} 0 0 ${sweep} ${end}`} className="swing" />
    </g>
  )
}
