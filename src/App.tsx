import { useEffect } from 'react'
import { CatalogPanel } from './components/CatalogPanel'
import { FloorPlan2D } from './components/FloorPlan2D'
import { Header } from './components/Header'
import { InspectorPanel } from './components/InspectorPanel'
import { Toolbar } from './components/Toolbar'
import { Viewport3D } from './components/Viewport3D'
import { usePlanner } from './store'

export default function App() {
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
    <div className="app">
      <Header />
      <div className="workspace">
        <CatalogPanel />
        <div className="views">
          <FloorPlan2D />
          <Viewport3D />
        </div>
        <InspectorPanel />
      </div>
      <Toolbar />
    </div>
  )
}
