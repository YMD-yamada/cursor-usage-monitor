import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMonitorData } from './hooks/useMonitorData'
import { UsageCharts, UsageMiniBars } from './components/UsageCharts'
import { BillingGuide, GuideChip } from './components/BillingGuide'
import { DualPoolHero } from './components/UsageHero'
import {
  clampPercent,
  formatBytes,
} from './lib/format'

function ChromeGlyph({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <title>{title}</title>
      {children}
    </svg>
  )
}

export default function App() {
  const {
    usage,
    metrics,
    tasks,
    usageError,
    metricsError,
    tasksError,
    refreshUsage,
    refreshingUsage,
  } = useMonitorData()
  const [expanded, setExpanded] = useState(false)
  const [autostart, setAutostart] = useState(true)
  const isElectron = Boolean(window.cursorMonitor?.isElectron)

  useEffect(() => {
    if (!window.cursorMonitor) return
    void window.cursorMonitor.getState().then((s) => {
      setExpanded(s.expanded)
      if (typeof s.autostart === 'boolean') setAutostart(s.autostart)
    })
    return window.cursorMonitor.onExpanded(setExpanded)
  }, [])

  const cursorPct = clampPercent(
    usage?.breakdown?.cursorModels?.percent ??
      usage?.breakdown?.auto?.percent ??
      usage?.spend.autoPercentUsed ??
      0,
  )
  const otherPct = clampPercent(
    usage?.breakdown?.otherModels?.percent ??
      usage?.breakdown?.named?.percent ??
      usage?.spend.apiPercentUsed ??
      0,
  )
  const sysMem = clampPercent(metrics?.memory.usedPercent ?? 0)
  const cursorMemPct = clampPercent(metrics?.cursor.memPercent ?? 0)
  const otherMemPct = clampPercent(Math.max(sysMem - cursorMemPct, 0))
  const freeMemPct = clampPercent(100 - sysMem)
  const counts = tasks?.counts

  const statusLine = useMemo(() => {
    if (usageError) return usageError
    if (metricsError) return metricsError
    if (tasksError) return tasksError
    if (!usage?.breakdown) return usage?.billing.autoMessage || 'Usageboard'
    const b = usage.breakdown
    const cm = b.cursorModels?.percent ?? b.auto.percent
    const om = b.otherModels?.percent ?? b.named.percent
    return `Cursor Models ${cm.toFixed(0)}% · Other Models ${om.toFixed(0)}% · 従量 ${b.onDemand.status}`
  }, [usage, usageError, metricsError, tasksError])
  const taskSummary = useMemo(() => {
    if (!counts) return '…'
    const parts = []
    if (counts.running) parts.push(`実行${counts.running}`)
    if (counts.waiting) parts.push(`待機${counts.waiting}`)
    if (counts.unread) parts.push(`未読${counts.unread}`)
    if (!parts.length) return '静か'
    return parts.join(' ')
  }, [counts])

  const ramTitle = metrics
    ? `RAM ${sysMem.toFixed(0)}% · Cursor ${cursorMemPct.toFixed(0)}% · 他 ${otherMemPct.toFixed(0)}% · 空き ${freeMemPct.toFixed(0)}%`
    : 'RAM …'

  async function toggle() {
    if (window.cursorMonitor) {
      const next = await window.cursorMonitor.toggleExpanded()
      setExpanded(next.expanded)
      return
    }
    setExpanded((v) => !v)
  }

  return (
    <div className={`widget ${expanded ? 'is-expanded' : 'is-compact'}`}>
      <header className="widget-chrome">
        <div
          className="drag-handle"
          title="ここをドラッグして移動"
          onPointerDown={(e) => {
            if (!window.cursorMonitor?.startDrag) return
            if (e.button !== 0) return
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            window.cursorMonitor.startDrag()
          }}
          onPointerUp={() => window.cursorMonitor?.endDrag?.()}
          onPointerCancel={() => window.cursorMonitor?.endDrag?.()}
          onLostPointerCapture={() => window.cursorMonitor?.endDrag?.()}
        >
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">Usageboard</span>
        </div>
        <div className="chrome-actions">
          <button
            type="button"
            className="icon-btn"
            title={expanded ? 'コンパクト表示' : '詳細を開く'}
            onClick={() => void toggle()}
          >
            <ChromeGlyph title={expanded ? 'コンパクト' : '詳細'}>
              {expanded ? (
                <path
                  d="M4 10.5L8 6.5L12 10.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M4 6.5L8 10.5L12 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </ChromeGlyph>
          </button>
          {isElectron && (
            <>
              <button
                type="button"
                className="icon-btn"
                title="右端にスナップ"
                onClick={() => void window.cursorMonitor?.snapRight()}
              >
                <ChromeGlyph title="右端にスナップ">
                  <rect
                    x="3"
                    y="3.5"
                    width="10"
                    height="9"
                    rx="1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M9 3.5V12.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                </ChromeGlyph>
              </button>
              <button
                type="button"
                className="icon-btn"
                title="最小化（タスクバー）"
                onClick={() => void window.cursorMonitor?.minimize?.()}
              >
                <ChromeGlyph title="最小化">
                  <path
                    d="M3.5 12.5H12.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </ChromeGlyph>
              </button>
              <button
                type="button"
                className="icon-btn danger"
                title="トレイに隠す"
                onClick={() => void window.cursorMonitor?.hide()}
              >
                <ChromeGlyph title="トレイに隠す">
                  <path
                    d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </ChromeGlyph>
              </button>
            </>
          )}
        </div>
      </header>

      <DualPoolHero
        cursorPct={cursorPct}
        otherPct={otherPct}
        cursorExhausted={Boolean(usage?.breakdown?.cursorModels?.exhausted)}
        otherExhausted={Boolean(usage?.breakdown?.otherModels?.exhausted)}
        onDemandAllowed={usage?.breakdown?.onDemand.allowed}
        loading={!usage}
        onToggle={() => void toggle()}
      />

      {usage?.guide ? <GuideChip usage={usage} /> : null}

      {usage?.charts?.daily?.length ? (
        <UsageMiniBars daily={usage.charts.daily} />
      ) : (
        <p className="chart-empty compact-empty">
          {taskSummary === '静か' ? '14日グラフを準備中' : `Tasks ${taskSummary}`}
        </p>
      )}

      <div className="share-block" title={ramTitle}>
        <div className="share-head">
          <span>この PC の RAM</span>
          <span className="mono">
            {metrics
              ? `${sysMem.toFixed(0)}% · Cursor ${cursorMemPct.toFixed(0)}%`
              : '…'}
          </span>
        </div>
        <div className="share-track" aria-label={ramTitle}>
          <span
            className="seg cursor"
            style={{ width: `${cursorMemPct}%` }}
          />
          <span className="seg other" style={{ width: `${otherMemPct}%` }} />
          <span className="seg free" style={{ width: `${freeMemPct}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="expanded-body">
          <p className="status-line">{statusLine}</p>
          {usage ? <BillingGuide usage={usage} /> : null}
          <UsageCharts usage={usage} />
          <div className="share-legend mono">
            <span>
              <i className="dot cursor" />
              Cursor {formatBytes(metrics?.cursor.totalWorkingSetBytes || 0)}
            </span>
            <span>
              <i className="dot other" />
              他アプリ{' '}
              {formatBytes(
                Math.max(
                  (metrics?.memory.usedBytes || 0) -
                    (metrics?.cursor.totalWorkingSetBytes || 0),
                  0,
                ),
              )}
            </span>
            <span>
              <i className="dot free" />
              空き {formatBytes(metrics?.memory.freeBytes || 0)}
            </span>
          </div>
          <label className="autostart-row">
            <input
              type="checkbox"
              checked={autostart}
              onChange={(e) => {
                const next = e.target.checked
                setAutostart(next)
                void window.cursorMonitor?.setAutostart?.(next)
                  .then((r) => {
                    if (typeof r?.autostart === 'boolean') setAutostart(r.autostart)
                  })
                  .catch(() => {
                    setAutostart(next)
                  })
              }}
            />
            <span>ログイン時に自動起動</span>
          </label>
          <div className="expanded-actions">
            <button
              type="button"
              className="text-btn"
              disabled={refreshingUsage}
              onClick={() => refreshUsage()}
            >
              {refreshingUsage ? '更新中…' : '再取得'}
            </button>
            {isElectron && (
              <button
                type="button"
                className="text-btn quit-btn"
                onClick={() => void window.cursorMonitor?.quit()}
              >
                終了
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
