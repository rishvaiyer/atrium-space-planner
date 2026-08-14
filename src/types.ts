export type Category = 'restaurant' | 'office' | 'retail'
export type Tool = 'select' | 'measure'
export type FloorFinish = 'oak' | 'terrazzo' | 'concrete' | 'tile'
export type BudgetTier = 'budget' | 'standard' | 'premium'
export type Jurisdiction = 'IBC' | 'NBC' | 'Eurocode'
export type WallSide = 'n' | 's' | 'e' | 'w'
export type CostGroup = 'seating' | 'tables' | 'counters' | 'lighting' | 'other'

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
  plan: 'chair' | 'stool' | 'rect' | 'round' | 'banquette' | 'bar' | 'pendant' | 'fridge' | 'desk'
  blocksCirculation: boolean
  isSeat: boolean
  seats: number
}

export interface PlacedItem {
  id: string
  catalogId: string
  x: number
  z: number
  rotation: number
  finish?: string
}

export interface Door {
  id: string
  wall: WallSide
  offset: number
  width: number
  swing: 'left' | 'right'
}

export interface WindowSpec {
  id: string
  wall: WallSide
  offset: number
  width: number
  sill: number
  head: number
}

export interface Room {
  width: number
  depth: number
  wallHeight: number
  wallThickness: number
  doors: Door[]
  windows: WindowSpec[]
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

export interface CostLine {
  group: CostGroup | 'flooring'
  label: string
  amount: number
}
