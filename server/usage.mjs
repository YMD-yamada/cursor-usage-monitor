import { readCursorAuth } from './auth.mjs'
import { buildBillingGuide } from './guide.mjs'

const BASE = 'https://cursor.com'

const AUTO_MODEL_HINTS = new Set([
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
])

function authHeaders(sessionToken) {
  return {
    Cookie: `WorkosCursorSessionToken=${sessionToken}`,
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Origin: 'https://cursor.com',
    Referer: 'https://cursor.com/dashboard?tab=usage',
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
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return null
  return new Date(n).toISOString()
}

function toMs(value) {
  if (value == null) return null
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

function classifyModel(model, autoBucketModels = []) {
  const name = String(model || 'unknown')
  const lower = name.toLowerCase()
  const isBuiltinAuto =
    AUTO_MODEL_HINTS.has(lower) ||
    lower.startsWith('composer') ||
    lower === 'default' ||
    lower === 'auto'

  // Display category: what the user recognizes (Auto/Composer vs Claude/GPT/Grok).
  const category = isBuiltinAuto ? 'auto' : 'named'

  // Billing lane: how Cursor's plan meters it (auto bucket vs named API).
  const inAutoBucket =
    isBuiltinAuto ||
    autoBucketModels.includes(name) ||
    autoBucketModels.includes(lower)
  const billingLane = inAutoBucket ? 'auto' : 'named'

  return { category, billingLane }
}

async function fetchAllUsageEvents(sessionToken, { startMs, endMs } = {}) {
  const pageSize = 500
  const maxPages = 8
  const all = []
  let total = null

  for (let page = 1; page <= maxPages; page += 1) {
    const body = { page, pageSize }
    if (startMs != null) body.startDate = startMs
    if (endMs != null) body.endDate = endMs

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
  hardLimit,
  models,
  includedUsd,
  bonusUsd,
  limitUsd,
  remainingUsd,
}) {
  const includedPercent =
    limitUsd > 0
      ? Math.min(100, (includedUsd / limitUsd) * 100)
      : Number(plan.totalPercentUsed || 0)
  const autoPercent = Number(plan.autoPercentUsed || 0)
  const namedPercent = Number(plan.apiPercentUsed || 0)
  const autoCost = models
    .filter((m) => m.category === 'auto')
    .reduce((sum, m) => sum + m.costUsd, 0)
  const namedCost = models
    .filter((m) => m.category === 'named')
    .reduce((sum, m) => sum + m.costUsd, 0)
  const namedOnAutoLane = models
    .filter((m) => m.category === 'named' && m.billingLane === 'auto')
    .reduce((sum, m) => sum + m.costUsd, 0)
  const onDemandAllowed = !Boolean(hardLimit?.noUsageBasedAllowed)
  const exhausted = limitUsd > 0 && includedUsd >= limitUsd - 0.005

  return {
    included: {
      label: 'プラン枠',
      hint: 'サブスクに含まれる利用枠（Claude の枠に近いもの）',
      usedUsd: includedUsd,
      limitUsd,
      remainingUsd,
      percent: includedPercent,
      exhausted,
      message: period?.displayMessage || null,
    },
    bonus: {
      label: 'ボーナス',
      hint: 'モデル提供側の追加無料枠。プラン枠とは別計上',
      usedUsd: bonusUsd,
      active: bonusUsd > 0,
      message: plan.bonusTooltip || null,
    },
    auto: {
      label: 'Auto / Composer',
      hint: 'Cursor 自動モデル枠',
      percent: autoPercent,
      costUsd: Math.round(autoCost * 10000) / 10000,
      message: period?.autoModelSelectedDisplayMessage || null,
    },
    named: {
      label: '外部モデル',
      hint: 'Claude / GPT / Grok など。Auto 枠で消化される場合あり',
      percent: namedPercent,
      costUsd: Math.round(namedCost * 10000) / 10000,
      onAutoLaneUsd: Math.round(namedOnAutoLane * 10000) / 10000,
      message: period?.namedModelSelectedDisplayMessage || null,
    },
    onDemand: {
      label: '従量課金',
      allowed: onDemandAllowed,
      status: onDemandAllowed ? '利用可' : '停止中',
      hint: onDemandAllowed
        ? '枠超過後も従量で継続可能'
        : '枠超過後の従量課金はオフ',
    },
  }
}

export async function fetchCursorUsage() {
  const auth = readCursorAuth()
  const [period, aggregated, hardLimit, legacy, me] = await Promise.all([
    postJson(auth.sessionToken, '/api/dashboard/get-current-period-usage'),
    postJson(auth.sessionToken, '/api/dashboard/get-aggregated-usage-events'),
    postJson(auth.sessionToken, '/api/dashboard/get-hard-limit').catch(() => null),
    getJson(auth.sessionToken, `/api/usage?user=${auth.userId}`).catch(() => null),
    getJson(auth.sessionToken, '/api/auth/me').catch(() => null),
  ])

  const cycleStartMs = toMs(period?.billingCycleStart)
  const cycleEndMs = toMs(period?.billingCycleEnd) || Date.now()
  const chartEndMs = Math.min(cycleEndMs, Date.now())

  const { events, total: eventsTotal } = await fetchAllUsageEvents(
    auth.sessionToken,
    {
      startMs: cycleStartMs ?? Date.now() - 21 * 24 * 60 * 60 * 1000,
      endMs: chartEndMs,
    },
  ).catch(() => ({ events: [], total: 0 }))

  const plan = period?.planUsage || {}
  const autoBucketModels = period?.autoBucketModels || []
  const totalSpendCents = Number(plan.totalSpend || 0)
  const includedSpendCents = Number(plan.includedSpend || 0)
  const bonusSpendCents = Number(plan.bonusSpend || 0)
  const limitCents = Number(plan.limit || 0)
  const includedUsd = centsToUsd(includedSpendCents)
  const bonusUsd = centsToUsd(bonusSpendCents)
  const limitUsd = centsToUsd(limitCents)
  const remainingUsd = centsToUsd(Math.max(limitCents - includedSpendCents, 0))
  const percentUsed = Number(plan.totalPercentUsed ?? plan.autoPercentUsed ?? 0)

  const models = (aggregated?.aggregations || [])
    .map((row) => {
      const model = row.modelIntent || 'unknown'
      const { category, billingLane } = classifyModel(model, autoBucketModels)
      return {
        model,
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
    plan,
    period,
    hardLimit,
    models,
    includedUsd,
    bonusUsd,
    limitUsd,
    remainingUsd,
  })

  const account = {
    email: auth.email || me?.email || null,
    name: me?.name || null,
    membershipType: auth.membershipType,
    subscriptionStatus: auth.subscriptionStatus,
    userId: auth.userId,
  }

  const billingInfo = {
    cycleStart: msToIso(period?.billingCycleStart) || legacy?.startOfMonth || null,
    cycleEnd: msToIso(period?.billingCycleEnd),
    displayMessage: period?.displayMessage || null,
    autoMessage: period?.autoModelSelectedDisplayMessage || null,
    apiMessage: period?.namedModelSelectedDisplayMessage || null,
    enabled: Boolean(period?.enabled),
    noUsageBasedAllowed: Boolean(hardLimit?.noUsageBasedAllowed),
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
      percentUsed,
      includedPercent: breakdown.included.percent,
      autoPercentUsed: Number(plan.autoPercentUsed || 0),
      apiPercentUsed: Number(plan.apiPercentUsed || 0),
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
