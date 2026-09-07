import type { MetricsPayload, TasksPayload, UsagePayload } from '../../lib/format'
import { widgetVisible, type DetailId, type ViewPrefs } from '../../lib/viewPrefs'
import { UsageCharts } from '../UsageCharts'
import { UsageAlert, heroMetaLine } from '../UsageAlert'
import { UsageGauges } from './UsageGauges'
import { SystemMeters } from './SystemMeters'
import { SessionList, SessionStrip } from './SessionStrip'
import { DetailOverlay } from './DetailSheet'

type Props = {
  usage: UsagePayload | null
  metrics: MetricsPayload | null
  tasks: TasksPayload | null
  cursorPct: number
  otherPct: number
  sysMem: number
  cursorMemPct: number
  sysCpu: number
  cursorCpuRaw: number
  signedIn: boolean
  loadingUsage: boolean
  planLabel?: string
  cycleDaysLeft?: number | null
  cycleEnd?: string | null
  onDemandAllowed?: boolean
  prefs: ViewPrefs
  detail: DetailId | null
  onCloseDetail: () => void
  refreshing: boolean
  onRefresh: () => void
  autostart: boolean
  onAutostart: (v: boolean) => void
  isElectron: boolean
  onQuit?: () => void
}

export function ExpandedDashboard({
  usage,
  metrics,
  tasks,
  cursorPct,
  otherPct,
  sysMem,
  cursorMemPct,
  sysCpu,
  cursorCpuRaw,
  signedIn,
  loadingUsage,
  planLabel,
  cycleDaysLeft,
  cycleEnd,
  onDemandAllowed,
  prefs,
  detail,
  onCloseDetail,
  refreshing,
  onRefresh,
  autostart,
  onAutostart,
  isElectron,
  onQuit,
}: Props) {
  const show = (id: Parameters<typeof widgetVisible>[1]) => widgetVisible(prefs, id)

  const hasAny =
    show('gauges') || show('charts') || show('system') || show('sessions')

  const meta = heroMetaLine({
    loading: loadingUsage,
    signedIn,
    planLabel,
    onDemandAllowed,
  })

  return (
    <div className="dash-expanded">
      {detail ? (
        <DetailOverlay
          section={detail}
          usage={usage}
          onClose={onCloseDetail}
        />
      ) : (
        <div className="dash-page">
          <p className="dash-meta mono">{meta}</p>
          {usage && <UsageAlert usage={usage} compact />}
          {!hasAny && (
            <p className="dash-hint">右上のメニューから、見たい項目を選んでください</p>
          )}
          {show('gauges') && (
            <UsageGauges
              cursorPct={cursorPct}
              otherPct={otherPct}
              cursorExhausted={Boolean(usage?.breakdown?.cursorModels?.exhausted)}
              otherExhausted={Boolean(usage?.breakdown?.otherModels?.exhausted)}
              loading={loadingUsage}
              signedIn={signedIn}
              size="lg"
              cycleEnd={cycleEnd}
              cycleDaysLeft={cycleDaysLeft}
            />
          )}
          {show('system') && (
            <SystemMeters
              sysMem={sysMem}
              cursorMemPct={cursorMemPct}
              sysCpu={sysCpu}
              cursorCpuRaw={cursorCpuRaw}
              cursorBytes={metrics?.cursor.totalWorkingSetBytes}
              size="lg"
            />
          )}
          {show('sessions') && (
            <>
              <SessionStrip tasks={tasks} compact />
              <div className="dash-session-list-wrap">
                <SessionList tasks={tasks} hideEmpty />
              </div>
            </>
          )}
          {show('charts') && <UsageCharts usage={usage} compact />}
        </div>
      )}

      <footer className="dash-footer">
        <label className="autostart-row">
          <input
            type="checkbox"
            checked={autostart}
            onChange={(e) => onAutostart(e.target.checked)}
          />
          <span>自動起動</span>
        </label>
        <div className="expanded-actions">
          <button
            type="button"
            className="text-btn"
            disabled={refreshing}
            onClick={onRefresh}
          >
            {refreshing ? '更新中…' : '更新'}
          </button>
          {isElectron && onQuit && (
            <button type="button" className="text-btn quit-btn" onClick={onQuit}>
              終了
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
