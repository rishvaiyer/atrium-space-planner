import { useEffect, useMemo, useState } from 'react'
import { openBoard } from '../board'
import { analyzeLayout } from '../compliance'
import { DESIGN_EXAMPLE, compileDesign } from '../design'
import { toPlaceExport } from '../placeExport'
import { downloadJson } from '../project'
import { TEMPLATES } from '../templates'
import { usePlanner } from '../store'
import { toggleTheme } from '../theme'
import { tip } from './tipAttrs'

export function CommandPalette({ onClose, onOpenTemplates, onHelp }: { onClose: () => void; onOpenTemplates: () => void; onHelp?: () => void }) {
  const [q, setQ] = useState('')
  const commands = useMemo(
    () => [
      { id: 'templates', label: 'New project from template…', run: onOpenTemplates },
      { id: 'help', label: 'Help', run: () => onHelp?.() },
      { id: 'present', label: 'Presentation mode', run: () => usePlanner.getState().setFlag('focusMode', !usePlanner.getState().focusMode) },
      { id: 'shot', label: 'Download 3D screenshot', run: () => usePlanner.getState().requestShot() },
      { id: 'library', label: 'Toggle library', run: () => usePlanner.getState().setFlag('showLibrary', !usePlanner.getState().showLibrary) },
      { id: 'spec', label: 'Toggle spec', run: () => usePlanner.getState().setFlag('showSpec', !usePlanner.getState().showSpec) },
      {
        id: 'board',
        label: 'Open print board',
        run: () => {
          const s = usePlanner.getState()
          openBoard({
            name: s.projectName,
            occupancyGroup: s.occupancyGroup,
            room: s.room,
            items: s.items,
            analysis: analyzeLayout({
              room: s.room,
              items: s.items,
              tier: s.budgetTier,
              floor: s.floorFinish,
              cap: s.budgetCap,
              jurisdiction: s.jurisdiction,
              worldId: s.worldId,
              occupancyGroup: s.occupancyGroup,
            }),
          })
        },
      },
      { id: 'ai-recipe', label: 'Download AI room recipe', run: () => downloadJson('ai-room.example.json', DESIGN_EXAMPLE) },
      {
        id: 'ai-lounge',
        label: 'Load AI lounge example',
        run: () => usePlanner.getState().applyProject(compileDesign(DESIGN_EXAMPLE)),
      },
      {
        id: 'place',
        label: 'Export place JSON',
        run: () => {
          const s = usePlanner.getState()
          downloadJson(
            `${s.projectName.replace(/\s+/g, '-').toLowerCase()}.place.json`,
            toPlaceExport({ name: s.projectName, occupancyGroup: s.occupancyGroup, room: s.room, items: s.items }),
          )
        },
      },
      { id: 'wall', label: 'Wall tool', run: () => usePlanner.getState().setTool('wall') },
      { id: 'door', label: 'Door tool', run: () => usePlanner.getState().setTool('door') },
      { id: 'window', label: 'Window tool', run: () => usePlanner.getState().setTool('window') },
      { id: 'fit', label: 'Fit plan to room', run: () => usePlanner.getState().fitView() },
      { id: 'orbit', label: 'Camera: orbit', run: () => usePlanner.getState().setCameraMode('orbit') },
      { id: 'eye', label: 'Camera: eye level', run: () => usePlanner.getState().setCameraMode('eye') },
      { id: 'top', label: 'Camera: top', run: () => usePlanner.getState().setCameraMode('top') },
      { id: 'theme', label: 'Toggle light / dark', run: () => toggleTheme() },
      ...TEMPLATES.map((t) => ({
        id: `t-${t.id}`,
        label: `Template: ${t.name}`,
        run: () => usePlanner.getState().loadTemplate(t.id),
      })),
    ],
    [onOpenTemplates, onHelp],
  )
  const filtered = commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Go to template, camera, present…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filtered[0]) {
              filtered[0].run()
              onClose()
            }
          }}
        />
        <ul>
          {filtered.slice(0, 12).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  c.run()
                  onClose()
                }}
                {...tip(c.label)}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
