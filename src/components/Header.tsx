import { useEffect, useState } from 'react'
import { catalogItem } from '../catalog'
import { usePlanner } from '../store'
import { applyTheme, readTheme, toggleTheme, type Theme } from '../theme'

export function Header({ compact = false }: { compact?: boolean }) {
  const seats = usePlanner((s) => s.items.reduce((n, it) => n + catalogItem(it.catalogId).seats, 0))
  const jurisdiction = usePlanner((s) => s.jurisdiction)
  const [theme, setTheme] = useState<Theme>(() => (typeof document === 'undefined' ? 'light' : readTheme()))

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

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
        {!compact && <span className="folio">Plate 01 · café</span>}
        <span className="proj-name">{jurisdiction} occupancy</span>
        <span className="badge quiet">{seats} seats</span>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="theme-switch"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setTheme(toggleTheme())}
        >
          <span className={theme === 'light' ? 'on' : ''}>Day</span>
          <span className={theme === 'dark' ? 'on' : ''}>Night</span>
        </button>
        <button type="button" onClick={() => usePlanner.getState().undo()}>
          Undo
        </button>
        {!compact && (
          <button type="button" onClick={() => usePlanner.getState().redo()}>
            Redo
          </button>
        )}
        {!compact && (
          <button type="button" onClick={() => usePlanner.getState().resetLayout()}>
            Reset
          </button>
        )}
      </div>
    </header>
  )
}
