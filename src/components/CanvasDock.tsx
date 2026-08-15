import { usePlanner } from '../store'
import { Icon } from './Icon'
import { tip } from './tipAttrs'

const LAYERS = [
  ['showWalls', 'Walls', 'Show or hide walls'],
  ['showOpenings', 'Openings', 'Show or hide doors and windows'],
  ['showFurniture', 'Fixtures', 'Show or hide furniture'],
  ['showLighting', 'Lights', 'Show or hide lights'],
  ['showElectrical', 'Power', 'Show or hide power marks'],
  ['showEgress', 'Egress', 'Show exit paths'],
  ['showOccupancy', 'Seats', 'Mark seats on the plan'],
  ['showLabels', 'Labels', 'Name each fixture on the plan'],
  ['showNotes', 'Notes', 'Show or hide notes'],
  ['showDimensions', 'Dims', 'Show room dimensions'],
  ['showGrid', 'Grid', 'Show the snap grid'],
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
      <button
        type="button"
        className={`snap ${snapOn ? 'on' : ''}`}
        {...tip('Cycle grid snap: 50 / 100 / 200 mm')}
        onClick={() => usePlanner.getState().cycleSnap()}
      >
        <Icon name="snap" />
        Snap {Math.round(snap * 1000)} mm
      </button>
      <button type="button" {...tip('Fit the plan to the room', 'F')} onClick={() => usePlanner.getState().fitView()}>
        Fit plan
      </button>
      <div className="dock-layers">
        {LAYERS.map(([k, label, hint]) => (
          <button
            key={k}
            type="button"
            className={layerOn[k] ? 'on' : ''}
            {...tip(hint)}
            onClick={() => usePlanner.getState().setFlag(k, !layerOn[k])}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
