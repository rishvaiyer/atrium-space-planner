import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { catalogItem } from '../catalog'
import { FurnitureMesh, RoomMesh } from '../scene/Furniture'
import { LowPower } from '../lowPower'
import { useIsMobile } from '../media'
import { usePlanner } from '../store'
import type { FloorFinish, PlacedItem, Room } from '../types'
import { GLBoundary } from './GLBoundary'

const CAMERA = { position: [12.5, 7.4, 12] as [number, number, number], fov: 38, near: 0.1, far: 80 }
const CAMERA_MOBILE = { ...CAMERA, fov: 46 }
const ORBIT_TARGET: [number, number, number] = [5.6, 0.4, 4.2]
const BG = '#8aa3b0'
const FOG_ARGS: [string, number, number] = [BG, 18, 42]
const HEMI_SKY = '#f2f0ea'
const HEMI_GROUND = '#6b5c4c'
const WRAP: CSSProperties = { width: '100%', height: '100%' }
const GL = {
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance' as const,
  failIfMajorPerformanceCaveat: false,
}

function canCreateWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

export function Viewport3D() {
  const time = usePlanner((s) => s.timeOfDay)
  const items = usePlanner((s) => s.items)
  const showFurniture = usePlanner((s) => s.showFurniture)
  const showElectrical = usePlanner((s) => s.showElectrical)
  const room = usePlanner((s) => s.room)
  const floor = usePlanner((s) => s.floorFinish)
  const showWalls = usePlanner((s) => s.showWalls)
  const brand = usePlanner((s) => s.brandColor)
  const selectedIds = usePlanner((s) => s.selectedIds)
  const sun = useMemo(() => sunFromTime(time), [time])
  const mobile = useIsMobile()
  const hemiArgs = useMemo(() => [HEMI_SKY, HEMI_GROUND, sun.hemi] as [string, string, number], [sun.hemi])
  const [useIso, setUseIso] = useState(() => !canCreateWebGL())
  const glReady = useRef(false)

  useEffect(() => {
    if (!canCreateWebGL()) {
      setUseIso(true)
      return
    }
    const id = window.setTimeout(() => {
      if (!glReady.current) setUseIso(true)
    }, 2500)
    return () => window.clearTimeout(id)
  }, [])

  if (useIso) {
    return (
      <IsoView
        room={room}
        items={items}
        showFurniture={showFurniture}
        showElectrical={showElectrical}
        brand={brand}
        selectedIds={selectedIds}
        floor={floor}
      />
    )
  }

  return (
    <div className="viewport3d">
      <div className="view-label">3D · orbit</div>
      <GLBoundary>
        <Canvas
          style={WRAP}
          shadows={!mobile}
          dpr={1}
          gl={GL}
          camera={mobile ? CAMERA_MOBILE : CAMERA}
          onPointerMissed={() => usePlanner.getState().select(null)}
          onCreated={({ gl }) => {
            glReady.current = true
            gl.setClearColor(BG, 1)
          }}
        >
          <LowPower.Provider value={mobile}>
            <color attach="background" args={[BG]} />
            <fog attach="fog" args={FOG_ARGS} />
            <hemisphereLight args={hemiArgs} />
            <ambientLight intensity={mobile ? sun.ambient + 0.22 : sun.ambient} />
            <directionalLight
              position={sun.position}
              intensity={mobile ? sun.intensity * 0.7 : sun.intensity}
              color={sun.color}
              castShadow={!mobile}
              shadow-mapSize-width={512}
              shadow-mapSize-height={512}
              shadow-camera-near={1}
              shadow-camera-far={40}
              shadow-camera-left={-12}
              shadow-camera-right={12}
              shadow-camera-top={12}
              shadow-camera-bottom={-12}
            />
            <Scene
              items={items}
              showFurniture={showFurniture}
              showElectrical={showElectrical}
              room={room}
              floor={floor}
              showWalls={showWalls}
              brand={brand}
              selectedIds={selectedIds}
            />
            <OrbitControls
              makeDefault
              enableDamping={false}
              maxPolarAngle={Math.PI / 2 - 0.06}
              minDistance={3}
              maxDistance={28}
              target={ORBIT_TARGET}
            />
          </LowPower.Provider>
        </Canvas>
      </GLBoundary>
    </div>
  )
}

