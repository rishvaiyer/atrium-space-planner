export type Category = 'restaurant' | 'office' | 'retail' | 'healthcare' | 'home' | 'education' | 'habitat'
export type Tool = 'select' | 'measure' | 'pan' | 'paint' | 'stamp' | 'note' | 'wall' | 'door' | 'window'
export type CameraMode = 'orbit' | 'eye' | 'top'
export type ArchSel = { kind: 'wall' | 'door' | 'window' | 'space'; id: string }
export type FloorFinish =
  | 'oak'
  | 'walnut'
  | 'herringbone'
  | 'terrazzo'
  | 'marble'
  | 'concrete'
  | 'tile'
  | 'slate'
  | 'carpet'
  | 'checker'
export type WallFinish = 'plaster' | 'paint' | 'brick' | 'wood' | 'concrete' | 'tile'
export type BudgetTier = 'budget' | 'standard' | 'premium'
export type Jurisdiction = 'IBC' | 'NBC' | 'Eurocode'
export type WallSide = 'n' | 's' | 'e' | 'w'
export type CostGroup = 'seating' | 'tables' | 'counters' | 'lighting' | 'other' | 'habitat' | 'power' | 'life'
export type WorldUse = 'sit' | 'sleep' | 'work' | 'prop'

export interface CatalogItem {
  id: string
  name: string
  sku: string
  category: Category
  costGroup: CostGroup
  price: number
  w: number
  d: number
  h: number
  plan: 'chair' | 'stool' | 'rect' | 'round' | 'banquette' | 'bar' | 'pendant' | 'fridge' | 'desk' | 'module'
  blocksCirculation: boolean
  isSeat: boolean
  seats: number
  /** Hip height in meters when an avatar sits or lies. */
  sitHeight?: number
  tags?: string[]
  use?: WorldUse
}

export interface PlacedItem {
  id: string
  catalogId: string
  x: number
  z: number
  rotation: number
  finish?: string
  w?: number
  d?: number
  h?: number
  texture?: string
  extra?: string
}

export interface WallSeg {
  id: string
  ax: number
  az: number
  bx: number
  bz: number
}

export interface Door {
  id: string
  wallId: string
  offset: number
  width: number
  swing: 'left' | 'right'
}

export interface WindowSpec {
  id: string
  wallId: string
  offset: number
  width: number
  sill: number
  head: number
}

export interface Space {
  id: string
  name: string
  polygon: { x: number; z: number }[]
  wallIds: string[]
}

export interface Room {
  width: number
  depth: number
  originX: number
  originZ: number
  wallHeight: number
  wallThickness: number
  walls: WallSeg[]
  doors: Door[]
  windows: WindowSpec[]
  spaces: Space[]
}

export interface ComplianceCheck {
  id: string
  label: string
  ok: boolean
  detail: string
}

export interface EgressPath {
  fromId: string
  points: { x: number; z: number }[]
  length: number
}

export interface Note {
  id: string
  x: number
  z: number
  text: string
}

export interface CostLine {
  group: CostGroup | 'flooring'
  label: string
  amount: number
}
