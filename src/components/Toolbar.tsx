import { usePlanner } from '../store'
import type { Tool } from '../types'

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'pan', label: 'Pan' },
  { id: 'measure', label: 'Measure' },
  { id: 'paint', label: 'Paint' },
  { id: 'stamp', label: 'Stamp' },
  { id: 'note', label: 'Note' },
]

const LAYERS = [
  ['showWalls', 'Walls'],
  ['showOpenings', 'Openings'],
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

export function Toolbar({ compact = false }: { compact?: boolean }) {
  const tool = usePlanner((s) => s.tool)
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
    <footer className="toolbar">
      <div className="cluster">
        {(compact ? TOOLS.filter((t) => t.id !== 'stamp') : TOOLS).map((t) => (
          <button
            key={t.id}
            className={tool === t.id ? 'on' : ''}
            onClick={() => usePlanner.getState().setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button onClick={() => usePlanner.getState().rotateSelected(Math.PI / 2)}>Rotate</button>
        <button onClick={() => usePlanner.getState().duplicateSelected()}>Copy</button>
        <button className="danger" onClick={() => usePlanner.getState().deleteSelected()}>
          Delete
        </button>
      </div>
      {!compact && (
        <div className="cluster layers">
          {LAYERS.map(([k, label]) => (
            <button
              key={k}
              className={layerOn[k] ? 'on' : ''}
              onClick={() => usePlanner.getState().setFlag(k, !layerOn[k])}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="cluster">
        <button className={snapOn ? 'on' : ''} onClick={() => usePlanner.getState().cycleSnap()}>
          Snap {Math.round(snap * 1000)}
        </button>
        {!compact && (
          <span className="hint-k">V select · H pan · M measure · C paint · N note · R rotate</span>
        )}
      </div>
    </footer>
  )
}
