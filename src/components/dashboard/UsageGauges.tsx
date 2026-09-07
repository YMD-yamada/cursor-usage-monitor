import { clampPercent, remainingPercent, buildCycleBurn } from '../../lib/format'

type Tone = 'ok' | 'warn' | 'danger'

function toneFor(percent: number, exhausted?: boolean): Tone {
  if (exhausted || percent >= 90) return 'danger'
  if (percent >= 70) return 'warn'
  return 'ok'
}

function Gauge({
  label,
  remain,
  percent,
  exhausted,
  size = 'md',
}: {
  label: string
  remain: number
  percent: number
  exhausted?: boolean
  size?: 'md' | 'lg'
}) {
  const pct = clampPercent(percent)
  const tone = toneFor(pct, exhausted)
  const r = size === 'lg' ? 34 : 28
  const dim = size === 'lg' ? 96 : 80
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  const stroke = size === 'lg' ? 7 : 6
  const cx = dim / 2

  return (
    <div className={`dash-gauge tone-${tone} size-${size}`}>
      <div className="dash-gauge-ring" style={{ width: dim, height: dim }}>
        <svg viewBox={`0 0 ${dim} ${dim}`} width={dim} height={dim}>
          <circle
            className="ring-track"
            cx={cx}
            cy={cx}
            r={r}
            strokeWidth={stroke}
          />
          <circle
            className="ring-fill"
            cx={cx}
            cy={cx}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        </svg>
        <div className="dash-gauge-value">
          <span className="dash-gauge-num">{pct.toFixed(0)}</span>
          <span className="dash-gauge-unit">%</span>
        </div>
      </div>
      <span className="dash-gauge-label">{label}</span>
      <span className="dash-gauge-hint">
        {exhausted ? '使い切り' : `残り ${remain.toFixed(0)}%`}
      </span>
    </div>
  )
}

type Props = {
  cursorPct: number
  otherPct: number
  cursorExhausted?: boolean
  otherExhausted?: boolean
  loading?: boolean
  signedIn?: boolean
  size?: 'md' | 'lg'
  cycleEnd?: string | null
  cycleDaysLeft?: number | null
}

export function UsageGauges({
  cursorPct,
  otherPct,
  cursorExhausted,
  otherExhausted,
  loading,
  signedIn = true,
  size = 'md',
  cycleEnd,
  cycleDaysLeft,
}: Props) {
  const show = !loading && signedIn
  const burn = buildCycleBurn({
    cycleEnd,
    daysLeft: cycleDaysLeft,
    cursorPct,
    otherPct,
  })

  return (
    <section className="dash-usage" aria-label="利用枠">
      {show && (
        <div className="dash-cycle">
          <p className="dash-cycle-reset">{burn.headline}</p>
          {burn.pace && <p className="dash-cycle-pace">{burn.pace}</p>}
        </div>
      )}
      <div className="dash-gauge-row">
        <Gauge
          label="Cursor"
          remain={remainingPercent(show ? cursorPct : 0)}
          percent={show ? cursorPct : 0}
          exhausted={cursorExhausted}
          size={size}
        />
        <Gauge
          label="その他"
          remain={remainingPercent(show ? otherPct : 0)}
          percent={show ? otherPct : 0}
          exhausted={otherExhausted}
          size={size}
        />
      </div>
      {!signedIn && !loading && (
        <p className="dash-hint">Cursor にサインインすると表示されます</p>
      )}
      {loading && <p className="dash-hint">読み込み中…</p>}
    </section>
  )
}
