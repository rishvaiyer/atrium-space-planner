import { Component, type ErrorInfo, type ReactNode } from 'react'

export class GLBoundary extends Component<{ children: ReactNode }, { failed: boolean; message: string }> {
  state = { failed: false, message: '' }

  static getDerivedStateFromError(error: unknown) {
    return {
      failed: true,
      message: error instanceof Error ? error.message : 'WebGL failed',
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.warn('ATRIUM 3D stopped', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="viewport3d webgl-fallback">
          <p>3D stopped so the 2D plan can keep running.</p>
          <p className="hint">{this.state.message}</p>
          <button type="button" onClick={() => this.setState({ failed: false, message: '' })}>
            Retry 3D
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
