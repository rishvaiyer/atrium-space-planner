import { Suspense, useMemo, type ReactNode } from 'react'
import { catalogItem, getGlbUrl } from '../catalog'
import { itemDims } from '../geometry'
import { useLowPower } from '../lowPower'
import { floorTexture, marbleTexture, wallTexture, woodTexture } from '../textures'
import type { FloorFinish, PlacedItem, Room, WallFinish } from '../types'
import { doorHinge, pointOnWall, wallDir, wallPieces } from '../walls'
import { GlbSafe } from './GlbProp'
import { TexturedGroup } from './TexturedGroup'
import {
  ArmchairMesh,
  ArtMesh,
  BedMesh,
  BookshelfMesh,
  CoatRackMesh,
  FireplaceMesh,
  FloorLampMesh,
  GrandPianoMesh,
  MirrorMesh,
  OttomanMesh,
  PianoMesh,
  RugMesh,
  SideTableMesh,
  SinkMesh,
  SofaMesh,
  SpeakerMesh,
  TallPlantMesh,
  TrashMesh,
  TvMesh,
  VaseMesh,
} from './realProps'

const LEGS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

function woodMat(color = '#8a5a32') {
  return { map: woodTexture(color), roughness: 0.55, metalness: 0.02 }
}

export function FurnitureMesh({ item, brand }: { item: PlacedItem; brand: string }) {
  const accent = item.finish ?? brand
  const def = catalogItem(item.catalogId)
  const { w, d, h } = itemDims(item)
  const sx = w / def.w
  const sy = h / def.h
  const sz = d / def.d
  const glbUrl = getGlbUrl(item.catalogId) || item.glbUrl
  const wrap = (node: ReactNode) => (
    <TexturedGroup textureId={item.texture} tint={item.finish}>
      {node}
    </TexturedGroup>
  )

  if (glbUrl) {
    return (
      <Suspense fallback={null}>
        <GlbSafe url={glbUrl} w={w} d={d} h={h} textureId={item.texture} tint={item.finish} />
      </Suspense>
    )
  }

  const body = (() => {
    switch (item.catalogId) {
      case 'cafe-chair':
        return <Chair accent={accent} />
      case 'task-chair':
        return <TaskChair accent={accent} />
      case 'stool':
        return <Stool accent={accent} />
      case 'table-4':
        return <Table top={0.9} square />
      case 'table-2':
        return <Table top={0.7} square={false} />
      case 'display-table':
        return <Table top={1.15} square depth={0.8} />
      case 'banquette':
        return <Banquette w={def.w} d={def.d} accent={accent} />
      case 'lounge':
      case 'sofa':
      case 'clinic-sofa':
      case 'booth':
        return <SofaMesh w={def.w} d={def.d} accent={accent} />
      case 'bench':
      case 'fitting-bench':
      case 'piano-bench':
        return <Banquette w={def.w} d={def.d} accent={accent} />
      case 'armchair':
        return <ArmchairMesh accent={accent} />
      case 'guest-chair':
      case 'dining-chair':
      case 'student-chair':
        return <Chair accent={accent} />
      case 'conference-table':
      case 'dining-table':
        return <Table top={def.w} square depth={def.d} />
      case 'high-top':
        return <Table top={def.w} square={false} />
      case 'kitchen-island':
      case 'prep-table':
        return <Bar w={def.w} d={def.d} h={def.h} />
      case 'phone-booth':
        return <HabMod accent={accent} />
      case 'bed':
        return <BedMesh accent={accent} />
      case 'exam-table':
        return <Table top={def.w} square depth={def.d} />
      case 'coffee-table':
      case 'side-table':
      case 'nightstand':
        return <SideTableMesh />
      case 'reception':
      case 'whiteboard':
        return <Bar w={def.w} d={Math.max(def.d, 0.12)} h={def.h} />
      case 'waiting-chair':
        return <Chair accent={accent} />
      case 'espresso-bar':
        return <Bar w={def.w} d={def.d} h={def.h} machine />
      case 'service-counter':
      case 'checkout':
        return <Bar w={def.w} d={def.d} h={def.h} />
      case 'pendant':
        return <Pendant />
      case 'fridge':
        return <Fridge w={def.w} d={def.d} h={def.h} />
      case 'host-stand':
        return <HostStand />
      case 'planter':
        return <Planter />
      case 'plant-tall':
        return <TallPlantMesh accent={accent} />
      case 'desk':
        return <Desk />
      case 'credenza':
      case 'dresser':
        return <Credenza />
      case 'gondola':
        return <Gondola />
      case 'hab-mod':
        return <HabMod accent={accent} />
      case 'airlock':
        return <Airlock />
      case 'greenhouse':
        return <Greenhouse />
      case 'eclss':
        return <Eclss />
      case 'solar-array':
        return <Solar />
      case 'rtg':
        return <Rtg />
      case 'rad-shelter':
        return <Shelter accent={accent} />
      case 'isru':
        return <Isru />
      case 'piano':
        return <PianoMesh accent={accent} />
      case 'grand-piano':
        return <GrandPianoMesh accent={accent} />
      case 'bookshelf':
      case 'shelf':
      case 'cubby':
      case 'file-cabinet':
        return <BookshelfMesh />
      case 'tv-console':
        return <TvMesh />
      case 'floor-lamp':
        return <FloorLampMesh />
      case 'trash':
        return <TrashMesh />
      case 'coat-rack':
      case 'clothing-rack':
        return <CoatRackMesh />
      case 'vase':
        return <VaseMesh accent={accent} />
      case 'ottoman':
        return <OttomanMesh accent={accent} />
      case 'rug':
        return <RugMesh accent={accent} />
      case 'sink':
        return <SinkMesh />
      case 'mirror':
        return <MirrorMesh />
      case 'wall-art':
        return <ArtMesh accent={accent} />
      case 'fireplace':
        return <FireplaceMesh />
      case 'speaker':
        return <SpeakerMesh />
      default:
        return (
          <mesh position={[0, def.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[def.w, def.h, def.d]} />
            <meshStandardMaterial color={accent} roughness={0.6} />
          </mesh>
        )
    }
  })()

  return wrap(<group scale={[sx, sy, sz]}>{body}</group>)
}

function Chair({ accent }: { accent: string }) {
  const wood = useMemo(() => woodMat('#7a4e2a'), [])
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.04, 0.4]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[0, 0.49, 0.01]} castShadow>
        <boxGeometry args={[0.4, 0.035, 0.38]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.72, -0.18]} castShadow>
        <boxGeometry args={[0.42, 0.46, 0.045]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      {LEGS.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.17, 0.22, z * 0.16]} castShadow>
          <cylinderGeometry args={[0.018, 0.022, 0.44, 8]} />
          <meshStandardMaterial {...wood} />
        </mesh>
      ))}
    </group>
  )
}

