import { useEffect, useState } from 'react'
import { applyTheme, readTheme, toggleTheme, type Theme } from '../theme'
import { Icon } from './Icon'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (typeof document === 'undefined' ? 'light' : readTheme()))

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const sync = () => setTheme(readTheme())
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setTheme(toggleTheme())}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
