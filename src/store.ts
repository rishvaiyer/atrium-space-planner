import { create } from 'zustand'
import { createDefaultItems, ROOM } from './defaultLayout'
import { snapTo, uid } from './geometry'
import type {
  BudgetTier,
  Category,
  FloorFinish,
  Jurisdiction,
  PlacedItem,
  Room,
  Tool,
} from './types'

const HISTORY_LIMIT = 40

export interface PlannerState {
  room: Room
  items: PlacedItem[]
  selectedIds: string[]
  tool: Tool
  category: Category
  pendingCatalogId: string | null
  snap: number
  snapOn: boolean
  showWalls: boolean
  showFurniture: boolean
  showElectrical: boolean
  showEgress: boolean
  showDimensions: boolean
  showGrid: boolean
  brandColor: string
  floorFinish: FloorFinish
  timeOfDay: number
  budgetTier: BudgetTier
  budgetCap: number
  jurisdiction: Jurisdiction
  isDragging3d: boolean
  measure: { a: { x: number; z: number } | null; b: { x: number; z: number } | null }
  past: PlacedItem[][]
  future: PlacedItem[][]
  select: (id: string | null, additive?: boolean) => void
  setTool: (tool: Tool) => void
  setCategory: (category: Category) => void
  setPending: (catalogId: string | null) => void
  placeItem: (catalogId: string, x: number, z: number) => void
  moveItems: (ids: string[], x: number, z: number, asCenterOf?: string) => void
  updateItem: (id: string, patch: Partial<PlacedItem>) => void
  rotateSelected: (delta: number) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  setFinish: (id: string, finish: string) => void
  setBrandColor: (color: string) => void
  setFloorFinish: (floorFinish: FloorFinish) => void
  setTimeOfDay: (timeOfDay: number) => void
  setBudgetTier: (budgetTier: BudgetTier) => void
  setJurisdiction: (jurisdiction: Jurisdiction) => void
  setFlag: (
    key:
      | 'showWalls'
      | 'showFurniture'
      | 'showElectrical'
      | 'showEgress'
      | 'showDimensions'
      | 'showGrid'
      | 'snapOn'
      | 'isDragging3d',
    value: boolean,
  ) => void
  setMeasurePoint: (point: { x: number; z: number }) => void
  clearMeasure: () => void
  commitHistory: () => void
  undo: () => void
  redo: () => void
  resetLayout: () => void
}

function cloneItems(items: PlacedItem[]): PlacedItem[] {
  return items.map((item) => ({ ...item }))
}

