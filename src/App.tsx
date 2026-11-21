import { lazy, Suspense, useRef, useState } from 'react'
import cafeImage from './assets/atrium-cafe.webp'
import { PlanPreview } from './components/PlanPreview'
import { TEMPLATES } from './templates'
import { PROJECT_KEY, readProjectFile, downloadJson, type ProjectFile } from './project'
import {
  archiveInvalidStorage,
  preserveCurrentProject,
  readLayoutOptions,
  type RecoveryFiles,
  type LayoutOption,
} from './layoutOptions'
import { ThemeToggle } from './components/ThemeToggle'

const Planner = lazy(() => import('./Planner'))

function readHomeState(): {
  latest: ProjectFile | null
  options: LayoutOption[]
  notice: string
  recovery: RecoveryFiles | null
} {
  try {
    const raw = localStorage.getItem(PROJECT_KEY)
    const latest = raw ? readProjectFile(raw) : null
    const recovery: RecoveryFiles = {}
    let options: LayoutOption[] = []
    if (raw && !latest) recovery.project = raw
    try {
      options = readLayoutOptions()
    } catch {
      recovery.options = localStorage.getItem('atrium-layout-options-v1') ?? ''
    }
    const needsRecovery = Object.keys(recovery).length > 0
    return {
      latest,
      options,
      notice: needsRecovery
        ? 'Some saved data could not be reopened. Keep a recovery copy, then back it up to start again.'
        : '',
      recovery: needsRecovery ? recovery : null,
    }
  } catch {
    return {
      latest: null,
      options: [],
      notice: 'Browser storage could not be read. You can still open a project file.',
      recovery: null,
    }
  }
}

