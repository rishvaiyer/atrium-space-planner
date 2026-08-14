import { catalogItem } from '../catalog'
import { usePlanner } from '../store'

export function Header() {
  const seats = usePlanner((s) => s.items.reduce((n, it) => n + catalogItem(it.catalogId).seats, 0))
  const jurisdiction = usePlanner((s) => s.jurisdiction)

  return (
    <header className="header">
      <div className="brand">
        <span className="mark">A</span>
        <div>
          <strong>ATRIUM</strong>
          <em>Commercial space planner</em>
        </div>
      </div>
      <div className="project">
        <span className="proj-name">Harbour Café — Fit-out 04</span>
        <span className="badge">{jurisdiction}</span>
        <span className="badge quiet">{seats} seats placed</span>
      </div>
      <div className="header-actions">
        <button onClick={() => usePlanner.getState().undo()}>Undo</button>
        <button onClick={() => usePlanner.getState().redo()}>Redo</button>
        <button onClick={() => usePlanner.getState().resetLayout()}>Reset layout</button>
      </div>
    </header>
  )
}
