import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react'
import { catalogItem } from '../catalog'
import { analyzeLayout } from '../compliance'
import { formatMm, itemAabb } from '../geometry'
import { usePlanner } from '../store'
import type { PlacedItem } from '../types'

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

  const analysis = useMemo(() => {
    try {
      return analyzeLayout({ room, items, tier, floor, cap, jurisdiction, worldId })
    } catch {
      return null
    }
  }, [room, items, tier, floor, cap, jurisdiction, worldId])

  const wrapRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ x: -1.4, y: -1.5, w: room.width + 2.8, h: room.depth + 3 })
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
      state.select(null)
      drag.current = { mode: 'pan', ids: [], lastX: e.clientX, lastZ: e.clientY, moved: false }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
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
    const p = toWorld(e.clientX, e.clientY)
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
  const t = room.wallThickness

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
      <div className="view-label">2D · plan</div>
      <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="plan-svg">
        <defs>
          <pattern id="hatch" width="0.18" height="0.18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="0.18" stroke="#2c2822" strokeWidth="0.04" />
          </pattern>
        </defs>
        <rect x={view.x} y={view.y} width={view.w} height={view.h} className="paper" />

        {showGrid && (
          <g className="grid">
            {ticks(0, room.width, 0.2).map((x) => (
              <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={room.depth} className={x % 1 === 0 ? 'major' : 'minor'} />
            ))}
            {ticks(0, room.depth, 0.2).map((z) => (
              <line key={`hz${z}`} x1={0} y1={z} x2={room.width} y2={z} className={z % 1 === 0 ? 'major' : 'minor'} />
            ))}
          </g>
        )}

        {showWalls && (
          <g className="walls">
            <rect x={-t} y={-t} width={room.width + t * 2} height={t} />
            <rect x={-t} y={room.depth} width={room.width + t * 2} height={t} />
            <rect x={-t} y={0} width={t} height={room.depth} />
            <rect x={room.width} y={0} width={t} height={room.depth} />
            {showOpenings &&
              room.doors.map((door) => {
              const along = door.wall === 'n' || door.wall === 's'
              const x = door.wall === 'w' ? -t - 0.02 : door.wall === 'e' ? room.width - 0.02 : door.offset
              const y = door.wall === 's' ? -t - 0.02 : door.wall === 'n' ? room.depth - 0.02 : door.offset
              return (
                <rect
                  key={door.id}
                  className="door-cut"
                  x={x}
                  y={y}
                  width={along ? door.width : t + 0.04}
                  height={along ? t + 0.04 : door.width}
                />
              )
            })}
            {showOpenings &&
              room.doors.map((door) => (
              <DoorSwing key={`${door.id}-swing`} door={door} roomWidth={room.width} roomDepth={room.depth} />
            ))}
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
              x1={0}
              y1={room.depth + pad + 0.15}
              x2={room.width}
              y2={room.depth + pad + 0.15}
              label={formatMm(room.width)}
            />
            <Dimension
              x1={room.width + pad + 0.15}
              y1={0}
              x2={room.width + pad + 0.15}
              y2={room.depth}
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

        <g className="north" transform={`translate(${room.width - 0.55}, ${-0.85})`}>
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

function DoorSwing({
  door,
  roomWidth,
  roomDepth,
}: {
  door: { wall: 'n' | 's' | 'e' | 'w'; offset: number; width: number; swing: 'left' | 'right' }
  roomWidth: number
  roomDepth: number
}) {
  const w = door.width
  let x = 0
  let y = 0
  let rot = 0
  if (door.wall === 's') {
    x = door.offset
    y = 0
    rot = 0
  } else if (door.wall === 'n') {
    x = door.offset + w
    y = roomDepth
    rot = 180
  } else if (door.wall === 'w') {
    x = 0
    y = door.offset + w
    rot = 90
  } else {
    x = roomWidth
    y = door.offset
    rot = -90
  }
  const sweep = door.swing === 'left' ? 1 : 0
  const end = door.swing === 'left' ? `0,${w}` : `${w},0`
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot})`}>
      <path d={`M 0 0 L ${w} 0 A ${w} ${w} 0 0 ${sweep} ${end}`} className="swing" />
    </g>
  )
}
