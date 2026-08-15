import { useMemo } from 'react'
import { catalogItem } from '../catalog'
import { analyzeLayout } from '../compliance'
import { formatMm, formatMoney } from '../geometry'
import { usePlanner } from '../store'
import type { BudgetTier, FloorFinish, Jurisdiction, WallFinish } from '../types'

const BRANDS = ['#ff4d00', '#111111', '#efeae2', '#2f6fed', '#6b5344', '#c45c4a']
const FLOORS: FloorFinish[] = [
  'oak',
  'walnut',
  'herringbone',
  'terrazzo',
  'marble',
  'concrete',
  'tile',
  'slate',
  'carpet',
  'checker',
]
const WALLS: WallFinish[] = ['plaster', 'paint', 'brick', 'wood', 'concrete', 'tile']
const TIERS: BudgetTier[] = ['budget', 'standard', 'premium']
const CODES: Jurisdiction[] = ['IBC', 'NBC', 'Eurocode']

export function InspectorPanel() {
  const items = usePlanner((s) => s.items)
  const selectedIds = usePlanner((s) => s.selectedIds)
  const room = usePlanner((s) => s.room)
  const brand = usePlanner((s) => s.brandColor)
  const floor = usePlanner((s) => s.floorFinish)
  const wall = usePlanner((s) => s.wallFinish)
  const time = usePlanner((s) => s.timeOfDay)
  const tier = usePlanner((s) => s.budgetTier)
  const cap = usePlanner((s) => s.budgetCap)
  const jurisdiction = usePlanner((s) => s.jurisdiction)
  const worldId = usePlanner((s) => s.worldId)

  const selected = selectedIds.length === 1 ? items.find((i) => i.id === selectedIds[0]) : undefined
  const def = selected ? catalogItem(selected.catalogId) : undefined

  const analysis = useMemo(() => {
    try {
      return analyzeLayout({ room, items, tier, floor, cap, jurisdiction, worldId })
    } catch {
      return null
    }
  }, [room, items, tier, floor, cap, jurisdiction, worldId])

  const hourLabel = `${Math.floor(time).toString().padStart(2, '0')}:${Math.round((time % 1) * 60)
    .toString()
    .padStart(2, '0')}`

  const failed = analysis?.checks.filter((c) => !c.ok).length ?? 0

  return (
    <aside className="panel inspector">
      <section className="estimate hero">
        <div className="panel-kicker">Capex</div>
        {analysis ? (
          <>
            <strong className="hero-num">{formatMoney(analysis.total)}</strong>
            <div className="cap-bar">
              <div
                className={analysis.budgetOk ? 'ok' : 'bad'}
                style={{ width: `${Math.min(100, (analysis.total / analysis.cap) * 100)}%` }}
              />
            </div>
            <div className="cap-label">Cap {formatMoney(analysis.cap)}</div>
            <div className="pills">
              {TIERS.map((t) => (
                <button key={t} type="button" className={tier === t ? 'on' : ''} onClick={() => usePlanner.getState().setBudgetTier(t)}>
                  {t}
                </button>
              ))}
            </div>
            <ul className="lines">
              {analysis.lines.map((line) => (
                <li key={line.group}>
                  <span>{line.label}</span>
                  <b>{formatMoney(line.amount)}</b>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="empty">Estimate unavailable.</p>
        )}
      </section>

      <section>
        <div className="panel-kicker">Selection</div>
        {selected && def ? (
          <>
            <h3>{def.name}</h3>
            <div className="kv">
              <span>SKU</span>
              <b>{def.sku}</b>
              <span>Position</span>
              <b>
                {selected.x.toFixed(2)} · {selected.z.toFixed(2)} m
              </b>
              <span>Rotation</span>
              <b>{Math.round((selected.rotation * 180) / Math.PI) % 360}°</b>
              <span>Size</span>
              <b>
                {formatMm(def.w)} × {formatMm(def.d)}
              </b>
            </div>
            <label className="field">
              Finish
              <div className="swatches">
                {BRANDS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={selected.finish === c || (!selected.finish && c === brand) ? 'on' : ''}
                    style={{ background: c }}
                    onClick={() => usePlanner.getState().setFinish(selected.id, c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </label>
          </>
        ) : (
          <p className="empty">Click a fixture on the plan or in 3D.</p>
        )}
      </section>

      <section>
        <div className="panel-kicker">Room</div>
        <label className="field">
          Time of day
          <div className="slider-row">
            <input
              type="range"
              min={6}
              max={20}
              step={0.25}
              value={time}
              onChange={(e) => usePlanner.getState().setTimeOfDay(Number(e.target.value))}
            />
            <span>{hourLabel}</span>
          </div>
        </label>
        <label className="field">
          Floor
          <div className="pills">
            {FLOORS.map((f) => (
              <button key={f} type="button" className={floor === f ? 'on' : ''} onClick={() => usePlanner.getState().setFloorFinish(f)}>
                {f}
              </button>
            ))}
          </div>
        </label>
        <label className="field">
          Walls
          <div className="pills">
            {WALLS.map((w) => (
              <button key={w} type="button" className={wall === w ? 'on' : ''} onClick={() => usePlanner.getState().setWallFinish(w)}>
                {w}
              </button>
            ))}
          </div>
        </label>
        <label className="field">
          Brand
          <div className="swatches">
            {BRANDS.map((c) => (
              <button
                key={c}
                type="button"
                className={brand === c ? 'on' : ''}
                style={{ background: c }}
                onClick={() => usePlanner.getState().setBrandColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </label>
      </section>

      <section>
        <div className="panel-kicker">Code</div>
        {analysis ? (
          <>
            <div className={`code-pulse ${failed ? 'bad' : 'ok'}`}>{failed ? `${failed} issues` : 'Passing'}</div>
            <div className="kv">
              <span>Occupancy</span>
              <b>{analysis.occupancyGroup}</b>
              <span>Load</span>
              <b>{analysis.occupantLoad}</b>
              <span>Seats / m²</span>
              <b>
                {analysis.seats} · {analysis.seatsPerM2.toFixed(2)}
              </b>
              {worldId === 'earth' && (
                <>
                  <span>Travel</span>
                  <b>
                    {analysis.maxTravelM.toFixed(1)} / {analysis.travelLimitM} m
                  </b>
                  <span>Aisle</span>
                  <b>
                    {analysis.aisleMinM.toFixed(2)} / {analysis.aisleRequiredM} m
                  </b>
                  <span>Code</span>
                  <div className="pills tight">
                    {CODES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={jurisdiction === c ? 'on' : ''}
                        onClick={() => usePlanner.getState().setJurisdiction(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <ul className="checks">
              {analysis.checks.map((c) => (
                <li key={c.id} className={c.ok ? 'ok' : 'bad'}>
                  <span className="mark">{c.ok ? '✓' : '!'}</span>
                  <span>
                    {c.label}
                    <em>{c.detail}</em>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="empty">Code checks unavailable.</p>
        )}
      </section>
    </aside>
  )
}
