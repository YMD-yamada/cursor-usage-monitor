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
}: {
  label: string
  total: number
  cursorShare: number
  size: 'md' | 'lg'
}) {
  const pct = clampPercent(total)
  const cursorBar = clampPercent(Math.min(cursorShare, pct))
  const otherBar = clampPercent(Math.max(pct - cursorBar, 0))
  const freeBar = clampPercent(100 - pct)

  return (
    <div className={`dash-meter size-${size}`}>
      <div className="dash-meter-head">
        <span className="dash-meter-label">{label}</span>
        <span className="dash-meter-pct mono">{pct.toFixed(0)}%</span>
      </div>
      <div className="dash-meter-track" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className="seg cursor" style={{ width: `${cursorBar}%` }} />
        <span className="seg other" style={{ width: `${otherBar}%` }} />
        <span className="seg free" style={{ width: `${freeBar}%` }} />
      </div>
      <div className="dash-meter-legend">
        <span><i className="dot cursor" />Cursor {cursorShare.toFixed(0)}%</span>
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
      <BigBar label="メモリ" total={sysMem} cursorShare={cursorMemPct} size={size} />
      <BigBar label="CPU" total={sysCpu} cursorShare={cursorCpuNorm} size={size} />
      {size === 'lg' && cursorBytes != null && cursorBytes > 0 && (
        <p className="dash-system-note mono">
          Cursor 使用メモリ {formatBytes(cursorBytes)}
        </p>
      )}
    </section>
  )
}
