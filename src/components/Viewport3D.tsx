import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { catalogItem } from '../catalog'
import { itemDims } from '../geometry'
import { FurnitureMesh, RoomMesh } from '../scene/Furniture'
import { LowPower } from '../lowPower'
import { useIsMobile } from '../media'
import { usePlanner } from '../store'
import { planetTexture } from '../textures'
import type { CameraMode, FloorFinish, PlacedItem, Room, WallFinish } from '../types'
import { worldOf, type World, type WorldId } from '../worlds'
import { GLBoundary } from './GLBoundary'

const CAMERA = { position: [12.5, 7.4, 12] as [number, number, number], fov: 38, near: 0.1, far: 80 }
const CAMERA_SPACE = { position: [14, 8.2, 14] as [number, number, number], fov: 42, near: 0.1, far: 160 }
const CAMERA_MOBILE = { ...CAMERA, fov: 46 }
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
  const showLighting = usePlanner((s) => s.showLighting)
  const wallFinish = usePlanner((s) => s.wallFinish)
  const room = usePlanner((s) => s.room)
  const floor = usePlanner((s) => s.floorFinish)
  const showWalls = usePlanner((s) => s.showWalls)
  const brand = usePlanner((s) => s.brandColor)
  const selectedIds = usePlanner((s) => s.selectedIds)
  const worldId = usePlanner((s) => s.worldId)
  const cameraMode = usePlanner((s) => s.cameraMode)
  const world = worldOf(worldId)
  const sun = useMemo(() => sunFromTime(time), [time])
  const mobile = useIsMobile()
  const hemiArgs = useMemo(
    () => [world.hemiSky, world.hemiGround, sun.hemi] as [string, string, number],
    [world.hemiSky, world.hemiGround, sun.hemi],
  )
  const fogArgs = useMemo(
    () => [world.sky, world.id === 'earth' ? 16 : 22, world.fogFar] as [string, number, number],
    [world.sky, world.fogFar, world.id],
  )
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
        showLighting={showLighting}
        brand={brand}
        selectedIds={selectedIds}
        floor={floor}
        worldId={worldId}
      />
    )
  }

  return (
    <div className="viewport3d">
      <div className="view-label">Model</div>
      <GLBoundary>
        <Canvas
          style={WRAP}
          shadows={!mobile && worldId === 'earth'}
          dpr={1}
          gl={GL}
          camera={worldId === 'earth' ? (mobile ? CAMERA_MOBILE : CAMERA) : CAMERA_SPACE}
          onPointerMissed={() => usePlanner.getState().select(null)}
          onCreated={({ gl }) => {
            glReady.current = true
            gl.setClearColor(world.sky, 1)
          }}
        >
          <LowPower.Provider value={mobile}>
            <color attach="background" args={[world.sky]} />
            <fog attach="fog" args={fogArgs} />
            <hemisphereLight args={hemiArgs} />
            <ambientLight intensity={mobile ? sun.ambient + 0.22 : sun.ambient} />
            <directionalLight
              position={sun.position}
              intensity={mobile ? sun.intensity * 0.7 : sun.intensity * (worldId === 'earth' ? 1 : 0.85)}
              color={sun.color}
              castShadow={!mobile && worldId === 'earth'}
              shadow-mapSize-width={512}
              shadow-mapSize-height={512}
              shadow-camera-near={1}
              shadow-camera-far={40}
              shadow-camera-left={-12}
              shadow-camera-right={12}
              shadow-camera-top={12}
              shadow-camera-bottom={-12}
            />
            {worldId !== 'earth' && <Stars radius={60} depth={30} count={mobile ? 400 : 900} factor={3} fade speed={0} />}
            {worldId !== 'earth' && <Planet world={world} />}
            <Scene
              items={items}
              showFurniture={showFurniture}
              showLighting={showLighting}
              room={room}
              floor={floor}
              wallFinish={wallFinish}
              showWalls={showWalls && worldId === 'earth'}
              brand={brand}
              selectedIds={selectedIds}
            />
            <CameraRig mode={cameraMode} room={room} />
            <OrbitControls
              makeDefault
              enableDamping={false}
              maxPolarAngle={cameraMode === 'eye' ? Math.PI / 2 - 0.02 : Math.PI / 2 - 0.04}
              minDistance={cameraMode === 'eye' ? 0.4 : 3}
              maxDistance={worldId === 'earth' ? 28 : 48}
            />
          </LowPower.Provider>
        </Canvas>
      </GLBoundary>
    </div>
  )
}

