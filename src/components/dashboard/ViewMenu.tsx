import { useEffect, useRef } from 'react'
import {
  DETAIL_ITEMS,
  VIEW_WIDGETS,
  type DetailId,
  type ViewPrefs,
  type ViewWidget,
} from '../../lib/viewPrefs'

type Props = {
  open: boolean
  prefs: ViewPrefs
  onToggleOpen: () => void
  onClose: () => void
  onToggleWidget: (id: ViewWidget) => void
  onOpenDetail: (id: DetailId) => void
  onReset: () => void
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <title>表示</title>
      <path
        d="M3 4.5H13M3 8H13M3 11.5H13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ViewMenu({
  open,
  prefs,
  onToggleOpen,
  onClose,
  onToggleWidget,
  onOpenDetail,
  onReset,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div className="view-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`icon-btn ${open ? 'is-open' : ''}`}
        title="表示とくわしく"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggleOpen}
      >
        <MenuGlyph />
      </button>
      {open && (
        <div className="view-menu" role="menu" aria-label="表示とくわしく">
          <p className="view-menu-kicker">画面に出す</p>
          {VIEW_WIDGETS.map((row) => (
            <label key={row.id} className="view-menu-check" role="menuitemcheckbox">
              <input
                type="checkbox"
                checked={prefs.widgets[row.id]}
                onChange={() => onToggleWidget(row.id)}
              />
              <span>{row.label}</span>
            </label>
          ))}
          <p className="view-menu-kicker">くわしく</p>
          {DETAIL_ITEMS.map((row) => (
            <button
              key={row.id}
              type="button"
              className="view-menu-item"
              role="menuitem"
              onClick={() => onOpenDetail(row.id)}
            >
              {row.label}
            </button>
          ))}
          <button
            type="button"
            className="view-menu-item muted"
            role="menuitem"
            onClick={onReset}
          >
            表示を標準に戻す
          </button>
        </div>
      )}
    </div>
  )
}
