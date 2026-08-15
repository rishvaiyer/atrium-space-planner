import { useEffect, useRef, useState } from 'react'
import { openBoard } from '../board'
import { catalogItem } from '../catalog'
import { analyzeLayout } from '../compliance'
import { toPlaceExport } from '../placeExport'
import { downloadJson, downloadText } from '../project'
import { usePlanner } from '../store'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'
import { tip } from './tipAttrs'

export function Header({
  compact = false,
  onTemplates,
  onPalette,
  onImport,
  onHelp,
}: {
  compact?: boolean
  onTemplates: () => void
  onPalette: () => void
  onImport: () => void
  onHelp: () => void
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

  const exportPlace = () => {
    const s = usePlanner.getState()
    downloadJson(
      `${s.projectName.replace(/\s+/g, '-').toLowerCase()}.place.json`,
      toPlaceExport({ name: s.projectName, occupancyGroup: s.occupancyGroup, room: s.room, items: s.items }),
    )
  }

  return (
    <header className={`header ${focusMode ? 'focus' : ''}`}>
      <div className="brand">
        <span className="mark" {...tip('ATRIUM space planner')}>
          A
        </span>
        <input
          className="proj-input"
          value={name}
          aria-label="Project name"
          {...tip('Rename this project')}
          onChange={(e) => usePlanner.getState().setProjectName(e.target.value)}
        />
        {!compact && (
          <span className="meta-line" {...tip('Room size and seated count')}>
            {room.width.toFixed(1)} × {room.depth.toFixed(1)} m · {seats} seats
          </span>
        )}
      </div>
      <div className="header-actions">
        <button type="button" {...tip('Start a new project from a room template', '⌘N')} onClick={onTemplates}>
          New project
        </button>
        {compact ? (
          <MoreMenu
            items={[
              { label: 'Open file', run: onImport },
              { label: 'Save project', run: exportJson },
              { label: 'Print board', run: printBoard },
              { label: 'Export place JSON', run: exportPlace },
              { label: 'Present', run: () => usePlanner.getState().setFlag('focusMode', !focusMode) },
              { label: 'Redo', run: () => usePlanner.getState().redo() },
              { label: 'Help', run: onHelp },
            ]}
          />
        ) : (
          <>
            <button type="button" {...tip('Search commands and templates', '⌘K')} onClick={onPalette}>
              Commands
            </button>
            <button type="button" {...tip('Open an ATRIUM or design JSON file', '⌘O')} onClick={onImport}>
              Open file
            </button>
            <button type="button" {...tip('Download this project as JSON', '⌘S')} onClick={exportJson}>
              Save project
            </button>
            <button type="button" {...tip('Download a cost takeoff spreadsheet')} onClick={exportCsv}>
              Cost CSV
            </button>
            <button type="button" {...tip('Open a printable plan, cost, and code sheet')} onClick={printBoard}>
              Print board
            </button>
            <button type="button" {...tip('Export sit-ready place JSON for other apps')} onClick={exportPlace}>
              Export place
            </button>
            <span className="sep" />
            <button
              type="button"
              className={showLibrary && !focusMode ? 'on' : ''}
              {...tip('Show or hide the fixture library')}
              onClick={() => usePlanner.getState().setFlag('showLibrary', !showLibrary)}
            >
              Library
            </button>
            <button
              type="button"
              className={showSpec && !focusMode ? 'on' : ''}
              {...tip('Show or hide specs, capex, and textures')}
              onClick={() => usePlanner.getState().setFlag('showSpec', !showSpec)}
            >
              Spec
            </button>
            <button
              type="button"
              className={focusMode ? 'on' : ''}
              {...tip('Hide side panels for presenting')}
              onClick={() => usePlanner.getState().setFlag('focusMode', !focusMode)}
            >
              Present
            </button>
          </>
        )}
        <button type="button" className="icon-btn" aria-label="Undo" {...tip('Undo last change', '⌘Z')} onClick={() => usePlanner.getState().undo()}>
          <Icon name="undo" />
        </button>
        {!compact && (
          <button type="button" className="icon-btn" aria-label="Redo" {...tip('Redo', '⇧⌘Z')} onClick={() => usePlanner.getState().redo()}>
            <Icon name="redo" />
          </button>
        )}
        <button type="button" className="icon-btn" aria-label="Help" {...tip('How to plan a space', '?')} onClick={onHelp}>
          ?
        </button>
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
        {...tip('More actions')}
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
                {...tip(item.label)}
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
