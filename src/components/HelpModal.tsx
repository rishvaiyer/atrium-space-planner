export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div className="help-card" role="dialog" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <header className="panel-head">
          <div>
            <div className="panel-kicker">ATRIUM</div>
            <h2 id="help-title">How to plan a space</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close help">
            ×
          </button>
        </header>
        <div className="help-body">
          <section>
            <h3>Place furniture</h3>
            <p>
              Open <strong>Library</strong>, pick a fixture, then tap the 2D plan or 3D floor. The next click drops it.
              Search works across names, SKUs, and tags (try “piano”).
            </p>
          </section>
          <section>
            <h3>Real 3D models</h3>
            <p>
              Built-in items use detailed meshes (piano keys, sofa cushions, beds). For photoreal GLBs, open the{' '}
              <strong>Models</strong> tab: choose files from your computer, a whole folder of <code>.glb</code> files, or
              search Polyfork (paste your token from polyfork.dev/account). The browser cannot read your Desktop by itself —
              you pick the folder once.
            </p>
          </section>
          <section>
            <h3>Textures</h3>
            <p>
              Select any fixture, open <strong>Spec</strong>, and pick a surface: oak, marble, brass, velvet, leather, and
              dozens more. The map wraps the real 3D mesh (and imported GLBs), not a replacement box. Pair with Color to
              tint. Set Texture to none to restore the default finish.
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
              measure · ? this help · Esc cancel.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