function Scene({
  items,
  showFurniture,
  showElectrical,
  room,
  floor,
  showWalls,
  brand,
  selectedIds,
}: {
  items: PlacedItem[]
  showFurniture: boolean
  showElectrical: boolean
  room: Room
  floor: FloorFinish
  showWalls: boolean
  brand: string
  selectedIds: string[]
}) {
  return (
    <group>
      <RoomMesh room={room} floor={floor} showWalls={showWalls} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[room.width / 2, 0.01, room.depth / 2]}
        onPointerDown={(e) => {
          e.stopPropagation()
          const state = usePlanner.getState()
          if (state.pendingCatalogId) {
            state.placeItem(state.pendingCatalogId, e.point.x, e.point.z)
          } else if (state.tool === 'select') {
            state.select(null)
          }
        }}
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {items.map((item) => {
        const def = catalogItem(item.catalogId)
        if (!showElectrical && def.costGroup === 'lighting') return null
        if (!showFurniture && def.costGroup !== 'lighting') return null
        return (
          <PlacedMesh
            key={item.id}
            item={item}
            brand={brand}
            selected={selectedIds.includes(item.id)}
          />
        )
      })}
    </group>
  )
}

function PlacedMesh({
  item,
  brand,
  selected,
}: {
  item: PlacedItem
  brand: string
  selected: boolean
}) {
  return (
    <group
      name={`item-${item.id}`}
      position={[item.x, 0, item.z]}
      rotation={[0, item.rotation, 0]}
      onPointerDown={(e) => {
        e.stopPropagation()
        const state = usePlanner.getState()
        if (state.pendingCatalogId) {
          state.placeItem(state.pendingCatalogId, e.point.x, e.point.z)
          return
        }
        state.select(item.id, e.shiftKey)
      }}
    >
      <FurnitureMesh item={item} brand={brand} />
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.34, 32]} />
          <meshBasicMaterial color="#c9a36a" />
        </mesh>
      )}
    </group>
  )
}

function iso(x: number, z: number, y = 0) {
  return { x: (x - z) * 0.78, y: (x + z) * 0.4 - y }
}

function IsoView({
  room,
  items,
  showFurniture,
  showElectrical,
  brand,
  selectedIds,
  floor,
}: {
  room: Room
  items: PlacedItem[]
  showFurniture: boolean
  showElectrical: boolean
  brand: string
  selectedIds: string[]
  floor: FloorFinish
}) {
  const floorPts = [
    iso(0, 0),
    iso(room.width, 0),
    iso(room.width, room.depth),
    iso(0, room.depth),
  ]
  const floorFill =
    floor === 'oak' ? '#b9895a' : floor === 'terrazzo' ? '#c5c0b4' : floor === 'tile' ? '#cfc6b8' : '#9a9a96'

  const xs = floorPts.map((p) => p.x)
  const ys = floorPts.map((p) => p.y)
  const pad = 1.4
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const w = Math.max(...xs) - minX + pad
  const h = Math.max(...ys) - minY + pad + 1.2

  return (
    <div className="viewport3d iso-view">
      <div className="view-label">3D · isometric</div>
      <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="iso-svg">
        <polygon
          points={floorPts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={floorFill}
          stroke="#6a5340"
          strokeWidth={0.04}
        />
        {items.map((item) => {
          const def = catalogItem(item.catalogId)
          if (!showElectrical && def.costGroup === 'lighting') return null
          if (!showFurniture && def.costGroup !== 'lighting') return null
          const a = iso(item.x - def.w / 2, item.z - def.d / 2)
          const b = iso(item.x + def.w / 2, item.z - def.d / 2)
          const c = iso(item.x + def.w / 2, item.z + def.d / 2)
          const d = iso(item.x - def.w / 2, item.z + def.d / 2)
          const lift = def.h * 0.42
          const fill = item.finish ?? (def.costGroup === 'lighting' ? '#e8d9a8' : brand)
          const selected = selectedIds.includes(item.id)
          return (
            <g
              key={item.id}
              className={selected ? 'iso-item on' : 'iso-item'}
              onClick={(e) => {
                e.stopPropagation()
                usePlanner.getState().select(item.id)
              }}
            >
              <polygon
                points={`${a.x},${a.y - lift} ${b.x},${b.y - lift} ${c.x},${c.y - lift} ${d.x},${d.y - lift}`}
                fill={fill}
                stroke="#2a2620"
                strokeWidth={0.03}
                opacity={def.costGroup === 'lighting' ? 0.55 : 0.95}
              />
              <polygon
                points={`${b.x},${b.y} ${c.x},${c.y} ${c.x},${c.y - lift} ${b.x},${b.y - lift}`}
                fill="#000"
                opacity={0.18}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function sunFromTime(hour: number) {
  const t = (hour - 6) / 14
  const ang = t * Math.PI
  const elevation = Math.max(0.05, Math.sin(ang))
  const dusk = hour < 7.5 || hour > 17.5
  return {
    position: [Math.cos(ang) * 14, elevation * 16 + 2, Math.sin(ang) * 10 - 4] as [number, number, number],
    intensity: dusk ? 0.35 + elevation * 0.8 : 1.1 + elevation * 1.4,
    color: dusk ? '#ffb07a' : '#fff1dc',
    ambient: dusk ? 0.18 : 0.32,
    hemi: dusk ? 0.35 : 0.55,
  }
}
