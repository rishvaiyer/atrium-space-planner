import { catalogItem, getGlbUrl } from '../catalog'
import { itemDims } from '../geometry'
import type { PlacedItem } from '../types'

const LEGS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

/** Unique / lit meshes stay as full trees. Everything else can instance. */
const SKIP = new Set([
  'piano',
  'grand-piano',
  'sofa',
  'lounge',
  'clinic-sofa',
  'booth',
  'armchair',
  'bed',
  'coffee-table',
  'side-table',
  'nightstand',
  'bookshelf',
  'shelf',
  'cubby',
  'file-cabinet',
  'tv-console',
  'floor-lamp',
  'trash',
  'coat-rack',
  'clothing-rack',
  'vase',
  'ottoman',
  'rug',
  'sink',
  'mirror',
  'wall-art',
  'fireplace',
  'speaker',
  'plant-tall',
  'pendant',
  'espresso-bar',
  'kitchen-island',
  'hab-mod',
  'airlock',
  'greenhouse',
  'phone-booth',
  'eclss',
  'solar-array',
  'rtg',
  'rad-shelter',
  'isru',
])

export type InstancePart = {
  kind: 'box' | 'cyl' | 'sphere' | 'torus'
  args: number[]
  pos: [number, number, number]
  rot?: [number, number, number]
  color: string
  roughness?: number
  metalness?: number
  woodTint?: string
}

export function instanceKey(item: PlacedItem, brand: string): string | null {
  if (item.texture) return null
  if (item.glbUrl || getGlbUrl(item.catalogId)) return null
  if (SKIP.has(item.catalogId)) return null
  const def = catalogItem(item.catalogId)
  if (def.costGroup === 'lighting') return null
  const { w, d, h } = itemDims(item)
  const finish = item.finish ?? brand
  return `${item.catalogId}|${finish}|${w.toFixed(3)}|${d.toFixed(3)}|${h.toFixed(3)}`
}

const MIN_BATCH = 2

export type InstanceBatch = {
  key: string
  catalogId: string
  finish: string
  items: PlacedItem[]
  parts: InstancePart[]
}

export function partitionInstances(items: PlacedItem[], brand: string) {
  const groups = new Map<string, PlacedItem[]>()
  const unique: PlacedItem[] = []
  for (const item of items) {
    const key = instanceKey(item, brand)
    if (!key) {
      unique.push(item)
      continue
    }
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }
  const batches: InstanceBatch[] = []
  for (const [key, list] of groups) {
    if (list.length < MIN_BATCH) {
      unique.push(...list)
      continue
    }
    const finish = list[0].finish ?? brand
    batches.push({
      key,
      catalogId: list[0].catalogId,
      finish,
      items: list,
      parts: recipeFor(list[0].catalogId, finish),
    })
  }
  return { batches, unique }
}

