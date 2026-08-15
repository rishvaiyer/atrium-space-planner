import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { catalogItem } from '../catalog'
import { collidingItemIds, itemCollides } from '../collision'
import { formatMoney, itemDims } from '../geometry'
import { FurnitureMesh, RoomMesh } from '../scene/Furniture'
import { InstancedCatalog } from '../scene/InstancedFurniture'
import { partitionInstances } from '../scene/instanceRecipes'
import { LowPower, useLowPower } from '../lowPower'
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
  const present = usePlanner((s) => s.focusMode)
  const world = worldOf(worldId)
  const sun = useMemo(() => sunFromTime(time), [time])
  const mobile = useIsMobile()
  const hemiArgs = useMemo(
    () => [world.hemiSky, world.hemiGround, sun.hemi] as [string, string, number],
    [world.hemiSky, world.hemiGround, sun.hemi],
  )
  const fogArgs = useMemo(
    () =>
      [worldId === 'earth' ? '#c5cdd4' : world.sky, world.id === 'earth' ? 24 : 22, world.id === 'earth' ? 48 : world.fogFar] as [
        string,
        number,
        number,
      ],
    [world.sky, world.fogFar, world.id, worldId],
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
    <div className={`viewport3d ${present ? 'cinema' : ''}`}>
      <div className="view-label">Model</div>
      {present && <PresentHud />}
      <GLBoundary>
        <Canvas
          style={WRAP}
          shadows={!mobile && worldId === 'earth'}
          dpr={mobile ? 1 : present ? [1, 1.5] : 1}
          gl={GL}
          camera={worldId === 'earth' ? (mobile ? CAMERA_MOBILE : CAMERA) : CAMERA_SPACE}
          onPointerMissed={() => usePlanner.getState().select(null)}
          onCreated={({ gl }) => {
            glReady.current = true
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.08
            gl.setClearColor(worldId === 'earth' ? '#c5cdd4' : world.sky, 1)
          }}
        >
          <LowPower.Provider value={mobile}>
            <color attach="background" args={[worldId === 'earth' ? '#c5cdd4' : world.sky]} />
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
            {!mobile && worldId === 'earth' && (
              <Suspense fallback={null}>
                <InteriorEnv warm={time >= 16 || time < 8} />
              </Suspense>
            )}
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
            <EyeWalk enabled={cameraMode === 'eye' && worldId === 'earth'} room={room} />
            <ShotTaker />
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.08}
              autoRotate={present && cameraMode === 'orbit'}
              autoRotateSpeed={0.35}
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

function InteriorEnv({ warm }: { warm: boolean }) {
  return (
    <Environment resolution={256} environmentIntensity={0.55}>
      <Lightformer intensity={warm ? 3.2 : 2.4} color={warm ? '#ffd7a8' : '#f4f7fb'} position={[0, 4.2, 0]} scale={[12, 1.2, 1]} />
      <Lightformer intensity={1.8} color={warm ? '#ffb070' : '#d7e8ff'} position={[6, 2.4, -2]} scale={[4, 5, 1]} />
      <Lightformer intensity={0.9} color="#c9d6e4" position={[-5, 1.6, 4]} scale={[5, 3, 1]} />
      <Lightformer intensity={0.45} color="#ffffff" position={[0, 0.4, 6]} scale={[10, 2, 1]} />
    </Environment>
  )
}

