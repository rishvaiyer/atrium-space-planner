import { Component, type ReactNode } from 'react'

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null }

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : 'The planner failed to start.' }
  }

  render() {
    if (this.state.message) {
      return (
        <div className="crash">
          <h1>ATRIUM</h1>
          <p>The planner hit an error and stopped drawing.</p>
          <pre>{this.state.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