export function recipeFor(catalogId: string, accent: string): InstancePart[] {
  const def = catalogItem(catalogId)
  switch (catalogId) {
    case 'cafe-chair':
    case 'guest-chair':
    case 'dining-chair':
    case 'student-chair':
    case 'waiting-chair':
      return chairParts(accent)
    case 'task-chair':
      return taskChairParts(accent)
    case 'stool':
      return stoolParts(accent)
    case 'table-4':
      return tableParts(0.9, 0.9, true)
    case 'display-table':
      return tableParts(1.15, 0.8, true)
    case 'table-2':
      return tableParts(0.7, 0.7, false)
    case 'high-top':
      return tableParts(def.w, def.d, false)
    case 'conference-table':
    case 'dining-table':
    case 'exam-table':
      return tableParts(def.w, def.d, true)
    case 'banquette':
    case 'bench':
    case 'fitting-bench':
    case 'piano-bench':
      return banquetteParts(def.w, def.d, accent)
    case 'desk':
      return deskParts()
    case 'credenza':
    case 'dresser':
      return [
        {
          kind: 'box',
          args: [1.8, 0.74, 0.45],
          pos: [0, 0.37, 0],
          color: '#5e3b22',
          woodTint: '#5e3b22',
          roughness: 0.55,
        },
      ]
    case 'fridge':
      return [
        {
          kind: 'box',
          args: [def.w, def.h, def.d],
          pos: [0, def.h / 2, 0],
          color: '#e8e6e2',
          metalness: 0.35,
          roughness: 0.35,
        },
      ]
    case 'host-stand':
      return [
        { kind: 'box', args: [0.5, 1.1, 0.46], pos: [0, 0.55, 0], color: '#6a4020', woodTint: '#6a4020' },
        { kind: 'box', args: [0.5, 0.04, 0.42], pos: [0, 1.12, 0.05], rot: [-0.15, 0, 0], color: '#6a4020', woodTint: '#6a4020' },
      ]
    case 'planter':
      return [
        { kind: 'cyl', args: [0.18, 0.16, 0.44, 16], pos: [0, 0.22, 0], color: '#4a4038', roughness: 0.7 },
        { kind: 'sphere', args: [0.22, 16, 12], pos: [0, 0.58, 0], color: '#2f6a46', roughness: 0.85 },
        { kind: 'sphere', args: [0.14, 12, 10], pos: [0.08, 0.72, 0.04], color: '#3c7d52', roughness: 0.85 },
      ]
    case 'gondola':
      return [
        { kind: 'box', args: [1.2, 1.44, 0.5], pos: [0, 0.72, 0], color: '#d9d3c8', roughness: 0.6 },
        { kind: 'box', args: [1.14, 0.02, 0.22], pos: [0, 0.3, 0.18], color: '#b7b1a6' },
        { kind: 'box', args: [1.14, 0.02, 0.22], pos: [0, 0.7, 0.18], color: '#b7b1a6' },
        { kind: 'box', args: [1.14, 0.02, 0.22], pos: [0, 1.1, 0.18], color: '#b7b1a6' },
      ]
    case 'service-counter':
    case 'checkout':
    case 'prep-table':
    case 'reception':
    case 'whiteboard':
      return barParts(def.w, Math.max(def.d, catalogId === 'whiteboard' || catalogId === 'reception' ? 0.12 : def.d), def.h)
    default:
      return [
        {
          kind: 'box',
          args: [def.w, def.h, def.d],
          pos: [0, def.h / 2, 0],
          color: accent,
          roughness: 0.6,
        },
      ]
  }
}

function chairParts(accent: string): InstancePart[] {
  return [
    { kind: 'box', args: [0.42, 0.04, 0.4], pos: [0, 0.45, 0], color: '#7a4e2a', woodTint: '#7a4e2a', roughness: 0.55 },
    { kind: 'box', args: [0.4, 0.035, 0.38], pos: [0, 0.49, 0.01], color: accent, roughness: 0.85 },
    { kind: 'box', args: [0.42, 0.46, 0.045], pos: [0, 0.72, -0.18], color: accent, roughness: 0.85 },
    ...LEGS.map(
      ([x, z]): InstancePart => ({
        kind: 'cyl',
        args: [0.018, 0.022, 0.44, 8],
        pos: [x * 0.17, 0.22, z * 0.16],
        color: '#7a4e2a',
        woodTint: '#7a4e2a',
        roughness: 0.55,
      }),
    ),
  ]
}

function taskChairParts(accent: string): InstancePart[] {
  return [
    { kind: 'cyl', args: [0.26, 0.28, 0.07, 20], pos: [0, 0.48, 0], color: accent, roughness: 0.7 },
    { kind: 'box', args: [0.42, 0.48, 0.06], pos: [0, 0.78, -0.16], rot: [-0.18, 0, 0], color: accent, roughness: 0.7 },
    { kind: 'cyl', args: [0.03, 0.03, 0.32, 8], pos: [0, 0.28, 0], color: '#c9cdd2', metalness: 0.7, roughness: 0.25 },
    { kind: 'cyl', args: [0.28, 0.28, 0.03, 16], pos: [0, 0.12, 0], color: '#2a2c2e', metalness: 0.4, roughness: 0.4 },
  ]
}

