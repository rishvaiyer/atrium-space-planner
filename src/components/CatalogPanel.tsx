import { CATALOG } from '../catalog'
import { usePlanner } from '../store'
import type { Category } from '../types'

const CATS: { id: Category; label: string }[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'office', label: 'Office' },
  { id: 'retail', label: 'Retail' },
]

export function CatalogPanel() {
  const category = usePlanner((s) => s.category)
  const pending = usePlanner((s) => s.pendingCatalogId)
  const setCategory = usePlanner((s) => s.setCategory)
  const setPending = usePlanner((s) => s.setPending)
  const items = CATALOG.filter((i) => i.category === category)

  return (
    <aside className="panel catalog">
      <div className="panel-kicker">Library</div>
      <div className="cats">
        {CATS.map((c) => (
          <button
            key={c.id}
            className={c.id === category ? 'on' : ''}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="hint">{pending ? 'Click the plan or 3D floor to place' : 'Select an item, then click to place'}</p>
      <ul className="catalog-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              className={`catalog-row ${pending === item.id ? 'on' : ''}`}
              onClick={() => setPending(pending === item.id ? null : item.id)}
            >
              <span className={`glyph ${item.plan}`} />
              <span className="meta">
                <strong>{item.name}</strong>
                <em>
                  {item.sku} · ${item.price.toLocaleString()}
                </em>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
