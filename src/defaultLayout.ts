import type { PlacedItem, Room } from './types'
import { uid } from './geometry'

const PI = Math.PI

function item(
  catalogId: string,
  x: number,
  z: number,
  rotation = 0,
  finish?: string,
): PlacedItem {
  return { id: uid(), catalogId, x, z, rotation, finish }
}

function chairsAround(tx: number, tz: number, span = 0.62): PlacedItem[] {
  return [
    item('cafe-chair', tx, tz - span, 0),
    item('cafe-chair', tx, tz + span, PI),
    item('cafe-chair', tx - span, tz, -PI / 2),
    item('cafe-chair', tx + span, tz, PI / 2),
  ]
}

export const ROOM: Room = {
  width: 11.2,
  depth: 8.4,
  wallHeight: 3.15,
  wallThickness: 0.2,
  doors: [
    { id: 'door-main', wall: 's', offset: 1.7, width: 1.0, swing: 'left' },
    { id: 'door-service', wall: 'e', offset: 6.35, width: 0.9, swing: 'right' },
  ],
  windows: [
    { id: 'w1', wall: 'n', offset: 1.1, width: 2.2, sill: 0.9, head: 2.4 },
    { id: 'w2', wall: 'n', offset: 4.5, width: 2.2, sill: 0.9, head: 2.4 },
    { id: 'w3', wall: 'n', offset: 7.9, width: 2.2, sill: 0.9, head: 2.4 },
    { id: 'w4', wall: 'e', offset: 1.4, width: 1.8, sill: 0.9, head: 2.4 },
  ],
}

export function createDefaultItems(): PlacedItem[] {
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
