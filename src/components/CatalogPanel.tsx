import { CATALOG } from '../catalog'
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

export function CatalogPanel() {
  const category = usePlanner((s) => s.category)
  const pending = usePlanner((s) => s.pendingCatalogId)
  const setCategory = usePlanner((s) => s.setCategory)
  const setPending = usePlanner((s) => s.setPending)
  const active = CATS.some((c) => c.id === category) ? category : 'restaurant'
  const items = CATALOG.filter((i) => i.category === active)

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
      <p className="hint">{pending ? 'Click the plan or the floor to drop it' : 'Pick a piece, then click to place'}</p>
      <ul className="catalog-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`catalog-row ${pending === item.id ? 'on' : ''}`}
              onClick={() => setPending(pending === item.id ? null : item.id)}
            >
              <span className={`glyph ${item.plan}`} />
              <span className="meta">
                <strong>{item.name}</strong>
                <em>{item.sku}</em>
              </span>
              <span className="price">${item.price.toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
