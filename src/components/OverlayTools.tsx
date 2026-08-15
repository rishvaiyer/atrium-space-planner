import { usePlanner } from '../store'
import type { Tool } from '../types'
import { Icon } from './Icon'

const TOOLS: { id: Tool; label: string; key: string; icon: 'select' | 'pan' | 'measure' | 'paint' | 'stamp' | 'note' }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: 'select' },
  { id: 'pan', label: 'Pan', key: 'H', icon: 'pan' },
  { id: 'measure', label: 'Measure', key: 'M', icon: 'measure' },
  { id: 'paint', label: 'Paint', key: 'C', icon: 'paint' },
  { id: 'stamp', label: 'Stamp', key: 'T', icon: 'stamp' },
  { id: 'note', label: 'Note', key: 'N', icon: 'note' },
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
          title={`${t.label} (${t.key})`}
          aria-label={t.label}
          onClick={() => usePlanner.getState().setTool(t.id)}
        >
          <Icon name={t.icon} />
        </button>
      ))}
      <span className="sep" />
      <button type="button" title="Rotate (R)" aria-label="Rotate" onClick={() => usePlanner.getState().rotateSelected(Math.PI / 2)}>
        <Icon name="rotate" />
      </button>
      <button type="button" title="Duplicate (⌘D)" aria-label="Duplicate" onClick={() => usePlanner.getState().duplicateSelected()}>
        <Icon name="copy" />
      </button>
      <button type="button" className="danger" title="Delete" aria-label="Delete" onClick={() => usePlanner.getState().deleteSelected()}>
        <Icon name="trash" />
      </button>
    </div>
  )
}