function TaskChair({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.28, 0.07, 20]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.78, -0.16]} rotation={[-0.18, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.48, 0.06]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.32, 8]} />
        <meshStandardMaterial color="#c9cdd2" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.03, 16]} />
        <meshStandardMaterial color="#2a2c2e" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Stool({ accent }: { accent: string }) {
  const wood = useMemo(() => woodMat('#6b4423'), [])
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.19, 0.045, 24]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.165, 0.165, 0.03, 24]} />
        <meshStandardMaterial color={accent} roughness={0.8} />
      </mesh>
      {LEGS.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.12, 0.36, z * 0.12]} rotation={[0.12 * z, 0, -0.12 * x]} castShadow>
          <cylinderGeometry args={[0.012, 0.016, 0.74, 8]} />
          <meshStandardMaterial color="#c5c8cc" metalness={0.75} roughness={0.22} />
        </mesh>
      ))}
      <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.01, 8, 24]} />
        <meshStandardMaterial color="#c5c8cc" metalness={0.75} roughness={0.22} />
      </mesh>
    </group>
  )
}

function Table({
  top,
  square,
  depth,
}: {
  top: number
  square: boolean
  depth?: number
}) {
  const wood = useMemo(() => woodMat('#9a6a3a'), [])
  const d = depth ?? top
  return (
    <group>
      {square ? (
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[top, 0.04, d]} />
          <meshStandardMaterial {...wood} />
        </mesh>
      ) : (
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[top / 2, top / 2, 0.04, 32]} />
          <meshStandardMaterial {...wood} />
        </mesh>
      )}
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.7, 12]} />
        <meshStandardMaterial color="#3a332c" roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 20]} />
        <meshStandardMaterial color="#2e2a26" roughness={0.5} />
      </mesh>
    </group>
  )
}

function Banquette({ w, d, accent }: { w: number; d: number; accent: string }) {
  const wood = useMemo(() => woodMat('#5c3a22'), [])
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.36, d]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[0, 0.4, 0.02]} castShadow>
        <boxGeometry args={[w - 0.08, 0.1, d - 0.1]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.68, -d / 2 + 0.07]} castShadow>
        <boxGeometry args={[w, 0.62, 0.1]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
    </group>
  )
}

