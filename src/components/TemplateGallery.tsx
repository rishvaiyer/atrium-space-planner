import { TEMPLATES } from '../templates'
import { usePlanner } from '../store'

export function TemplateGallery({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="gallery" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <div className="panel-kicker">New project</div>
            <h2>Start from a room</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="gallery-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="template-card"
              onClick={() => {
                usePlanner.getState().loadTemplate(t.id)
                onClose()
              }}
            >
              <strong>{t.name}</strong>
              <em>{t.blurb}</em>
              <span>
                {t.room.width} × {t.room.depth} m · {t.occupancyGroup.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
