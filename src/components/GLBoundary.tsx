import { Component, type ReactNode } from 'react'

export class GLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="webgl-fallback">
          3D could not start on this phone. Open the Plan tab for the floor layout.
        </div>
      )
    }
    return this.props.children
  }
}
