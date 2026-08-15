import { lazy, Suspense, useEffect, useState } from 'react'
import { CanvasDock } from './components/CanvasDock'
import { CatalogPanel } from './components/CatalogPanel'
import { FloorPlan2D } from './components/FloorPlan2D'
import { GLBoundary } from './components/GLBoundary'
import { Header } from './components/Header'
import { InspectorPanel } from './components/InspectorPanel'
import { ToolRail } from './components/ToolRail'
import { useIsMobile } from './media'
import { usePlanner } from './store'

const Viewport3D = lazy(async () => {
  const mod = await import('./components/Viewport3D')
  return { default: mod.Viewport3D }
})

type MobileTab = 'plan' | 'view3d' | 'catalog' | 'inspect'

export default function App() {
  const mobile = useIsMobile()
  const worldId = usePlanner((s) => s.worldId)
  const [tab, setTab] = useState<MobileTab>('plan')
  const [allow3d, setAllow3d] = useState(false)

  useEffect(() => {
    let inner = 0
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setAllow3d(true))
    })
    return () => {
      window.cancelAnimationFrame(outer)
      window.cancelAnimationFrame(inner)
    }
  }, [])

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
      if (e.key === 'v' || e.key === 'V') {
        state.setTool('select')
        return
      }
      if (e.key === 'h' || e.key === 'H') {
        state.setTool('pan')
        return
      }
      if (e.key === 'm' || e.key === 'M') {
        state.setTool('measure')
        return
      }
      if (e.key === 'c' || e.key === 'C') {
        state.setTool('paint')
        return
      }
      if (e.key === 'n' || e.key === 'N') {
        state.setTool('note')
        return
      }
      if (e.key === 't' || e.key === 'T') {
        state.setTool('stamp')
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

  const showPlan = !mobile || tab === 'plan'
  const want3d = !mobile || tab === 'view3d'
  const show3d = allow3d && want3d
  const showViews = !mobile || tab === 'plan' || tab === 'view3d'

  return (
    <div className={`app ${mobile ? 'mobile' : ''} world-${worldId}`}>
      <ToolRail compact={mobile} />
      <div className="shell">
        <Header compact={mobile} />
        {mobile && (
          <nav className="mobile-tabs">
            <button type="button" className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>
              Plan
            </button>
            <button type="button" className={tab === 'view3d' ? 'on' : ''} onClick={() => setTab('view3d')}>
              3D
            </button>
            <button type="button" className={tab === 'catalog' ? 'on' : ''} onClick={() => setTab('catalog')}>
              Library
            </button>
            <button type="button" className={tab === 'inspect' ? 'on' : ''} onClick={() => setTab('inspect')}>
              Spec
            </button>
          </nav>
        )}
        <div className="workspace">
          {(!mobile || tab === 'catalog') && <CatalogPanel />}
          {showViews && (
            <div className="views">
              {showPlan && <FloorPlan2D />}
              {want3d &&
                (show3d ? (
                  <GLBoundary>
                    <Suspense fallback={<div className="viewport3d boot-3d">Loading 3D…</div>}>
                      <Viewport3D />
                    </Suspense>
                  </GLBoundary>
                ) : (
                  <div className="viewport3d boot-3d">Loading 3D…</div>
                ))}
              {!mobile && <CanvasDock />}
            </div>
          )}
          {(!mobile || tab === 'inspect') && <InspectorPanel />}
        </div>
      </div>
    </div>
  )
}
