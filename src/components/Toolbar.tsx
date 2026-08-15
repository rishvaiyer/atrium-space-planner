import { usePlanner } from '../store'

export function Toolbar({ compact = false }: { compact?: boolean }) {
  const tool = usePlanner((s) => s.tool)
  const snapOn = usePlanner((s) => s.snapOn)
  const snap = usePlanner((s) => s.snap)
  const walls = usePlanner((s) => s.showWalls)
  const furniture = usePlanner((s) => s.showFurniture)
  const electrical = usePlanner((s) => s.showElectrical)
  const egress = usePlanner((s) => s.showEgress)
  const dims = usePlanner((s) => s.showDimensions)
  const grid = usePlanner((s) => s.showGrid)

  return (
    <footer className="toolbar">
      <div className="cluster">
        <ToolBtn id="select" label="Select" on={tool === 'select'} />
        {!compact && <ToolBtn id="measure" label="Measure" on={tool === 'measure'} />}
        <button onClick={() => usePlanner.getState().rotateSelected(Math.PI / 2)}>Rotate</button>
        <button className="danger" onClick={() => usePlanner.getState().deleteSelected()}>
          Delete
        </button>
      </div>
      {!compact && (
        <div className="cluster">
          <Toggle k="showWalls" label="Walls" on={walls} />
          <Toggle k="showFurniture" label="Fixtures" on={furniture} />
          <Toggle k="showElectrical" label="Electrical" on={electrical} />
          <Toggle k="showEgress" label="Egress" on={egress} />
          <Toggle k="showDimensions" label="Dimensions" on={dims} />
          <Toggle k="showGrid" label="Grid" on={grid} />
        </div>
      )}
      <div className="cluster">
        <button className={snapOn ? 'on' : ''} onClick={() => usePlanner.getState().setFlag('snapOn', !snapOn)}>
          Snap {Math.round(snap * 1000)}
        </button>
        {!compact && <span className="hint-k">R rotate · Del remove · ⌘Z undo · Alt-drag pan</span>}
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
