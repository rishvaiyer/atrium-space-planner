import { catalogItem } from '../catalog'
import { usePlanner } from '../store'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'

export function Header({ compact = false }: { compact?: boolean }) {
  const seats = usePlanner((s) => s.items.reduce((n, it) => n + catalogItem(it.catalogId).seats, 0))
  const jurisdiction = usePlanner((s) => s.jurisdiction)

  return (
    <header className="header">
      <div className="brand">
        <strong>ATRIUM</strong>
        {!compact && <em>Café · 11.2 × 8.4 m</em>}
      </div>
      <div className="project">
        <span className="stat">{jurisdiction}</span>
        <span className="stat">{seats} seats</span>
      </div>
      <div className="header-actions">
        <ThemeToggle large />
        <button type="button" title="Undo" aria-label="Undo" onClick={() => usePlanner.getState().undo()}>
          <Icon name="undo" />
        </button>
        {!compact && (
          <button type="button" title="Redo" aria-label="Redo" onClick={() => usePlanner.getState().redo()}>
            <Icon name="redo" />
          </button>
        )}
        {!compact && (
          <button type="button" className="ghost" onClick={() => usePlanner.getState().resetLayout()}>
            Reset
          </button>
        )}
      </div>
    </header>
  )
}
