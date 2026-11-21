import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeLayout } from '../compliance'
import { formatMoney, itemAabb } from '../geometry'
import { usePlanner } from '../store'

export function PlanningBrief({ onClose }: { onClose: () => void }) {
  const state = usePlanner()
  const dialog = useRef<HTMLDialogElement>(null)
  const [unit, setUnit] = useState<'m' | 'ft' | 'in'>('m')
  const [measurements, setMeasurements] = useState(
    [state.room.width, state.room.depth, state.room.wallHeight].map((value) =>
      String(Number(value.toFixed(6))),
    ),
  )
  const [notice, setNotice] = useState('')
  const factor = unit === 'ft' ? 0.3048 : unit === 'in' ? 0.0254 : 1
  const analysis = useMemo(
    () =>
      analyzeLayout({
        room: state.room,
        items: state.items,
        tier: state.budgetTier,
        floor: state.floorFinish,
        cap: state.budgetCap,
        jurisdiction: state.jurisdiction,
        occupancyGroup: state.occupancyGroup,
        worldId: state.worldId,
        costSettings: state.costSettings,
      }),
    [
      state.room,
      state.items,
      state.budgetTier,
      state.floorFinish,
      state.budgetCap,
      state.jurisdiction,
      state.occupancyGroup,
      state.worldId,
      state.costSettings,
    ],
  )
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const outside = state.items.filter((item) => {
    const box = itemAabb(item)
    return (
      box.minX < state.room.originX ||
      box.minZ < state.room.originZ ||
      box.maxX > state.room.originX + state.room.width ||
      box.maxZ > state.room.originZ + state.room.depth
    )
  })
  const quoted = state.items.filter((item) => item.unitPrice != null).length
  const unpriced = analysis.schedule.filter((row) => row.basis === 'Price needed')

  return (
    <dialog
      ref={dialog}
      className="options-dialog"
      aria-labelledby="brief-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="options-content planning-brief">
        <header className="section-heading">
          <div>
            <h2 id="brief-title">Planning brief</h2>
            <p>Use your measurements and prices to compare real choices.</p>
          </div>
          <button type="button" onClick={onClose}>
            Close brief
          </button>
        </header>
        <section>
          <h3>Room measurements</h3>
          <p>
            Enter measurements from your room. Resizing moves walls proportionally; furniture sizes stay
            fixed.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const [width, depth, wallHeight] = measurements.map((value) => Number(value) * factor)
              if (
                ![width, depth, wallHeight].every(Number.isFinite) ||
                width < 1 ||
                width > 28 ||
                depth < 1 ||
                depth > 22 ||
                wallHeight < 1.8 ||
                wallHeight > 6
              ) {
                setNotice(
                  'Supported size: width 1–28 m, depth 1–22 m, height 1.8–6 m. Check the units and values.',
                )
                return
              }
              const issue = state.setRoom({ width, depth, wallHeight })
              setNotice(issue ?? 'Room dimensions updated in the plan and 3D view.')
            }}
          >
            <label className="brief-field">
              Units
              <select
                aria-label="Room measurement units"
                value={unit}
                onChange={(event) => {
                  const next = event.target.value as typeof unit
                  const nextFactor = next === 'ft' ? 0.3048 : next === 'in' ? 0.0254 : 1
                  setMeasurements(
                    measurements.map((value) =>
                      String(Number(((Number(value) * factor) / nextFactor).toFixed(6))),
                    ),
                  )
                  setUnit(next)
                }}
              >
                <option value="m">Metres</option>
                <option value="ft">Feet, decimal</option>
                <option value="in">Inches</option>
              </select>
            </label>
            <div className="brief-dimensions">
              {['Width', 'Depth', 'Height'].map((label, index) => (
                <label key={label} className="brief-field">
                  {label} ({unit})
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={measurements[index]}
                    onChange={(event) =>
                      setMeasurements((values) =>
                        values.map((value, i) => (i === index ? event.target.value : value)),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <button type="submit">Apply measurements</button>
          </form>
        </section>
        <section>
          <h3>Project budget</h3>
          {outside.length > 0 && (
            <p className="product-notice">
              {outside.length} pieces extend beyond the room boundary.{' '}
              <button
                type="button"
                onClick={() => {
                  state.selectMany(outside.map((item) => item.id))
                  state.setFlag('showSpec', true)
                  onClose()
                }}
              >
                Select pieces to review
              </button>
            </p>
          )}
          <p>
            Amounts are in USD. Supplier prices entered on furniture take priority over catalog allowances.
          </p>
          <div className="brief-dimensions">
            <label className="brief-field">
              Total budget (USD)
              <input
                type="number"
                min="0"
                step="100"
                value={state.budgetCap}
                onChange={(event) => state.setBudget(Number(event.target.value))}
              />
            </label>
            <label className="brief-field">
              Delivery & installation (USD)
              <input
                type="number"
                min="0"
                step="50"
                value={state.costSettings.setupAllowance}
                onChange={(event) =>
                  state.setCostSettings({ setupAllowance: Math.max(0, Number(event.target.value)) })
                }
              />
            </label>
            <label className="brief-field">
              Contingency (%)
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={state.costSettings.contingencyPct}
                onChange={(event) =>
                  state.setCostSettings({
                    contingencyPct: Math.min(100, Math.max(0, Number(event.target.value))),
                  })
                }
              />
            </label>
          </div>
          <label className="brief-field">
            Your flooring price per m² (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={state.costSettings.floorRate ?? ''}
              placeholder="Use finish allowance; enter 0 to keep the existing floor"
              onChange={(event) =>
                state.setCostSettings({
                  floorRate: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)),
                })
              }
            />
          </label>
          <table className="brief-costs">
            <tbody>
              {analysis.lines.map((line) => (
                <tr key={line.group}>
                  <th scope="row">{line.label}</th>
                  <td>{formatMoney(line.amount)}</td>
                </tr>
              ))}
              <tr className="brief-total">
                <th scope="row">Total estimate</th>
                <td>{formatMoney(analysis.total)}</td>
              </tr>
              <tr>
                <th scope="row">Budget left</th>
                <td>{formatMoney(state.budgetCap - analysis.total)}</td>
              </tr>
              <tr>
                <th scope="row">Cost per seat</th>
                <td>
                  {analysis.seats ? formatMoney(analysis.total / analysis.seats) : 'Add seating to compare'}
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            {quoted} of {state.items.length} placed pieces use your prices. Select furniture in the studio to
            enter a quote, then apply it to matching pieces.
          </p>
          {unpriced.length > 0 && (
            <p className="product-notice">
              Price needed for {unpriced.map((row) => row.name).join(', ')}. These pieces currently contribute
              $0 to the estimate.
            </p>
          )}
        </section>
        <section>
          <h3>How to read the layout screen</h3>
          <p>
            Routes are checked on a 20 cm grid to exterior doors. The clearance screen tests a 915 mm setting.
            Results show route connectivity on that grid. Measure the narrowest aisle on site. Confirm door
            and passage dimensions on site.
          </p>
        </section>
        {notice && (
          <p className="product-notice" role="status">
            {notice}
          </p>
        )}
      </div>
    </dialog>
  )
}