export const usePlanner = create<PlannerState>((set, get) => ({
  room: ROOM,
  items: createDefaultItems(),
  selectedIds: [],
  tool: 'select',
  category: 'restaurant',
  pendingCatalogId: null,
  snap: 0.1,
  snapOn: true,
  showWalls: true,
  showFurniture: true,
  showElectrical: true,
  showEgress: true,
  showDimensions: true,
  showGrid: true,
  brandColor: '#c45c32',
  floorFinish: 'oak',
  timeOfDay: 10.5,
  budgetTier: 'standard',
  budgetCap: 18000,
  jurisdiction: 'IBC',
  isDragging3d: false,
  measure: { a: null, b: null },
  past: [],
  future: [],

  select: (id, additive = false) => {
    set((state) => {
      if (!id) {
        return state.selectedIds.length ? { selectedIds: [] } : state
      }
      if (additive) {
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((x) => x !== id)
            : [...state.selectedIds, id],
        }
      }
      if (state.selectedIds.length === 1 && state.selectedIds[0] === id) return state
      return { selectedIds: [id] }
    })
  },

  setTool: (tool) =>
    set((state) =>
      state.tool === tool && !state.pendingCatalogId && !state.measure.a && !state.measure.b
        ? state
        : { tool, pendingCatalogId: null, measure: { a: null, b: null } },
    ),
  setCategory: (category) => set((state) => (state.category === category ? state : { category })),
  setPending: (catalogId) =>
    set((state) =>
      state.pendingCatalogId === catalogId && state.tool === 'select'
        ? state
        : { pendingCatalogId: catalogId, tool: 'select' },
    ),

  placeItem: (catalogId, x, z) => {
    const state = get()
    const snap = state.snapOn ? state.snap : 0
    const item: PlacedItem = {
      id: uid(),
      catalogId,
      x: snapTo(x, snap),
      z: snapTo(z, snap),
      rotation: 0,
    }
    state.commitHistory()
    set({
      items: [...state.items, item],
      selectedIds: [item.id],
      pendingCatalogId: null,
    })
  },

  moveItems: (ids, x, z, asCenterOf) => {
    const { items, snapOn, snap } = get()
    const s = snapOn ? snap : 0
    const target = asCenterOf ? items.find((it) => it.id === asCenterOf) : items.find((it) => ids.includes(it.id))
    if (!target) return
    const dx = snapTo(x, s) - target.x
    const dz = snapTo(z, s) - target.z
    set({
      items: items.map((it) =>
        ids.includes(it.id) ? { ...it, x: it.x + dx, z: it.z + dz } : it,
      ),
    })
  },

  updateItem: (id, patch) => {
    set((state) => ({
      items: state.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }))
  },

  rotateSelected: (delta) => {
    const { selectedIds, items, commitHistory } = get()
    if (!selectedIds.length) return
    commitHistory()
    set({
      items: items.map((it) =>
        selectedIds.includes(it.id) ? { ...it, rotation: it.rotation + delta } : it,
      ),
    })
  },

  deleteSelected: () => {
    const { selectedIds, items, commitHistory } = get()
    if (!selectedIds.length) return
    commitHistory()
    set({
      items: items.filter((it) => !selectedIds.includes(it.id)),
      selectedIds: [],
    })
  },

  duplicateSelected: () => {
    const { selectedIds, items, commitHistory } = get()
    if (!selectedIds.length) return
    commitHistory()
    const copies = items
      .filter((it) => selectedIds.includes(it.id))
      .map((it) => ({ ...it, id: uid(), x: it.x + 0.4, z: it.z + 0.4 }))
    set({
      items: [...items, ...copies],
      selectedIds: copies.map((c) => c.id),
    })
  },

  setFinish: (id, finish) => {
    set((state) => ({
      items: state.items.map((it) => (it.id === id ? { ...it, finish } : it)),
    }))
  },

  setBrandColor: (brandColor) => set((s) => (s.brandColor === brandColor ? s : { brandColor })),
  setFloorFinish: (floorFinish) => set((s) => (s.floorFinish === floorFinish ? s : { floorFinish })),
  setTimeOfDay: (timeOfDay) => set((s) => (s.timeOfDay === timeOfDay ? s : { timeOfDay })),
  setBudgetTier: (budgetTier) => set((s) => (s.budgetTier === budgetTier ? s : { budgetTier })),
  setJurisdiction: (jurisdiction) =>
    set((s) => (s.jurisdiction === jurisdiction ? s : { jurisdiction })),
  setFlag: (key, value) =>
    set((state) => (state[key] === value ? state : { [key]: value })),

  setMeasurePoint: (point) => {
    const { measure } = get()
    if (!measure.a) set({ measure: { a: point, b: null } })
    else if (!measure.b) set({ measure: { a: measure.a, b: point } })
    else set({ measure: { a: point, b: null } })
  },
  clearMeasure: () => set({ measure: { a: null, b: null } }),

  commitHistory: () => {
    const { items, past } = get()
    set({
      past: [...past.slice(-(HISTORY_LIMIT - 1)), cloneItems(items)],
      future: [],
    })
  },

  undo: () => {
    const { past, items, future } = get()
    const prev = past[past.length - 1]
    if (!prev) return
    set({
      items: prev,
      past: past.slice(0, -1),
      future: [...future, cloneItems(items)],
      selectedIds: [],
    })
  },

  redo: () => {
    const { future, items, past } = get()
    const next = future[future.length - 1]
    if (!next) return
    set({
      items: next,
      future: future.slice(0, -1),
      past: [...past, cloneItems(items)],
      selectedIds: [],
    })
  },

  resetLayout: () => {
    get().commitHistory()
    set({ items: createDefaultItems(), selectedIds: [], pendingCatalogId: null })
  },
}))
