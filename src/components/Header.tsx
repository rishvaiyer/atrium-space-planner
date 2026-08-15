import { catalogItem } from '../catalog'
import { usePlanner } from '../store'
import { WORLDS } from '../worlds'

export function Header({ compact = false }: { compact?: boolean }) {
  const seats = usePlanner((s) => s.items.reduce((n, it) => n + catalogItem(it.catalogId).seats, 0))
  const jurisdiction = usePlanner((s) => s.jurisdiction)
  const worldId = usePlanner((s) => s.worldId)
  const world = WORLDS.find((w) => w.id === worldId) ?? WORLDS[0]

  return (
    <header className="header">
      <div className="brand">
        <span className="mark">A</span>
        <div>
          <strong>ATRIUM</strong>
          {!compact && <em>Spatial studio</em>}
        </div>
      </div>
      <div className="project">
        <div className="worlds">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              className={w.id === worldId ? 'on' : ''}
              onClick={() => usePlanner.getState().setWorld(w.id)}
            >
              {w.name}
            </button>
          ))}
        </div>
        {!compact && (
          <span className="proj-name">
            {world.tag}
            {worldId === 'earth' ? ` · ${jurisdiction}` : ''}
          </span>
        )}
        <span className="badge quiet">{worldId === 'earth' ? `${seats} seats` : `${seats} crew`}</span>
      </div>
      <div className="header-actions">
        <button onClick={() => usePlanner.getState().undo()}>Undo</button>
        {!compact && <button onClick={() => usePlanner.getState().redo()}>Redo</button>}
        {!compact && <button onClick={() => usePlanner.getState().resetLayout()}>Reset</button>}
      </div>
    </header>
  )
}
