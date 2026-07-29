import type { DailyUsagePoint, ModelUsage, UsagePayload } from '../lib/format'
import { clampPercent, formatTokens, formatUsd } from '../lib/format'
import { UsageBuckets } from './UsageBuckets'

type Props = {
  usage: UsagePayload | null
  compact?: boolean
}

const MODEL_COLORS = ['#2fd3c5', '#7ad0ff', '#e2b45a', '#c792ea', '#ef7d6a']

function shortModel(name: string) {
  return name
    .replace(/^cursor-/, '')
    .replace(/-high-fast$/, '')
    .replace(/-fast$/, '')
}

function dayLabel(isoDate: string) {
  const parts = isoDate.split('-')
  return `${Number(parts[1])}/${Number(parts[2])}`
}

/** Compact 14-day cost bars — always visible under the hero. */
export function UsageMiniBars({ daily }: { daily: DailyUsagePoint[] }) {
  if (!daily.length) return null
  const max = Math.max(...daily.map((d) => d.costUsd), 0.01)
  const total = daily.reduce((sum, d) => sum + d.costUsd, 0)

  return (
    <div className="mini-bars" role="img" aria-label={`直近14日のコスト合計 ${formatUsd(total)}`}>
      <div className="mini-bars-track">
        {daily.map((d) => {
          const h = d.costUsd > 0 ? Math.max((d.costUsd / max) * 100, 10) : 4
          return (
            <span
              key={d.date}
              className={`mini-bar ${d.costUsd > 0 ? 'active' : ''}`}
              style={{ height: `${h}%` }}
              title={`${d.date}: ${formatUsd(d.costUsd)} · ${d.events} events`}
            />
          )
        })}
      </div>
      <div className="mini-bars-meta mono">
        <span>14日</span>
        <span>{formatUsd(total)}</span>
      </div>
    </div>
  )
}

/** Kept for compatibility; prefer UsageMiniBars. */
export function UsageSparkline({ daily }: { daily: DailyUsagePoint[] }) {
  return <UsageMiniBars daily={daily} />
}

function UsageRing({ percent }: { percent: number }) {
  const pct = clampPercent(percent)
  const r = 28
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'ok'

  return (
    <div className={`usage-ring tone-${tone}`} aria-label={`Usage ${pct.toFixed(0)}%`}>
      <svg viewBox="0 0 72 72" width="72" height="72">
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
      <div className="ring-label">
        <span className="ring-num">{pct.toFixed(0)}</span>
        <span className="ring-unit">%</span>
      </div>
    </div>
  )
}

function DailyBars({ daily }: { daily: DailyUsagePoint[] }) {
  const maxCost = Math.max(...daily.map((d) => d.costUsd), 0.01)
  const maxEvents = Math.max(...daily.map((d) => d.events), 1)
  const total = daily.reduce((sum, d) => sum + d.costUsd, 0)
  const peak = daily.reduce((best, d) => (d.costUsd > best.costUsd ? d : best), daily[0])

  return (
    <div className="chart-block">
      <div className="chart-head">
        <span>日別コスト（14日）</span>
        <span className="mono">
          Σ {formatUsd(total)}
          {peak?.costUsd ? ` · 峰 ${dayLabel(peak.date)}` : ''}
        </span>
      </div>
      <div className="bar-chart" role="img" aria-label="日別コスト棒グラフ">
        {daily.map((d) => {
          const h = d.costUsd > 0 ? Math.max((d.costUsd / maxCost) * 100, 8) : 3
          const eventBottom =
            d.events > 0 ? Math.max((d.events / maxEvents) * 82, 8) : 0
          return (
            <div
              key={d.date}
              className="bar-col"
              title={`${d.date}: ${formatUsd(d.costUsd)} · ${d.events} events`}
            >
              <div className="bar-col-track">
                <span
                  className={`bar-col-fill ${d.costUsd > 0 ? 'active' : ''}`}
                  style={{ height: `${h}%` }}
                />
                {d.events > 0 && (
                  <i
                    className="bar-event-dot"
                    style={{ bottom: `${eventBottom}%` }}
                  />
                )}
              </div>
              <span className="bar-col-label">{dayLabel(d.date).split('/')[1]}</span>
            </div>
          )
        })}
      </div>
      <p className="chart-caption mono">棒=コスト · 点=イベント数</p>
    </div>
  )
}

