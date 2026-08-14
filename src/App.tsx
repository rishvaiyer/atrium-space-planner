import { lazy, Suspense, useEffect, useState } from 'react'
import { CatalogPanel } from './components/CatalogPanel'
import { FloorPlan2D } from './components/FloorPlan2D'
import { Header } from './components/Header'
import { InspectorPanel } from './components/InspectorPanel'
import { Toolbar } from './components/Toolbar'
import { useIsMobile } from './media'
import { usePlanner } from './store'

const Viewport3D = lazy(async () => {
  const mod = await import('./components/Viewport3D')
  return { default: mod.Viewport3D }
})

type MobileTab = 'plan' | 'view3d' | 'catalog' | 'inspect'

export default function App() {
  const mobile = useIsMobile()
  const [tab, setTab] = useState<MobileTab>('plan')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = usePlanner.getState()
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        state.duplicateSelected()
        return
      }
      if (e.key === 'Escape') {
        state.select(null)
        state.setPending(null)
        state.clearMeasure()
        return
      }
      if (e.key === 'r' || e.key === 'R') {
        state.rotateSelected(Math.PI / 2)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const el = e.target as HTMLElement
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return
        e.preventDefault()
        state.deleteSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`app ${mobile ? 'mobile' : ''}`}>
      <Header compact={mobile} />
      {mobile && (
        <nav className="mobile-tabs">
          <button className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>
            Plan
          </button>
          <button className={tab === 'view3d' ? 'on' : ''} onClick={() => setTab('view3d')}>
            3D
          </button>
          <button className={tab === 'catalog' ? 'on' : ''} onClick={() => setTab('catalog')}>
            Catalog
          </button>
          <button className={tab === 'inspect' ? 'on' : ''} onClick={() => setTab('inspect')}>
            Estimate
          </button>
        </nav>
      )}
      <div className="workspace">
        {(!mobile || tab === 'catalog') && <CatalogPanel />}
        {(!mobile || tab === 'plan' || tab === 'view3d') && (
          <div className="views">
            {(!mobile || tab === 'plan') && <FloorPlan2D />}
            {(!mobile || tab === 'view3d') && (
              <Suspense fallback={<div className="viewport3d boot-3d">Loading 3D…</div>}>
                <Viewport3D />
              </Suspense>
            )}
          </div>
        )}
        {(!mobile || tab === 'inspect') && <InspectorPanel />}
      </div>
      <Toolbar compact={mobile} />
    </div>
  )
}
