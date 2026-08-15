export type Theme = 'light' | 'dark'

const KEY = 'atrium-theme'

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* private mode */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#111113' : '#f4f4f2')
}

export function persistTheme(theme: Theme) {
  applyTheme(theme)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = readTheme() === 'dark' ? 'light' : 'dark'
  persistTheme(next)
  return next
}
