import { useMemo, useState } from 'react'
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

type ChartPoint = {
  x: number
  yCost: number
  yEvents: number
  day: DailyUsagePoint
}

function buildDailyGeometry(
  daily: DailyUsagePoint[],
  width: number,
  height: number,
  pad = { top: 8, right: 6, bottom: 4, left: 6 },
) {
  const innerW = Math.max(width - pad.left - pad.right, 1)
  const innerH = Math.max(height - pad.top - pad.bottom, 1)
  const maxCost = Math.max(...daily.map((d) => d.costUsd), 0.01)
  const maxEvents = Math.max(...daily.map((d) => d.events), 1)
  const n = daily.length
  const step = n <= 1 ? 0 : innerW / (n - 1)

  const points: ChartPoint[] = daily.map((day, i) => {
    const x = pad.left + (n <= 1 ? innerW / 2 : i * step)
    const yCost =
      pad.top + innerH * (1 - Math.min(day.costUsd / maxCost, 1))
    const yEvents =
      pad.top + innerH * (1 - Math.min(day.events / maxEvents, 1))
    return { x, yCost, yEvents, day }
  })

  const costLine = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.yCost.toFixed(1)}`)
    .join(' ')

  const baseline = pad.top + innerH
  const costArea =
    points.length === 0
      ? ''
      : [
          `M${points[0].x.toFixed(1)},${baseline.toFixed(1)}`,
          ...points.map((p) => `L${p.x.toFixed(1)},${p.yCost.toFixed(1)}`),
          `L${points[points.length - 1].x.toFixed(1)},${baseline.toFixed(1)}`,
          'Z',
        ].join(' ')

  const eventsLine = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.yEvents.toFixed(1)}`,
    )
    .join(' ')

  return { points, costLine, costArea, eventsLine, maxCost, maxEvents, pad, baseline }
}

/** Compact 14-day cost area chart — always visible under the hero. */
export function UsageMiniBars({ daily }: { daily: DailyUsagePoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 280
  const height = 48
  const geo = useMemo(
    () => buildDailyGeometry(daily, width, height, { top: 6, right: 4, bottom: 2, left: 4 }),
    [daily],
  )

  if (!daily.length) return null

  const total = daily.reduce((sum, d) => sum + d.costUsd, 0)
  const active = hover != null ? daily[hover] : null

  return (
    <div
      className="mini-bars"
      role="img"
      aria-label={`直近14日のコスト合計 ${formatUsd(total)}`}
    >
      <svg
        className="mini-area-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="miniCostFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ad0ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2fd3c5" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={geo.costArea} fill="url(#miniCostFill)" />
        <path
          d={geo.costLine}
          fill="none"
          stroke="#2fd3c5"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {geo.points.map((p, i) => (
          <g key={p.day.date}>
            <circle
              cx={p.x}
              cy={p.yCost}
              r={hover === i ? 2.8 : p.day.costUsd > 0 ? 1.4 : 0}
              fill={hover === i ? '#7ad0ff' : '#2fd3c5'}
              opacity={p.day.costUsd > 0 || hover === i ? 1 : 0}
            />
            <rect
              x={p.x - (geo.points.length > 1 ? (width / geo.points.length) / 2 : 8)}
              y={0}
              width={geo.points.length > 1 ? width / geo.points.length : 16}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      <div className="mini-bars-meta mono">
        <span>
          {active
            ? `${dayLabel(active.date)} · ${formatUsd(active.costUsd)} · ${active.events}件`
            : '14日コスト'}
        </span>
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

function DailyTrendChart({ daily }: { daily: DailyUsagePoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 320
  const height = 120
  const geo = useMemo(
    () =>
      buildDailyGeometry(daily, width, height, {
        top: 12,
        right: 8,
        bottom: 18,
        left: 8,
      }),
    [daily],
  )

  const total = daily.reduce((sum, d) => sum + d.costUsd, 0)
  const peak = daily.reduce((best, d) => (d.costUsd > best.costUsd ? d : best), daily[0])
  const active = hover != null ? geo.points[hover] : null
  const labelIndexes = new Set(
    [0, Math.floor((daily.length - 1) / 2), daily.length - 1].filter(
      (i) => i >= 0 && i < daily.length,
    ),
  )

  return (
    <div className="chart-block">
      <div className="chart-head">
        <span>日別コスト推移（14日）</span>
        <span className="mono">
          Σ {formatUsd(total)}
          {peak?.costUsd ? ` · 峰 ${dayLabel(peak.date)}` : ''}
        </span>
      </div>
      <div className="area-chart-wrap" role="img" aria-label="日別コスト面積グラフ">
        <svg
          className="area-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="dailyCostFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7ad0ff" stopOpacity="0.5" />
              <stop offset="55%" stopColor="#2fd3c5" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2fd3c5" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((t) => {
            const y = geo.pad.top + (height - geo.pad.top - geo.pad.bottom) * t
            return (
              <line
                key={t}
                x1={geo.pad.left}
                x2={width - geo.pad.right}
                y1={y}
                y2={y}
                className="chart-grid"
              />
            )
          })}

          <path d={geo.costArea} fill="url(#dailyCostFill)" />
          <path
            d={geo.eventsLine}
            fill="none"
            stroke="#e2b45a"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            strokeLinejoin="round"
            opacity="0.85"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={geo.costLine}
            fill="none"
            stroke="#2fd3c5"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {geo.points.map((p, i) => (
            <g key={p.day.date}>
              <circle
                cx={p.x}
                cy={p.yCost}
                r={hover === i ? 3.4 : p.day.costUsd > 0 ? 2 : 0}
                fill={hover === i ? '#7ad0ff' : '#2fd3c5'}
                stroke="rgba(14,20,27,0.85)"
                strokeWidth="1"
              />
              {labelIndexes.has(i) && (
                <text
                  x={p.x}
                  y={height - 4}
                  textAnchor="middle"
                  className="chart-axis-label"
                >
                  {dayLabel(p.day.date)}
                </text>
              )}
              <rect
                x={
                  p.x -
                  (geo.points.length > 1 ? width / geo.points.length / 2 : 10)
                }
                y={0}
                width={geo.points.length > 1 ? width / geo.points.length : 20}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          ))}

          {active && (
            <line
              x1={active.x}
              x2={active.x}
              y1={geo.pad.top}
              y2={geo.baseline}
              className="chart-hover-line"
            />
          )}
        </svg>

        {active && (
          <div
            className="chart-tooltip mono"
            style={{
              left: `${(active.x / width) * 100}%`,
            }}
          >
            <strong>{dayLabel(active.day.date)}</strong>
            <span>{formatUsd(active.day.costUsd)}</span>
            <span>{active.day.events} events</span>
          </div>
        )}
      </div>
      <p className="chart-caption mono">
        実線=コスト · 破線=イベント数
        {active
          ? ` · 選択 ${dayLabel(active.day.date)} ${formatUsd(active.day.costUsd)}`
          : ''}
      </p>
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
      {daily.length > 0 && <DailyTrendChart daily={daily} />}
      <ModelShare models={usage.models} />
      <TokenMix usage={usage} />
    </div>
  )
}
