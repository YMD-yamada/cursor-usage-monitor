import { readCursorAuth } from './auth.mjs'
import { buildBillingGuide } from './guide.mjs'

const BASE = 'https://cursor.com'

/** First-party / Cursor Models pool (matches dashboard "Cursor Models"). */
const CURSOR_MODEL_HINTS = new Set([
  'default',
  'auto',
  'agent_review',
  'composer-1',
  'composer-1.5',
  'composer-2',
  'composer-2-fast',
  'composer-2.5',
  'composer-2.5-fast',
  'vega',
  'vega-med',
  'vega-medium',
  'vega-high',
  'vega-xhigh',
  'grok-4.5',
])

function authHeaders(sessionToken) {
  return {
    Cookie: `WorkosCursorSessionToken=${sessionToken}`,
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Origin: 'https://cursor.com',
    Referer: 'https://cursor.com/dashboard/usage',
  }
}

async function postJson(sessionToken, endpoint, body = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: authHeaders(sessionToken),
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${endpoint} failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return text ? JSON.parse(text) : null
}

async function getJson(sessionToken, endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'GET',
    headers: authHeaders(sessionToken),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${endpoint} failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return text ? JSON.parse(text) : null
}

function centsToUsd(cents) {
  return Math.round((Number(cents) || 0) * 100) / 10000
}

function msToIso(value) {
  if (value == null) return null
  if (typeof value === 'string' && value.includes('T')) return value
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return null
  return new Date(n).toISOString()
}

function toMs(value) {
  if (value == null) return null
  if (typeof value === 'string' && value.includes('T')) {
    const t = Date.parse(value)
    return Number.isFinite(t) ? t : null
  }
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : null
}

function dayKey(ms) {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function eventCostCents(event) {
  if (event?.chargedCents != null && event.chargedCents !== '') {
    return Number(event.chargedCents) || 0
  }
  if (event?.tokenUsage?.totalCents != null) {
    return Number(event.tokenUsage.totalCents) || 0
  }
  return 0
}

/**
 * Classify against official pools:
 * - Cursor Models: Composer / Cursor Grok / Auto bucket
 * - Other Models: third-party API models
 */
function classifyModel(model, autoBucketModels = []) {
  const name = String(model || 'unknown')
  const lower = name.toLowerCase()
  const inAutoBucket =
    CURSOR_MODEL_HINTS.has(lower) ||
    lower.startsWith('composer') ||
    lower.startsWith('cursor-grok') ||
    lower.startsWith('grok-4.5') ||
    lower.startsWith('vega') ||
    lower === 'default' ||
    lower === 'auto' ||
    autoBucketModels.includes(name) ||
    autoBucketModels.includes(lower)

  const pool = inAutoBucket ? 'cursor' : 'other'
  // Keep legacy keys for older UI bits that still check category/billingLane.
  return {
    pool,
    category: pool === 'cursor' ? 'auto' : 'named',
    billingLane: pool === 'cursor' ? 'auto' : 'named',
  }
}

async function fetchAllUsageEvents(sessionToken, { startMs, endMs } = {}) {
  const pageSize = 500
  const maxPages = 8
  const all = []
  let total = null

  for (let page = 1; page <= maxPages; page += 1) {
    const body = { page, pageSize }
    if (startMs != null) body.startDate = String(startMs)
    if (endMs != null) body.endDate = String(endMs)

    const data = await postJson(
      sessionToken,
      '/api/dashboard/get-filtered-usage-events',
      body,
    )
    const rows = data?.usageEventsDisplay || []
    if (total == null) total = Number(data?.totalUsageEventsCount || 0)
    all.push(...rows)
    if (rows.length < pageSize || all.length >= total) break
  }

  return { events: all, total: total ?? all.length }
}

function buildDailySeries(events, { days = 14, endMs = Date.now() } = {}) {
  const end = new Date(endMs)
  end.setHours(23, 59, 59, 999)

  const keys = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    d.setHours(12, 0, 0, 0)
    keys.push(dayKey(d.getTime()))
  }

  const map = new Map(
    keys.map((key) => [
      key,
      {
        date: key,
        costUsd: 0,
        events: 0,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
      },
    ]),
  )

  for (const event of events) {
    const ms = toMs(event.timestamp)
    if (ms == null) continue
    const key = dayKey(ms)
    const bucket = map.get(key)
    if (!bucket) continue
    const tokens = event.tokenUsage || {}
    bucket.costUsd += centsToUsd(eventCostCents(event))
    bucket.events += 1
    bucket.requests += Number(event.requestsCosts || 0)
    bucket.inputTokens += Number(tokens.inputTokens || 0)
    bucket.outputTokens += Number(tokens.outputTokens || 0)
    bucket.cacheReadTokens += Number(tokens.cacheReadTokens || 0)
  }

  return keys.map((key) => {
    const row = map.get(key)
    return {
      ...row,
      costUsd: Math.round(row.costUsd * 10000) / 10000,
      requests: Math.round(row.requests * 100) / 100,
    }
  })
}

