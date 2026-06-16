import { useState } from 'react'
import SearchTab   from './SearchTab'
import ArchiveTab  from './ArchiveTab'
import AnalysisTab from './AnalysisTab'

const TABS = [
  { id: 'search',   label: '검색'     },
  { id: 'archive',  label: '아카이브' },
  { id: 'analysis', label: '분석'     },
]

export default function SidePanel() {
  const [active, setActive] = useState('search')

  return (
    <div style={{
      width: 280, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderBottom: '1px solid var(--color-border)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            flex: 1, height: 38, fontSize: 11, cursor: 'pointer',
            background: 'transparent', border: 'none', fontFamily: 'inherit',
            letterSpacing: '0.01em',
            borderBottom: active === t.id
              ? '2px solid var(--color-text-primary)'
              : '2px solid transparent',
            color: active === t.id
              ? 'var(--color-text-primary)'
              : 'var(--color-text-secondary)',
            fontWeight: active === t.id ? 500 : 400,
            transition: 'color .12s',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — 두 탭 모두 마운트 유지, 활성 탭만 표시 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: active === 'search' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
          <SearchTab />
        </div>
        <div style={{ flex: 1, display: active === 'archive' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
          <ArchiveTab />
        </div>
        <div style={{ flex: 1, display: active === 'analysis' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
          <AnalysisTab />
        </div>
      </div>
    </div>
  )
}
