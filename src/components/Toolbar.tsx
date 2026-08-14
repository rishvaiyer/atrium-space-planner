import { usePlanner } from '../store'

export function Toolbar() {
  const tool = usePlanner((s) => s.tool)
  const snapOn = usePlanner((s) => s.snapOn)
  const snap = usePlanner((s) => s.snap)
  const flags = usePlanner((s) => ({
    walls: s.showWalls,
    furniture: s.showFurniture,
    electrical: s.showElectrical,
    egress: s.showEgress,
    dims: s.showDimensions,
    grid: s.showGrid,
  }))

  return (
    <footer className="toolbar">
      <div className="cluster">
        <ToolBtn id="select" label="Select" on={tool === 'select'} />
        <ToolBtn id="measure" label="Measure" on={tool === 'measure'} />
        <button onClick={() => usePlanner.getState().rotateSelected(Math.PI / 2)}>Rotate 90</button>
        <button onClick={() => usePlanner.getState().duplicateSelected()}>Duplicate</button>
        <button className="danger" onClick={() => usePlanner.getState().deleteSelected()}>
          Delete
        </button>
      </div>
      <div className="cluster">
        <Toggle k="showWalls" label="Walls" on={flags.walls} />
        <Toggle k="showFurniture" label="Fixtures" on={flags.furniture} />
        <Toggle k="showElectrical" label="Electrical" on={flags.electrical} />
        <Toggle k="showEgress" label="Egress" on={flags.egress} />
        <Toggle k="showDimensions" label="Dimensions" on={flags.dims} />
        <Toggle k="showGrid" label="Grid" on={flags.grid} />
      </div>
      <div className="cluster">
        <button className={snapOn ? 'on' : ''} onClick={() => usePlanner.getState().setFlag('snapOn', !snapOn)}>
          Snap {Math.round(snap * 1000)} mm
        </button>
        <span className="hint-k">R rotate · Del remove · ⌘Z undo · Alt-drag pan</span>
      </div>
    </footer>
  )
}

function ToolBtn({ id, label, on }: { id: 'select' | 'measure'; label: string; on: boolean }) {
  return (
    <button className={on ? 'on' : ''} onClick={() => usePlanner.getState().setTool(id)}>
      {label}
    </button>
  )
}

function Toggle({
  k,
  label,
  on,
}: {
  k: 'showWalls' | 'showFurniture' | 'showElectrical' | 'showEgress' | 'showDimensions' | 'showGrid'
  label: string
  on: boolean
}) {
  return (
    <button className={on ? 'on' : ''} onClick={() => usePlanner.getState().setFlag(k, !on)}>
      {label}
    </button>
  )
}
