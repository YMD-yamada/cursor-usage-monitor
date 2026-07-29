import type { MetricsPayload } from '../lib/format'
import { clampPercent, formatBytes } from '../lib/format'
import { Meter } from './Meter'

type Props = {
  metrics: MetricsPayload | null
}

export function SystemPanel({ metrics }: Props) {
  if (!metrics) {
    return (
      <section className="panel system-panel">
        <p className="eyebrow">System</p>
        <h2>計測準備中…</h2>
      </section>
    )
  }

  const cpu = clampPercent(metrics.cpu.loadPercent)
  const mem = clampPercent(metrics.memory.usedPercent)
  const cursorCpu = metrics.cursor.totalCpuPercent

  return (
    <section className="panel system-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">System</p>
          <h2>CPU / Memory</h2>
        </div>
        <p className="section-note">{metrics.cpu.cores} cores</p>
      </div>

      <div className="meters-stack">
        <Meter
          label="System CPU"
          value={cpu}
          detail={`${cpu.toFixed(1)}%`}
          tone={cpu >= 85 ? 'danger' : cpu >= 65 ? 'warn' : 'ok'}
        />
        <Meter
          label="System Memory"
          value={mem}
          detail={`${formatBytes(metrics.memory.usedBytes)} / ${formatBytes(metrics.memory.totalBytes)}`}
          tone={mem >= 90 ? 'danger' : mem >= 75 ? 'warn' : 'ok'}
        />
        <Meter
          label="Cursor processes"
          value={clampPercent(cursorCpu / Math.max(metrics.cpu.cores, 1))}
          detail={`${cursorCpu.toFixed(1)}% CPU · ${formatBytes(metrics.cursor.totalWorkingSetBytes)} · ${metrics.cursor.processCount} procs`}
          tone={cursorCpu > 100 ? 'warn' : 'ok'}
        />
      </div>
    </section>
  )
}
