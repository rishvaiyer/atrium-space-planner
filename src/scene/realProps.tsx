import { useMemo } from 'react'
import { woodTexture } from '../textures'

const LEGS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

function wood(color: string) {
  return { map: woodTexture(color), roughness: 0.52, metalness: 0.04 }
}

export function PianoMesh({ accent }: { accent: string }) {
  const body = useMemo(() => wood('#1a1410'), [])
  const keys = 24
  return (
    <group>
      <mesh position={[0, 0.52, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 1.04, 0.52]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0, 1.08, 0.02]} castShadow>
        <boxGeometry args={[1.5, 0.08, 0.58]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0, 0.72, 0.28]} castShadow receiveShadow>
        <boxGeometry args={[1.42, 0.08, 0.28]} />
        <meshStandardMaterial color="#111" roughness={0.4} />
      </mesh>
      {Array.from({ length: keys }, (_, i) => {
        const x = -0.66 + i * (1.32 / (keys - 1))
        const black = [1, 3, 6, 8, 10].includes(i % 12)
        return (
          <mesh key={i} position={[x, black ? 0.78 : 0.76, black ? 0.22 : 0.3]} castShadow>
            <boxGeometry args={[black ? 0.028 : 0.048, black ? 0.04 : 0.03, black ? 0.12 : 0.22]} />
            <meshStandardMaterial color={black ? '#111' : '#f4f1ea'} roughness={0.35} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.58, 0.32]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.36, 0.02, 0.18]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      <mesh position={[-0.62, 0.42, 0.08]}>
        <cylinderGeometry args={[0.018, 0.018, 0.12, 10]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.25} />
      </mesh>
      {LEGS.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.62, 0.12, z * 0.16]} castShadow>
          <boxGeometry args={[0.08, 0.24, 0.08]} />
          <meshStandardMaterial {...body} />
        </mesh>
      ))}
    </group>
  )
}

export function BedMesh({ accent }: { accent: string }) {
  const frame = useMemo(() => wood('#5c3a22'), [])
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.28, 2.05]} />
        <meshStandardMaterial {...frame} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.52, 0.22, 1.96]} />
        <meshStandardMaterial color={accent} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.56, -0.72]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.58, 0.14, 0.38]} />
        <meshStandardMaterial color="#efe8dc" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.7, -0.98]} castShadow>
        <boxGeometry args={[1.6, 0.7, 0.08]} />
        <meshStandardMaterial {...frame} />
      </mesh>
    </group>
  )
}

export function SofaMesh({ w, d, accent }: { w: number; d: number; accent: string }) {
  const n = Math.max(2, Math.round(w / 0.7))
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.36, d]} />
        <meshStandardMaterial color="#3a322c" roughness={0.7} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + w / n / 2 + i * (w / n)
        return (
          <mesh key={i} position={[x, 0.46, 0.02]} castShadow>
            <boxGeometry args={[w / n - 0.06, 0.16, d - 0.18]} />
            <meshStandardMaterial color={accent} roughness={0.88} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.72, -d / 2 + 0.08]} castShadow>
        <boxGeometry args={[w, 0.55, 0.14]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
      <mesh position={[-w / 2 + 0.08, 0.55, 0]} castShadow>
        <boxGeometry args={[0.12, 0.4, d - 0.08]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
      <mesh position={[w / 2 - 0.08, 0.55, 0]} castShadow>
        <boxGeometry args={[0.12, 0.4, d - 0.08]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
    </group>
  )
}

export function ArmchairMesh({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.78, 0.32, 0.78]} />
        <meshStandardMaterial color="#2e2824" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.44, 0.04]} castShadow>
        <boxGeometry args={[0.62, 0.14, 0.58]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.72, -0.3]} castShadow>
        <boxGeometry args={[0.78, 0.58, 0.12]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
      <mesh position={[-0.36, 0.52, 0.02]} castShadow>
        <boxGeometry args={[0.1, 0.28, 0.7]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
      <mesh position={[0.36, 0.52, 0.02]} castShadow>
        <boxGeometry args={[0.1, 0.28, 0.7]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>
    </group>
  )
}

export function BookshelfMesh() {
  const w = useMemo(() => wood('#6b4428'), [])
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 1.8, 0.32]} />
        <meshStandardMaterial {...w} />
      </mesh>
      {[0.28, 0.7, 1.12, 1.52].map((y) => (
        <mesh key={y} position={[0, y, 0.02]}>
          <boxGeometry args={[0.82, 0.03, 0.28]} />
          <meshStandardMaterial {...w} />
        </mesh>
      ))}
      {[-0.28, -0.08, 0.12, 0.3].map((x, i) => (
        <mesh key={x} position={[x, 0.92, 0.04]} castShadow>
          <boxGeometry args={[0.12, 0.28, 0.18]} />
          <meshStandardMaterial color={['#7a2e2e', '#2e4a7a', '#2f6a46', '#c4a35a'][i]} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

export function TvMesh() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.5, 0.44, 0.38]} />
        <meshStandardMaterial color="#2a2a2c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.95, -0.02]} castShadow>
        <boxGeometry args={[1.28, 0.74, 0.06]} />
        <meshStandardMaterial color="#111" roughness={0.25} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.95, 0.01]}>
        <boxGeometry args={[1.18, 0.64, 0.02]} />
        <meshStandardMaterial color="#1b2838" emissive="#1a3350" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

export function FloorLampMesh() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 16]} />
        <meshStandardMaterial color="#2a2a2c" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.5, 8]} />
        <meshStandardMaterial color="#c5c8cc" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.48, 0]} castShadow>
        <coneGeometry args={[0.18, 0.22, 16, 1, true]} />
        <meshStandardMaterial color="#f0e6d4" side={2} roughness={0.6} emissive="#f4e6c4" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

