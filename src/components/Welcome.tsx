import { useState } from 'react'

const KEY = 'atrium-welcomed'

/** First-visit card: one sentence, three things to try, out of the way of the room. */
export function Welcome({ onTemplates }: { onTemplates: () => void }) {
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(KEY)
    } catch {
      return true
    }
  })
  if (!open) return null
  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* private mode */
    }
    setOpen(false)
  }
  return (
    <aside className="welcome" role="dialog" aria-label="Welcome to atrium">
      <div className="welcome-kicker">atrium</div>
      <h2>Plan a room in 2D. Walk it in 3D.</h2>
      <p>One model drives both views, the cost, and the code checks. Move anything and everything updates.</p>
      <ul>
        <li><b>Drag</b> a chair on the plan</li>
        <li><b>Eye</b> to walk the room at head height</li>
        <li><kbd>.</kbd> to present, <kbd>⌘K</kbd> for everything</li>
      </ul>
      <div className="welcome-actions">
        <button type="button" className="primary" onClick={close}>Explore the café</button>
        <button type="button" onClick={() => { close(); onTemplates() }}>Pick another room</button>
      </div>
    </aside>
  )
}
