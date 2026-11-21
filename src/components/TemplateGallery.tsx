import { preserveCurrentProject } from '../layoutOptions'
import { useEffect, useRef, useState } from 'react'
import { PlanPreview } from './PlanPreview'
import { TEMPLATES } from '../templates'
import { usePlanner } from '../store'
import { tip } from './tipAttrs'

export function TemplateGallery({ onClose }: { onClose: () => void }) {
  const [notice, setNotice] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return (
    <dialog ref={dialog} className="gallery-dialog" aria-labelledby="gallery-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="gallery" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <div className="panel-kicker">New project</div>
            <h2 id="gallery-title">Start from a room</h2>
          </div>
          <button type="button" onClick={onClose} {...tip('Close without changing the project')}>
            Close
          </button>
        </header>
        {notice && <p className="product-notice" role="status">{notice}</p>}
        <div className="gallery-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="template-card"
              {...tip(`${t.blurb} — ${t.room.width} × ${t.room.depth} m`)}
              onClick={() => {
                try { preserveCurrentProject(usePlanner.getState().toProject()); usePlanner.getState().loadTemplate(t.id); onClose() }
                catch { setNotice('Your current room could not be backed up. Download it before starting another.') }
              }}
            >
              <PlanPreview project={{ name: t.name, room: t.room, items: t.items() }} />
              <strong>{t.name}</strong>
              <em>{t.blurb}</em>
              <span>
                {t.room.width} × {t.room.depth} m · {t.occupancyGroup.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
