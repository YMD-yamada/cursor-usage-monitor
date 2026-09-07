import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

/** Keeps the Electron shell visible when a panel throws (e.g. missing import). */
export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Usageboard]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="widget widget-error">
          <p className="widget-error-title">Usageboard for Cursor</p>
          <p className="widget-error-body">
            表示エラーが起きました。下のボタンで復旧できます。
          </p>
          <p className="widget-error-detail mono">{this.state.error.message}</p>
          <button
            type="button"
            className="text-btn"
            onClick={() => this.setState({ error: null })}
          >
            再試行
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
