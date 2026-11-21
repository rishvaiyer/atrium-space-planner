import { furnitureCsv } from '../pricing'
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
  onHome,
  onOptions,
  onBrief,
  onTemplates,
  onPalette,
  onImport,
  onSave,
  onReset,
  onHelp,
}: {
  compact?: boolean
  onHome: () => void
  onOptions: () => void
  onBrief: () => void
  onTemplates: () => void
  onPalette: () => void
  onImport: () => void
  onSave: () => void
  onReset: () => void
  onHelp: () => void
}) {
  const name = usePlanner((s) => s.projectName)
  const seats = usePlanner((s) => s.items.reduce((n, it) => n + catalogItem(it.catalogId).seats, 0))
  const room = usePlanner((s) => s.room)
  const focusMode = usePlanner((s) => s.focusMode)

  const exportCsv = () => {
    const state = usePlanner.getState()
    downloadText('atrium-furniture.csv', furnitureCsv(state.items, state.budgetTier), 'text/csv')
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
      costSettings: s.costSettings,
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
        <button type="button" className="mark home-mark" onClick={onHome} aria-label="Back to projects">
          atrium <span aria-hidden="true">↖</span>
        </button>
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
        <button
          type="button"
          {...tip('Start a new project from a room template', '⌘N')}
          onClick={onTemplates}
        >
          New project
        </button>
        {!compact && (
          <button type="button" onClick={onBrief}>
            Planning brief
          </button>
        )}
        <button type="button" className="options-button" onClick={onOptions}>
          {compact ? 'Options' : 'Compare options'}
        </button>
        {!compact && (
          <button type="button" className="client-board-button" onClick={printBoard}>
            Client board ↗
          </button>
        )}
        {compact ? (
          <MoreMenu
            items={[
              { label: 'Planning brief', run: onBrief },
              { label: 'New project', run: onTemplates },
              { label: 'Open file', run: onImport },
              { label: 'Save project', run: onSave },
              { label: 'Client board', run: printBoard },
              { label: 'Export place JSON', run: exportPlace },
              { label: 'Present', run: () => usePlanner.getState().setFlag('focusMode', !focusMode) },
              { label: 'Redo', run: () => usePlanner.getState().redo() },
              { label: 'Help', run: onHelp },
              { label: 'Reset all data', run: onReset },
            ]}
          />
        ) : (
          <>
            <button
              type="button"
              className="kbd-btn"
              {...tip('Search commands and templates', '⌘K')}
              onClick={onPalette}
            >
              Search <kbd>⌘K</kbd>
            </button>

            <button
              type="button"
              className={focusMode ? 'on' : ''}
              {...tip('Hide chrome and orbit the room for a client pitch', '.')}
              onClick={() => usePlanner.getState().setFlag('focusMode', !focusMode)}
            >
              Present
            </button>
            <MoreMenu
              items={[
                { label: 'Open file', run: onImport },
                { label: 'Save project', run: onSave },
                { label: 'Furniture list (CSV)', run: exportCsv },
                { label: 'Client board', run: printBoard },
                { label: 'Export place JSON', run: exportPlace },
                { label: 'Reset all data', run: onReset },
              ]}
            />
          </>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-label="Undo"
          {...tip('Undo last change', '⌘Z')}
          onClick={() => usePlanner.getState().undo()}
        >
          <Icon name="undo" />
        </button>
        {!compact && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Redo"
            {...tip('Redo', '⇧⌘Z')}
            onClick={() => usePlanner.getState().redo()}
          >
            <Icon name="redo" />
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-label="Help"
          {...tip('How to plan a space', '?')}
          onClick={onHelp}
        >
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