function Bar({ w, d, h, machine }: { w: number; d: number; h: number; machine?: boolean }) {
  const wood = useMemo(() => woodMat('#5a351c'), [])
  const marble = useMemo(() => marbleTexture(), [])
  return (
    <group>
      <mesh position={[0, (h - 0.06) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h - 0.06, d - 0.04]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[0, h - 0.025, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.04, 0.05, d]} />
        <meshStandardMaterial map={marble} roughness={0.28} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.06, d / 2 - 0.02]}>
        <boxGeometry args={[w, 0.12, 0.02]} />
        <meshStandardMaterial color="#1c1a18" />
      </mesh>
      {machine && (
        <group position={[0.4, h, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.42, 0.44, 0.38]} />
            <meshStandardMaterial color="#d8d5d0" metalness={0.65} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.48, 0.02]}>
            <boxGeometry args={[0.38, 0.08, 0.3]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[-0.55, 0.12, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.12, 16]} />
            <meshStandardMaterial color="#eeeae4" />
          </mesh>
        </group>
      )}
    </group>
  )
}

function Pendant() {
  const lowPower = useLowPower()
  return (
    <group position={[0, 2.55, 0]}>
      <mesh>
        <cylinderGeometry args={[0.006, 0.006, 0.7, 8]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.42, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.16, 24]} />
        <meshStandardMaterial color="#f2ebe0" roughness={0.45} emissive="#f4e6c4" emissiveIntensity={0.45} />
      </mesh>
      {!lowPower && (
        <pointLight position={[0, -0.5, 0]} intensity={6} distance={5.5} color="#ffd8a8" decay={2} />
      )}
    </group>
  )
}

function Fridge({ w, d, h }: { w: number; d: number; h: number }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#e8e6e2" metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, h / 2, d / 2 + 0.005]}>
        <boxGeometry args={[w - 0.1, h - 0.18, 0.02]} />
        <meshStandardMaterial color="#8aa0aa" metalness={0.2} roughness={0.15} transparent opacity={0.45} />
      </mesh>
    </group>
  )
}

function HostStand() {
  const wood = useMemo(() => woodMat('#6a4020'), [])
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 1.1, 0.46]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[0, 1.12, 0.05]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.42]} />
        <meshStandardMaterial {...wood} />
      </mesh>
    </group>
  )
}

function Planter() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.16, 0.44, 16]} />
        <meshStandardMaterial color="#4a4038" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color="#2f6a46" roughness={0.85} />
      </mesh>
      <mesh position={[0.08, 0.72, 0.04]}>
        <sphereGeometry args={[0.14, 12, 10]} />
        <meshStandardMaterial color="#3c7d52" roughness={0.85} />
      </mesh>
    </group>
  )
}

function Desk() {
  const wood = useMemo(() => woodMat('#7a5330'), [])
  return (
    <group>
      <mesh position={[0, 0.73, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.04, 0.8]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      {LEGS.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.72, 0.36, z * 0.34]} castShadow>
          <boxGeometry args={[0.06, 0.72, 0.06]} />
          <meshStandardMaterial color="#2c2c2c" />
        </mesh>
      ))}
    </group>
  )
}

function Credenza() {
  const wood = useMemo(() => woodMat('#5e3b22'), [])
  return (
    <mesh position={[0, 0.37, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.8, 0.74, 0.45]} />
      <meshStandardMaterial {...wood} />
    </mesh>
  )
}

function Gondola() {
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.2, 1.44, 0.5]} />
        <meshStandardMaterial color="#d9d3c8" roughness={0.6} />
      </mesh>
      {[0.3, 0.7, 1.1].map((y) => (
        <mesh key={y} position={[0, y, 0.18]}>
          <boxGeometry args={[1.14, 0.02, 0.22]} />
          <meshStandardMaterial color="#b7b1a6" />
        </mesh>
      ))}
    </group>
  )
}

function HabMod({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[1.15, 1.15, 2.3, 20]} />
        <meshStandardMaterial color="#c5ccd4" metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.38, 0]}>
        <cylinderGeometry args={[1.05, 1.15, 0.16, 20]} />
        <meshStandardMaterial color={accent} metalness={0.2} roughness={0.4} />
      </mesh>
    </group>
  )
}

