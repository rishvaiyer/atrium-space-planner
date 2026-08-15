import { catalogItem, sitHeightOf, worldUse } from './catalog'
import { itemDims } from './geometry'
import { polygonArea } from './spaces'
import type { PlacedItem, Room } from './types'
import { pointOnWall, wallById } from './walls'

export function toPlaceExport(options: {
  name: string
  occupancyGroup: string
  room: Room
  items: PlacedItem[]
}) {
  const { name, occupancyGroup, room, items } = options
  return {
    kind: 'atrium-place' as const,
    name,
    occupancyGroup,
    meters: { width: room.width, depth: room.depth, height: room.wallHeight },
    spaces: room.spaces.map((sp) => ({
      id: sp.id,
      name: sp.name,
      polygon: sp.polygon,
      area: Math.abs(polygonArea(sp.polygon)),
    })),
    walls: room.walls,
    doors: room.doors.map((door) => {
      const wall = wallById(room, door.wallId)
      const mid = wall ? pointOnWall(wall, door.offset + door.width / 2) : { x: 0, z: 0 }
      return { id: door.id, ...mid, width: door.width, wallId: door.wallId }
    }),
    props: items.map((it) => {
      const def = catalogItem(it.catalogId)
      const { w, d, h } = itemDims(it)
      const use = worldUse(def)
      const slots = use === 'sit' || use === 'sleep' ? Math.max(1, def.seats || 1) : 0
      return {
        id: it.id,
        catalogId: it.catalogId,
        name: def.name,
        x: it.x,
        y: 0,
        z: it.z,
        yaw: it.rotation,
        w,
        d,
        h,
        color: it.finish ?? null,
        texture: it.texture ?? null,
        extra: it.extra ?? null,
        glbUrl: def.glbUrl && !def.glbUrl.startsWith('blob:') ? def.glbUrl : it.glbUrl ?? null,
        use,
        sittable: use === 'sit',
        sleepable: use === 'sleep',
        sitHeight: sitHeightOf(def),
        seats: slots,
      }
    }),
  }
}
