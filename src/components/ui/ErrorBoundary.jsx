import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 16,
        background: 'var(--color-bg, #fff)',
        fontFamily: 'inherit',
      }}>
        <div style={{ fontSize: 32 }}>🎵</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary, #111)' }}>
          문제가 발생했어요
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #888)', maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
          예기치 않은 오류가 발생했습니다.<br />
          페이지를 새로고침하면 해결될 수 있어요.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 4, padding: '8px 24px', borderRadius: 6,
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            background: 'var(--color-text-primary, #111)',
            color: '#fff', border: 'none',
          }}
        >
          새로고침
        </button>
      </div>
    )
  }
}
