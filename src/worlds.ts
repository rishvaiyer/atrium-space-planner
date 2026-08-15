import type { Category, FloorFinish } from './types'

export type WorldId = 'earth' | 'moon' | 'mars' | 'titan'

export interface World {
  id: WorldId
  name: string
  tag: string
  gravityG: number
  atmosphereKpa: number
  meanK: number
  dayHours: number
  sky: string
  fogFar: number
  hemiSky: string
  hemiGround: string
  brand: string
  floor: FloorFinish
  timeOfDay: number
  budgetCap: number
  catalog: Category
  occupancyGroup: string
  crewTarget: number
  solarFactor: number
  radiation: 'low' | 'high' | 'extreme'
  padUsdM2: { budget: number; standard: number; premium: number }
}

export const WORLDS: World[] = [
  {
    id: 'earth',
    name: 'Earth',
    tag: 'Studio',
    gravityG: 1,
    atmosphereKpa: 101.3,
    meanK: 288,
    dayHours: 24,
    sky: '#151a22',
    fogFar: 38,
    hemiSky: '#d5e4f5',
    hemiGround: '#2a313c',
    brand: '#3b82f6',
    floor: 'concrete',
    timeOfDay: 18.5,
    budgetCap: 18000,
    catalog: 'restaurant',
    occupancyGroup: 'A-2 Assembly',
    crewTarget: 22,
    solarFactor: 1,
    radiation: 'low',
    padUsdM2: { budget: 18, standard: 32, premium: 54 },
  },
  {
    id: 'moon',
    name: 'Moon',
    tag: 'Mare Imbrium',
    gravityG: 0.165,
    atmosphereKpa: 0,
    meanK: 250,
    dayHours: 708,
    sky: '#04060a',
    fogFar: 80,
    hemiSky: '#9aa8c4',
    hemiGround: '#1a1c20',
    brand: '#d7dde6',
    floor: 'concrete',
    timeOfDay: 12,
    budgetCap: 420000,
    catalog: 'habitat',
    occupancyGroup: 'Surface habitat',
    crewTarget: 4,
    solarFactor: 1,
    radiation: 'extreme',
    padUsdM2: { budget: 220, standard: 380, premium: 620 },
  },
  {
    id: 'mars',
    name: 'Mars',
    tag: 'Jezero crater',
    gravityG: 0.38,
    atmosphereKpa: 0.6,
    meanK: 210,
    dayHours: 24.6,
    sky: '#1a1410',
    fogFar: 48,
    hemiSky: '#e8b48a',
    hemiGround: '#4a2c22',
    brand: '#ff8b6a',
    floor: 'tile',
    timeOfDay: 16,
    budgetCap: 380000,
    catalog: 'habitat',
    occupancyGroup: 'Surface habitat',
    crewTarget: 6,
    solarFactor: 0.43,
    radiation: 'high',
    padUsdM2: { budget: 180, standard: 310, premium: 520 },
  },
  {
    id: 'titan',
    name: 'Titan',
    tag: 'Xanadu coast',
    gravityG: 0.14,
    atmosphereKpa: 146.7,
    meanK: 94,
    dayHours: 382,
    sky: '#120e18',
    fogFar: 32,
    hemiSky: '#c4b8a0',
    hemiGround: '#2a2430',
    brand: '#c4b5fd',
    floor: 'terrazzo',
    timeOfDay: 9,
    budgetCap: 510000,
    catalog: 'habitat',
    occupancyGroup: 'Cryogenic habitat',
    crewTarget: 4,
    solarFactor: 0.01,
    radiation: 'low',
    padUsdM2: { budget: 260, standard: 440, premium: 780 },
  },
]

export const WORLD_BY_ID: Record<WorldId, World> = Object.fromEntries(
  WORLDS.map((world) => [world.id, world]),
) as Record<WorldId, World>

export function worldOf(id: WorldId): World {
  return WORLD_BY_ID[id]
}
