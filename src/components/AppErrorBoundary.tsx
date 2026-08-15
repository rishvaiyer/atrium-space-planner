import { Component, type ErrorInfo, type ReactNode } from 'react'

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null }

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : 'The planner failed to start.' }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.warn('ATRIUM crashed', error, info.componentStack)
  }

  render() {
    if (this.state.message) {
      return (
        <div className="crash">
          <h1>ATRIUM</h1>
          <p>The planner hit an error and stopped drawing.</p>
          <pre>{this.state.message}</pre>
          <button type="button" onClick={() => this.setState({ message: null })}>
            Reload planner
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
