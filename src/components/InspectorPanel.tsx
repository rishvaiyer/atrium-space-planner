import { useEffect, useMemo, useState } from 'react'
import { catalogItem, sitHeightOf, worldUse } from '../catalog'
import { analyzeLayout } from '../compliance'
import { formatMm, formatMoney, itemDims } from '../geometry'
import { applyObjectCode, objectCode, OBJECT_TEXTURES } from '../objectCode'
import { downloadJson } from '../project'
import { usePlanner } from '../store'
import type { BudgetTier, FloorFinish, Jurisdiction, PlacedItem, WallFinish } from '../types'
import { wallById, wallLen } from '../walls'

const BRANDS = ['#3b82f6', '#111111', '#efeae2', '#c2410c', '#6b5344', '#0f766e']
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

  const occupancyGroup = usePlanner((s) => s.occupancyGroup)
  const selectedArch = usePlanner((s) => s.selectedArch)

  const selected = selectedIds.length === 1 ? items.find((i) => i.id === selectedIds[0]) : undefined

  const analysis = useMemo(() => {
    try {
      return analyzeLayout({ room, items, tier, floor, cap, jurisdiction, worldId, occupancyGroup })
    } catch {
      return null
    }
  }, [room, items, tier, floor, cap, jurisdiction, worldId, occupancyGroup])

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
        <div className="panel-kicker">Envelope</div>
        <label className="field">
          Width · depth · height (m)
          <div className="dims">
            <input
              type="number"
              min={3}
              max={28}
              step={0.1}
              value={Number(room.width.toFixed(2))}
              onChange={(e) => usePlanner.getState().setRoom({ width: Number(e.target.value) })}
            />
            <input
              type="number"
              min={3}
              max={22}
              step={0.1}
              value={Number(room.depth.toFixed(2))}
              onChange={(e) => usePlanner.getState().setRoom({ depth: Number(e.target.value) })}
            />
            <input
              type="number"
              min={2.2}
              max={6}
              step={0.05}
              value={Number(room.wallHeight.toFixed(2))}
              onChange={(e) => usePlanner.getState().setRoom({ wallHeight: Number(e.target.value) })}
            />
          </div>
        </label>
        <p className="hint">W draws a wall · D a door · G a window. Shift for an angled wall. Partition walls name rooms automatically.</p>
      </section>

      <section>
        <div className="panel-kicker">Rooms</div>
        {(room.spaces ?? []).length ? (
          <ul className="space-list">
            {(room.spaces ?? []).map((sp) => {
              const report = analysis?.spaces.find((r) => r.id === sp.id)
              const on = selectedArch?.kind === 'space' && selectedArch.id === sp.id
              return (
                <li key={sp.id} className={on ? 'on' : ''}>
                  <input
                    aria-label="Room name"
                    value={sp.name}
                    onFocus={() => usePlanner.getState().selectArch({ kind: 'space', id: sp.id })}
                    onChange={(e) => usePlanner.getState().renameSpace(sp.id, e.target.value)}
                  />
                  <span>
                    {report ? `${report.area.toFixed(1)} m² · ${report.seats} seats · load ${report.load}` : '—'}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="empty">Closed wall loops become named rooms.</p>
        )}
      </section>

      {selectedArch && (
        <section>
          <div className="panel-kicker">Architecture</div>
          {selectedArch.kind === 'wall' &&
            (() => {
              const wall = wallById(room, selectedArch.id)
              if (!wall) return <p className="empty">Wall missing.</p>
              return (
                <>
                  <h3>Wall</h3>
                  <div className="kv">
                    <span>Length</span>
                    <b>{formatMm(wallLen(wall))}</b>
                    <span>From</span>
                    <b>
                      {wall.ax.toFixed(2)}, {wall.az.toFixed(2)}
                    </b>
                    <span>To</span>
                    <b>
                      {wall.bx.toFixed(2)}, {wall.bz.toFixed(2)}
                    </b>
                  </div>
                </>
              )
            })()}
          {selectedArch.kind === 'door' && (
            <>
              <h3>Door</h3>
              <p className="hint">Click a wall with the Door tool to add another 90 cm leaf.</p>
            </>
          )}
          {selectedArch.kind === 'window' && (
            <>
              <h3>Window</h3>
              <p className="hint">1.6 m glazed opening. Delete removes it.</p>
            </>
          )}
          {selectedArch.kind === 'space' &&
            (() => {
              const sp = room.spaces.find((s) => s.id === selectedArch.id)
              const report = analysis?.spaces.find((r) => r.id === selectedArch.id)
              if (!sp) return <p className="empty">Room missing.</p>
              return (
                <>
                  <h3>{sp.name}</h3>
                  <label className="field">
                    Name
                    <input value={sp.name} onChange={(e) => usePlanner.getState().renameSpace(sp.id, e.target.value)} />
                  </label>
                  {report && (
                    <div className="kv">
                      <span>Area</span>
                      <b>{report.area.toFixed(1)} m²</b>
                      <span>Seats</span>
                      <b>{report.seats}</b>
                      <span>Occupant load</span>
                      <b>{report.load}</b>
                    </div>
                  )}
                </>
              )
            })()}
        </section>
      )}

      <section>
        <div className="panel-kicker">Selection</div>
        {selected ? (
          <ObjectEditor item={selected} brand={brand} />
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

function ObjectEditor({ item, brand }: { item: PlacedItem; brand: string }) {
  const def = catalogItem(item.catalogId)
  const { w, d, h } = itemDims(item)
  const [raw, setRaw] = useState(() => JSON.stringify(objectCode(item), null, 2))
  const [err, setErr] = useState('')

  useEffect(() => {
    const live = usePlanner.getState().items.find((it) => it.id === item.id)
    if (live) setRaw(JSON.stringify(objectCode(live), null, 2))
    setErr('')
  }, [item.id])

  const patch = (next: Partial<PlacedItem>) => {
    const s = usePlanner.getState()
    s.commitHistory()
    s.updateItem(item.id, next)
  }

  const applyCode = () => {
    const result = applyObjectCode(item, raw)
    if ('error' in result) {
      setErr(result.error)
      return
    }
    setErr('')
    const s = usePlanner.getState()
    s.commitHistory()
    s.updateItem(item.id, result.item)
  }

  return (
    <>
      <h3>{def.name}</h3>
      <div className="kv">
        <span>SKU</span>
        <b>{def.sku}</b>
        <span>Position</span>
        <b>
          {item.x.toFixed(2)} · {item.z.toFixed(2)} m
        </b>
        <span>Rotation</span>
        <b>{Math.round((item.rotation * 180) / Math.PI) % 360}°</b>
        <span>World</span>
        <b>
          {worldUse(def) === 'sit'
            ? `Sit × ${def.seats} · ${sitHeightOf(def).toFixed(2)} m`
            : worldUse(def) === 'sleep'
              ? `Sleep · ${sitHeightOf(def).toFixed(2)} m`
              : worldUse(def) === 'work'
                ? 'Work surface'
                : 'Prop'}
        </b>
      </div>
      <label className="field">
        Size w · d · h (m)
        <div className="dims">
          <input type="number" min={0.05} max={8} step={0.05} value={Number(w.toFixed(2))} onChange={(e) => patch({ w: Number(e.target.value) })} />
          <input type="number" min={0.05} max={8} step={0.05} value={Number(d.toFixed(2))} onChange={(e) => patch({ d: Number(e.target.value) })} />
          <input type="number" min={0.05} max={6} step={0.05} value={Number(h.toFixed(2))} onChange={(e) => patch({ h: Number(e.target.value) })} />
        </div>
      </label>
      <label className="field">
        Color
        <div className="swatches">
          {BRANDS.map((c) => (
            <button
              key={c}
              type="button"
              className={item.finish === c || (!item.finish && c === brand) ? 'on' : ''}
              style={{ background: c }}
              onClick={() => patch({ finish: c })}
              aria-label={c}
            />
          ))}
        </div>
        <input
          type="text"
          value={item.finish ?? ''}
          placeholder="#hex"
          onChange={(e) => patch({ finish: e.target.value || undefined })}
        />
      </label>
      <label className="field">
        Texture
        <div className="pills">
          <button type="button" className={!item.texture ? 'on' : ''} onClick={() => patch({ texture: undefined })}>
            none
          </button>
          {OBJECT_TEXTURES.map((t) => (
            <button key={t} type="button" className={item.texture === t ? 'on' : ''} onClick={() => patch({ texture: t })}>
              {t}
            </button>
          ))}
        </div>
      </label>
      <label className="field">
        Object code
        <textarea
          className="object-code"
          rows={12}
          spellCheck={false}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-label="Raw object JSON"
        />
      </label>
      {err && <p className="empty">{err}</p>}
      <div className="pills">
        <button type="button" onClick={applyCode}>
          Apply code
        </button>
        <button
          type="button"
          onClick={() => {
            setRaw(JSON.stringify(objectCode(item), null, 2))
            setErr('')
          }}
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => downloadJson(`${def.id}.object.json`, objectCode(item))}
        >
          Export object
        </button>
      </div>
      <p className="hint">AIs can Open a design JSON, or paste object code here. Save / Place exports the whole room with these edits.</p>
    </>
  )
}
