import { useMemo, type CSSProperties } from 'react'
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

  return (
    <div className="viewport3d">
      <div className="view-label">3D · orbit</div>
      <GLBoundary>
        <Canvas
          style={WRAP}
          shadows={!mobile}
          dpr={1}
          camera={mobile ? CAMERA_MOBILE : CAMERA}
          onPointerMissed={() => usePlanner.getState().select(null)}
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
