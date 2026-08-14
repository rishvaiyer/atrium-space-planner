import { useMemo } from 'react'
import { usePlanner } from '../store'
import { floorTexture, marbleTexture, plasterTexture, woodTexture } from '../textures'
import type { PlacedItem } from '../types'
import { catalogItem } from '../catalog'

const LEGS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

function woodMat(color = '#8a5a32') {
  return { map: woodTexture(color), roughness: 0.55, metalness: 0.02 }
}

export function FurnitureMesh({ item }: { item: PlacedItem }) {
  const brand = usePlanner((s) => s.brandColor)
  const accent = item.finish ?? brand
  const def = catalogItem(item.catalogId)

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
      return <Banquette w={def.w} d={def.d} accent={accent} />
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
    case 'desk':
      return <Desk />
    case 'credenza':
      return <Credenza />
    case 'gondola':
      return <Gondola />
    default:
      return (
        <mesh position={[0, def.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[def.w, def.h, def.d]} />
          <meshStandardMaterial color={accent} roughness={0.6} />
        </mesh>
      )
  }
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
  return (
    <group position={[0, 2.55, 0]}>
      <mesh>
        <cylinderGeometry args={[0.006, 0.006, 0.7, 8]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.42, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.16, 24]} />
        <meshStandardMaterial color="#f2ebe0" roughness={0.45} emissive="#f4e6c4" emissiveIntensity={0.25} />
      </mesh>
      <pointLight position={[0, -0.5, 0]} intensity={6} distance={5.5} color="#ffd8a8" decay={2} />
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

export function RoomMesh() {
  const room = usePlanner((s) => s.room)
  const floor = usePlanner((s) => s.floorFinish)
  const showWalls = usePlanner((s) => s.showWalls)
  const plaster = useMemo(() => plasterTexture(), [])
  const { width: w, depth: d, wallHeight: h, wallThickness: t } = room

  const south = pieces(w, room.doors.filter((door) => door.wall === 's'))
  const north = pieces(w, room.doors.filter((door) => door.wall === 'n'))
  const west = pieces(d, room.doors.filter((door) => door.wall === 'w'))
  const east = pieces(d, room.doors.filter((door) => door.wall === 'e'))

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, d / 2]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <FloorMat kind={floor} />
      </mesh>
      {showWalls && (
        <>
          {south.map((p) => (
            <mesh key={`s${p.s}`} position={[(p.s + p.e) / 2, h / 2, -t / 2]} receiveShadow>
              <boxGeometry args={[p.e - p.s, h, t]} />
              <meshStandardMaterial map={plaster} color="#f3ebe0" roughness={0.9} />
            </mesh>
          ))}
          {north.map((p) => (
            <mesh key={`n${p.s}`} position={[(p.s + p.e) / 2, h / 2, d + t / 2]} receiveShadow>
              <boxGeometry args={[p.e - p.s, h, t]} />
              <meshStandardMaterial map={plaster} color="#f3ebe0" roughness={0.9} />
            </mesh>
          ))}
          {west.map((p) => (
            <mesh key={`w${p.s}`} position={[-t / 2, h / 2, (p.s + p.e) / 2]} receiveShadow>
              <boxGeometry args={[t, h, p.e - p.s]} />
              <meshStandardMaterial map={plaster} color="#f3ebe0" roughness={0.9} />
            </mesh>
          ))}
          {east.map((p) => (
            <mesh key={`e${p.s}`} position={[w + t / 2, h / 2, (p.s + p.e) / 2]} receiveShadow>
              <boxGeometry args={[t, h, p.e - p.s]} />
              <meshStandardMaterial map={plaster} color="#f3ebe0" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[-t / 2, h / 2, -t / 2]} receiveShadow>
            <boxGeometry args={[t, h, t]} />
            <meshStandardMaterial map={plaster} color="#f3ebe0" roughness={0.9} />
          </mesh>
          <mesh position={[w + t / 2, h / 2, -t / 2]} receiveShadow>
            <boxGeometry args={[t, h, t]} />
            <meshStandardMaterial map={plaster} color="#f3ebe0" roughness={0.9} />
          </mesh>
          <mesh position={[-t / 2, h / 2, d + t / 2]} receiveShadow>
            <boxGeometry args={[t, h, t]} />
            <meshStandardMaterial map={plaster} color="#f3ebe0" roughness={0.9} />
          </mesh>
          <mesh position={[w + t / 2, h / 2, d + t / 2]} receiveShadow>
            <boxGeometry args={[t, h, t]} />
            <meshStandardMaterial map={plaster} color="#f3ebe0" roughness={0.9} />
          </mesh>
          {room.windows.map((win) => {
            const along = win.wall === 'n' || win.wall === 's'
            const x =
              win.wall === 'w' ? 0.02 : win.wall === 'e' ? w - 0.02 : win.offset + win.width / 2
            const z =
              win.wall === 's' ? 0.02 : win.wall === 'n' ? d - 0.02 : win.offset + win.width / 2
            const wh = win.head - win.sill
            return (
              <mesh key={win.id} position={[x, win.sill + wh / 2, z]}>
                <boxGeometry args={along ? [win.width, wh, 0.04] : [0.04, wh, win.width]} />
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
          {room.doors.map((door) => {
            const open = 1.15
            const hingeX =
              door.wall === 's'
                ? door.offset
                : door.wall === 'n'
                  ? door.offset + door.width
                  : door.wall === 'w'
                    ? 0
                    : w
            const hingeZ =
              door.wall === 's'
                ? 0
                : door.wall === 'n'
                  ? d
                  : door.wall === 'w'
                    ? door.offset + door.width
                    : door.offset
            const rot =
              door.wall === 's'
                ? open
                : door.wall === 'n'
                  ? Math.PI + open
                  : door.wall === 'w'
                    ? Math.PI / 2 + open
                    : -Math.PI / 2 - open
            return (
              <group key={door.id} position={[hingeX, 0, hingeZ]} rotation={[0, rot, 0]}>
                <mesh position={[door.width / 2, 1.05, 0]} castShadow>
                  <boxGeometry args={[door.width, 2.1, 0.05]} />
                  <meshStandardMaterial color="#6b4428" roughness={0.55} />
                </mesh>
              </group>
            )
          })}
        </>
      )}
    </group>
  )
}

function pieces(length: number, doors: { offset: number; width: number }[]) {
  const holes = doors.map((door) => ({ s: door.offset, e: door.offset + door.width })).sort((a, b) => a.s - b.s)
  const out: { s: number; e: number }[] = []
  let cursor = 0
  for (const hole of holes) {
    if (hole.s > cursor + 0.01) out.push({ s: cursor, e: hole.s })
    cursor = Math.max(cursor, hole.e)
  }
  if (cursor < length - 0.01) out.push({ s: cursor, e: length })
  return out
}

function FloorMat({ kind }: { kind: 'oak' | 'terrazzo' | 'concrete' | 'tile' }) {
  const map = useMemo(() => floorTexture(kind), [kind])
  return <meshStandardMaterial map={map} roughness={kind === 'oak' ? 0.55 : 0.4} />
}
