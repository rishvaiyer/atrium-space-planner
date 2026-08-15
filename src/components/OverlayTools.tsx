import { usePlanner } from '../store'
import type { Tool } from '../types'
import { Icon } from './Icon'
import { tip } from './tipAttrs'

const TOOLS: { id: Tool; label: string; key: string; hint: string; icon: 'select' | 'pan' | 'measure' | 'wall' | 'door' | 'window' | 'paint' | 'stamp' | 'note' }[] = [
  { id: 'select', label: 'Select', key: 'V', hint: 'Select and move fixtures', icon: 'select' },
  { id: 'pan', label: 'Pan', key: 'H', hint: 'Pan the plan', icon: 'pan' },
  { id: 'wall', label: 'Wall', key: 'W', hint: 'Draw a wall: click two points', icon: 'wall' },
  { id: 'door', label: 'Door', key: 'D', hint: 'Place a door on a wall', icon: 'door' },
  { id: 'window', label: 'Window', key: 'G', hint: 'Place a window on a wall', icon: 'window' },
  { id: 'measure', label: 'Measure', key: 'M', hint: 'Measure distance between two clicks', icon: 'measure' },
  { id: 'paint', label: 'Paint', key: 'C', hint: 'Click a fixture to apply the brand color', icon: 'paint' },
  { id: 'stamp', label: 'Stamp', key: 'T', hint: 'Click to copy the selected fixture', icon: 'stamp' },
  { id: 'note', label: 'Note', key: 'N', hint: 'Click the plan to add a note', icon: 'note' },
]

export function OverlayTools({ compact = false }: { compact?: boolean }) {
  const tool = usePlanner((s) => s.tool)
  const tools = compact ? TOOLS.filter((t) => t.id !== 'stamp') : TOOLS

  return (
    <div className="overlay-tools">
      {tools.map((t) => (
        <button
          key={t.id}
          type="button"
          className={tool === t.id ? 'on' : ''}
          aria-label={t.label}
          {...tip(t.hint, t.key)}
          onClick={() => usePlanner.getState().setTool(t.id)}
        >
          <Icon name={t.icon} />
        </button>
      ))}
      <span className="sep" />
      <button type="button" aria-label="Rotate selected" {...tip('Rotate selected 90°', 'R')} onClick={() => usePlanner.getState().rotateSelected(Math.PI / 2)}>
        <Icon name="rotate" />
      </button>
      <button type="button" aria-label="Duplicate selected" {...tip('Duplicate selected', '⌘D')} onClick={() => usePlanner.getState().duplicateSelected()}>
        <Icon name="copy" />
      </button>
      <button type="button" className="danger" aria-label="Delete selected" {...tip('Delete selected', '⌫')} onClick={() => usePlanner.getState().deleteSelected()}>
        <Icon name="trash" />
      </button>
    </div>
  )
}
