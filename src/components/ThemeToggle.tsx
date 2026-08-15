import { useEffect, useState } from 'react'
import { applyTheme, readTheme, toggleTheme, type Theme } from '../theme'
import { Icon } from './Icon'

export function ThemeToggle({ large = false }: { large?: boolean }) {
  const [theme, setTheme] = useState<Theme>(() => (typeof document === 'undefined' ? 'light' : readTheme()))

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${large ? 'large' : ''} ${theme}`}
      onClick={() => setTheme(toggleTheme())}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      <span>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </span>
    </button>
  )
}
