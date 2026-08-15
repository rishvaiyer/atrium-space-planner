import { tip } from './tipAttrs'

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div className="help-card" role="dialog" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <header className="panel-head">
          <div>
            <div className="panel-kicker">ATRIUM</div>
            <h2 id="help-title">How to plan a space</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close help" {...tip('Close help')}>
            ×
          </button>
        </header>
        <div className="help-body">
          <section>
            <h3>Place furniture</h3>
            <p>
              Open <strong>Library</strong>, pick a fixture, then move over the plan — a ghost shows where it will land
              (red if it hits a wall or another piece). Click to drop. Hold <strong>Shift</strong> to place another of
              the same. Drag a box to multi-select. Drag the blue handle to rotate any angle (Shift snaps 15°). Arrows
              nudge; Alt arrows nudge 2 cm.
            </p>
          </section>
          <section>
            <h3>Real 3D models</h3>
            <p>
              Imported GLBs keep their real size. <strong>Save project</strong> embeds those models in the JSON (up to a
              size cap) so you can Open the file on another computer. Polyfork items save as links. Huge files may be
              skipped — keep the original GLB if the save notes they were omitted.
            </p>
          </section>
          <section>
            <h3>Textures</h3>
            <p>
              Select any fixture, open <strong>Spec</strong>, and pick a photoreal PBR surface (oak, marble, brass,
              velvet, leather, and the rest). Color, normal, and roughness maps wrap the real mesh. Floors and walls
              use the same library.
            </p>
          </section>
          <section>
            <h3>Draw the room</h3>
            <p>
              <strong>W</strong> wall (click two points), <strong>D</strong> door on a wall, <strong>G</strong> window.
              <strong>Select</strong> a piece, then rotate, duplicate, or delete. Drag to move. Pinch or scroll to zoom;
              space / pan tool to pan.
            </p>
          </section>
          <section>
            <h3>Present the room</h3>
            <p>
              <strong>Present</strong> (or <strong>.</strong>) hides the library and spec, letterboxes the 3D view, and
              slowly orbits. <strong>Shot</strong> downloads a PNG of the model. <strong>Eye</strong> is a walkthrough —
              <strong>WASD</strong> to walk, drag to look. Esc leaves present.
            </p>
          </section>
          <section>
            <h3>Files</h3>
            <p>
              <strong>New project</strong> opens templates. <strong>Open file</strong> loads an ATRIUM or AI design JSON.{' '}
              <strong>Save project</strong> downloads the plan. <strong>Print board</strong> opens a printable sheet.{' '}
              <strong>Export place</strong> writes sit-ready JSON for other apps. Work autosaves in this browser.
            </p>
          </section>
          <section>
            <h3>Shortcuts</h3>
            <p>
              ⌘K commands · ⌘O open file · ⌘S save · ⌘Z undo · ⌘D duplicate · R rotate · F fit · V select · H pan · M
              measure · . present · ? this help · Esc cancel.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