function buildBreakdown({
  plan,
  period,
  summary,
  hardLimit,
  models,
  includedUsd,
  bonusUsd,
  limitUsd,
  remainingUsd,
}) {
  const cursorPercent = Number(
    plan.autoPercentUsed ?? summary?.individualUsage?.plan?.autoPercentUsed ?? 0,
  )
  const otherPercent = Number(
    plan.apiPercentUsed ?? summary?.individualUsage?.plan?.apiPercentUsed ?? 0,
  )
  const cursorCost = models
    .filter((m) => m.pool === 'cursor')
    .reduce((sum, m) => sum + m.costUsd, 0)
  const otherCost = models
    .filter((m) => m.pool === 'other')
    .reduce((sum, m) => sum + m.costUsd, 0)

  const onDemandFromSummary = summary?.individualUsage?.onDemand
  const onDemandAllowed =
    onDemandFromSummary != null
      ? Boolean(onDemandFromSummary.enabled)
      : !Boolean(hardLimit?.noUsageBasedAllowed)

  const includedPercent =
    limitUsd > 0
      ? Math.min(100, (includedUsd / limitUsd) * 100)
      : 0

  const cursorMessage =
    period?.autoModelSelectedDisplayMessage ||
    summary?.autoModelSelectedDisplayMessage ||
    null
  const otherMessage =
    period?.namedModelSelectedDisplayMessage ||
    summary?.namedModelSelectedDisplayMessage ||
    null

  const cursorModels = {
    label: 'Cursor Models',
    hint: 'Composer 2.5 / Cursor Grok 4.5 / Auto。公式ダッシュボードの Cursor Models プール',
    percent: cursorPercent,
    costUsd: Math.round(cursorCost * 10000) / 10000,
    exhausted: cursorPercent >= 99.5,
    message: cursorMessage,
  }

  const otherModels = {
    label: 'Other Models',
    hint: 'Claude / GPT / Gemini など第三者モデル。公式の Other Models（API）プール',
    percent: otherPercent,
    costUsd: Math.round(otherCost * 10000) / 10000,
    exhausted: otherPercent >= 99.5,
    message: otherMessage,
  }

  // Legacy aliases (same numbers) so older UI code keeps working during transition.
  const auto = {
    label: cursorModels.label,
    hint: cursorModels.hint,
    percent: cursorModels.percent,
    costUsd: cursorModels.costUsd,
    message: cursorModels.message,
  }
  const named = {
    label: otherModels.label,
    hint: otherModels.hint,
    percent: otherModels.percent,
    costUsd: otherModels.costUsd,
    onAutoLaneUsd: 0,
    message: otherModels.message,
  }

  return {
    cursorModels,
    otherModels,
    included: {
      label: 'Included（会計）',
      hint:
        'プラン購入分に対するドル会計。公式の主表示は2プールの％です。個人プランでは Usage 画面から $ 表示が外されています',
      usedUsd: includedUsd,
      limitUsd,
      remainingUsd,
      percent: includedPercent,
      exhausted: limitUsd > 0 && includedUsd >= limitUsd - 0.005,
      message: period?.displayMessage || null,
    },
    bonus: {
      label: 'ボーナス',
      hint: 'モデル提供側の追加無料枠。保証されない。プール％とは別の会計',
      usedUsd: bonusUsd,
      active: bonusUsd > 0,
      message: plan.bonusTooltip || null,
    },
    auto,
    named,
    onDemand: {
      label: '従量課金',
      allowed: onDemandAllowed,
      usedUsd: centsToUsd(onDemandFromSummary?.used ?? 0),
      limitUsd:
        onDemandFromSummary?.limit == null
          ? null
          : centsToUsd(onDemandFromSummary.limit),
      status: onDemandAllowed ? '利用可' : '停止中',
      hint: onDemandAllowed
        ? '枠超過後も従量で継続可能'
        : '枠超過後の従量課金はオフ',
    },
  }
}

