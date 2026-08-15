import { create } from 'zustand'
import { layoutForWorld, ROOM } from './defaultLayout'
import { clamp, snapTo, uid } from './geometry'
import type {
  BudgetTier,
  CameraMode,
  Category,
  FloorFinish,
  Jurisdiction,
  Note,
  PlacedItem,
  Room,
  Tool,
  WallFinish,
} from './types'
import type { WorldId } from './worlds'
import { worldOf } from './worlds'
import type { ProjectFile } from './project'
import { templateById } from './templates'

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
  showLabels: boolean
  showNotes: boolean
  showOpenings: boolean
  showOccupancy: boolean
  showLighting: boolean
  brandColor: string
  floorFinish: FloorFinish
  wallFinish: WallFinish
  timeOfDay: number
  budgetTier: BudgetTier
  budgetCap: number
  jurisdiction: Jurisdiction
  worldId: WorldId
  isDragging3d: boolean
  measure: { a: { x: number; z: number } | null; b: { x: number; z: number } | null }
  notes: Note[]
  past: PlacedItem[][]
  future: PlacedItem[][]
  projectName: string
  templateId: string
  occupancyGroup: string
  showLibrary: boolean
  showSpec: boolean
  focusMode: boolean
  cameraMode: CameraMode
  viewEpoch: number
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
  setWallFinish: (wallFinish: WallFinish) => void
  cycleSnap: () => void
  stampAt: (x: number, z: number) => void
  addNote: (x: number, z: number) => void
  removeNote: (id: string) => void
  setTimeOfDay: (timeOfDay: number) => void
  setBudgetTier: (budgetTier: BudgetTier) => void
  setJurisdiction: (jurisdiction: Jurisdiction) => void
  setWorld: (worldId: WorldId) => void
  setFlag: (
    key:
      | 'showWalls'
      | 'showFurniture'
      | 'showElectrical'
      | 'showEgress'
      | 'showDimensions'
      | 'showGrid'
      | 'showLabels'
      | 'showNotes'
      | 'showOpenings'
      | 'showOccupancy'
      | 'showLighting'
      | 'snapOn'
      | 'isDragging3d'
      | 'showLibrary'
      | 'showSpec'
      | 'focusMode',
    value: boolean,
  ) => void
  setProjectName: (projectName: string) => void
  setCameraMode: (cameraMode: CameraMode) => void
  setRoom: (patch: Partial<Pick<Room, 'width' | 'depth' | 'wallHeight'>>) => void
  loadTemplate: (id: string) => void
  toProject: () => ProjectFile
  applyProject: (file: ProjectFile) => void
  fitView: () => void
  nudgeSelected: (dx: number, dz: number) => void
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
  items: layoutForWorld('earth'),
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
  showLabels: false,
  showNotes: true,
  showOpenings: true,
  showOccupancy: false,
  showLighting: true,
  brandColor: '#3b82f6',
  floorFinish: 'oak',
  wallFinish: 'plaster',
  timeOfDay: 18.5,
  budgetTier: 'standard',
  budgetCap: 18000,
  jurisdiction: 'IBC',
  worldId: 'earth',
  isDragging3d: false,
  measure: { a: null, b: null },
  notes: [],
  past: [],
  future: [],
  projectName: 'Café',
  templateId: 'cafe',
  occupancyGroup: 'A-2 Assembly',
  showLibrary: true,
  showSpec: true,
  focusMode: false,
  cameraMode: 'orbit',
  viewEpoch: 0,

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
  setWallFinish: (wallFinish) => set((s) => (s.wallFinish === wallFinish ? s : { wallFinish })),
  cycleSnap: () =>
    set((s) => {
      const next = s.snap === 0.05 ? 0.1 : s.snap === 0.1 ? 0.2 : 0.05
      return { snap: next, snapOn: true }
    }),
  stampAt: (x, z) => {
    const { selectedIds, items, commitHistory, snapOn, snap } = get()
    const sel = items.filter((it) => selectedIds.includes(it.id))
    if (!sel.length) return
    commitHistory()
    const origin = sel[0]
    const sx = snapOn ? snapTo(x, snap) : x
    const sz = snapOn ? snapTo(z, snap) : z
    const copies = sel.map((it) => ({
      ...it,
      id: uid(),
      x: sx + (it.x - origin.x),
      z: sz + (it.z - origin.z),
    }))
    set({
      items: [...get().items, ...copies],
      selectedIds: copies.map((c) => c.id),
    })
  },
  addNote: (x, z) => {
    const { notes, snapOn, snap } = get()
    set({
      notes: [
        ...notes,
        {
          id: uid(),
          x: snapOn ? snapTo(x, snap) : x,
          z: snapOn ? snapTo(z, snap) : z,
          text: `N${notes.length + 1}`,
        },
      ],
    })
  },
  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  setTimeOfDay: (timeOfDay) => set((s) => (s.timeOfDay === timeOfDay ? s : { timeOfDay })),
  setBudgetTier: (budgetTier) => set((s) => (s.budgetTier === budgetTier ? s : { budgetTier })),
  setJurisdiction: (jurisdiction) =>
    set((s) => (s.jurisdiction === jurisdiction ? s : { jurisdiction })),
  setWorld: (worldId) => {
    const current = get()
    if (current.worldId === worldId) return
    const world = worldOf(worldId)
    current.commitHistory()
    set({
      worldId,
      items: layoutForWorld(worldId),
      selectedIds: [],
      pendingCatalogId: null,
      category: world.catalog,
      brandColor: world.brand,
      floorFinish: world.floor,
      timeOfDay: world.timeOfDay,
      budgetCap: world.budgetCap,
    })
  },
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
    const { templateId, commitHistory } = get()
    commitHistory()
    get().loadTemplate(templateId)
  },

  setProjectName: (projectName) => set((s) => (s.projectName === projectName ? s : { projectName })),
  setCameraMode: (cameraMode) => set((s) => (s.cameraMode === cameraMode ? s : { cameraMode })),
  fitView: () => set((s) => ({ viewEpoch: s.viewEpoch + 1 })),
  setRoom: (patch) =>
    set((s) => {
      const width = clamp(patch.width ?? s.room.width, 3, 28)
      const depth = clamp(patch.depth ?? s.room.depth, 3, 22)
      const wallHeight = clamp(patch.wallHeight ?? s.room.wallHeight, 2.2, 6)
      if (width === s.room.width && depth === s.room.depth && wallHeight === s.room.wallHeight) return s
      return { room: { ...s.room, width, depth, wallHeight }, viewEpoch: s.viewEpoch + 1 }
    }),
  nudgeSelected: (dx, dz) => {
    const { selectedIds, items, snap } = get()
    if (!selectedIds.length) return
    set({
      items: items.map((it) =>
        selectedIds.includes(it.id) ? { ...it, x: it.x + dx * snap, z: it.z + dz * snap } : it,
      ),
    })
  },
  loadTemplate: (id) => {
    const t = templateById(id)
    get().commitHistory()
    set((s) => ({
      templateId: t.id,
      projectName: t.name,
      occupancyGroup: t.occupancyGroup,
      room: t.room,
      items: t.items(),
      notes: [],
      category: t.category,
      floorFinish: t.floor,
      wallFinish: t.wall,
      timeOfDay: t.timeOfDay,
      budgetCap: t.budgetCap,
      budgetTier: t.budgetTier,
      selectedIds: [],
      pendingCatalogId: null,
      worldId: 'earth',
      viewEpoch: s.viewEpoch + 1,
    }))
  },
  toProject: () => {
    const s = get()
    return {
      version: 1 as const,
      name: s.projectName,
      templateId: s.templateId,
      occupancyGroup: s.occupancyGroup,
      room: s.room,
      items: s.items,
      notes: s.notes,
      brandColor: s.brandColor,
      floorFinish: s.floorFinish,
      wallFinish: s.wallFinish,
      timeOfDay: s.timeOfDay,
      budgetTier: s.budgetTier,
      budgetCap: s.budgetCap,
      jurisdiction: s.jurisdiction,
      category: s.category,
    }
  },
  applyProject: (file) => {
    get().commitHistory()
    set((s) => ({
      projectName: file.name,
      templateId: file.templateId,
      occupancyGroup: file.occupancyGroup,
      room: file.room,
      items: file.items,
      notes: file.notes ?? [],
      brandColor: file.brandColor,
      floorFinish: file.floorFinish,
      wallFinish: file.wallFinish,
      timeOfDay: file.timeOfDay,
      budgetTier: file.budgetTier,
      budgetCap: file.budgetCap,
      jurisdiction: file.jurisdiction,
      category: file.category,
      selectedIds: [],
      pendingCatalogId: null,
      worldId: 'earth',
      viewEpoch: s.viewEpoch + 1,
    }))
  },
}))