function EyeWalk({ enabled, room }: { enabled: boolean; room: Room }) {
  const { camera, controls } = useThree()
  const held = useRef({ w: false, a: false, s: false, d: false })
  useEffect(() => {
    if (!enabled) return
    const setKey = (e: KeyboardEvent, down: boolean) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
        held.current[k] = down
        e.preventDefault()
      }
    }
    const down = (e: KeyboardEvent) => setKey(e, true)
    const up = (e: KeyboardEvent) => setKey(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      held.current = { w: false, a: false, s: false, d: false }
    }
  }, [enabled])
  useFrame((_, dt) => {
    if (!enabled) return
    const k = held.current
    if (!k.w && !k.a && !k.s && !k.d) return
    const speed = 2.4 * dt
    const fwd = new THREE.Vector3()
    camera.getWorldDirection(fwd)
    fwd.y = 0
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1)
    else fwd.normalize()
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
    const delta = new THREE.Vector3()
    if (k.w) delta.add(fwd)
    if (k.s) delta.sub(fwd)
    if (k.d) delta.add(right)
    if (k.a) delta.sub(right)
    if (delta.lengthSq() < 1e-8) return
    delta.normalize().multiplyScalar(speed)
    const minX = room.originX + 0.35
    const maxX = room.originX + room.width - 0.35
    const minZ = room.originZ + 0.35
    const maxZ = room.originZ + room.depth - 0.35
    camera.position.x = THREE.MathUtils.clamp(camera.position.x + delta.x, minX, maxX)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + delta.z, minZ, maxZ)
    camera.position.y = 1.55
    const orbit = controls as { target?: THREE.Vector3 } | null
    if (orbit?.target) {
      orbit.target.x = THREE.MathUtils.clamp(orbit.target.x + delta.x, minX, maxX)
      orbit.target.z = THREE.MathUtils.clamp(orbit.target.z + delta.z, minZ, maxZ)
      orbit.target.y = 1.5
    }
  })
  return null
}

