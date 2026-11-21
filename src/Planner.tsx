import { PlanningBrief } from './components/PlanningBrief'
import { preserveCurrentProject } from './layoutOptions'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { shallow } from 'zustand/shallow'
import { CanvasDock } from './components/CanvasDock'
import { CatalogPanel } from './components/CatalogPanel'
import { CommandPalette } from './components/CommandPalette'
import { FloorPlan2D } from './components/FloorPlan2D'
import { GLBoundary } from './components/GLBoundary'
import { Header } from './components/Header'
import { TooltipHost } from './components/Tip'
import { tip } from './components/tipAttrs'
import { HelpModal } from './components/HelpModal'
import { InspectorPanel } from './components/InspectorPanel'
import { OverlayTools } from './components/OverlayTools'
import { TemplateGallery } from './components/TemplateGallery'
import { LayoutOptions } from './components/LayoutOptions'
import type { ProjectFile } from './project'
import { clearAllLocalData, hydrateGlbLibrary } from './glbLibrary'
import { useIsMobile } from './media'
import { downloadJson, PROJECT_KEY, readProjectFile } from './project'
import { createProjectAutosave } from './projectAutosave'
import { readOpenFile } from './design'
import { usePlanner } from './store'

const Viewport3D = lazy(async () => {
  const mod = await import('./components/Viewport3D')
  return { default: mod.Viewport3D }
})

type MobileTab = 'plan' | 'view3d' | 'catalog' | 'inspect'

