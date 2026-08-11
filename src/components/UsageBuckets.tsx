import type { UsagePayload } from '../lib/format'
import { clampPercent, formatUsd } from '../lib/format'

type Props = {
  usage: UsagePayload
  compact?: boolean
}

function toneFor(percent: number, exhausted?: boolean) {
  if (exhausted || percent >= 90) return 'danger'
  if (percent >= 70) return 'warn'
  return 'ok'
}

function poolsOf(usage: UsagePayload) {
  const b = usage.breakdown
  const cursor = b?.cursorModels ?? b?.auto
  const other = b?.otherModels ?? b?.named
  return {
    cursorPct: clampPercent(cursor?.percent ?? usage.spend.autoPercentUsed ?? 0),
    otherPct: clampPercent(other?.percent ?? usage.spend.apiPercentUsed ?? 0),
    cursorCost: cursor?.costUsd ?? 0,
    otherCost: other?.costUsd ?? 0,
    cursorMsg: cursor?.message ?? usage.billing.autoMessage,
    otherMsg: other?.message ?? usage.billing.apiMessage,
    cursorExhausted: Boolean(cursor?.exhausted),
    otherExhausted: Boolean(other?.exhausted),
  }
}

function MeterRow({
  label,
  detail,
  percent,
  tone,
  title,
}: {
  label: string
  detail: string
  percent: number
  tone: string
  title?: string
}) {
  const pct = clampPercent(percent)
  return (
    <div className="bucket-meter" title={title}>
      <div className="bucket-meter-head">
        <span>{label}</span>
        <span className="mono">{detail}</span>
      </div>
      <div className="bucket-meter-track">
        <span
          className={`bucket-meter-fill tone-${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Compact strip: official two pools (Cursor Models / Other Models). */
export function UsageBucketStrip({ usage }: { usage: UsagePayload }) {
  const b = usage.breakdown
  if (!b) return null
  const p = poolsOf(usage)

  return (
    <div className="bucket-strip">
      <div className="bucket-strip-head">
        <span>公式プール</span>
        <span className="mono">
          CM {p.cursorPct.toFixed(0)}% · OM {p.otherPct.toFixed(0)}%
        </span>
      </div>
      <MeterRow
        label="Cursor Models"
        detail={`${p.cursorPct.toFixed(0)}%`}
        percent={p.cursorPct}
        tone={toneFor(p.cursorPct, p.cursorExhausted)}
        title={p.cursorMsg || undefined}
      />
      <MeterRow
        label="Other Models"
        detail={`${p.otherPct.toFixed(0)}%`}
        percent={p.otherPct}
        tone={toneFor(p.otherPct, p.otherExhausted)}
        title={p.otherMsg || undefined}
      />
      <div className="bucket-strip-meta mono">
        <span>
          従量 {b.onDemand.allowed ? 'ON' : 'OFF'}
        </span>
        {b.bonus.active ? (
          <span>
            <i className="swatch bonus" />
            ボーナス会計 {formatUsd(b.bonus.usedUsd)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function UsageBuckets({ usage, compact = false }: Props) {
  const b = usage.breakdown
  if (!b) return null

  if (compact) {
    return <UsageBucketStrip usage={usage} />
  }

  const p = poolsOf(usage)

  return (
    <div className="usage-buckets">
      <div className="chart-block">
        <div className="chart-head">
          <span>Usage プール（公式と同じ）</span>
          <span className="mono">
            CM {p.cursorPct.toFixed(0)}% · OM {p.otherPct.toFixed(0)}%
          </span>
        </div>
        <p className="bucket-lead">
          公式ダッシュボードは Cursor Models と Other Models
          の2本％です。合算の1本％はありません。
        </p>

        <MeterRow
          label="Cursor Models"
          detail={`${p.cursorPct.toFixed(0)}%`}
          percent={p.cursorPct}
          tone={toneFor(p.cursorPct, p.cursorExhausted)}
          title={p.cursorMsg || b.cursorModels?.hint || b.auto.hint}
        />
        <MeterRow
          label="Other Models"
          detail={`${p.otherPct.toFixed(0)}%`}
          percent={p.otherPct}
          tone={toneFor(p.otherPct, p.otherExhausted)}
          title={p.otherMsg || b.otherModels?.hint || b.named.hint}
        />

        <div className="bucket-cards">
          <div className="bucket-card" title={b.onDemand.hint}>
            <span className="bucket-card-label">従量課金</span>
            <span
              className={`bucket-card-value mono ${b.onDemand.allowed ? 'ok' : 'warn'}`}
            >
              {b.onDemand.status}
            </span>
            <span className="bucket-card-note">
              {b.onDemand.allowed ? '枠超過後も継続可' : '枠超過後は停止'}
            </span>
          </div>
          <div className="bucket-card" title={b.bonus.hint}>
            <span className="bucket-card-label">ボーナス会計</span>
            <span className="bucket-card-value mono">{formatUsd(b.bonus.usedUsd)}</span>
            <span className="bucket-card-note">
              {b.bonus.active ? '保証外の追加無料' : 'なし'}
            </span>
          </div>
        </div>

        <div className="chart-head tight">
          <span>Included 会計（参考）</span>
          <span className="mono">
            {formatUsd(b.included.usedUsd)} / {formatUsd(b.included.limitUsd)}
          </span>
        </div>
        <p className="bucket-note">
          個人プランの公式 Usage は％／トークン中心です。Included $
          は会計上の数字で、主バーではありません。
        </p>

        {(p.cursorMsg || p.otherMsg) && (
          <p className="bucket-messages">
            {[p.cursorMsg, p.otherMsg].filter(Boolean).join(' / ')}
          </p>
        )}
      </div>
    </div>
  )
}
