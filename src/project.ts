import type { CostSettings } from './pricing'
import { catalogItem } from './catalog'
import type {
  BudgetTier,
  Category,
  FloorFinish,
  Jurisdiction,
  Note,
  PlacedItem,
  Room,
  WallFinish,
} from './types'
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
  costSettings?: CostSettings
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
    if (
      data?.version !== 1 ||
      typeof data.name !== 'string' ||
      !data.room ||
      !Array.isArray(data.items) ||
      (data.notes != null && !Array.isArray(data.notes)) ||
      (data.glbAssets != null && !Array.isArray(data.glbAssets))
    )
      return null
    const room = migrateRoom(data.room)
    if (
      ![room.width, room.depth, room.wallHeight, room.wallThickness].every(Number.isFinite) ||
      !data.items.every(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.catalogId === 'string' &&
          [item.x, item.z, item.rotation].every(Number.isFinite),
      )
    )
      return null
    if (room.width <= 0 || room.depth <= 0 || room.wallHeight <= 0 || room.width > 100 || room.depth > 100)
      return null
    for (const item of data.items) {
      catalogItem(item.catalogId)
      if ([item.w, item.d, item.h].some((value) => value != null && (!Number.isFinite(value) || value <= 0)))
        return null
      if (
        item.unitPrice != null &&
        (!Number.isFinite(item.unitPrice) || item.unitPrice < 0 || item.unitPrice > 10000000)
      )
        return null
      if (item.quoteReference != null && typeof item.quoteReference !== 'string') return null
      if (item.finish != null && typeof item.finish !== 'string') return null
    }
    data.room = room
    data.templateId = typeof data.templateId === 'string' ? data.templateId : 'empty'
    data.occupancyGroup = typeof data.occupancyGroup === 'string' ? data.occupancyGroup : 'B Business'
    data.notes = data.notes ?? []
    data.brandColor = typeof data.brandColor === 'string' ? data.brandColor : '#637353'
    if (
      ![
        'oak',
        'walnut',
        'herringbone',
        'terrazzo',
        'marble',
        'concrete',
        'tile',
        'slate',
        'carpet',
        'checker',
      ].includes(data.floorFinish)
    )
      data.floorFinish = 'oak'
    if (!['plaster', 'paint', 'brick', 'wood', 'concrete', 'tile'].includes(data.wallFinish))
      data.wallFinish = 'plaster'
    if (!['budget', 'standard', 'premium'].includes(data.budgetTier)) data.budgetTier = 'standard'
    if (!['IBC', 'NBC', 'Eurocode'].includes(data.jurisdiction)) data.jurisdiction = 'IBC'
    if (
      !['restaurant', 'office', 'retail', 'healthcare', 'home', 'education', 'habitat'].includes(
        data.category,
      )
    )
      data.category = 'restaurant'
    if (!Number.isFinite(data.timeOfDay)) data.timeOfDay = 14
    if (!Number.isFinite(data.budgetCap) || data.budgetCap < 0) data.budgetCap = 18000
    if (
      data.costSettings &&
      (!Number.isFinite(data.costSettings.setupAllowance) ||
        data.costSettings.setupAllowance < 0 ||
        !Number.isFinite(data.costSettings.contingencyPct) ||
        data.costSettings.contingencyPct < 0 ||
        data.costSettings.contingencyPct > 100)
    )
      return null
    if (data.costSettings?.floorRate != null && (!Number.isFinite(data.costSettings.floorRate) || data.costSettings.floorRate < 0)) return null
    return data
  } catch {
    return null
  }
}