function Planet({ world }: { world: World }) {
  const map = useMemo(() => planetTexture(world.id), [world.id])
  return (
    <mesh position={[5.6, -20, 4.2]} rotation={[0.35, 0.4, 0]}>
      <sphereGeometry args={[18.6, 48, 48]} />
      <meshStandardMaterial map={map} roughness={1} metalness={0} />
    </mesh>
  )
}

function CameraRig({ mode, room }: { mode: CameraMode; room: Room }) {
  const { camera, controls } = useThree()
  useLayoutEffect(() => {
    const cx = room.originX + room.width / 2
    const cz = room.originZ + room.depth / 2
    const ty = mode === 'eye' ? 1.5 : 0.4
    if (mode === 'eye') {
      camera.position.set(room.originX + Math.min(1.5, room.width * 0.18), 1.55, cz)
    } else if (mode === 'top') {
      camera.position.set(cx, Math.max(room.width, room.depth) * 1.15, cz + 0.05)
    } else {
      camera.position.set(cx + 7, 7.2, cz + 7)
    }
    const orbit = controls as { target?: { set: (x: number, y: number, z: number) => void } } | null
    orbit?.target?.set(cx, ty, cz)
  }, [mode, room.width, room.depth, room.originX, room.originZ, camera, controls])
  return null
}

function Scene({
  items,
  showFurniture,
  showLighting,
  room,
  floor,
  wallFinish,
  showWalls,
  brand,
  selectedIds,
}: {
  items: PlacedItem[]
  showFurniture: boolean
  showLighting: boolean
  room: Room
  floor: FloorFinish
  wallFinish: WallFinish
  showWalls: boolean
  brand: string
  selectedIds: string[]
}) {
  return (
    <group>
      <RoomMesh room={room} floor={floor} wallFinish={wallFinish} showWalls={showWalls} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[room.originX + room.width / 2, 0.01, room.originZ + room.depth / 2]}
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
        if (!showLighting && def.costGroup === 'lighting') return null
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
          <meshBasicMaterial color="#3b82f6" />
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
  showLighting,
  brand,
  selectedIds,
  floor,
  worldId,
}: {
  room: Room
  items: PlacedItem[]
  showFurniture: boolean
  showLighting: boolean
  brand: string
  selectedIds: string[]
  floor: FloorFinish
  worldId: WorldId
}) {
  const ox = room.originX
  const oz = room.originZ
  const floorPts = [
    iso(ox, oz),
    iso(ox + room.width, oz),
    iso(ox + room.width, oz + room.depth),
    iso(ox, oz + room.depth),
  ]
  const earthFloor =
    floor === 'oak' || floor === 'walnut' || floor === 'herringbone'
      ? '#8d7358'
      : floor === 'marble' || floor === 'terrazzo'
        ? '#c5c0b4'
        : floor === 'tile' || floor === 'checker'
          ? '#c5ccd4'
          : floor === 'slate'
            ? '#5a616a'
            : floor === 'carpet'
              ? '#5c4a3e'
              : '#8d939c'
  const floorFill =
    worldId === 'mars' ? '#8a4a32' : worldId === 'moon' ? '#8d9198' : worldId === 'titan' ? '#6a5a40' : earthFloor

  const xs = floorPts.map((p) => p.x)
  const ys = floorPts.map((p) => p.y)
  const pad = 1.4
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const w = Math.max(...xs) - minX + pad
  const h = Math.max(...ys) - minY + pad + 1.2

  return (
    <div className="viewport3d iso-view">
      <div className="view-label">Model · iso</div>
      <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="iso-svg">
        <polygon
          points={floorPts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={floorFill}
          stroke="#3a4452"
          strokeWidth={0.04}
        />
        {items.map((item) => {
          const def = catalogItem(item.catalogId)
          if (!showLighting && def.costGroup === 'lighting') return null
          if (!showFurniture && def.costGroup !== 'lighting') return null
          const { w, d, h } = itemDims(item)
          const a = iso(item.x - w / 2, item.z - d / 2)
          const b = iso(item.x + w / 2, item.z - d / 2)
          const c = iso(item.x + w / 2, item.z + d / 2)
          const dpt = iso(item.x - w / 2, item.z + d / 2)
          const lift = h * 0.42
          const fill = item.finish ?? (def.costGroup === 'lighting' ? '#9ec5ff' : brand)
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
                points={`${a.x},${a.y - lift} ${b.x},${b.y - lift} ${c.x},${c.y - lift} ${dpt.x},${dpt.y - lift}`}
                fill={fill}
                stroke="#0e1116"
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
    color: dusk ? '#b7c8ff' : '#e8f1ff',
    ambient: dusk ? 0.18 : 0.32,
    hemi: dusk ? 0.35 : 0.55,
  }
}
