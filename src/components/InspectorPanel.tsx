import { useMemo } from 'react'
import { catalogItem } from '../catalog'
import { analyzeLayout } from '../compliance'
import { formatMm, formatMoney } from '../geometry'
import { usePlanner } from '../store'
import type { BudgetTier, FloorFinish, Jurisdiction, WallFinish } from '../types'

const BRANDS = ['#b4532a', '#1c1916', '#e8dfd2', '#3d6b8a', '#6b5344', '#c45c4a']
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

  const hourLabel =
    `${Math.floor(time).toString().padStart(2, '0')}:${Math.round((time % 1) * 60)
      .toString()
      .padStart(2, '0')}`

  return (
    <aside className="panel inspector">
      <section>
        <div className="panel-kicker">02 · Object</div>
        {selected && def ? (
          <>
            <h3>{def.name}</h3>
            <div className="kv">
              <span>SKU</span>
              <b>{def.sku}</b>
              <span>X / Z</span>
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
          <p className="empty">Select a fixture to inspect position, rotation, and finish.</p>
        )}
      </section>

      <section>
        <div className="panel-kicker">03 · Environment</div>
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
          Floor finish
          <div className="pills">
            {FLOORS.map((f) => (
              <button key={f} className={floor === f ? 'on' : ''} onClick={() => usePlanner.getState().setFloorFinish(f)}>
                {f}
              </button>
            ))}
          </div>
        </label>
        <label className="field">
          Wall finish
          <div className="pills">
            {WALLS.map((w) => (
              <button key={w} className={wall === w ? 'on' : ''} onClick={() => usePlanner.getState().setWallFinish(w)}>
                {w}
              </button>
            ))}
          </div>
        </label>
        <label className="field">
          Brand color
          <div className="swatches">
            {BRANDS.map((c) => (
              <button
                key={c}
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
        <div className="panel-kicker">{worldId === 'earth' ? '04 · Code' : '04 · Life support'}</div>
        {analysis ? (
          <>
        <div className="kv">
          <span>Occupancy</span>
          <b>{analysis.occupancyGroup}</b>
          <span>{worldId === 'earth' ? 'Occupant load' : 'Crew target'}</span>
          <b>{analysis.occupantLoad}</b>
          <span>{worldId === 'earth' ? 'Seats / m²' : 'Berths'}</span>
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
          <span>Jurisdiction</span>
          <div className="pills tight">
            {CODES.map((c) => (
              <button
                key={c}
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

      <section className="estimate">
        <div className="panel-kicker">05 · Estimate</div>
        <div className="pills">
          {TIERS.map((t) => (
            <button key={t} className={tier === t ? 'on' : ''} onClick={() => usePlanner.getState().setBudgetTier(t)}>
              {t}
            </button>
          ))}
        </div>
        {analysis ? (
          <>
        <ul className="lines">
          {analysis.lines.map((line) => (
            <li key={line.group}>
              <span>{line.label}</span>
              <b>{formatMoney(line.amount)}</b>
            </li>
          ))}
        </ul>
        <div className="capex">
          <span>Capex</span>
          <strong>{formatMoney(analysis.total)}</strong>
        </div>
        <div className="cap-bar">
          <div
            className={analysis.budgetOk ? 'ok' : 'bad'}
            style={{ width: `${Math.min(100, (analysis.total / analysis.cap) * 100)}%` }}
          />
        </div>
        <div className="cap-label">Cap {formatMoney(analysis.cap)}</div>
          </>
        ) : (
          <p className="empty">Estimate unavailable.</p>
        )}
      </section>
    </aside>
  )
}
