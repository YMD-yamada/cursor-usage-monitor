import { useEffect, useMemo, useState } from 'react'
import { useMonitorData } from './hooks/useMonitorData'
import { UsageCharts, UsageMiniBars } from './components/UsageCharts'
import { UsageBucketStrip } from './components/UsageBuckets'
import { BillingGuide, GuideChip } from './components/BillingGuide'
import {
  clampPercent,
  formatBytes,
  formatUsd,
} from './lib/format'

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

  const planPct = clampPercent(
    usage?.breakdown?.included.percent ??
      usage?.spend.includedPercent ??
      usage?.spend.percentUsed ??
      0,
  )
  const planExhausted = Boolean(usage?.breakdown?.included.exhausted)
  const sysCpu = clampPercent(metrics?.cpu.loadPercent ?? 0)
  const sysMem = clampPercent(metrics?.memory.usedPercent ?? 0)
  const cursorMemPct = clampPercent(metrics?.cursor.memPercent ?? 0)
  const otherMemPct = clampPercent(Math.max(sysMem - cursorMemPct, 0))
  const freeMemPct = clampPercent(100 - sysMem)
  const counts = tasks?.counts

  const usageTone =
    planExhausted || planPct >= 90 ? 'danger' : planPct >= 70 ? 'warn' : 'ok'

  const statusLine = useMemo(() => {
    if (usageError) return usageError
    if (metricsError) return metricsError
    if (tasksError) return tasksError
    if (!usage?.breakdown) return usage?.billing.autoMessage || 'Cursor monitor'
    const b = usage.breakdown
    if (b.included.exhausted) {
      return `プラン枠使い切り · ボーナス ${formatUsd(b.bonus.usedUsd)} · 従量 ${b.onDemand.status}`
    }
    return `プラン枠 残 ${formatUsd(b.included.remainingUsd)} · Auto ${b.auto.percent.toFixed(0)}% · 外部 ${formatUsd(b.named.costUsd)}`
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
          <span className="brand-mark">C</span>
          <span className="brand-text">Monitor</span>
        </div>
        <div className="chrome-actions">
          <button
            type="button"
            className="icon-btn"
            title={expanded ? 'コンパクト表示' : '詳細を開く'}
            onClick={() => void toggle()}
          >
            {expanded ? '▴' : '▾'}
          </button>
          {isElectron && (
            <>
              <button
                type="button"
                className="icon-btn"
                title="右端にスナップ"
                onClick={() => void window.cursorMonitor?.snapRight()}
              >
                ⌐
              </button>
              <button
                type="button"
                className="icon-btn"
                title="最小化（タスクバー）"
                onClick={() => void window.cursorMonitor?.minimize?.()}
              >
                –
              </button>
              <button
                type="button"
                className="icon-btn danger"
                title="トレイに隠す"
                onClick={() => void window.cursorMonitor?.hide()}
              >
                ×
              </button>
            </>
          )}
        </div>
      </header>

      <button type="button" className="hero-hit" onClick={() => void toggle()}>
        <div className={`usage-big tone-${usageTone}`}>
          <span className="usage-num">{usage ? planPct.toFixed(0) : '—'}</span>
          <span className="usage-unit">%</span>
        </div>
        <div className="hero-side">
          <p className="hero-label">プラン枠</p>
          <p className="hero-spend">
            {usage
              ? `${formatUsd(usage.spend.includedUsd)} / ${formatUsd(usage.spend.limitUsd || usage.spend.includedUsd)}${planExhausted ? ' · 使い切り' : ''}`
              : '…'}
          </p>
          <p className="hero-meta mono">
            {usage
              ? `ボーナス ${formatUsd(usage.spend.bonusUsd)} · 外部 ${formatUsd(usage.breakdown?.named.costUsd ?? 0)}`
              : `CPU ${sysCpu.toFixed(0)}% · Tasks ${taskSummary}`}
          </p>
        </div>
      </button>

      {usage?.breakdown ? <UsageBucketStrip usage={usage} /> : null}
      {usage?.guide ? <GuideChip usage={usage} /> : null}

      {usage?.charts?.daily?.length ? (
        <UsageMiniBars daily={usage.charts.daily} />
      ) : (
        <p className="chart-empty compact-empty">
          Usage グラフ待機中…（展開後に詳細グラフ）
        </p>
      )}

      <div className="share-block" title={ramTitle}>
        <div className="share-head">
          <span>RAM</span>
          <span className="mono">
            {metrics
              ? `${sysMem.toFixed(0)}% · C ${cursorMemPct.toFixed(0)}%`
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
                    // Keep the optimistic value if IPC fails.
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
