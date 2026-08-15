import { create } from 'zustand'
import { catalogItem } from './catalog'
import { layoutForWorld, ROOM } from './defaultLayout'
import { clamp, snapTo, uid } from './geometry'
import type {
  ArchSel,
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
import {
  cloneRoom,
  insertWall,
  migrateRoom,
  nearestWall,
  reshapeBox,
  wallLen,
  withBounds,
} from './walls'

const HISTORY_LIMIT = 40

interface Snapshot {
  items: PlacedItem[]
  room: Room
  notes: Note[]
}

function cloneItems(items: PlacedItem[]): PlacedItem[] {
  return items.map((item) => ({ ...item }))
}

function snapState(items: PlacedItem[], room: Room, notes: Note[]): Snapshot {
  return { items: cloneItems(items), room: cloneRoom(room), notes: notes.map((n) => ({ ...n })) }
}

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
  past: Snapshot[]
  future: Snapshot[]
  wallStart: { x: number; z: number } | null
  selectedArch: ArchSel | null
  projectName: string
  templateId: string
  occupancyGroup: string
  showLibrary: boolean
  showSpec: boolean
  focusMode: boolean
  cameraMode: CameraMode
  viewEpoch: number
  select: (id: string | null, additive?: boolean) => void
  selectMany: (ids: string[]) => void
  setTool: (tool: Tool) => void
  setCategory: (category: Category) => void
  setPending: (catalogId: string | null) => void
  placeItem: (catalogId: string, x: number, z: number, keepPending?: boolean) => void
  moveItems: (ids: string[], x: number, z: number, asCenterOf?: string) => void
  updateItem: (id: string, patch: Partial<PlacedItem>) => void
  rotateSelected: (delta: number) => void
  setItemRotation: (id: string, rotation: number) => void
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
  nudgeSelected: (dx: number, dz: number, fine?: boolean) => void
  selectArch: (sel: ArchSel | null) => void
  addWall: (ax: number, az: number, bx: number, bz: number) => void
  setWallStart: (pt: { x: number; z: number } | null) => void
  placeOpening: (kind: 'door' | 'window', x: number, z: number) => void
  renameSpace: (id: string, name: string) => void
  setMeasurePoint: (point: { x: number; z: number }) => void
  clearMeasure: () => void
  commitHistory: () => void
  undo: () => void
  redo: () => void
  resetLayout: () => void
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
  wallStart: null,
  selectedArch: null,
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
        const next: Partial<PlannerState> = {}
        if (state.selectedIds.length) next.selectedIds = []
        if (state.selectedArch) next.selectedArch = null
        return Object.keys(next).length ? next : state
      }
      if (additive) {
        return {
          selectedArch: null,
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((x) => x !== id)
            : [...state.selectedIds, id],
        }
      }
      if (state.selectedIds.length === 1 && state.selectedIds[0] === id && !state.selectedArch) return state
      return { selectedIds: [id], selectedArch: null }
    })
  },
  selectMany: (ids) => set({ selectedIds: ids, selectedArch: null }),

  setTool: (tool) =>
    set((state) =>
      state.tool === tool && !state.pendingCatalogId && !state.measure.a && !state.measure.b && !state.wallStart
        ? state
        : { tool, pendingCatalogId: null, measure: { a: null, b: null }, wallStart: null },
    ),
  setCategory: (category) => set((state) => (state.category === category ? state : { category })),
  setPending: (catalogId) =>
    set((state) =>
      state.pendingCatalogId === catalogId && state.tool === 'select'
        ? state
        : { pendingCatalogId: catalogId, tool: 'select' },
    ),

  placeItem: (catalogId, x, z, keepPending = false) => {
    const state = get()
    const snap = state.snapOn ? state.snap : 0
    const def = catalogItem(catalogId)
    const remote = def.glbUrl && !def.glbUrl.startsWith('blob:') ? def.glbUrl : undefined
    const item: PlacedItem = {
      id: uid(),
      catalogId,
      x: snapTo(x, snap),
      z: snapTo(z, snap),
      rotation: 0,
      glbUrl: remote,
      w: def.glbUrl ? def.w : undefined,
      d: def.glbUrl ? def.d : undefined,
      h: def.glbUrl ? def.h : undefined,
    }
    state.commitHistory()
    set({
      items: [...state.items, item],
      selectedIds: [item.id],
      pendingCatalogId: keepPending ? catalogId : null,
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

  setItemRotation: (id, rotation) => {
    set((state) => ({
      items: state.items.map((it) => (it.id === id ? { ...it, rotation } : it)),
    }))
  },

  deleteSelected: () => {
    const { selectedIds, selectedArch, items, room, commitHistory } = get()
    if (selectedArch) {
      commitHistory()
      if (selectedArch.kind === 'wall') {
        set({
          room: withBounds({
            ...room,
            walls: room.walls.filter((w) => w.id !== selectedArch.id),
            doors: room.doors.filter((d) => d.wallId !== selectedArch.id),
            windows: room.windows.filter((w) => w.wallId !== selectedArch.id),
          }),
          selectedArch: null,
          viewEpoch: get().viewEpoch + 1,
        })
        return
      }
      if (selectedArch.kind === 'door') {
        set({ room: { ...room, doors: room.doors.filter((d) => d.id !== selectedArch.id) }, selectedArch: null })
        return
      }
      if (selectedArch.kind === 'window') {
        set({ room: { ...room, windows: room.windows.filter((w) => w.id !== selectedArch.id) }, selectedArch: null })
        return
      }
      set({ selectedArch: null })
      return
    }
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
    get().commitHistory()
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
    const { notes, snapOn, snap, commitHistory } = get()
    commitHistory()
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
  removeNote: (id) => {
    get().commitHistory()
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
  },
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
    const { items, room, notes, past } = get()
    set({
      past: [...past.slice(-(HISTORY_LIMIT - 1)), snapState(items, room, notes)],
      future: [],
    })
  },

  undo: () => {
    const { past, items, room, notes, future } = get()
    const prev = past[past.length - 1]
    if (!prev) return
    set({
      items: prev.items,
      room: prev.room,
      notes: prev.notes,
      past: past.slice(0, -1),
      future: [...future, snapState(items, room, notes)],
      selectedIds: [],
      selectedArch: null,
    })
  },

  redo: () => {
    const { future, items, room, notes, past } = get()
    const next = future[future.length - 1]
    if (!next) return
    set({
      items: next.items,
      room: next.room,
      notes: next.notes,
      future: future.slice(0, -1),
      past: [...past, snapState(items, room, notes)],
      selectedIds: [],
      selectedArch: null,
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
  setRoom: (patch) => {
    const s = get()
    const width = clamp(patch.width ?? s.room.width, 3, 28)
    const depth = clamp(patch.depth ?? s.room.depth, 3, 22)
    const wallHeight = clamp(patch.wallHeight ?? s.room.wallHeight, 2.2, 6)
    if (width === s.room.width && depth === s.room.depth && wallHeight === s.room.wallHeight) return
    s.commitHistory()
    const room = reshapeBox({ ...s.room, wallHeight }, width, depth)
    set({ room: { ...room, wallHeight }, viewEpoch: s.viewEpoch + 1 })
  },
  nudgeSelected: (dx, dz, fine = false) => {
    const { selectedIds, items, snap, commitHistory } = get()
    if (!selectedIds.length) return
    commitHistory()
    const step = fine ? 0.02 : snap
    set({
      items: items.map((it) =>
        selectedIds.includes(it.id) ? { ...it, x: it.x + dx * step, z: it.z + dz * step } : it,
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
      wallStart: null,
      selectedArch: null,
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
      room: migrateRoom(file.room),
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
      wallStart: null,
      selectedArch: null,
      worldId: 'earth',
      viewEpoch: s.viewEpoch + 1,
    }))
  },
  selectArch: (sel) => set({ selectedArch: sel, selectedIds: sel ? [] : get().selectedIds }),
  setWallStart: (pt) => set({ wallStart: pt }),
  addWall: (ax, az, bx, bz) => {
    if (Math.hypot(bx - ax, bz - az) < 0.35) return
    const { room, commitHistory } = get()
    commitHistory()
    const next = insertWall(room, ax, az, bx, bz)
    set({
      room: next.room,
      wallStart: { x: bx, z: bz },
      selectedArch: { kind: 'wall', id: next.id },
      viewEpoch: get().viewEpoch + 1,
    })
  },
  renameSpace: (id, name) =>
    set((s) => ({
      room: {
        ...s.room,
        spaces: s.room.spaces.map((sp) => (sp.id === id ? { ...sp, name } : sp)),
      },
    })),
  placeOpening: (kind, x, z) => {
    const { room, commitHistory } = get()
    const hit = nearestWall(room.walls, x, z, 0.75)
    if (!hit) return
    const width = kind === 'door' ? 0.9 : 1.6
    const len = wallLen(hit.wall)
    if (len < width + 0.2) return
    const offset = clamp(hit.offset - width / 2, 0.08, len - width - 0.08)
    commitHistory()
    if (kind === 'door') {
      const door = { id: uid(), wallId: hit.wall.id, offset, width, swing: 'left' as const }
      set({
        room: { ...room, doors: [...room.doors, door] },
        selectedArch: { kind: 'door', id: door.id },
      })
      return
    }
    const win = { id: uid(), wallId: hit.wall.id, offset, width, sill: 0.9, head: 2.3 }
    set({
      room: { ...room, windows: [...room.windows, win] },
      selectedArch: { kind: 'window', id: win.id },
    })
  },
}))
