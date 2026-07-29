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

/** Compact strip: plan quota + bonus + auto/named. */
export function UsageBucketStrip({ usage }: { usage: UsagePayload }) {
  const b = usage.breakdown
  if (!b) return null
  const includedPct = clampPercent(b.included.percent)
  const spendTotal = Math.max(usage.spend.totalUsd, 0.01)
  const includedShare = (b.included.usedUsd / spendTotal) * 100
  const bonusShare = (b.bonus.usedUsd / spendTotal) * 100

  return (
    <div className="bucket-strip">
      <div className="bucket-strip-head">
        <span>プラン枠 {includedPct.toFixed(0)}%</span>
        <span className="mono">
          {formatUsd(b.included.usedUsd)} / {formatUsd(b.included.limitUsd)}
          {b.included.exhausted ? ' · 使い切り' : ''}
        </span>
      </div>
      <div
        className="bucket-spend-track"
        title={`プラン枠 ${formatUsd(b.included.usedUsd)} · ボーナス ${formatUsd(b.bonus.usedUsd)}`}
      >
        <span
          className="seg included"
          style={{ width: `${Math.max(includedShare, b.included.usedUsd > 0 ? 4 : 0)}%` }}
        />
        <span
          className="seg bonus"
          style={{ width: `${Math.max(bonusShare, b.bonus.usedUsd > 0 ? 4 : 0)}%` }}
        />
      </div>
      <div className="bucket-strip-meta mono">
        <span>
          <i className="swatch included" />
          枠内 {formatUsd(b.included.usedUsd)}
        </span>
        <span>
          <i className="swatch bonus" />
          ボーナス {formatUsd(b.bonus.usedUsd)}
        </span>
        <span>
          外部 {formatUsd(b.named.costUsd)}
        </span>
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

  const includedTone = toneFor(b.included.percent, b.included.exhausted)
  const spendTotal = Math.max(
    b.included.usedUsd + b.bonus.usedUsd,
    usage.spend.totalUsd,
    0.01,
  )

  return (
    <div className="usage-buckets">
      <div className="chart-block">
        <div className="chart-head">
          <span>Usage 内訳</span>
          <span className="mono">合計 {formatUsd(usage.spend.totalUsd)}</span>
        </div>
        <p className="bucket-lead">
          Cursor は「プラン枠」と「ボーナス（提供側無料）」が別です。大きな％だけだと
          Claude の枠のように見えません。
        </p>

        <MeterRow
          label="プラン枠"
          detail={`${formatUsd(b.included.usedUsd)} / ${formatUsd(b.included.limitUsd)} · ${b.included.percent.toFixed(0)}%`}
          percent={b.included.percent}
          tone={includedTone}
          title={b.included.hint}
        />
        <MeterRow
          label="Auto / Composer"
          detail={`${b.auto.percent.toFixed(0)}% · ${formatUsd(b.auto.costUsd)}`}
          percent={b.auto.percent}
          tone={toneFor(b.auto.percent)}
          title={b.auto.message || b.auto.hint}
        />
        <MeterRow
          label="外部モデル"
          detail={`API枠 ${b.named.percent.toFixed(0)}% · 実コスト ${formatUsd(b.named.costUsd)}`}
          percent={b.named.percent}
          tone={toneFor(b.named.percent)}
          title={b.named.message || b.named.hint}
        />
        {b.named.onAutoLaneUsd && b.named.onAutoLaneUsd > 0 ? (
          <p className="bucket-note">
            外部モデルのうち {formatUsd(b.named.onAutoLaneUsd)} は Auto
            枠側で消化（見た目は外部でも課金レーンは Auto）。
          </p>
        ) : null}

        <div className="bucket-cards">
          <div className="bucket-card" title={b.bonus.hint}>
            <span className="bucket-card-label">ボーナス</span>
            <span className="bucket-card-value mono">{formatUsd(b.bonus.usedUsd)}</span>
            <span className="bucket-card-note">
              {b.bonus.active ? '提供側の追加無料' : 'なし'}
            </span>
          </div>
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
        </div>

        <div className="chart-head tight">
          <span>コストの内訳</span>
          <span className="mono">
            枠内 {(b.included.usedUsd / spendTotal * 100).toFixed(0)}% · ボーナス{' '}
            {(b.bonus.usedUsd / spendTotal * 100).toFixed(0)}%
          </span>
        </div>
        <div className="bucket-spend-track tall">
          <span
            className="seg included"
            style={{
              width: `${(b.included.usedUsd / spendTotal) * 100}%`,
            }}
            title={`プラン枠 ${formatUsd(b.included.usedUsd)}`}
          />
          <span
            className="seg bonus"
            style={{
              width: `${(b.bonus.usedUsd / spendTotal) * 100}%`,
            }}
            title={`ボーナス ${formatUsd(b.bonus.usedUsd)}`}
          />
        </div>
        {(b.included.message || b.auto.message || b.named.message) && (
          <p className="bucket-messages">
            {[b.included.message, b.auto.message, b.named.message]
              .filter(Boolean)
              .join(' / ')}
          </p>
        )}
      </div>
    </div>
  )
}
