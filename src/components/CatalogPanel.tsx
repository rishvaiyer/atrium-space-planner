import { useEffect, useState } from 'react'
import { CATALOG, worldUse } from '../catalog'
import {
  addPolyforkAsset,
  clearGlbLibrary,
  hydrateGlbLibrary,
  importGlbFiles,
  listGlb,
  removeGlb,
  type GlbEntry,
} from '../glbLibrary'
import { glbUrlFor, polyforkKey, searchPolyfork, setPolyforkKey, type PolyforkAsset } from '../polyfork'
import { PhotoModelPanel } from './PhotoModelPanel'
import { usePlanner } from '../store'
import type { Category } from '../types'
import { tip } from './tipAttrs'

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
  const [tab, setTab] = useState<'stock' | 'models' | 'photo'>('stock')
  const [library, setLibrary] = useState<GlbEntry[]>([])
  const [pfQ, setPfQ] = useState('')
  const [pfKey, setPfKey] = useState(() => polyforkKey())
  const [pfHits, setPfHits] = useState<PolyforkAsset[]>([])
  const [pfErr, setPfErr] = useState('')
  const [pfBusy, setPfBusy] = useState(false)
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

  useEffect(() => {
    void hydrateGlbLibrary().then(setLibrary)
  }, [])

  const pick = (id: string) => {
    const next = pending === id ? null : id
    setPending(next)
    if (next) onPick?.()
  }

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const next = await importGlbFiles([...list])
    setLibrary(next)
  }

  const runPolyfork = async () => {
    setPfBusy(true)
    setPfErr('')
    setPolyforkKey(pfKey.trim())
    try {
      setPfHits(await searchPolyfork(pfQ))
    } catch (e) {
      setPfErr(e instanceof Error ? e.message : 'Polyfork search failed')
      setPfHits([])
    } finally {
      setPfBusy(false)
    }
  }

  const addPf = (asset: PolyforkAsset) => {
    const size = asset.size_m
    const next = addPolyforkAsset({
      id: asset.id,
      title: asset.title,
      glbUrl: glbUrlFor(asset),
      w: size?.x || 1.2,
      d: size?.z || size?.x || 1.2,
      h: size?.y || 1.2,
      thumb: asset.thumbnail,
    })
    setLibrary(next)
    pick(`pf:${asset.id}`)
  }

  return (
    <aside className="panel catalog">
      <header className="panel-head">
        <div>
          <div className="panel-kicker">Library</div>
          <h2>Fixtures</h2>
        </div>
      </header>
      <div className="cats">
        <button type="button" className={tab === 'stock' ? 'on' : ''} {...tip('Built-in furniture and fixtures')} onClick={() => setTab('stock')}>
          Catalog
        </button>
        <button type="button" className={tab === 'models' ? 'on' : ''} {...tip('Import GLB files or search Polyfork')} onClick={() => setTab('models')}>
          Models
        </button>
        <button type="button" className={tab === 'photo' ? 'on' : ''} {...tip('Turn a photo of a piece of furniture into a 3D model')} onClick={() => setTab('photo')}>
          Photo → 3D
        </button>
      </div>
      {tab === 'photo' ? (
        <PhotoModelPanel
          onCreated={(entry) => {
            setLibrary(listGlb())
            setTab('models')
            pick(entry.id)
          }}
        />
      ) : tab === 'stock' ? (
        <>
          <div className="cats">
            {CATS.map((c) => (
              <button key={c.id} type="button" className={c.id === active ? 'on' : ''} {...tip(`${c.label} fixtures`)} onClick={() => setCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <p className="hint">{pending ? 'Tap the 2D plan or 3D floor to drop it' : 'Pick a piece, then tap the plan to place'}</p>
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
                  {...tip(
                    pending === item.id
                      ? `Selected — tap the 2D plan or 3D floor to place ${item.name}`
                      : `${item.name} · ${item.w.toFixed(2)} × ${item.d.toFixed(2)} × ${item.h.toFixed(2)} m — click, then tap the plan`,
                  )}
                  onClick={() => pick(item.id)}
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
        </>
      ) : (
        <div className="models-pane">
          <p className="hint">
            Import GLB files from a folder on your computer, or pull props from Polyfork. Then tap the plan to place.
          </p>
          <div className="file-row">
            <label className="file-btn" {...tip('Choose .glb or .gltf files from your computer')}>
              Import GLB files
              <input
                type="file"
                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                multiple
                hidden
                onChange={(e) => {
                  void onFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            <label className="file-btn" {...tip('Pick a folder of models — the browser cannot read your Desktop by itself')}>
              Import folder
              <input
                type="file"
                multiple
                hidden
                // @ts-expect-error Chromium folder picker
                webkitdirectory=""
                onChange={(e) => {
                  void onFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {library.length > 0 && (
            <div className="file-row">
              <button
                type="button"
                className="file-btn danger"
                {...tip('Delete every imported and generated model from this browser')}
                onClick={() => {
                  if (!confirm(`Remove all ${library.length} model${library.length === 1 ? '' : 's'} from this browser? Models already placed in the plan stay put until you delete them.`)) return
                  clearGlbLibrary()
                  setLibrary([])
                  setPending(null)
                }}
              >
                Remove all {library.length}
              </button>
            </div>
          )}
          {library.length > 0 && (
            <ul className="catalog-list">
              {library.map((e) => (
                <li key={e.id} className="lib-row">
                  <button
                    type="button"
                    className={`catalog-row ${pending === e.id ? 'on' : ''}`}
                    {...tip(`${e.name} — click, then tap the plan to place`)}
                    onClick={() => pick(e.id)}
                  >
                    {e.thumb ? <img className="glyph-img" src={e.thumb} alt="" /> : <span className="glyph rect" />}
                    <span className="meta">
                      <strong>{e.name}</strong>
                      <em>{e.source === 'polyfork' ? 'Polyfork' : e.source === 'photo' ? `From photo · ${e.photoKind ?? 'model'}` : 'Local GLB'}</em>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    {...tip('Remove from this browser’s model library')}
                    onClick={() => {
                      removeGlb(e.id)
                      setLibrary(listGlb())
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h3 className="models-h">Polyfork library</h3>
          <label className="field">
            API token (optional, from polyfork.dev/account)
            <input
              type="password"
              value={pfKey}
              onChange={(e) => setPfKey(e.target.value)}
              placeholder="Bearer token"
              autoComplete="off"
              {...tip('Paste your Polyfork API token from polyfork.dev/account')}
            />
          </label>
          <label className="field">
            Search props
            <input value={pfQ} onChange={(e) => setPfQ(e.target.value)} placeholder="chair, lamp, sofa…" onKeyDown={(e) => e.key === 'Enter' && void runPolyfork()} />
          </label>
          <button type="button" className="file-btn wide" disabled={pfBusy} {...tip('Search free and Pro props on polyfork.dev')} onClick={() => void runPolyfork()}>
            {pfBusy ? 'Searching…' : 'Search Polyfork'}
          </button>
          {pfErr && <p className="hint bad">{pfErr}. You can still import local GLB files.</p>}
          <ul className="catalog-list">
            {pfHits.map((a) => (
              <li key={a.id}>
                <button type="button" className="catalog-row" {...tip(`Add ${a.title} to the library and place it`)} onClick={() => addPf(a)}>
                  {a.thumbnail ? <img className="glyph-img" src={a.thumbnail} alt="" /> : <span className="glyph rect" />}
                  <span className="meta">
                    <strong>{a.title}</strong>
                    <em>{a.free ? 'Free' : 'Pro'} · tap to add & place</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