function Airlock() {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.62, 2.1, 16]} />
        <meshStandardMaterial color="#8b95a0" metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.1, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.06, 8, 18]} />
        <meshStandardMaterial color="#7ee0d6" metalness={0.5} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Greenhouse() {
  return (
    <group>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[3.1, 2.05, 1.7]} />
        <meshStandardMaterial color="#7ee0d6" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[3.2, 0.12, 1.8]} />
        <meshStandardMaterial color="#2a333c" />
      </mesh>
    </group>
  )
}

function Eclss() {
  return (
    <mesh position={[0, 1, 0]} castShadow>
      <boxGeometry args={[1.15, 1.95, 0.75]} />
      <meshStandardMaterial color="#4b5563" metalness={0.4} roughness={0.35} />
    </mesh>
  )
}

function Solar() {
  return (
    <mesh position={[0, 0.12, 0]} rotation={[-0.18, 0, 0]} castShadow>
      <boxGeometry args={[3.5, 0.06, 1.05]} />
      <meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.2} />
    </mesh>
  )
}

function Rtg() {
  return (
    <group>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.42, 1.3, 12]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.55} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 12]} />
        <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

function Shelter({ accent }: { accent: string }) {
  return (
    <mesh position={[0, 0.8, 0]} castShadow>
      <boxGeometry args={[2.15, 1.55, 2.15]} />
      <meshStandardMaterial color={accent} roughness={0.85} />
    </mesh>
  )
}

function Isru() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.9, 1.7, 1.5]} />
        <meshStandardMaterial color="#6b7280" metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0.7, 1.9, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 1.1, 8]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
    </group>
  )
}

export function RoomMesh({
  room,
  floor,
  wallFinish,
  showWalls,
}: {
  room: Room
  floor: FloorFinish
  wallFinish: WallFinish
  showWalls: boolean
}) {
  const plaster = useMemo(() => wallTexture(wallFinish), [wallFinish])
  const { width: w, depth: d, originX: ox, originZ: oz, wallHeight: h, wallThickness: t } = room

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox + w / 2, 0, oz + d / 2]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <FloorMat kind={floor} />
      </mesh>
      {showWalls &&
        room.walls.map((wall) => {
          const dir = wallDir(wall)
          const angle = Math.atan2(dir.z, dir.x)
          return (
            <group key={wall.id}>
              {wallPieces(room, wall).map((p) => {
                const mid = (p.s + p.e) / 2
                const pos = pointOnWall(wall, mid)
                return (
                  <mesh key={`${wall.id}-${p.s}`} position={[pos.x, h / 2, pos.z]} rotation={[0, -angle, 0]} receiveShadow>
                    <boxGeometry args={[p.e - p.s, h, t]} />
                    <meshStandardMaterial map={plaster} color="#eef3f8" roughness={0.9} />
                  </mesh>
                )
              })}
            </group>
          )
        })}
      {showWalls &&
        room.windows.map((win) => {
          const wall = room.walls.find((w) => w.id === win.wallId)
          if (!wall) return null
          const dir = wallDir(wall)
          const angle = Math.atan2(dir.z, dir.x)
          const pos = pointOnWall(wall, win.offset + win.width / 2)
          const wh = win.head - win.sill
          return (
            <mesh key={win.id} position={[pos.x, win.sill + wh / 2, pos.z]} rotation={[0, -angle, 0]}>
              <boxGeometry args={[win.width, wh, 0.04]} />
              <meshStandardMaterial
                color="#b9d4e4"
                transparent
                opacity={0.28}
                metalness={0.1}
                roughness={0.05}
                emissive="#dcefff"
                emissiveIntensity={0.15}
              />
            </mesh>
          )
        })}
      {showWalls &&
        room.doors.map((door) => {
          const hinge = doorHinge(room, door)
          if (!hinge) return null
          return (
            <group key={door.id} position={[hinge.x, 0, hinge.z]} rotation={[0, hinge.angle + 1.15, 0]}>
              <mesh position={[door.width / 2, 1.05, 0]} castShadow>
                <boxGeometry args={[door.width, 2.1, 0.05]} />
                <meshStandardMaterial color="#6b4428" roughness={0.55} />
              </mesh>
            </group>
          )
        })}
    </group>
  )
}

function FloorMat({ kind }: { kind: FloorFinish }) {
  const map = useMemo(() => floorTexture(kind), [kind])
  const rough = kind === 'oak' || kind === 'walnut' || kind === 'herringbone' ? 0.55 : kind === 'marble' ? 0.2 : 0.4
  return <meshStandardMaterial map={map} roughness={rough} />
}
