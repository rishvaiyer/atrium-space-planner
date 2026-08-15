import { usePlanner } from '../store'
import { Icon } from './Icon'

const LAYERS = [
  ['showWalls', 'Walls'],
  ['showOpenings', 'Doors'],
  ['showFurniture', 'Fixtures'],
  ['showLighting', 'Lights'],
  ['showElectrical', 'Power'],
  ['showEgress', 'Egress'],
  ['showOccupancy', 'Seats'],
  ['showLabels', 'Labels'],
  ['showNotes', 'Notes'],
  ['showDimensions', 'Dims'],
  ['showGrid', 'Grid'],
] as const

export function CanvasDock() {
  const snapOn = usePlanner((s) => s.snapOn)
  const snap = usePlanner((s) => s.snap)
  const walls = usePlanner((s) => s.showWalls)
  const openings = usePlanner((s) => s.showOpenings)
  const furniture = usePlanner((s) => s.showFurniture)
  const lighting = usePlanner((s) => s.showLighting)
  const electrical = usePlanner((s) => s.showElectrical)
  const egress = usePlanner((s) => s.showEgress)
  const occupancy = usePlanner((s) => s.showOccupancy)
  const labels = usePlanner((s) => s.showLabels)
  const notes = usePlanner((s) => s.showNotes)
  const dims = usePlanner((s) => s.showDimensions)
  const grid = usePlanner((s) => s.showGrid)

  const layerOn: Record<(typeof LAYERS)[number][0], boolean> = {
    showWalls: walls,
    showOpenings: openings,
    showFurniture: furniture,
    showLighting: lighting,
    showElectrical: electrical,
    showEgress: egress,
    showOccupancy: occupancy,
    showLabels: labels,
    showNotes: notes,
    showDimensions: dims,
    showGrid: grid,
  }

  return (
    <div className="canvas-dock">
      <button type="button" className={`snap ${snapOn ? 'on' : ''}`} onClick={() => usePlanner.getState().cycleSnap()}>
        <Icon name="snap" />
        Snap {Math.round(snap * 1000)} mm
      </button>
      <div className="dock-layers">
        {LAYERS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={layerOn[k] ? 'on' : ''}
            onClick={() => usePlanner.getState().setFlag(k, !layerOn[k])}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
