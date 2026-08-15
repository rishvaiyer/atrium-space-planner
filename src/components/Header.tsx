import { catalogItem } from '../catalog'
import { usePlanner } from '../store'

export function Header({ compact = false }: { compact?: boolean }) {
  const seats = usePlanner((s) => s.items.reduce((n, it) => n + catalogItem(it.catalogId).seats, 0))
  const jurisdiction = usePlanner((s) => s.jurisdiction)

  return (
    <header className="header">
      <div className="brand">
        <span className="mark">A</span>
        <div>
          <strong>ATRIUM</strong>
          {!compact && <em>Spatial studio</em>}
        </div>
      </div>
      {!compact && (
        <div className="project">
          <span className="proj-name">Nimbus Loft — Live model</span>
          <span className="badge">{jurisdiction}</span>
          <span className="badge quiet">{seats} seats</span>
        </div>
      )}
      <div className="header-actions">
        <button onClick={() => usePlanner.getState().undo()}>Undo</button>
        {!compact && <button onClick={() => usePlanner.getState().redo()}>Redo</button>}
        {!compact && <button onClick={() => usePlanner.getState().resetLayout()}>Reset</button>}
      </div>
    </header>
  )
}