function ModelShare({ models }: { models: ModelUsage[] }) {
  const top = models.slice(0, 6)
  const max = Math.max(...top.map((m) => m.costUsd), 0.01)
  const total = top.reduce((sum, m) => sum + m.costUsd, 0) || 0.01
  const autoTotal = models
    .filter((m) => m.category === 'auto')
    .reduce((sum, m) => sum + m.costUsd, 0)
  const namedTotal = models
    .filter((m) => m.category === 'named')
    .reduce((sum, m) => sum + m.costUsd, 0)

  return (
    <div className="chart-block">
      <div className="chart-head">
        <span>モデル別コスト</span>
        <span className="mono">{formatUsd(total)}</span>
      </div>
      {top.length === 0 ? (
        <p className="chart-empty">モデル集計なし</p>
      ) : (
        <>
          <div className="model-cat-summary mono">
            <span>自動 {formatUsd(autoTotal)}</span>
            <span>外部 {formatUsd(namedTotal)}</span>
          </div>
          <div className="stack-track" aria-label="モデル別コスト比率">
            {top.map((m, i) => (
              <span
                key={m.model}
                className="stack-seg"
                style={{
                  width: `${(m.costUsd / total) * 100}%`,
                  background: MODEL_COLORS[i % MODEL_COLORS.length],
                }}
                title={`${m.model}: ${formatUsd(m.costUsd)}`}
              />
            ))}
          </div>
          <ul className="model-bars">
            {top.map((m, i) => (
              <li key={m.model}>
                <div className="model-bars-head">
                  <i
                    className="swatch"
                    style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] }}
                  />
                  <span className="name">
                    <span
                      className={`model-tag ${m.category === 'named' ? 'named' : 'auto'}`}
                    >
                      {m.category === 'named' ? '外部' : '自動'}
                    </span>
                    {m.category === 'named' && m.billingLane === 'auto' ? (
                      <span className="model-tag lane">Auto枠</span>
                    ) : null}
                    {shortModel(m.model)}
                  </span>
                  <span className="mono val">{formatUsd(m.costUsd)}</span>
                </div>
                <div className="model-bar-track">
                  <span
                    className="model-bar-fill"
                    style={{
                      width: `${(m.costUsd / max) * 100}%`,
                      background: MODEL_COLORS[i % MODEL_COLORS.length],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function TokenMix({ usage }: { usage: UsagePayload }) {
  const parts = [
    { key: 'in', label: 'In', value: usage.tokens.input, color: '#2fd3c5' },
    { key: 'out', label: 'Out', value: usage.tokens.output, color: '#7ad0ff' },
    { key: 'cache', label: 'Cache', value: usage.tokens.cacheRead, color: '#5b7c99' },
  ]
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1

  return (
    <div className="chart-block">
      <div className="chart-head">
        <span>トークン構成</span>
        <span className="mono">{formatTokens(total)}</span>
      </div>
      <div className="stack-track tall">
        {parts.map((p) => (
          <span
            key={p.key}
            className="stack-seg"
            style={{
              width: `${(p.value / total) * 100}%`,
              background: p.color,
            }}
            title={`${p.label}: ${formatTokens(p.value)}`}
          />
        ))}
      </div>
      <div className="token-legend mono">
        {parts.map((p) => (
          <span key={p.key}>
            <i className="swatch" style={{ background: p.color }} />
            {p.label} {formatTokens(p.value)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function UsageCharts({ usage, compact = false }: Props) {
  if (!usage) return null
  const daily = usage.charts?.daily ?? []

  if (compact) {
    if (!daily.length) return null
    return <UsageMiniBars daily={daily} />
  }

  const planPercent =
    usage.breakdown?.included.percent ??
    usage.spend.includedPercent ??
    usage.spend.percentUsed

  return (
    <div className="usage-charts">
      <div className="usage-overview">
        <UsageRing percent={planPercent} />
        <div className="usage-overview-copy">
          <p className="hero-label">プラン枠</p>
          <p className="overview-spend mono">
            {formatUsd(usage.spend.includedUsd)} /{' '}
            {formatUsd(usage.spend.limitUsd || usage.spend.includedUsd)}
          </p>
          <p className="overview-meta mono">
            合計 {formatUsd(usage.spend.totalUsd)}
            {usage.spend.bonusUsd > 0
              ? ` · ボーナス ${formatUsd(usage.spend.bonusUsd)}`
              : ''}
          </p>
          {usage.charts?.eventsTotal != null && (
            <p className="overview-meta mono">
              Events {usage.charts.eventsSampled}
              {usage.charts.eventsTotal > usage.charts.eventsSampled
                ? ` / ${usage.charts.eventsTotal}`
                : ''}
            </p>
          )}
        </div>
      </div>
      <UsageBuckets usage={usage} />
      {daily.length > 0 && <DailyBars daily={daily} />}
      <ModelShare models={usage.models} />
      <TokenMix usage={usage} />
    </div>
  )
}
