import { chairsAround, item, ROOM } from './defaultLayout'
import type { BudgetTier, Category, FloorFinish, PlacedItem, Room, WallFinish } from './types'
import { uid } from './geometry'

export interface Template {
  id: string
  name: string
  blurb: string
  occupancyGroup: string
  category: Category
  floor: FloorFinish
  wall: WallFinish
  timeOfDay: number
  budgetCap: number
  budgetTier: BudgetTier
  room: Room
  items: () => PlacedItem[]
}

function room(
  width: number,
  depth: number,
  wallHeight = 3,
  doors: Room['doors'] = [{ id: 'door-main', wall: 's', offset: Math.max(0.8, width / 2 - 0.5), width: 1, swing: 'left' }],
  windows: Room['windows'] = [
    { id: 'w1', wall: 'n', offset: 0.8, width: Math.min(2.4, width - 1.6), sill: 0.9, head: 2.4 },
  ],
): Room {
  return {
    width,
    depth,
    wallHeight,
    wallThickness: 0.2,
    doors: doors.map((d) => ({ ...d, id: d.id || uid() })),
    windows: windows.map((w) => ({ ...w, id: w.id || uid() })),
  }
}

const PI = Math.PI

export const TEMPLATES: Template[] = [
  {
    id: 'cafe',
    name: 'Café',
    blurb: 'Service bar, four-tops, banquette',
    occupancyGroup: 'A-2 Assembly',
    category: 'restaurant',
    floor: 'oak',
    wall: 'plaster',
    timeOfDay: 18.5,
    budgetCap: 18000,
    budgetTier: 'standard',
    room: ROOM,
    items: () => {
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
    },
  },
  {
    id: 'waiting',
    name: 'Waiting room',
    blurb: 'Reception + seating bay',
    occupancyGroup: 'B Business',
    category: 'healthcare',
    floor: 'terrazzo',
    wall: 'paint',
    timeOfDay: 10,
    budgetCap: 12000,
    budgetTier: 'standard',
    room: room(9.2, 6.4, 3.1, [{ id: 'd', wall: 's', offset: 3.8, width: 1.1, swing: 'left' }]),
    items: () => [
      item('reception', 1.3, 3.2, PI / 2),
      item('task-chair', 2.15, 3.2, PI / 2),
      item('waiting-chair', 4.4, 1.2),
      item('waiting-chair', 5.15, 1.2),
      item('waiting-chair', 5.9, 1.2),
      item('waiting-chair', 6.65, 1.2),
      item('waiting-chair', 7.8, 2.4, -PI / 2),
      item('waiting-chair', 7.8, 3.2, -PI / 2),
      item('waiting-chair', 7.8, 4.0, -PI / 2),
      item('coffee-table', 5.6, 2.6),
      item('planter', 8.6, 5.7),
      item('pendant', 5.6, 2.6),
    ],
  },
  {
    id: 'clinic',
    name: 'Exam room',
    blurb: 'Table, stool, storage',
    occupancyGroup: 'B Business',
    category: 'healthcare',
    floor: 'tile',
    wall: 'paint',
    timeOfDay: 11,
    budgetCap: 8000,
    budgetTier: 'standard',
    room: room(4.6, 3.8, 2.7, [{ id: 'd', wall: 's', offset: 0.4, width: 0.9, swing: 'right' }], [
      { id: 'w', wall: 'n', offset: 1.1, width: 1.6, sill: 1.0, head: 2.3 },
    ]),
    items: () => [
      item('exam-table', 2.5, 1.35),
      item('stool', 2.5, 2.35),
      item('credenza', 0.4, 1.9, PI / 2),
      item('task-chair', 3.85, 3.15),
    ],
  },
  {
    id: 'office',
    name: 'Open office',
    blurb: 'Four desks + lounge',
    occupancyGroup: 'B Business',
    category: 'office',
    floor: 'carpet',
    wall: 'plaster',
    timeOfDay: 14,
    budgetCap: 16000,
    budgetTier: 'standard',
    room: room(12, 8, 3.1),
    items: () => [
      item('desk', 2.2, 2.0),
      item('task-chair', 2.2, 2.7),
      item('desk', 5.0, 2.0),
      item('task-chair', 5.0, 2.7),
      item('desk', 2.2, 5.4),
      item('task-chair', 2.2, 4.7, PI),
      item('desk', 5.0, 5.4),
      item('task-chair', 5.0, 4.7, PI),
      item('lounge', 9.8, 1.4),
      item('coffee-table', 9.8, 2.5),
      item('credenza', 10.8, 6.8),
      item('pendant', 3.6, 3.8),
      item('pendant', 9.8, 2.2),
    ],
  },
  {
    id: 'classroom',
    name: 'Classroom',
    blurb: 'Rows, teacher wall, board',
    occupancyGroup: 'E Educational',
    category: 'education',
    floor: 'carpet',
    wall: 'paint',
    timeOfDay: 9.5,
    budgetCap: 14000,
    budgetTier: 'budget',
    room: room(10.4, 8.2, 3.2, [{ id: 'd', wall: 's', offset: 0.5, width: 1, swing: 'left' }]),
    items: () => {
      const out: PlacedItem[] = [item('whiteboard', 5.2, 0.2), item('desk', 5.2, 1.35), item('task-chair', 5.2, 2.05)]
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const x = 2.1 + c * 2.0
          const z = 3.4 + r * 1.5
          out.push(item('student-desk', x, z), item('task-chair', x, z + 0.48))
        }
      }
      return out
    },
  },
  {
    id: 'living',
    name: 'Living room',
    blurb: 'Sofa, table, lounge light',
    occupancyGroup: 'R-3 Residential',
    category: 'home',
    floor: 'walnut',
    wall: 'plaster',
    timeOfDay: 19,
    budgetCap: 10000,
    budgetTier: 'premium',
    room: room(7.2, 5.6, 2.7),
    items: () => [
      item('sofa', 3.6, 0.7),
      item('coffee-table', 3.6, 1.9),
      item('lounge', 0.7, 2.8, PI / 2),
      item('planter', 6.6, 5.0),
      item('pendant', 3.6, 1.9),
    ],
  },
  {
    id: 'hotel',
    name: 'Hotel room',
    blurb: 'Bed, nightstands, desk',
    occupancyGroup: 'R-1 Residential',
    category: 'home',
    floor: 'carpet',
    wall: 'paint',
    timeOfDay: 20,
    budgetCap: 9000,
    budgetTier: 'premium',
    room: room(5.2, 4.4, 2.6, [{ id: 'd', wall: 's', offset: 0.3, width: 0.9, swing: 'left' }], [
      { id: 'w', wall: 'n', offset: 1.4, width: 2.2, sill: 0.9, head: 2.3 },
    ]),
    items: () => [
      item('bed', 2.7, 1.35),
      item('nightstand', 1.55, 0.55),
      item('nightstand', 3.85, 0.55),
      item('desk', 1.0, 3.7),
      item('task-chair', 1.0, 3.15, PI),
    ],
  },
  {
    id: 'empty',
    name: 'Empty room',
    blurb: 'Set the envelope, then furnish',
    occupancyGroup: 'B Business',
    category: 'office',
    floor: 'concrete',
    wall: 'plaster',
    timeOfDay: 12,
    budgetCap: 12000,
    budgetTier: 'standard',
    room: room(8, 6, 3),
    items: () => [],
  },
]

export function templateById(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}
