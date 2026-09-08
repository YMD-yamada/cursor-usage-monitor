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
}: {
  label: string
  remain: number
  percent: number
  exhausted?: boolean
}) {
  const pct = clampPercent(percent)
  const tone = toneFor(pct, exhausted)
  const dim = 96
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  const stroke = 7
  const cx = dim / 2

  return (
    <div className={`dash-gauge tone-${tone}`}>
      <div className="dash-gauge-ring">
        <svg viewBox={`0 0 ${dim} ${dim}`} aria-hidden="true">
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
      <div className="dash-gauge-copy">
        <span className="dash-gauge-label">{label}</span>
        <span className="dash-gauge-hint">
          {exhausted ? '使い切り' : `残り ${remain.toFixed(0)}%`}
        </span>
      </div>
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
  cycleEnd?: string | null
  cycleDaysLeft?: number | null
  metaLine?: string | null
}

export function UsageGauges({
  cursorPct,
  otherPct,
  cursorExhausted,
  otherExhausted,
  loading,
  signedIn = true,
  cycleEnd,
  cycleDaysLeft,
  metaLine,
}: Props) {
  const show = !loading && signedIn
  const burn = buildCycleBurn({
    cycleEnd,
    daysLeft: cycleDaysLeft,
    cursorPct,
    otherPct,
  })
  const kicker = [burn.headline, metaLine].filter(Boolean).join(' · ')

  return (
    <section className="dash-usage" aria-label="利用枠">
      {show && (
        <div className="dash-cycle">
          <p className="dash-cycle-reset">{kicker}</p>
          {burn.pace && <p className="dash-cycle-pace">{burn.pace}</p>}
        </div>
      )}
      <div className="dash-gauge-row">
        <Gauge
          label="Cursor"
          remain={remainingPercent(show ? cursorPct : 0)}
          percent={show ? cursorPct : 0}
          exhausted={cursorExhausted}
        />
        <Gauge
          label="その他"
          remain={remainingPercent(show ? otherPct : 0)}
          percent={show ? otherPct : 0}
          exhausted={otherExhausted}
        />
      </div>
      {!signedIn && !loading && (
        <p className="dash-hint">Cursor にサインインすると表示されます</p>
      )}
      {loading && <p className="dash-hint">読み込み中…</p>}
    </section>
  )
}
