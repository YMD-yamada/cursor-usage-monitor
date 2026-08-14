import { clampPercent } from '../lib/format'

type Tone = 'ok' | 'warn' | 'danger'

function toneFor(percent: number, exhausted?: boolean): Tone {
  if (exhausted || percent >= 90) return 'danger'
  if (percent >= 70) return 'warn'
  return 'ok'
}

function PoolMark({
  label,
  percent,
  exhausted,
}: {
  label: string
  percent: number
  exhausted?: boolean
}) {
  const pct = clampPercent(percent)
  const tone = toneFor(pct, exhausted)
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)

  return (
    <div className={`pool-mark tone-${tone}`}>
      <div className="pool-mark-ring" aria-hidden="true">
        <svg viewBox="0 0 72 72">
          <circle className="ring-track" cx="36" cy="36" r={r} />
          <circle
            className="ring-fill"
            cx="36"
            cy="36"
            r={r}
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 36 36)"
          />
        </svg>
        <div className="pool-mark-value">
          <span className="pool-mark-num">{pct.toFixed(0)}</span>
          <span className="pool-mark-unit">%</span>
        </div>
      </div>
      <span className="pool-mark-label">{label}</span>
    </div>
  )
}

type Props = {
  cursorPct: number
  otherPct: number
  cursorExhausted?: boolean
  otherExhausted?: boolean
  onDemandAllowed?: boolean
  loading?: boolean
  onToggle?: () => void
}

/** Compact hero: official two pools, no fake combined %. */
export function DualPoolHero({
  cursorPct,
  otherPct,
  cursorExhausted,
  otherExhausted,
  onDemandAllowed,
  loading,
  onToggle,
}: Props) {
  return (
    <button type="button" className="pool-hero" onClick={() => onToggle?.()}>
      <div className="pool-hero-grid">
        <PoolMark
          label="Cursor Models"
          percent={loading ? 0 : cursorPct}
          exhausted={cursorExhausted}
        />
        <PoolMark
          label="Other Models"
          percent={loading ? 0 : otherPct}
          exhausted={otherExhausted}
        />
      </div>
      <p className="pool-hero-meta">
        {loading
          ? 'Usage を読み込み中…'
          : `従量 ${onDemandAllowed ? 'ON' : 'OFF'} · 公式と同じ2プール`}
      </p>
    </button>
  )
}