export default function App() {
  const [editing, setEditing] = useState(location.hash === '#studio')
  const [template, setTemplate] = useState<string>()
  const [opening, setOpening] = useState<ProjectFile>()
  const [saved, setSaved] = useState(readHomeState)
  const { latest, options, notice, recovery } = saved
  const file = useRef<HTMLInputElement>(null)
  const setNotice = (message: string) => setSaved((previous) => ({ ...previous, notice: message }))

  function start(id?: string, project?: ProjectFile) {
    try {
      if (id || project) preserveCurrentProject()
    } catch {
      setNotice(
        'Your current room could not be backed up. Continue it and download a project file before starting another.',
      )
      return
    }
    setTemplate(id)
    setOpening(project)
    history.replaceState(null, '', '#studio')
    setEditing(true)
  }

  function home() {
    history.replaceState(null, '', location.pathname + location.search)
    setSaved(readHomeState())
    setEditing(false)
  }

  if (editing) {
    return (
      <Suspense
        fallback={
          <div className="studio-loading" role="status">
            <b>atrium</b>
            <p>Opening your studio…</p>
          </div>
        }
      >
        <Planner initialTemplate={template} initialProject={opening} onHome={home} />
      </Suspense>
    )
  }

  return (
    <div className="project-home">
      <header className="home-header">
        <a className="atrium-wordmark" href={location.pathname} aria-label="Atrium home">
          <span className="atrium-symbol" aria-hidden="true">
            a
          </span>
          atrium
        </a>
        <nav aria-label="Home navigation">
          <a href="#your-work">Your work</a>
          <button type="button" onClick={() => file.current?.click()}>
            Open a file
          </button>
          <ThemeToggle />
        </nav>
      </header>
      <main className="home-content">
        <section className="home-intro">
          <div className="home-intro-copy">
            <p className="home-purpose">Space planning for cafés, studios and small venues</p>
            <h1>
              Find a layout
              <br />
              worth building.
            </h1>
            <p className="home-lede">
              Arrange the room. Walk through it. Compare the cost. Take a clear plan into your next
              conversation.
            </p>
            <div className="home-actions">
              <button className="product-primary" type="button" onClick={() => start('cafe')}>
                Start with the café <span aria-hidden="true">↗</span>
              </button>
              {latest && (
                <button type="button" onClick={() => start()}>
                  Continue your project
                </button>
              )}
            </div>
            <p className="home-storage">Saved in this browser · Download your work anytime</p>
          </div>
          <figure className="home-art">
            <img
              src={cafeImage}
              width="1320"
              height="880"
              alt="Architectural concept of a café with olive seating, timber walls and a red counter"
              fetchPriority="high"
            />
            <figcaption>Café design study · Concept artwork</figcaption>
          </figure>
        </section>

        <section className="home-work" id="your-work" aria-labelledby="work-heading">
          <div className="section-heading">
            <div>
              <h2>Your work</h2>
              <p>Pick up your room or explore another arrangement.</p>
            </div>
            <button type="button" onClick={() => start('empty')}>
              New blank room <span aria-hidden="true">+</span>
            </button>
          </div>
          {notice && (
            <div className="product-notice" role="status">
              {notice}
              {recovery && (
                <>
                  <button type="button" onClick={() => downloadJson('atrium-recovery.json', recovery)}>
                    Download recovery copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        archiveInvalidStorage()
                        downloadJson('atrium-recovery.json', recovery)
                        setSaved(readHomeState())
                        start('empty')
                      } catch {
                        setNotice(
                          'Your recovery data could not be backed up. Download a copy before trying again.',
                        )
                      }
                    }}
                  >
                    Back up and start again
                  </button>
                </>
              )}
            </div>
          )}
          {latest || options.length ? (
            <div className="recent-projects">
              {latest && (
                <button className="recent-project" type="button" onClick={() => start()}>
                  <PlanPreview project={latest} />
                  <span>
                    <strong>{latest.name || 'Untitled room'}</strong>
                    <em>Current project</em>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              )}
              {options.slice(0, 5).map((option) => (
                <button
                  key={option.id}
                  className="recent-project"
                  type="button"
                  onClick={() => start(undefined, option.project)}
                >
                  <PlanPreview project={option.project} />
                  <span>
                    <strong>{option.project.name || 'Untitled option'}</strong>
                    <em>
                      Saved{' '}
                      {new Date(option.savedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </em>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <p>Your projects will appear here.</p>
              <p>
                Start with a room below. Move a piece of furniture and see the plan, model and estimate change
                together.
              </p>
            </div>
          )}
        </section>

        <section className="home-start" aria-labelledby="start-heading">
          <div className="section-heading">
            <div>
              <h2>Start with a space</h2>
              <p>Real dimensions, editable furniture and a working budget.</p>
            </div>
          </div>
          <div className="starter-grid">
            {TEMPLATES.filter((t) => ['cafe', 'office', 'waiting', 'hotel'].includes(t.id)).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`starter starter-${t.id}`}
                onClick={() => start(t.id)}
              >
                <PlanPreview project={{ name: t.name, room: t.room, items: t.items() }} />
                <div>
                  <strong>{t.name}</strong>
                  <span>
                    {t.room.width.toFixed(1)} × {t.room.depth.toFixed(1)} m <span aria-hidden="true">↗</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="home-how" aria-label="What you can do">
          <div>
            <h2>Work at room scale.</h2>
            <p>
              Draw walls, place furniture and change finishes. The floor plan and 3D model share the same
              measurements.
            </p>
          </div>
          <div>
            <h2>Compare before committing.</h2>
            <p>
              Save different arrangements. Put seats, area and estimated cost side by side before picking a
              direction.
            </p>
          </div>
          <div>
            <h2>Bring a clear proposal.</h2>
            <p>
              Export your project, download a furniture list or print a client board with the plan and
              estimate.
            </p>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <span>atrium · Space planner</span>
        <span>Works in your browser</span>
        <a href="https://rishva.up.railway.app/">Rishva Iyer</a>
      </footer>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (event) => {
          const selected = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (!selected) return
          try {
            const project = readProjectFile(await selected.text())
            if (!project) throw new Error('Invalid project')
            start(undefined, project)
          } catch {
            setNotice('That file could not be opened. Choose an Atrium project file.')
            document.getElementById('your-work')?.scrollIntoView()
          }
        }}
      />
    </div>
  )
}