function stoolParts(accent: string): InstancePart[] {
  return [
    { kind: 'cyl', args: [0.18, 0.19, 0.045, 24], pos: [0, 0.72, 0], color: '#6b4423', woodTint: '#6b4423', roughness: 0.55 },
    { kind: 'cyl', args: [0.165, 0.165, 0.03, 24], pos: [0, 0.75, 0], color: accent, roughness: 0.8 },
    ...LEGS.map(
      ([x, z]): InstancePart => ({
        kind: 'cyl',
        args: [0.012, 0.016, 0.74, 8],
        pos: [x * 0.12, 0.36, z * 0.12],
        rot: [0.12 * z, 0, -0.12 * x],
        color: '#c5c8cc',
        metalness: 0.75,
        roughness: 0.22,
      }),
    ),
    {
      kind: 'torus',
      args: [0.13, 0.01, 8, 24],
      pos: [0, 0.32, 0],
      rot: [Math.PI / 2, 0, 0],
      color: '#c5c8cc',
      metalness: 0.75,
      roughness: 0.22,
    },
  ]
}

function tableParts(top: number, depth: number, square: boolean): InstancePart[] {
  const topPart: InstancePart = square
    ? { kind: 'box', args: [top, 0.04, depth], pos: [0, 0.74, 0], color: '#9a6a3a', woodTint: '#9a6a3a', roughness: 0.55 }
    : { kind: 'cyl', args: [top / 2, top / 2, 0.04, 32], pos: [0, 0.74, 0], color: '#9a6a3a', woodTint: '#9a6a3a', roughness: 0.55 }
  return [
    topPart,
    { kind: 'cyl', args: [0.055, 0.07, 0.7, 12], pos: [0, 0.38, 0], color: '#3a332c', roughness: 0.45, metalness: 0.15 },
    { kind: 'cyl', args: [0.22, 0.22, 0.04, 20], pos: [0, 0.04, 0], color: '#2e2a26', roughness: 0.5 },
  ]
}

function banquetteParts(w: number, d: number, accent: string): InstancePart[] {
  return [
    { kind: 'box', args: [w, 0.36, d], pos: [0, 0.18, 0], color: '#5c3a22', woodTint: '#5c3a22', roughness: 0.55 },
    { kind: 'box', args: [w - 0.08, 0.1, d - 0.1], pos: [0, 0.4, 0.02], color: accent, roughness: 0.88 },
    { kind: 'box', args: [w, 0.62, 0.1], pos: [0, 0.68, -d / 2 + 0.07], color: accent, roughness: 0.88 },
  ]
}

function deskParts(): InstancePart[] {
  return [
    { kind: 'box', args: [1.6, 0.04, 0.8], pos: [0, 0.73, 0], color: '#7a5330', woodTint: '#7a5330', roughness: 0.55 },
    ...LEGS.map(
      ([x, z]): InstancePart => ({
        kind: 'box',
        args: [0.06, 0.72, 0.06],
        pos: [x * 0.72, 0.36, z * 0.34],
        color: '#2c2c2c',
      }),
    ),
  ]
}

function barParts(w: number, d: number, h: number): InstancePart[] {
  return [
    { kind: 'box', args: [w, h - 0.06, d - 0.04], pos: [0, (h - 0.06) / 2, 0], color: '#5a351c', woodTint: '#5a351c', roughness: 0.55 },
    { kind: 'box', args: [w + 0.04, 0.05, d], pos: [0, h - 0.025, 0], color: '#d8d4cc', roughness: 0.28, metalness: 0.08 },
    { kind: 'box', args: [w, 0.12, 0.02], pos: [0, 0.06, d / 2 - 0.02], color: '#1c1a18' },
  ]
}