export default function Planner({
  initialTemplate,
  initialProject,
  onHome,
}: {
  initialTemplate?: string
  initialProject?: ProjectFile
  onHome: () => void
}) {
  const mobile = useIsMobile()
  const showLibrary = usePlanner((s) => s.showLibrary)
  const showSpec = usePlanner((s) => s.showSpec)
  const focusMode = usePlanner((s) => s.focusMode)
  const [tab, setTab] = useState<MobileTab>('plan')
  const [allow3d, setAllow3d] = useState(false)
  const [view, setView] = useState<'split' | 'plan' | 'model'>('model')
  const [brief, setBrief] = useState(false)
  const [options, setOptions] = useState(false)
  const [palette, setPalette] = useState(false)
  const [templates, setTemplates] = useState(false)
  const [help, setHelp] = useState(false)
  const [ready, setReady] = useState(false)
  const [storageFailure, setStorageFailure] = useState(false)
  const [projectNotice, setProjectNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const didRestore = useRef(false)
  const importing = useRef(false)
  const autosave = useRef<ReturnType<typeof createProjectAutosave>>(null)

  useEffect(() => {
    if (!focusMode) return
    setView('model')
    setTab('view3d')
    usePlanner.getState().setCameraMode('orbit')
  }, [focusMode])

  useEffect(() => {
    if (didRestore.current) return
    didRestore.current = true
    async function restore() {
      try {
        await hydrateGlbLibrary()
        if (initialTemplate) usePlanner.getState().loadTemplate(initialTemplate)
        else if (initialProject) await usePlanner.getState().applyProject(initialProject)
        else {
          const raw = localStorage.getItem(PROJECT_KEY)
          if (raw) {
            const project = readProjectFile(raw)
            if (!project) {
              setProjectNotice('The saved room could not be reopened. Open a project file to recover it.')
              return
            }
            await usePlanner.getState().applyProject(project)
          }
        }
        try {
          localStorage.setItem(PROJECT_KEY, JSON.stringify(usePlanner.getState().toProject()))
        } catch {
          setStorageFailure(true)
        }
      } catch {
        setProjectNotice('Your room could not be reopened. Open a project file to recover it.')
      } finally {
        setReady(true)
      }
    }
    void restore()
  }, [initialTemplate, initialProject])

  useEffect(() => {
    const save = createProjectAutosave(
      (project) => localStorage.setItem(PROJECT_KEY, JSON.stringify(project)),
      setStorageFailure,
    )
    autosave.current = save
    let previous = usePlanner.getState().toProject()
    const unsub = usePlanner.subscribe(() => {
      const current = usePlanner.getState().toProject()
      if (shallow(current, previous)) return
      previous = current
      save.schedule(current)
    })
    const saveOnExit = () => {
      save.flush()
    }
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') saveOnExit()
    }
    window.addEventListener('pagehide', saveOnExit)
    document.addEventListener('visibilitychange', saveWhenHidden)
    return () => {
      unsub()
      window.removeEventListener('pagehide', saveOnExit)
      document.removeEventListener('visibilitychange', saveWhenHidden)
      save.cancel()
      autosave.current = null
    }
  }, [])

  const downloadProject = useCallback(async () => {
    try {
      const project = await usePlanner.getState().exportProject()
      downloadJson(`${project.name.replace(/\s+/g, '-').toLowerCase()}.atrium.json`, project)
      setProjectNotice('')
    } catch {
      setProjectNotice('The project file could not be saved. Try again before closing the planner.')
    }
  }, [])

  async function openProject(file: File) {
    if (importing.current) return
    importing.current = true
    setProjectNotice('')
    try {
      const raw = await file.text()
      const project = readProjectFile(raw) ?? readOpenFile(raw)
      if (!project) {
        setProjectNotice('This file could not be opened. Choose an ATRIUM project or room recipe.')
        return
      }
      setReady(false)
      preserveCurrentProject(await usePlanner.getState().exportProject())
      await usePlanner.getState().applyProject(project)
    } catch {
      setProjectNotice('The project could not be opened. Try another project file.')
    } finally {
      importing.current = false
      setReady(true)
    }
  }

  function resetProject() {
    if (
      !confirm(
        'Clear the saved project and every imported or generated model from this browser, and start empty? This cannot be undone.',
      )
    )
      return
    try {
      clearAllLocalData()
      // A reload after clearing storage must not flush the previous project back.
      autosave.current?.cancel()
      location.reload()
    } catch {
      setProjectNotice(
        'Project data could not be cleared. Check your browser storage settings and try again.',
      )
    }
  }

  useEffect(() => {
    let inner = 0
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        setAllow3d(true)
        usePlanner.getState().fitView()
      })
    })
    return () => {
      window.cancelAnimationFrame(outer)
      window.cancelAnimationFrame(inner)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!ready) return
      const state = usePlanner.getState()
      const meta = e.metaKey || e.ctrlKey
      const el = e.target as HTMLElement
      const typing = el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
      if (typing) return
      if (options || templates || brief) return
      if ((help || palette) && e.key !== 'Escape') return

      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((v) => !v)
        return
      }
      if (meta && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        fileRef.current?.click()
        return
      }
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setTemplates(true)
        return
      }
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void downloadProject()
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
        if (help) {
          setHelp(false)
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
        if (options) {
          setOptions(false)
          return
        }
        state.clearMeasure()
        state.setWallStart(null)
        return
      }
      if (state.cameraMode === 'eye' && !meta && ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        return
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setHelp((v) => !v)
        return
      }
      if (e.key === '.' || e.key === '\\') {
        state.setFlag('focusMode', !state.focusMode)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        state.nudgeSelected(-1, 0, e.altKey)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        state.nudgeSelected(1, 0, e.altKey)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        state.nudgeSelected(0, -1, e.altKey)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        state.nudgeSelected(0, 1, e.altKey)
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
  }, [palette, templates, help, options, brief, ready, downloadProject])

  const showPlan = mobile ? tab === 'plan' : view !== 'model'
  const want3d = mobile ? tab === 'view3d' : view !== 'plan'
  const show3d = allow3d && want3d
  const showViews = !mobile || tab === 'plan' || tab === 'view3d'
  const library = !focusMode && (mobile ? tab === 'catalog' : showLibrary)
  const spec = !focusMode && (mobile ? tab === 'inspect' : showSpec)

  if (!ready)
    return (
      <div className="studio-loading" role="status">
        <b>atrium</b>
        <p>Opening your room and furniture…</p>
      </div>
    )

  return (
    <div className={`app ${mobile ? 'mobile' : ''} ${focusMode ? 'present' : ''}`}>
      <Header
        onHome={() => {
          autosave.current?.flush()
          onHome()
        }}
        onOptions={() => setOptions(true)}
        onBrief={() => setBrief(true)}
        compact={mobile}
        onTemplates={() => setTemplates(true)}
        onPalette={() => setPalette(true)}
        onImport={() => fileRef.current?.click()}
        onSave={downloadProject}
        onReset={resetProject}
        onHelp={() => setHelp(true)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
          if (!file) return
          e.currentTarget.value = ''
          void openProject(file)
        }}
      />
      <div className="project-notices" role="status">
        {storageFailure && (
          <p>
            This browser could not save or reopen local data.
            <button type="button" onClick={() => void downloadProject()}>
              Save project file
            </button>
          </p>
        )}
        {projectNotice && <p>{projectNotice}</p>}
      </div>
      {!mobile && (
        <div className="studio-toolbar">
          <div className="studio-view-tabs" role="group" aria-label="Workspace view">
            {(['split', 'plan', 'model'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                className={view === value ? 'active' : ''}
                onClick={() => setView(value)}
              >
                {value === 'split' ? 'Plan + 3D' : value === 'plan' ? 'Floor plan' : '3D room'}
              </button>
            ))}
          </div>
          <div className="studio-pane-tabs">
            <button
              type="button"
              aria-pressed={showLibrary}
              onClick={() => usePlanner.getState().setFlag('showLibrary', !showLibrary)}
            >
              Furniture
            </button>
            <button
              type="button"
              aria-pressed={showSpec}
              onClick={() => usePlanner.getState().setFlag('showSpec', !showSpec)}
            >
              Details + cost
            </button>
          </div>
          <button type="button" onClick={() => setOptions(true)}>
            Save an option
          </button>
        </div>
      )}
      <div className={`workspace ${library ? 'has-lib' : ''} ${spec ? 'has-spec' : ''}`}>
        {library && <CatalogPanel onPick={() => mobile && setTab('plan')} />}
        {showViews && (
          <div className={`views ${!mobile && view !== 'split' ? 'single-view' : ''}`}>
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
            <OverlayTools compact={mobile} modelOnly={!showPlan} />
            {showPlan && !focusMode && <CanvasDock />}
            {(!mobile || tab === 'view3d') && <ViewCameras />}
          </div>
        )}
        {spec && <InspectorPanel />}
      </div>
      {mobile && !focusMode && (
        <nav className="mobile-tabs">
          <button
            type="button"
            className={tab === 'plan' ? 'on' : ''}
            {...tip('2D floor plan')}
            onClick={() => setTab('plan')}
          >
            Plan
          </button>
          <button
            type="button"
            className={tab === 'view3d' ? 'on' : ''}
            {...tip('3D view of the room')}
            onClick={() => setTab('view3d')}
          >
            3D
          </button>
          <button
            type="button"
            className={tab === 'catalog' ? 'on' : ''}
            {...tip('Fixture library')}
            onClick={() => setTab('catalog')}
          >
            Library
          </button>
          <button
            type="button"
            className={tab === 'inspect' ? 'on' : ''}
            {...tip('Specs, cost, and textures')}
            onClick={() => setTab('inspect')}
          >
            Details
          </button>
        </nav>
      )}
      {palette && (
        <CommandPalette
          onClose={() => setPalette(false)}
          onOpenTemplates={() => setTemplates(true)}
          onHelp={() => setHelp(true)}
        />
      )}
      {brief && <PlanningBrief onClose={() => setBrief(false)} />}
      {options && <LayoutOptions onClose={() => setOptions(false)} />}
      {templates && <TemplateGallery onClose={() => setTemplates(false)} />}
      {help && <HelpModal onClose={() => setHelp(false)} />}
      <TooltipHost />
    </div>
  )
}

function ViewCameras() {
  const mode = usePlanner((s) => s.cameraMode)
  return (
    <div className="cam-switch">
      {(['orbit', 'eye', 'top'] as const).map((id) => (
        <button
          key={id}
          type="button"
          className={mode === id ? 'on' : ''}
          {...tip(
            id === 'orbit'
              ? 'Orbit camera — drag to look around'
              : id === 'eye'
                ? 'Eye-level walkthrough. WASD to walk, drag to look'
                : 'Top-down camera',
          )}
          onClick={() => usePlanner.getState().setCameraMode(id)}
        >
          {id === 'orbit' ? 'Rotate' : id === 'eye' ? 'Eye level' : 'Top'}
        </button>
      ))}
      <button
        type="button"
        onClick={() => usePlanner.setState((s) => ({ viewEpoch: s.viewEpoch + 1 }))}
        {...tip('Fit the whole room in this view')}
      >
        Fit
      </button>
      <button
        type="button"
        {...tip('Download a PNG of this 3D view')}
        onClick={() => usePlanner.getState().requestShot()}
      >
        Save image
      </button>
    </div>
  )
}
