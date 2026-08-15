import type { PlacedItem, Room } from './types'
import { uid } from './geometry'
import { boxRoom } from './walls'

const PI = Math.PI

export function item(
  catalogId: string,
  x: number,
  z: number,
  rotation = 0,
  finish?: string,
): PlacedItem {
  return { id: uid(), catalogId, x, z, rotation, finish }
}

export function chairsAround(tx: number, tz: number, span = 0.62): PlacedItem[] {
  return [
    item('cafe-chair', tx, tz - span, 0),
    item('cafe-chair', tx, tz + span, PI),
    item('cafe-chair', tx - span, tz, -PI / 2),
    item('cafe-chair', tx + span, tz, PI / 2),
  ]
}

export const ROOM: Room = boxRoom(
  11.2,
  8.4,
  3.15,
  [
    { id: 'door-main', wallId: 's', offset: 1.7, width: 1.0, swing: 'left' },
    { id: 'door-service', wallId: 'e', offset: 6.35, width: 0.9, swing: 'right' },
  ],
  [
    { id: 'w1', wallId: 'n', offset: 1.1, width: 2.2, sill: 0.9, head: 2.4 },
    { id: 'w2', wallId: 'n', offset: 4.5, width: 2.2, sill: 0.9, head: 2.4 },
    { id: 'w3', wallId: 'n', offset: 7.9, width: 2.2, sill: 0.9, head: 2.4 },
    { id: 'w4', wallId: 'e', offset: 1.4, width: 1.8, sill: 0.9, head: 2.4 },
  ],
)

export function createDefaultItems(): PlacedItem[] {
  return earthItems()
}

export function layoutForWorld(worldId: 'earth' | 'moon' | 'mars' | 'titan'): PlacedItem[] {
  if (worldId === 'moon') return moonItems()
  if (worldId === 'mars') return marsItems()
  if (worldId === 'titan') return titanItems()
  return earthItems()
}

function earthItems(): PlacedItem[] {
  const t1 = { x: 4.05, z: 2.55 }
  const t2 = { x: 6.55, z: 2.55 }
  const t3 = { x: 4.05, z: 5.55 }

  return [
    item('espresso-bar', 0.46, 4.15, PI / 2),
    item('stool', 1.18, 2.95, PI / 2),
    item('stool', 1.18, 3.7, PI / 2),
    item('stool', 1.18, 4.45, PI / 2),
    item('stool', 1.18, 5.2, PI / 2),
    item('fridge', 0.5, 7.65, PI / 2),
    item('host-stand', 2.55, 0.62, 0),
    item('planter', 0.55, 1.15),
    item('table-4', t1.x, t1.z),
    ...chairsAround(t1.x, t1.z),
    item('table-4', t2.x, t2.z),
    ...chairsAround(t2.x, t2.z),
    item('table-4', t3.x, t3.z),
    ...chairsAround(t3.x, t3.z),
    item('banquette', 8.85, 7.95, 0),
    item('table-2', 8.85, 6.95),
    item('cafe-chair', 8.35, 6.45, PI / 4),
    item('cafe-chair', 9.35, 6.45, -PI / 4),
    item('pendant', 0.95, 3.7),
    item('pendant', 0.95, 4.6),
    item('pendant', t1.x, t1.z),
    item('pendant', t2.x, t2.z),
    item('pendant', t3.x, t3.z),
    item('pendant', 8.85, 7.2),
  ]
}

function marsItems(): PlacedItem[] {
  return [
    item('airlock', 1.2, 1.15, 0),
    item('hab-mod', 3.6, 2.2),
    item('hab-mod', 6.2, 2.2),
    item('rad-shelter', 9.1, 2.15),
    item('eclss', 3.5, 4.7),
    item('greenhouse', 7.0, 5.1, 0),
    item('isru', 1.4, 6.6, PI / 2),
    item('solar-array', 5.4, 7.45),
    item('solar-array', 9.0, 7.45),
  ]
}

function moonItems(): PlacedItem[] {
  return [
    item('airlock', 1.3, 1.2),
    item('hab-mod', 3.8, 2.3),
    item('rad-shelter', 6.6, 2.3),
    item('eclss', 9.2, 2.2),
    item('hab-mod', 4.0, 5.2),
    item('solar-array', 7.6, 6.9),
    item('solar-array', 7.6, 7.7),
  ]
}

function titanItems(): PlacedItem[] {
  return [
    item('airlock', 1.25, 1.2),
    item('hab-mod', 3.7, 2.4),
    item('hab-mod', 6.4, 2.4),
    item('greenhouse', 4.8, 5.2),
    item('eclss', 8.6, 5.0),
    item('rtg', 1.5, 6.8),
    item('isru', 9.4, 7.0, PI / 2),
  ]
}
