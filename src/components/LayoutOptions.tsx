import { useEffect, useRef, useState } from 'react'
import { catalogItem } from '../catalog'
import { analyzeLayout } from '../compliance'
import { formatMoney } from '../geometry'
import {
  preserveCurrentProject,
  readLayoutOptions,
  saveLayoutOption,
  deleteLayoutOption,
  type LayoutOption,
} from '../layoutOptions'
import { usePlanner } from '../store'
import { PlanPreview } from './PlanPreview'

export function LayoutOptions({ onClose }: { onClose: () => void }) {
  const [options, setOptions] = useState<LayoutOption[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState(() => usePlanner.getState().projectName + ' · Option')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
    try {
      setOptions(readLayoutOptions())
    } catch {
      setNotice('Saved options could not be read. Download your current project before closing.')
    }
  }, [])

  async function save() {
    if (busy) return
    setBusy(true)
    try {
      const project = await usePlanner.getState().exportProject()
      const option = saveLayoutOption({ ...project, name: name.trim() || 'Untitled option' })
      setOptions(readLayoutOptions())
      setSelected((previous) => [...previous.slice(-1), option.id])
      setNotice('Option saved in this browser.')
    } catch {
      setNotice(
        'This option could not be saved. Storage may be full. Download a project file to keep your work.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function open(option: LayoutOption) {
    setBusy(true)
    try {
      preserveCurrentProject(await usePlanner.getState().exportProject())
      await usePlanner.getState().applyProject(option.project)
      onClose()
    } catch {
      setNotice('This option could not be reopened. Your current layout is still here.')
    } finally {
      setBusy(false)
    }
  }

  const comparison = options.filter((option) => selected.includes(option.id))
  return (
    <dialog
      ref={dialog}
      className="options-dialog"
      aria-labelledby="options-title"
      onCancel={(event) => {
        if (busy) event.preventDefault()
        else onClose()
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose()
      }}
    >
      <div className="options-content">
        <header className="section-heading">
          <div>
            <h2 id="options-title">Layout options</h2>
            <p>Save an arrangement, make a change, then compare.</p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Close layout options">
            Close
          </button>
        </header>
        <form
          className="save-option-form"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <label htmlFor="option-name">Name this option</label>
          <div>
            <input
              id="option-name"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
            <button className="product-primary" disabled={busy} type="submit">
              {busy ? 'Saving…' : 'Save current layout'}
            </button>
          </div>
        </form>
        {notice && (
          <p className="product-notice" role="status">
            {notice}
          </p>
        )}
        {options.length === 0 ? (
          <p className="options-empty">
            Your first saved option will appear here. Furniture, finishes and measurements are kept together.
          </p>
        ) : (
          <div className="options-list">
            {options.map((option) => (
              <article key={option.id} className={selected.includes(option.id) ? 'selected' : ''}>
                <PlanPreview project={option.project} />
                <div>
                  <strong>{option.project.name}</strong>
                  <p>
                    {option.project.items.reduce(
                      (count, item) => count + catalogItem(item.catalogId).seats,
                      0,
                    )}{' '}
                    seats · {new Date(option.savedAt).toLocaleDateString()}
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(option.id)}
                      onChange={(event) => {
                        setSelected((previous) =>
                          event.target.checked
                            ? [...previous.slice(-1), option.id]
                            : previous.filter((id) => id !== option.id),
                        )
                      }}
                    />{' '}
                    Compare
                  </label>
                </div>
                <div className="option-actions">
                  <button type="button" disabled={busy} onClick={() => void open(option)}>
                    Open
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !confirm(
                          `Delete saved option “${option.project.name}”? Your current room stays open.`,
                        )
                      )
                        return
                      try {
                        deleteLayoutOption(option.id)
                        setOptions(readLayoutOptions())
                        setSelected((previous) => previous.filter((id) => id !== option.id))
                      } catch {
                        setNotice('This option could not be removed. Try again.')
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {comparison.length > 0 && (
          <section className="options-compare" aria-labelledby="compare-heading">
            <h3 id="compare-heading">Compare arrangements</h3>
            <div className="comparison-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Layout</th>
                    <th scope="col">Seats</th>
                    <th scope="col">Area</th>
                    <th scope="col">Estimate</th>
                    <th scope="col">Budget left</th>
                    <th scope="col">Cost per seat</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((option) => {
                    const p = option.project
                    const analysis = analyzeLayout({
                      room: p.room,
                      items: p.items,
                      floor: p.floorFinish,
                      cap: p.budgetCap,
                      tier: p.budgetTier,
                      jurisdiction: p.jurisdiction,
                      worldId: 'earth',
                      occupancyGroup: p.occupancyGroup,
                      costSettings: p.costSettings,
                    })
                    return (
                      <tr key={option.id}>
                        <th scope="row">{p.name}</th>
                        <td>{analysis.seats}</td>
                        <td>{analysis.area.toFixed(1)} m²</td>
                        <td>{formatMoney(analysis.total)}</td>
                        <td>{formatMoney(p.budgetCap - analysis.total)}</td>
                        <td>{analysis.seats ? formatMoney(analysis.total / analysis.seats) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p>Estimates use the catalog and finish allowances. Check supplier prices before purchasing.</p>
          </section>
        )}
      </div>
    </dialog>
  )
}
