import type { UsagePayload } from '../lib/format'
import {
  clampPercent,
  formatDate,
  formatTokens,
  formatUsd,
} from '../lib/format'
import { Meter } from './Meter'

type Props = {
  usage: UsagePayload | null
}

export function UsageHero({ usage }: Props) {
  if (!usage) {
    return (
      <section className="hero panel">
        <p className="eyebrow">Cursor Usage</p>
        <h1 className="hero-title">読み込み中…</h1>
      </section>
    )
  }

  const pct = clampPercent(usage.spend.percentUsed)
  const planLabel = (usage.account.membershipType || 'plan').toUpperCase()

  return (
    <section className="hero panel">
      <div className="hero-copy">
        <p className="eyebrow">Cursor Usage</p>
        <h1 className="hero-title">
          {pct.toFixed(1)}%
          <span className="hero-title-muted"> used this cycle</span>
        </h1>
        <p className="hero-lead">
          {usage.account.name || usage.account.email || 'Signed-in account'} ·{' '}
          {planLabel}
          {usage.account.subscriptionStatus
            ? ` · ${usage.account.subscriptionStatus}`
            : ''}
        </p>
        <p className="hero-note">
          {usage.billing.autoMessage ||
            usage.billing.displayMessage ||
            '現在の請求サイクルの利用状況'}
        </p>
        <p className="hero-spendline">
          Spend {formatUsd(usage.spend.totalUsd)}
          <span className="sep">·</span>
          Included {formatUsd(usage.spend.includedUsd)} /{' '}
          {formatUsd(usage.spend.limitUsd || usage.spend.includedUsd)}
          <span className="sep">·</span>
          Bonus {formatUsd(usage.spend.bonusUsd)}
        </p>
      </div>

      <div className="hero-metrics">
        <Meter
          label="Included usage"
          value={pct}
          detail={`${pct.toFixed(1)}% used`}
          tone={pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'ok'}
        />
        <div className="stat-grid">
          <Stat label="Included" value={formatUsd(usage.spend.includedUsd)} />
          <Stat label="Bonus" value={formatUsd(usage.spend.bonusUsd)} />
          <Stat label="Input tokens" value={formatTokens(usage.tokens.input)} />
          <Stat
            label="Output tokens"
            value={formatTokens(usage.tokens.output)}
          />
          <Stat
            label="Cycle"
            value={`${formatDate(usage.billing.cycleStart)} → ${formatDate(usage.billing.cycleEnd)}`}
          />
          <Stat
            label="On-demand"
            value={usage.billing.noUsageBasedAllowed ? 'Blocked' : 'Allowed'}
          />
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}
