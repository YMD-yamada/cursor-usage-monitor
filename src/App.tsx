import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMonitorData } from './hooks/useMonitorData'
import { ExpandedDashboard } from './components/dashboard/ExpandedDashboard'
import { ViewMenu } from './components/dashboard/ViewMenu'
import { clampPercent } from './lib/format'
import {
  DEFAULT_VIEW_PREFS,
  loadViewPrefs,
  saveViewPrefs,
  type DetailId,
  type ViewPrefs,
  type ViewWidget,
} from './lib/viewPrefs'

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
    account,
    usageError,
    metricsError,
    tasksError,
    refreshUsage,
    refreshingUsage,
  } = useMonitorData()
  const [autostart, setAutostart] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [detail, setDetail] = useState<DetailId | null>(null)
  const [viewPrefs, setViewPrefs] = useState<ViewPrefs>(() => loadViewPrefs())
  const isElectron = Boolean(window.cursorMonitor?.isElectron)

  useEffect(() => {
    if (!window.cursorMonitor) return
    void window.cursorMonitor.getState().then((s) => {
      if (typeof s.autostart === 'boolean') setAutostart(s.autostart)
    })
  }, [])

  useEffect(() => {
    if (!detail) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDetail(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [detail])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  function persistPrefs(next: ViewPrefs) {
    setViewPrefs(next)
    saveViewPrefs(next)
  }

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
  const sysCpu = clampPercent(metrics?.cpu.loadPercent ?? 0)
  const cursorCpuRaw = metrics?.cursor.totalCpuPercent ?? 0
  const signedIn =
    account?.signedIn !== false && !/サインイン/i.test(usageError || '')

  const errorLine = useMemo(() => {
    if (usageError) return usageError
    if (metricsError) return metricsError
    if (tasksError) return tasksError
    return null
  }, [usageError, metricsError, tasksError])

  function openDetail(id: DetailId) {
    setMenuOpen(false)
    setDetail(id)
  }

  function toggleWidget(id: ViewWidget) {
    persistPrefs({
      ...viewPrefs,
      widgets: { ...viewPrefs.widgets, [id]: !viewPrefs.widgets[id] },
    })
  }

  return (
    <div className="widget is-expanded">
      <header className="widget-chrome">
        <div
          className="drag-handle"
          title="ドラッグで移動"
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
          <ViewMenu
            open={menuOpen}
            prefs={viewPrefs}
            onToggleOpen={() => setMenuOpen((v) => !v)}
            onClose={closeMenu}
            onToggleWidget={toggleWidget}
            onOpenDetail={openDetail}
            onReset={() => {
              persistPrefs({
                widgets: { ...DEFAULT_VIEW_PREFS.widgets },
              })
              closeMenu()
            }}
          />
          {isElectron && (
            <>
              <button
                type="button"
                className="icon-btn"
                title="右端へ"
                onClick={() => void window.cursorMonitor?.snapRight()}
              >
                <ChromeGlyph title="右端へ">
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

      {errorLine && <p className="usage-alert danger">{errorLine}</p>}

      <ExpandedDashboard
        usage={usage}
        metrics={metrics}
        tasks={tasks}
        cursorPct={cursorPct}
        otherPct={otherPct}
        sysMem={sysMem}
        cursorMemPct={cursorMemPct}
        sysCpu={sysCpu}
        cursorCpuRaw={cursorCpuRaw}
        signedIn={signedIn}
        loadingUsage={!usage && !usageError}
        planLabel={usage?.guide?.current.plan || account?.membershipType || undefined}
        cycleDaysLeft={usage?.guide?.current.cycleDaysLeft}
        cycleEnd={usage?.guide?.current.cycleEnd || usage?.billing?.cycleEnd}
        onDemandAllowed={usage?.breakdown?.onDemand.allowed}
        prefs={viewPrefs}
        detail={detail}
        onCloseDetail={() => setDetail(null)}
        refreshing={refreshingUsage}
        onRefresh={() => refreshUsage()}
        autostart={autostart}
        onAutostart={(next) => {
          setAutostart(next)
          void window.cursorMonitor?.setAutostart?.(next)
            .then((r) => {
              if (typeof r?.autostart === 'boolean') setAutostart(r.autostart)
            })
            .catch(() => setAutostart(next))
        }}
        isElectron={isElectron}
        onQuit={isElectron ? () => void window.cursorMonitor?.quit() : undefined}
      />
    </div>
  )
}