function ShotTaker() {
  const tick = usePlanner((s) => s.shotTick)
  const name = usePlanner((s) => s.projectName)
  const { gl, scene, camera } = useThree()
  const seen = useRef(0)
  useLayoutEffect(() => {
    if (!tick || tick === seen.current) return
    seen.current = tick
    gl.render(scene, camera)
    const a = document.createElement('a')
    a.href = gl.domElement.toDataURL('image/png')
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}-view.png`
    a.click()
  }, [tick, gl, scene, camera, name])
  return null
}

function PresentHud() {
  const name = usePlanner((s) => s.projectName)
  const items = usePlanner((s) => s.items)
  const cap = usePlanner((s) => s.budgetCap)
  const stats = useMemo(() => {
    let seats = 0
    let total = 0
    for (const it of items) {
      const def = catalogItem(it.catalogId)
      seats += def.seats
      total += def.price
    }
    return { seats, total }
  }, [items])
  return (
    <div className="present-hud">
      <div>
        <div className="present-kicker">ATRIUM</div>
        <div className="present-name">{name}</div>
      </div>
      <div className="present-meta">
        {stats.seats} seats · {formatMoney(stats.total)}
        {cap ? ` / ${formatMoney(cap)}` : ''}
      </div>
    </div>
  )
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
  const pending = usePlanner((s) => s.pendingCatalogId)
  const [ghost, setGhost] = useState<{ x: number; z: number } | null>(null)
  const snapOn = usePlanner((s) => s.snapOn)
  const snap = usePlanner((s) => s.snap)
  const mobile = useLowPower()
  const collideIds = useMemo(() => collidingItemIds(items, room), [items, room])
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const visible = useMemo(() => {
    return items.filter((item) => {
      const def = catalogItem(item.catalogId)
      if (!showLighting && def.costGroup === 'lighting') return false
      if (!showFurniture && def.costGroup !== 'lighting') return false
      return true
    })
  }, [items, showFurniture, showLighting])
  const { batches, unique } = useMemo(() => partitionInstances(visible, brand), [visible, brand])
  const shadowKey = useMemo(() => {
    let h = visible.length
    for (const it of visible) h = (Math.imul(h, 31) + Math.round(it.x * 50) + Math.round(it.z * 50)) | 0
    return h
  }, [visible])

  return (
    <group>
      <RoomMesh room={room} floor={floor} wallFinish={wallFinish} showWalls={showWalls} />
      {!mobile && (
        <ContactShadows
          key={shadowKey}
          frames={1}
          resolution={visible.length > 28 ? 256 : 512}
          position={[room.originX + room.width / 2, 0.011, room.originZ + room.depth / 2]}
          opacity={visible.length > 40 ? 0.28 : 0.38}
          scale={Math.max(room.width, room.depth) * 1.2}
          blur={2.2}
          far={8}
        />
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[room.originX + room.width / 2, 0.01, room.originZ + room.depth / 2]}
        onPointerMove={(e) => {
          if (!pending) {
            if (ghost) setGhost(null)
            return
          }
          const x = snapOn ? Math.round(e.point.x / snap) * snap : e.point.x
          const z = snapOn ? Math.round(e.point.z / snap) * snap : e.point.z
          setGhost((g) => (g && Math.abs(g.x - x) < 0.001 && Math.abs(g.z - z) < 0.001 ? g : { x, z }))
        }}
        onPointerOut={() => setGhost(null)}
        onPointerDown={(e) => {
          e.stopPropagation()
          const state = usePlanner.getState()
          if (state.pendingCatalogId) {
            state.placeItem(state.pendingCatalogId, e.point.x, e.point.z, e.shiftKey)
          } else if (state.tool === 'select') {
            state.select(null)
          }
        }}
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {batches.map((batch) => (
        <InstancedCatalog key={batch.key} batch={batch} />
      ))}
      {unique.map((item) => (
        <PlacedMesh key={item.id} item={item} brand={brand} />
      ))}
      {visible.map((item) => {
        const sel = selected.has(item.id)
        const col = collideIds.has(item.id)
        if (!sel && !col) return null
        return (
          <group key={`mark-${item.id}`} position={[item.x, 0, item.z]} rotation={[0, item.rotation, 0]}>
            {sel && (
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.28, 0.34, 32]} />
                <meshBasicMaterial color="#3b82f6" />
              </mesh>
            )}
            {col && (
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.36, 0.42, 32]} />
                <meshBasicMaterial color="#dc2626" />
              </mesh>
            )}
          </group>
        )
      })}
      {pending && ghost && <GhostPreview catalogId={pending} x={ghost.x} z={ghost.z} items={items} room={room} />}
    </group>
  )
}

function PlacedMesh({ item, brand }: { item: PlacedItem; brand: string }) {
  return (
    <group
      name={`item-${item.id}`}
      position={[item.x, 0, item.z]}
      rotation={[0, item.rotation, 0]}
      onPointerDown={(e) => {
        e.stopPropagation()
        const state = usePlanner.getState()
        if (state.pendingCatalogId) {
          state.placeItem(state.pendingCatalogId, e.point.x, e.point.z, e.shiftKey)
          return
        }
        state.select(item.id, e.shiftKey)
      }}
    >
      <FurnitureMesh item={item} brand={brand} />
    </group>
  )
}

function GhostPreview({
  catalogId,
  x,
  z,
  items,
  room,
}: {
  catalogId: string
  x: number
  z: number
  items: PlacedItem[]
  room: Room
}) {
  const ghostItem = { id: '_ghost', catalogId, x, z, rotation: 0 }
  const { w, d, h } = itemDims(ghostItem)
  const collide = itemCollides(ghostItem, items, room)
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={collide ? '#dc2626' : '#3b82f6'} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.3, 24]} />
        <meshBasicMaterial color={collide ? '#dc2626' : '#3b82f6'} transparent opacity={0.85} />
      </mesh>
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
  const golden = hour >= 16 && hour <= 19.2
  return {
    position: [Math.cos(ang) * 14, elevation * 16 + 2, Math.sin(ang) * 10 - 4] as [number, number, number],
    intensity: dusk ? 0.55 + elevation * 0.9 : 1.05 + elevation * 1.25,
    color: golden ? '#ffc089' : dusk ? '#b7c8ff' : '#f3f6ff',
    ambient: dusk ? 0.24 : 0.3,
    hemi: dusk ? 0.42 : 0.52,
  }
}
