import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { CanvasDock } from './components/CanvasDock'
import { CatalogPanel } from './components/CatalogPanel'
import { CommandPalette } from './components/CommandPalette'
import { FloorPlan2D } from './components/FloorPlan2D'
import { GLBoundary } from './components/GLBoundary'
import { Header } from './components/Header'
import { InspectorPanel } from './components/InspectorPanel'
import { OverlayTools } from './components/OverlayTools'
import { TemplateGallery } from './components/TemplateGallery'
import { useIsMobile } from './media'
import { PROJECT_KEY, readProjectFile } from './project'
import { usePlanner } from './store'

const Viewport3D = lazy(async () => {
  const mod = await import('./components/Viewport3D')
  return { default: mod.Viewport3D }
})

type MobileTab = 'plan' | 'view3d' | 'catalog' | 'inspect'

export default function App() {
  const mobile = useIsMobile()
  const showLibrary = usePlanner((s) => s.showLibrary)
  const showSpec = usePlanner((s) => s.showSpec)
  const focusMode = usePlanner((s) => s.focusMode)
  const [tab, setTab] = useState<MobileTab>('plan')
  const [allow3d, setAllow3d] = useState(false)
  const [palette, setPalette] = useState(false)
  const [templates, setTemplates] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROJECT_KEY)
      if (raw) {
        const file = readProjectFile(raw)
        if (file) usePlanner.getState().applyProject(file)
      } else {
        setTemplates(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    let t = 0
    const unsub = usePlanner.subscribe(() => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        try {
          localStorage.setItem(PROJECT_KEY, JSON.stringify(usePlanner.getState().toProject()))
        } catch {
          /* ignore */
        }
      }, 400)
    })
    return () => {
      unsub()
      window.clearTimeout(t)
    }
  }, [])

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
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'

      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((v) => !v)
        return
      }
      if (meta && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        setTemplates(true)
        return
      }
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault()
        const project = state.toProject()
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.atrium.json`
        a.click()
        URL.revokeObjectURL(a.href)
        return
      }
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
        if (palette) {
          setPalette(false)
          return
        }
        if (templates) {
          setTemplates(false)
          return
        }
        if (state.focusMode) {
          state.setFlag('focusMode', false)
          return
        }
        state.select(null)
        state.setPending(null)
        state.clearMeasure()
        state.setWallStart(null)
        return
      }
      if (typing) return
      if (e.key === '.' || e.key === '\\') {
        state.setFlag('focusMode', !state.focusMode)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        state.nudgeSelected(-1, 0)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        state.nudgeSelected(1, 0)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        state.nudgeSelected(0, -1)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        state.nudgeSelected(0, 1)
        return
      }
      if (e.key === 'w' || e.key === 'W') {
        state.setTool('wall')
        return
      }
      if ((e.key === 'd' || e.key === 'D') && !meta) {
        state.setTool('door')
        return
      }
      if (e.key === 'g' || e.key === 'G') {
        state.setTool('window')
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
      if (e.key === 'f' || e.key === 'F') {
        state.fitView()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        state.deleteSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [palette, templates])

  const showPlan = !mobile || tab === 'plan'
  const want3d = !mobile || tab === 'view3d'
  const show3d = allow3d && want3d
  const showViews = !mobile || tab === 'plan' || tab === 'view3d'
  const library = !focusMode && (mobile ? tab === 'catalog' : showLibrary)
  const spec = !focusMode && (mobile ? tab === 'inspect' : showSpec)

  return (
    <div className={`app ${mobile ? 'mobile' : ''} ${focusMode ? 'present' : ''}`}>
      <Header
        compact={mobile}
        onTemplates={() => setTemplates(true)}
        onPalette={() => setPalette(true)}
        onImport={() => fileRef.current?.click()}
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          file.text().then((raw) => {
            const project = readProjectFile(raw)
            if (project) usePlanner.getState().applyProject(project)
          })
          e.target.value = ''
        }}
      />
      <div className={`workspace ${library ? 'has-lib' : ''} ${spec ? 'has-spec' : ''}`}>
        {library && <CatalogPanel onPick={() => mobile && setTab('plan')} />}
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
            <OverlayTools compact={mobile} />
            {(!mobile || tab === 'plan') && !focusMode && <CanvasDock />}
            {(!mobile || tab === 'view3d') && <ViewCameras />}
          </div>
        )}
        {spec && <InspectorPanel />}
      </div>
      {mobile && !focusMode && (
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
      {palette && <CommandPalette onClose={() => setPalette(false)} onOpenTemplates={() => setTemplates(true)} />}
      {templates && <TemplateGallery onClose={() => setTemplates(false)} />}
    </div>
  )
}

function ViewCameras() {
  const mode = usePlanner((s) => s.cameraMode)
  return (
    <div className="cam-switch">
      {(['orbit', 'eye', 'top'] as const).map((id) => (
        <button key={id} type="button" className={mode === id ? 'on' : ''} onClick={() => usePlanner.getState().setCameraMode(id)}>
          {id}
        </button>
      ))}
    </div>
  )
}
