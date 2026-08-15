import type { BudgetTier, Category, FloorFinish, Jurisdiction, Note, PlacedItem, Room, WallFinish } from './types'
import type { PortableGlb } from './glbLibrary'
import { migrateRoom } from './walls'

export const PROJECT_KEY = 'atrium-project-v1'

export interface ProjectFile {
  version: 1
  name: string
  templateId: string
  occupancyGroup: string
  room: Room
  items: PlacedItem[]
  notes: Note[]
  brandColor: string
  floorFinish: FloorFinish
  wallFinish: WallFinish
  timeOfDay: number
  budgetTier: BudgetTier
  budgetCap: number
  jurisdiction: Jurisdiction
  category: Category
  /** Embedded / remote GLBs so the file opens on another machine. */
  glbAssets?: PortableGlb[]
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function readProjectFile(raw: string): ProjectFile | null {
  try {
    const data = JSON.parse(raw) as ProjectFile
    if (data?.version !== 1 || !data.room || !Array.isArray(data.items)) return null
    data.room = migrateRoom(data.room)
    return data
  } catch {
    return null
  }
}
