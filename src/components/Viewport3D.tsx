import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls, TransformControls } from '@react-three/drei'
import type { Group } from 'three'
import { catalogItem } from '../catalog'
import { FurnitureMesh, RoomMesh } from '../scene/Furniture'
import { LowPower } from '../lowPower'
import { useIsMobile } from '../media'
import { usePlanner } from '../store'
import type { PlacedItem } from '../types'
import { GLBoundary } from './GLBoundary'

export function Viewport3D() {
  const time = usePlanner((s) => s.timeOfDay)
  const sun = useMemo(() => sunFromTime(time), [time])
  const mobile = useIsMobile()

  return (
    <div className="viewport3d">
      <div className="view-label">3D · perspective</div>
      <GLBoundary>
        <Canvas
          shadows={!mobile}
          dpr={mobile ? [1, 1.25] : [1, 1.75]}
          camera={{ position: [12.5, 7.4, 12], fov: mobile ? 46 : 38, near: 0.1, far: 80 }}
          gl={{
            antialias: !mobile,
            alpha: false,
            powerPreference: mobile ? 'low-power' : 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          onPointerMissed={() => usePlanner.getState().select(null)}
        >
          <LowPower.Provider value={mobile}>
            <color attach="background" args={['#8aa3b0']} />
            <fog attach="fog" args={['#8aa3b0', 18, 42]} />
            <hemisphereLight args={['#f2f0ea', '#6b5c4c', sun.hemi]} />
            <ambientLight intensity={mobile ? sun.ambient + 0.22 : sun.ambient} />
            <directionalLight
              position={sun.position}
              intensity={mobile ? sun.intensity * 0.7 : sun.intensity}
              color={sun.color}
              castShadow={!mobile}
              shadow-mapSize-width={mobile ? 512 : 1024}
              shadow-mapSize-height={mobile ? 512 : 1024}
              shadow-camera-near={1}
              shadow-camera-far={40}
              shadow-camera-left={-12}
              shadow-camera-right={12}
              shadow-camera-top={12}
              shadow-camera-bottom={-12}
            />
            <Scene />
            {!mobile && (
              <ContactShadows position={[5.6, 0.01, 4.2]} opacity={0.35} scale={22} blur={2.2} far={8} />
            )}
            <Controls mobile={mobile} />
          </LowPower.Provider>
        </Canvas>
      </GLBoundary>
    </div>
  )
}

function Scene() {
  const items = usePlanner((s) => s.items)
  const showFurniture = usePlanner((s) => s.showFurniture)
  const showElectrical = usePlanner((s) => s.showElectrical)
  const room = usePlanner((s) => s.room)

  return (
    <group>
      <RoomMesh />
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
        return <PlacedMesh key={item.id} item={item} />
      })}
    </group>
  )
}

function PlacedMesh({ item }: { item: PlacedItem }) {
  const ref = useRef<Group>(null)
  const selected = usePlanner((s) => s.selectedIds.includes(item.id))
  const dragging = usePlanner((s) => s.isDragging3d)

  useEffect(() => {
    if (!ref.current) return
    if (dragging && selected) return
    ref.current.position.set(item.x, 0, item.z)
    ref.current.rotation.set(0, item.rotation, 0)
  }, [item.x, item.z, item.rotation, dragging, selected])

  return (
    <group
      ref={ref}
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
      <FurnitureMesh item={item} />
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.34, 32]} />
          <meshBasicMaterial color="#c9a36a" />
        </mesh>
      )}
    </group>
  )
}

function Controls({ mobile }: { mobile: boolean }) {
  const selectedIds = usePlanner((s) => s.selectedIds)
  const { scene } = useThree()
  const [object, setObject] = useState<Group | null>(null)
  const [orbitOn, setOrbitOn] = useState(true)

  useEffect(() => {
    if (mobile || selectedIds.length !== 1) {
      setObject(null)
      return
    }
    const found = scene.getObjectByName(`item-${selectedIds[0]}`) as Group | undefined
    setObject(found ?? null)
  }, [selectedIds, scene, mobile])

  return (
    <>
      <OrbitControls
        makeDefault
        enabled={orbitOn}
        enableDamping={!mobile}
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.06}
        minDistance={3}
        maxDistance={28}
        target={[5.6, 0.4, 4.2]}
      />
      {object && !mobile && (
        <TransformControls
          object={object}
          mode="translate"
          showY={false}
          size={0.85}
          space="world"
          onMouseDown={() => {
            usePlanner.getState().setFlag('isDragging3d', true)
            setOrbitOn(false)
          }}
          onMouseUp={() => {
            const state = usePlanner.getState()
            state.setFlag('isDragging3d', false)
            setOrbitOn(true)
            if (selectedIds.length !== 1) return
            const snap = state.snapOn ? state.snap : 0
            const x = snap ? Math.round(object.position.x / snap) * snap : object.position.x
            const z = snap ? Math.round(object.position.z / snap) * snap : object.position.z
            state.commitHistory()
            state.updateItem(selectedIds[0], { x, z })
            object.position.x = x
            object.position.z = z
            object.position.y = 0
          }}
        />
      )}
    </>
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
