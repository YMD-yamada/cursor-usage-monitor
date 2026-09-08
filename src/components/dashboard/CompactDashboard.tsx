import type { TasksPayload, UsagePayload } from '../../lib/format'
import { widgetVisible, type ViewPrefs } from '../../lib/viewPrefs'
import { UsageAlert, heroMetaLine } from '../UsageAlert'
import { UsageGauges } from './UsageGauges'
import { SystemMeters } from './SystemMeters'
import { SessionStrip } from './SessionStrip'

type Props = {
  usage: UsagePayload | null
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
  onDemandAllowed?: boolean
  prefs: ViewPrefs
}

export function CompactDashboard({
  usage,
  cursorPct,
  otherPct,
  sysMem,
  cursorMemPct,
  sysCpu,
  cursorCpuRaw,
  tasks,
  signedIn,
  loadingUsage,
  planLabel,
  cycleDaysLeft,
  onDemandAllowed,
  prefs,
}: Props) {
  const show = (id: Parameters<typeof widgetVisible>[1]) =>
    widgetVisible(prefs, id)

  const hasAny = show('gauges') || show('system') || show('sessions')

  const meta = heroMetaLine({
    loading: loadingUsage,
    signedIn,
    planLabel,
    onDemandAllowed,
  })

  return (
    <div className="dash-compact">
      <p className="dash-meta mono">{meta}</p>
      {!signedIn ? (
        <p className="usage-alert danger">Cursor にサインイン</p>
      ) : usage ? (
        <UsageAlert usage={usage} compact />
      ) : null}
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
          cycleEnd={usage?.guide?.current.cycleEnd || usage?.billing?.cycleEnd}
          cycleDaysLeft={cycleDaysLeft}
        />
      )}
      {show('system') && (
        <SystemMeters
          sysMem={sysMem}
          cursorMemPct={cursorMemPct}
          sysCpu={sysCpu}
          cursorCpuRaw={cursorCpuRaw}
          size="md"
        />
      )}
      {show('sessions') && <SessionStrip tasks={tasks} compact />}
    </div>
  )
}
