import { useEffect, useRef, useState } from 'react'
import { openBoard } from '../board'
import { catalogItem } from '../catalog'
import { analyzeLayout } from '../compliance'
import { downloadJson, downloadText } from '../project'
import { usePlanner } from '../store'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'

export function Header({
  compact = false,
  onTemplates,
  onPalette,
  onImport,
}: {
  compact?: boolean
  onTemplates: () => void
  onPalette: () => void
  onImport: () => void
}) {
  const name = usePlanner((s) => s.projectName)
  const seats = usePlanner((s) => s.items.reduce((n, it) => n + catalogItem(it.catalogId).seats, 0))
  const room = usePlanner((s) => s.room)
  const showLibrary = usePlanner((s) => s.showLibrary)
  const showSpec = usePlanner((s) => s.showSpec)
  const focusMode = usePlanner((s) => s.focusMode)

  const exportJson = () => {
    const project = usePlanner.getState().toProject()
    downloadJson(`${project.name.replace(/\s+/g, '-').toLowerCase()}.atrium.json`, project)
  }

  const exportCsv = () => {
    const { items } = usePlanner.getState()
    const rows = ['sku,name,qty,unit,total']
    const counts = new Map<string, number>()
    for (const it of items) counts.set(it.catalogId, (counts.get(it.catalogId) ?? 0) + 1)
    for (const [id, qty] of counts) {
      const def = catalogItem(id)
      rows.push(`${def.sku},${def.name},${qty},${def.price},${def.price * qty}`)
    }
    downloadText('atrium-takeoff.csv', rows.join('\n'), 'text/csv')
  }

  const printBoard = () => {
    const s = usePlanner.getState()
    const analysis = analyzeLayout({
      room: s.room,
      items: s.items,
      tier: s.budgetTier,
      floor: s.floorFinish,
      cap: s.budgetCap,
      jurisdiction: s.jurisdiction,
      worldId: s.worldId,
      occupancyGroup: s.occupancyGroup,
    })
    openBoard({
      name: s.projectName,
      occupancyGroup: s.occupancyGroup,
      room: s.room,
      items: s.items,
      analysis,
    })
  }

  return (
    <header className={`header ${focusMode ? 'focus' : ''}`}>
      <div className="brand">
        <span className="mark">A</span>
        <input
          className="proj-input"
          value={name}
          aria-label="Project name"
          onChange={(e) => usePlanner.getState().setProjectName(e.target.value)}
        />
        {!compact && (
          <span className="meta-line">
            {room.width.toFixed(1)} × {room.depth.toFixed(1)} m · {seats} seats
          </span>
        )}
      </div>
      <div className="header-actions">
        <button type="button" onClick={onTemplates}>
          New
        </button>
        {compact ? (
          <MoreMenu
            items={[
              { label: 'Open', run: onImport },
              { label: 'Save', run: exportJson },
              { label: 'Board', run: printBoard },
              { label: 'Present', run: () => usePlanner.getState().setFlag('focusMode', !focusMode) },
              { label: 'Redo', run: () => usePlanner.getState().redo() },
            ]}
          />
        ) : (
          <>
            <button type="button" onClick={onPalette}>
              ⌘K
            </button>
            <button type="button" onClick={onImport}>
              Open
            </button>
            <button type="button" onClick={exportJson}>
              Save
            </button>
            <button type="button" onClick={exportCsv}>
              CSV
            </button>
            <button type="button" title="Printable plan, cost, and code" onClick={printBoard}>
              Board
            </button>
            <span className="sep" />
            <button
              type="button"
              className={showLibrary && !focusMode ? 'on' : ''}
              onClick={() => usePlanner.getState().setFlag('showLibrary', !showLibrary)}
            >
              Library
            </button>
            <button
              type="button"
              className={showSpec && !focusMode ? 'on' : ''}
              onClick={() => usePlanner.getState().setFlag('showSpec', !showSpec)}
            >
              Spec
            </button>
            <button
              type="button"
              className={focusMode ? 'on' : ''}
              onClick={() => usePlanner.getState().setFlag('focusMode', !focusMode)}
            >
              Present
            </button>
          </>
        )}
        <button type="button" className="icon-btn" title="Undo" aria-label="Undo" onClick={() => usePlanner.getState().undo()}>
          <Icon name="undo" />
        </button>
        {!compact && (
          <button type="button" className="icon-btn" title="Redo" aria-label="Redo" onClick={() => usePlanner.getState().redo()}>
            <Icon name="redo" />
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}

function MoreMenu({ items }: { items: { label: string; run: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  return (
    <div className="more-menu" ref={wrap}>
      <button
        type="button"
        className={`icon-btn ${open ? 'on' : ''}`}
        aria-label="More"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="more" />
      </button>
      {open && (
        <ul>
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  item.run()
                  setOpen(false)
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