export async function fetchCursorUsage() {
  const auth = readCursorAuth()
  const [summary, period, aggregated, hardLimit, legacy, me] = await Promise.all([
    getJson(auth.sessionToken, '/api/usage-summary').catch(() => null),
    postJson(auth.sessionToken, '/api/dashboard/get-current-period-usage'),
    postJson(auth.sessionToken, '/api/dashboard/get-aggregated-usage-events'),
    postJson(auth.sessionToken, '/api/dashboard/get-hard-limit').catch(() => null),
    getJson(auth.sessionToken, `/api/usage?user=${auth.userId}`).catch(() => null),
    getJson(auth.sessionToken, '/api/auth/me').catch(() => null),
  ])

  const cycleStartMs =
    toMs(summary?.billingCycleStart) ?? toMs(period?.billingCycleStart)
  const cycleEndMs =
    toMs(summary?.billingCycleEnd) ?? toMs(period?.billingCycleEnd) ?? Date.now()
  const chartEndMs = Math.min(cycleEndMs, Date.now())

  const { events, total: eventsTotal } = await fetchAllUsageEvents(
    auth.sessionToken,
    {
      startMs: cycleStartMs ?? Date.now() - 21 * 24 * 60 * 60 * 1000,
      endMs: chartEndMs,
    },
  ).catch(() => ({ events: [], total: 0 }))

  const plan = period?.planUsage || {}
  const summaryPlan = summary?.individualUsage?.plan || {}
  const autoBucketModels = period?.autoBucketModels || []

  const includedSpendCents = Number(
    plan.includedSpend ?? summaryPlan.breakdown?.included ?? summaryPlan.used ?? 0,
  )
  const bonusSpendCents = Number(
    plan.bonusSpend ?? summaryPlan.breakdown?.bonus ?? 0,
  )
  const totalSpendCents = Number(
    plan.totalSpend ??
      summaryPlan.breakdown?.total ??
      includedSpendCents + bonusSpendCents,
  )
  const limitCents = Number(plan.limit ?? summaryPlan.limit ?? 0)
  const includedUsd = centsToUsd(includedSpendCents)
  const bonusUsd = centsToUsd(bonusSpendCents)
  const limitUsd = centsToUsd(limitCents)
  const remainingUsd = centsToUsd(
    Math.max(
      (summaryPlan.remaining != null
        ? summaryPlan.remaining
        : limitCents - includedSpendCents) || 0,
      0,
    ),
  )

  const autoPercentUsed = Number(
    plan.autoPercentUsed ?? summaryPlan.autoPercentUsed ?? 0,
  )
  const apiPercentUsed = Number(
    plan.apiPercentUsed ?? summaryPlan.apiPercentUsed ?? 0,
  )
  // Official dashboard no longer shows a single combined %; keep totalPercentUsed
  // only as a secondary metric (not the hero).
  const totalPercentUsed = Number(
    plan.totalPercentUsed ?? summaryPlan.totalPercentUsed ?? 0,
  )

  const models = (aggregated?.aggregations || [])
    .map((row) => {
      const model = row.modelIntent || 'unknown'
      const { pool, category, billingLane } = classifyModel(
        model,
        autoBucketModels,
      )
      return {
        model,
        pool,
        category,
        billingLane,
        inputTokens: Number(row.inputTokens || 0),
        outputTokens: Number(row.outputTokens || 0),
        cacheReadTokens: Number(row.cacheReadTokens || 0),
        cacheWriteTokens: Number(row.cacheWriteTokens || 0),
        costUsd: centsToUsd(row.totalCents),
        tier: row.tier ?? null,
      }
    })
    .sort((a, b) => b.costUsd - a.costUsd)

  const daily = buildDailySeries(events, {
    days: 14,
    endMs: chartEndMs,
  })

  const breakdown = buildBreakdown({
    plan: {
      ...plan,
      autoPercentUsed,
      apiPercentUsed,
      totalPercentUsed,
      bonusTooltip: plan.bonusTooltip,
    },
    period,
    summary,
    hardLimit,
    models,
    includedUsd,
    bonusUsd,
    limitUsd,
    remainingUsd,
  })

  const membershipType =
    summary?.membershipType || auth.membershipType || me?.membershipType || null

  const account = {
    email: auth.email || me?.email || null,
    name: me?.name || null,
    membershipType,
    subscriptionStatus: auth.subscriptionStatus,
    userId: auth.userId,
  }

  const billingInfo = {
    cycleStart:
      msToIso(summary?.billingCycleStart) ||
      msToIso(period?.billingCycleStart) ||
      legacy?.startOfMonth ||
      null,
    cycleEnd:
      msToIso(summary?.billingCycleEnd) || msToIso(period?.billingCycleEnd),
    displayMessage: period?.displayMessage || null,
    autoMessage:
      period?.autoModelSelectedDisplayMessage ||
      summary?.autoModelSelectedDisplayMessage ||
      null,
    apiMessage:
      period?.namedModelSelectedDisplayMessage ||
      summary?.namedModelSelectedDisplayMessage ||
      null,
    enabled: Boolean(
      summaryPlan.enabled ?? period?.enabled ?? true,
    ),
    noUsageBasedAllowed: !breakdown.onDemand.allowed,
  }

  const guide = buildBillingGuide({
    account,
    billing: billingInfo,
    breakdown,
    models,
    autoBucketModels,
  })

  return {
    fetchedAt: new Date().toISOString(),
    account,
    billing: billingInfo,
    spend: {
      totalUsd: centsToUsd(totalSpendCents),
      includedUsd,
      bonusUsd,
      limitUsd,
      remainingUsd,
      // Primary pool percents (match official Spending / Usage).
      percentUsed: Math.max(autoPercentUsed, apiPercentUsed),
      includedPercent: breakdown.included.percent,
      autoPercentUsed,
      apiPercentUsed,
      totalPercentUsed,
    },
    breakdown,
    guide,
    tokens: {
      input: Number(aggregated?.totalInputTokens || 0),
      output: Number(aggregated?.totalOutputTokens || 0),
      cacheRead: Number(aggregated?.totalCacheReadTokens || 0),
      cacheWrite: Number(aggregated?.totalCacheWriteTokens || 0),
      costUsd: centsToUsd(aggregated?.totalCostCents || 0),
    },
    models,
    charts: {
      daily,
      eventsSampled: events.length,
      eventsTotal,
    },
    legacy,
  }
}
