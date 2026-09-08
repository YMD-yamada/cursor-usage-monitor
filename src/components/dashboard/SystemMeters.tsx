import { clampPercent, formatBytes } from '../../lib/format'

type Props = {
  sysMem: number
  cursorMemPct: number
  sysCpu: number
  cursorCpuRaw: number
  cursorBytes?: number
  size?: 'md' | 'lg'
}

function BigBar({
  label,
  total,
  cursorShare,
  size,
  detail,
}: {
  label: string
  total: number
  cursorShare: number
  size: 'md' | 'lg'
  detail?: string
}) {
  const pct = clampPercent(total)
  const cursorBar = clampPercent(Math.min(cursorShare, pct))
  const otherBar = clampPercent(Math.max(pct - cursorBar, 0))
  const freeBar = clampPercent(100 - pct)

  return (
    <div className={`dash-meter size-${size}`}>
      <div className="dash-meter-head">
        <span className="dash-meter-label">
          {label}
          <span className="dash-meter-sub">
            Cursor {cursorShare.toFixed(0)}%{detail ? ` · ${detail}` : ''}
          </span>
        </span>
        <span className="dash-meter-pct mono">{pct.toFixed(0)}%</span>
      </div>
      <div className="dash-meter-track" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className="seg cursor" style={{ width: `${cursorBar}%` }} />
        <span className="seg other" style={{ width: `${otherBar}%` }} />
        <span className="seg free" style={{ width: `${freeBar}%` }} />
      </div>
    </div>
  )
}

export function SystemMeters({
  sysMem,
  cursorMemPct,
  sysCpu,
  cursorCpuRaw,
  cursorBytes,
  size = 'md',
}: Props) {
  const cursorCpuNorm = clampPercent(cursorCpuRaw)

  return (
    <section className="dash-system" aria-label="PCリソース">
      <BigBar
        label="メモリ"
        total={sysMem}
        cursorShare={cursorMemPct}
        size={size}
        detail={cursorBytes && cursorBytes > 0 ? formatBytes(cursorBytes) : undefined}
      />
      <BigBar label="CPU" total={sysCpu} cursorShare={cursorCpuNorm} size={size} />
    </section>
  )
}