export function TrashMesh() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.14, 0.56, 16]} />
        <meshStandardMaterial color="#4a4e52" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.04, 16]} />
        <meshStandardMaterial color="#2a2c2e" />
      </mesh>
    </group>
  )
}

export function CoatRackMesh() {
  return (
    <group>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 1.7, 8]} />
        <meshStandardMaterial color="#5c3a22" roughness={0.6} />
      </mesh>
      {[-0.6, -0.2, 0.2, 0.6].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.12, 1.55, Math.cos(a) * 0.12]} rotation={[0.4, a, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.18, 6]} />
          <meshStandardMaterial color="#3a2a1c" />
        </mesh>
      ))}
    </group>
  )
}

export function VaseMesh({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.32, 12]} />
        <meshStandardMaterial color={accent} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#2f6a46" roughness={0.85} />
      </mesh>
    </group>
  )
}

export function OttomanMesh({ accent }: { accent: string }) {
  return (
    <mesh position={[0, 0.2, 0]} castShadow>
      <boxGeometry args={[0.7, 0.4, 0.7]} />
      <meshStandardMaterial color={accent} roughness={0.88} />
    </mesh>
  )
}

export function SideTableMesh() {
  const w = useMemo(() => wood('#8a5a32'), [])
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 20]} />
        <meshStandardMaterial {...w} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
    </group>
  )
}

export function RugMesh({ accent }: { accent: string }) {
  return (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[2.2, 1.4]} />
      <meshStandardMaterial color={accent} roughness={0.95} />
    </mesh>
  )
}

export function SinkMesh() {
  return (
    <group>
      <mesh position={[0, 0.88, 0]} castShadow>
        <boxGeometry args={[0.6, 0.12, 0.48]} />
        <meshStandardMaterial color="#e8e6e2" metalness={0.2} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.16, 0.14, 0.08, 16]} />
        <meshStandardMaterial color="#cfd5d8" metalness={0.4} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.05, -0.12]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
        <meshStandardMaterial color="#c5c8cc" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

export function GrandPianoMesh({ accent }: { accent: string }) {
  const body = useMemo(() => wood('#14110e'), [])
  return (
    <group>
      <mesh position={[0, 0.32, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 0.22, 1.55]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0.12, 0.32, 0.55]} castShadow>
        <boxGeometry args={[0.95, 0.2, 0.7]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0, 0.46, 0.72]} castShadow>
        <boxGeometry args={[1.42, 0.06, 0.32]} />
        <meshStandardMaterial color="#0e0e0e" roughness={0.35} />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => {
        const x = -0.62 + i * 0.058
        const black = [1, 3, 6, 8, 10].includes(i % 12)
        return (
          <mesh key={i} position={[x, black ? 0.51 : 0.49, black ? 0.68 : 0.78]} castShadow>
            <boxGeometry args={[black ? 0.028 : 0.05, 0.03, black ? 0.14 : 0.26]} />
            <meshStandardMaterial color={black ? '#111' : '#f4f1ea'} roughness={0.32} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.58, -0.2]} rotation={[0.02, 0, 0]} castShadow>
        <boxGeometry args={[1.46, 0.04, 1.4]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0.62, 0.42, 0.7]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.22, 0.02, 0.16]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      {[[-0.6, 0.7], [0.6, 0.7], [0.45, -0.7], [-0.45, -0.7]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.16, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.32, 10]} />
          <meshStandardMaterial {...body} />
        </mesh>
      ))}
    </group>
  )
}

export function MirrorMesh() {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.68, 1.66, 0.05]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.85, 0.02]}>
        <boxGeometry args={[0.56, 1.5, 0.02]} />
        <meshStandardMaterial color="#c5d4de" metalness={0.7} roughness={0.08} />
      </mesh>
    </group>
  )
}

export function ArtMesh({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.08, 0.78, 0.04]} />
        <meshStandardMaterial color="#2a241e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.9, 0.02]}>
        <boxGeometry args={[0.92, 0.64, 0.02]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
    </group>
  )
}

export function FireplaceMesh() {
  const stone = useMemo(() => wood('#6a6158'), [])
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 1.1, 0.42]} />
        <meshStandardMaterial {...stone} />
      </mesh>
      <mesh position={[0, 0.42, 0.12]}>
        <boxGeometry args={[0.7, 0.55, 0.22]} />
        <meshStandardMaterial color="#1a1410" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, 0.14]}>
        <boxGeometry args={[0.42, 0.18, 0.08]} />
        <meshStandardMaterial color="#e07020" emissive="#c04010" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 1.16, 0]} castShadow>
        <boxGeometry args={[1.7, 0.12, 0.5]} />
        <meshStandardMaterial color="#3a322c" roughness={0.55} />
      </mesh>
    </group>
  )
}

export function SpeakerMesh() {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.28, 1.1, 0.32]} />
        <meshStandardMaterial color="#1c1c1e" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.72, 0.14]}>
        <cylinderGeometry args={[0.09, 0.09, 0.04, 16]} />
        <meshStandardMaterial color="#3a3a3c" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.38, 0.14]}>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 16]} />
        <meshStandardMaterial color="#3a3a3c" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}

export function TallPlantMesh({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.12, 0.32, 12]} />
        <meshStandardMaterial color="#8a4a32" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color="#2f6a46" roughness={0.85} />
      </mesh>
      <mesh position={[0.12, 1.12, 0.08]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
    </group>
  )
}
