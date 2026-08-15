import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react'
import { catalogItem } from '../catalog'
import { analyzeLayout } from '../compliance'
import { formatMm, itemAabb, itemDims } from '../geometry'
import { isCoarsePointer } from '../media'
import { pointInPoly, polygonArea, polygonCentroid } from '../spaces'
import { usePlanner } from '../store'
import type { PlacedItem, Room, WallSeg } from '../types'
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
  const viewRef = useRef(view)
  viewRef.current = view
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; mx: number; my: number; view: typeof view } | null>(null)

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

  const toWorld = (clientX: number, clientY: number, v = viewRef.current) => {
    const el = wrapRef.current
    if (!el) return { x: 0, z: 0 }
    const r = el.getBoundingClientRect()
    const sx = (clientX - r.left) / r.width
    const sy = (clientY - r.top) / r.height
    return { x: v.x + sx * v.w, z: v.y + sy * v.h }
  }

  const zoomAt = (clientX: number, clientY: number, factor: number, v = viewRef.current) => {
    const p = toWorld(clientX, clientY, v)
    const nw = Math.min(80, Math.max(2.4, v.w * factor))
    const nh = nw * (v.h / v.w)
    const sx = (p.x - v.x) / v.w
    const sy = (p.z - v.y) / v.h
    return { x: p.x - sx * nw, y: p.z - sy * nh, w: nw, h: nh }
  }

  const onWheel = (e: WheelEvent) => {
    if (e.cancelable) e.preventDefault()
    const next = zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.1 : 0.9)
    viewRef.current = next
    setView(next)
  }

  const beginPinch = () => {
    const pts = [...pointers.current.values()]
    if (pts.length < 2) return
    drag.current = null
    const mx = (pts[0].x + pts[1].x) / 2
    const my = (pts[0].y + pts[1].y) / 2
    pinch.current = {
      dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
      mx,
      my,
      view: { ...viewRef.current },
    }
  }

  const gesture = useRef({ pinched: false, tap: null as null | { x: number; z: number; shift: boolean } })

  const applyTap = (p: { x: number; z: number }, shift: boolean) => {
    const state = usePlanner.getState()
    const slop = isCoarsePointer() ? 0.16 : 0
    const live = state.room
    const liveItems = state.items
    const liveNotes = state.notes

    if (state.tool === 'measure') {
      const s = state.snapOn ? state.snap : 0
      state.setMeasurePoint({
        x: s ? Math.round(p.x / s) * s : p.x,
        z: s ? Math.round(p.z / s) * s : p.z,
      })
      return
    }
    if (state.tool === 'note') {
      const hitNote = liveNotes.find((n) => Math.hypot(n.x - p.x, n.z - p.z) < 0.22 + slop)
      if (hitNote) state.removeNote(hitNote.id)
      else state.addNote(p.x, p.z)
      return
    }
    if (state.tool === 'paint') {
      const hit = hitTest(liveItems, p.x, p.z, showFurniture, showLighting, slop)
      if (hit) state.setFinish(hit.id, state.brandColor)
      return
    }
    if (state.tool === 'stamp') {
      if (state.selectedIds.length) state.stampAt(p.x, p.z)
      return
    }
    if (state.tool === 'wall') {
      const grid = state.snapOn ? state.snap : 0
      const start = state.wallStart
      const pt = snapDrawPoint(p.x, p.z, live.walls, grid, start ?? undefined, shift)
      if (!start) {
        state.setWallStart(pt)
        return
      }
      state.addWall(start.x, start.z, pt.x, pt.z)
      return
    }
    if (state.tool === 'door') {
      state.placeOpening('door', p.x, p.z)
      return
    }
    if (state.tool === 'window') {
      state.placeOpening('window', p.x, p.z)
      return
    }
    if (state.pendingCatalogId) {
      state.placeItem(state.pendingCatalogId, p.x, p.z)
      return
    }
    const arch = hitArch(live, p.x, p.z, isCoarsePointer() ? 0.42 : 0.28)
    if (arch) {
      state.selectArch(arch)
      return
    }
    const space = hitSpace(live, p.x, p.z)
    if (space) {
      state.selectArch({ kind: 'space', id: space.id })
      return
    }
    state.select(null)
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.cancelable) e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2) {
      gesture.current.pinched = true
      gesture.current.tap = null
      beginPinch()
      return
    }

    const p = toWorld(e.clientX, e.clientY)
    const state = usePlanner.getState()
    const slop = isCoarsePointer() ? 0.16 : 0
    gesture.current.pinched = false
    gesture.current.tap = null

    if (e.button === 1 || e.altKey || e.button === 2 || tool === 'pan') {
      drag.current = { mode: 'pan', ids: [], lastX: e.clientX, lastZ: e.clientY, moved: false }
      return
    }

    if (tool === 'select' && !pending) {
      const hit = hitTest(items, p.x, p.z, showFurniture, showLighting, slop)
      if (hit) {
        state.select(hit.id, e.shiftKey)
        const ids = e.shiftKey ? usePlanner.getState().selectedIds : [hit.id]
        drag.current = {
          mode: 'item',
          ids,
          originId: hit.id,
          lastX: p.x,
          lastZ: p.z,
          moved: false,
        }
        return
      }
    }

    if (isCoarsePointer()) {
      gesture.current.tap = { x: p.x, z: p.z, shift: e.shiftKey }
      drag.current = { mode: 'pan', ids: [], lastX: e.clientX, lastZ: e.clientY, moved: false }
      return
    }

    applyTap(p, e.shiftKey)
    if (tool === 'select' && !pending) {
      drag.current = { mode: 'pan', ids: [], lastX: e.clientX, lastZ: e.clientY, moved: false }
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1
      const mx = (pts[0].x + pts[1].x) / 2
      const my = (pts[0].y + pts[1].y) / 2
      const factor = pinch.current.dist / dist
      const zoomed = zoomAt(pinch.current.mx, pinch.current.my, factor, pinch.current.view)
      const el = wrapRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        zoomed.x -= ((mx - pinch.current.mx) / r.width) * zoomed.w
        zoomed.y -= ((my - pinch.current.my) / r.height) * zoomed.h
      }
      viewRef.current = zoomed
      setView(zoomed)
      return
    }
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
      const v = viewRef.current
      const dx = ((e.clientX - d.lastX) / r.width) * v.w
      const dy = ((e.clientY - d.lastZ) / r.height) * v.h
      if (Math.hypot(e.clientX - d.lastX, e.clientY - d.lastZ) > 6) d.moved = true
      d.lastX = e.clientX
      d.lastZ = e.clientY
      const next = { ...v, x: v.x - dx, y: v.y - dy }
      viewRef.current = next
      setView(next)
      return
    }
    if (!d.moved) {
      usePlanner.getState().commitHistory()
      d.moved = true
    }
    usePlanner.getState().moveItems(d.ids, p.x, p.z, d.originId)
  }

  const endPointer = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) {
      const g = gesture.current
      const d = drag.current
      if (!g.pinched && g.tap && d?.mode === 'pan' && !d.moved) applyTap(g.tap, g.tap.shift)
      drag.current = null
      g.tap = null
      g.pinched = false
    }
  }

  const pad = 0.35

  return (
    <div
      className={`viewport2d world-${worldId} ${pending ? 'placing' : ''} tool-${tool}`}
      ref={wrapRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
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

        {(room.spaces ?? []).map((sp) => {
          const on = selectedArch?.kind === 'space' && selectedArch.id === sp.id
          const c = polygonCentroid(sp.polygon)
          return (
            <g key={sp.id} className={`space-poly ${on ? 'on' : ''}`}>
              <polygon
                className="space-fill"
                points={sp.polygon.map((pt) => `${pt.x},${pt.z}`).join(' ')}
              />
              <text className="space-label" x={c.x} y={c.z} textAnchor="middle" dy={0.08}>
                {sp.name}
              </text>
            </g>
          )
        })}

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
  pad = 0,
): PlacedItem | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    const def = catalogItem(item.catalogId)
    if (!lighting && def.costGroup === 'lighting') continue
    if (!furniture && def.costGroup !== 'lighting') continue
    const box = itemAabb(item)
    if (x >= box.minX - pad && x <= box.maxX + pad && z >= box.minZ - pad && z <= box.maxZ + pad) return item
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
  const { w, d } = itemDims(item)
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
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.04} fill={fill} />
          <rect x={-w / 2} y={-d / 2} width={w} height={0.05} fill="#111318" />
        </>
      )}
      {def.plan === 'stool' && <circle r={w / 2} fill={fill} />}
      {def.plan === 'round' && <circle r={w / 2} fill={fill} />}
      {def.plan === 'rect' && (
        <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.02} fill={fill} />
      )}
      {def.plan === 'desk' && (
        <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.02} fill="#6b7380" />
      )}
      {def.plan === 'bar' && (
        <>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={fill} />
          <rect x={-w / 2} y={d / 2 - 0.08} width={w} height={0.08} fill="#111318" />
        </>
      )}
      {def.plan === 'banquette' && (
        <>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={fill} />
          <rect x={-w / 2} y={-d / 2} width={w} height={0.08} fill="#111318" />
        </>
      )}
      {def.plan === 'module' && (
        <>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.12} fill={fill} />
          <rect
            x={-w / 2 + 0.12}
            y={-d / 2 + 0.12}
            width={w - 0.24}
            height={d - 0.24}
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
          <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="#cfd5d8" />
          <rect x={-w / 2 + 0.06} y={-d / 2 + 0.06} width={w - 0.12} height={d - 0.12} fill="none" stroke="#5a656c" strokeWidth={0.03} />
        </>
      )}
      {showOccupancy && def.isSeat && (
        <circle r={0.08} className="occ" cy={0} />
      )}
      {showLabel && (
        <text className="item-label" y={d / 2 + 0.18} textAnchor="middle">
          {def.name}
        </text>
      )}
      {selected && (
        <rect
          className="sel"
          x={-w / 2 - 0.04}
          y={-d / 2 - 0.04}
          width={w + 0.08}
          height={d + 0.08}
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

function hitSpace(room: Room, x: number, z: number) {
  const hits = (room.spaces ?? []).filter((sp) => pointInPoly(sp.polygon, x, z))
  if (!hits.length) return null
  return hits.slice().sort((a, b) => Math.abs(polygonArea(a.polygon)) - Math.abs(polygonArea(b.polygon)))[0]
}

function hitArch(room: ReturnType<typeof usePlanner.getState>['room'], x: number, z: number, slop = 0.28) {
  for (const door of room.doors) {
    const wall = wallById(room, door.wallId)
    if (!wall) continue
    const c = pointOnWall(wall, door.offset + door.width / 2)
    if (Math.hypot(c.x - x, c.z - z) < slop) return { kind: 'door' as const, id: door.id }
  }
  for (const win of room.windows) {
    const wall = wallById(room, win.wallId)
    if (!wall) continue
    const c = pointOnWall(wall, win.offset + win.width / 2)
    if (Math.hypot(c.x - x, c.z - z) < slop) return { kind: 'window' as const, id: win.id }
  }
  const hit = nearestWall(room.walls, x, z, Math.max(slop, room.wallThickness * 1.4))
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
