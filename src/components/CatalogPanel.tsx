import { useState } from 'react'
import { CATALOG, worldUse } from '../catalog'
import { usePlanner } from '../store'
import type { Category } from '../types'

const CATS: { id: Category; label: string }[] = [
  { id: 'restaurant', label: 'F&B' },
  { id: 'office', label: 'Office' },
  { id: 'retail', label: 'Retail' },
  { id: 'healthcare', label: 'Health' },
  { id: 'home', label: 'Home' },
  { id: 'education', label: 'School' },
]

export function CatalogPanel({ onPick }: { onPick?: () => void }) {
  const category = usePlanner((s) => s.category)
  const pending = usePlanner((s) => s.pendingCatalogId)
  const setCategory = usePlanner((s) => s.setCategory)
  const setPending = usePlanner((s) => s.setPending)
  const [q, setQ] = useState('')
  const active = CATS.some((c) => c.id === category) ? category : 'restaurant'
  const needle = q.trim().toLowerCase()
  const items = CATALOG.filter((i) => i.category === active).filter((i) => {
    if (!needle) return true
    return (
      i.name.toLowerCase().includes(needle) ||
      i.sku.toLowerCase().includes(needle) ||
      i.id.includes(needle) ||
      (i.tags ?? []).some((t) => t.toLowerCase().includes(needle))
    )
  })

  return (
    <aside className="panel catalog">
      <header className="panel-head">
        <div>
          <div className="panel-kicker">Library</div>
          <h2>Fixtures</h2>
        </div>
      </header>
      <div className="cats">
        {CATS.map((c) => (
          <button key={c.id} type="button" className={c.id === active ? 'on' : ''} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <p className="hint">{pending ? 'Tap the plan to drop it' : 'Pick a piece, then tap the plan to place'}</p>
      <label className="field">
        Search
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="sofa, booth, piano…" aria-label="Search fixtures" />
      </label>
      <ul className="catalog-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`catalog-row ${pending === item.id ? 'on' : ''}`}
              onClick={() => {
                const next = pending === item.id ? null : item.id
                setPending(next)
                if (next) onPick?.()
              }}
            >
              <span className={`glyph ${item.plan}`} />
              <span className="meta">
                <strong>{item.name}</strong>
                <em>
                  {item.sku}
                  {worldUse(item) === 'sit' ? ` · sit ${item.seats}` : worldUse(item) === 'sleep' ? ' · sleep' : ''}
                </em>
              </span>
              <span className="price">${item.price.toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
