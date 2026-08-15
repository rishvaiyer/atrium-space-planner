import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { applyTheme, readTheme } from './theme'
import './index.css'

applyTheme(readTheme())

createRoot(document.getElementById('root')!).render(
  import.meta.env.DEV ? (
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>
  ) : (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  ),
)
