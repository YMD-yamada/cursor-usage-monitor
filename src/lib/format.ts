export type ModelCategory = 'auto' | 'named'

export type ModelUsage = {
  model: string
  category?: ModelCategory
  billingLane?: ModelCategory
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
  tier: number | null
}

export type UsageBreakdown = {
  included: {
    label: string
    hint: string
    usedUsd: number
    limitUsd: number
    remainingUsd: number
    percent: number
    exhausted: boolean
    message: string | null
  }
  bonus: {
    label: string
    hint: string
    usedUsd: number
    active: boolean
    message: string | null
  }
  auto: {
    label: string
    hint: string
    percent: number
    costUsd: number
    message: string | null
  }
  named: {
    label: string
    hint: string
    percent: number
    costUsd: number
    onAutoLaneUsd?: number
    message: string | null
  }
  onDemand: {
    label: string
    allowed: boolean
    status: string
    hint: string
  }
}

export type UsageGuide = {
  current: {
    headline: string
    plan: string
    membershipType: string | null
    subscriptionStatus: string | null
    cycleStart: string | null
    cycleEnd: string | null
    cycleDaysLeft: number | null
    whyStillWorking: string[]
    canDo: string[]
    cannotDo: string[]
  }
  layers: Array<{
    step: number
    title: string
    body: string
    state: string
  }>
  bonusExplainer?: {
    title: string
    summary: string
    points: string[]
  }
  poolsExplainer?: {
    title: string
    summary: string
    points: string[]
  }
  pools: Array<{
    id: string
    title: string
    body: string
    examples?: string[]
    usedNote: string
  }>
  history?: {
    title: string
    summary: string
    points: string[]
  }
  plans?: Array<{
    id: string
    name: string
    price: string
    otherModels: string
    cursorModels: string
    fit: string
    you: boolean
  }>
  stayOnPro?: {
    title: string
    points: string[]
  }
  modelStates: Array<{
    model: string
    costUsd: number
    category?: ModelCategory
    billingLane?: ModelCategory
    status: string
    meaning: string
  }>
  faq: Array<{ q: string; a: string }>
  tips: string[]
  docsUrl: string
  dashboardUrl: string
  spendingUrl?: string
}

export type DailyUsagePoint = {
  date: string
  costUsd: number
  events: number
  requests: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

export type UsagePayload = {
  fetchedAt: string
  cached?: boolean
  staleError?: string
  account: {
    email: string | null
    name: string | null
    membershipType: string | null
    subscriptionStatus: string | null
    userId: string
  }
  billing: {
    cycleStart: string | null
    cycleEnd: string | null
    displayMessage: string | null
    autoMessage: string | null
    apiMessage: string | null
    enabled: boolean
    noUsageBasedAllowed: boolean
  }
  spend: {
    totalUsd: number
    includedUsd: number
    bonusUsd: number
    limitUsd: number
    remainingUsd: number
    percentUsed: number
    includedPercent?: number
    autoPercentUsed: number
    apiPercentUsed: number
  }
  breakdown?: UsageBreakdown
  guide?: UsageGuide
  tokens: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    costUsd: number
  }
  models: ModelUsage[]
  charts?: {
    daily: DailyUsagePoint[]
    eventsSampled: number
    eventsTotal: number
  }
}

export type ProcessInfo = {
  pid: number
  name: string
  cpuTimeSec: number
  cpuPercent: number
  workingSetBytes: number
  privateBytes: number
  memPercent?: number
  startTime: string | null
  path: string | null
}

export type MemoryGroup = {
  name: string
  count: number
  workingSetBytes: number
  privateBytes: number
  cpuTimeSec: number
  memPercent: number
}

export type MetricsPayload = {
  platform: string
  cpu: {
    loadPercent: number
    cores: number
    model: string
  }
  memory: {
    totalBytes: number
    usedBytes: number
    freeBytes: number
    usedPercent: number
  }
  cursor: {
    processCount: number
    totalWorkingSetBytes: number
    totalPrivateBytes: number
    totalCpuPercent: number
    memPercent?: number
    processes: ProcessInfo[]
  }
  system?: {
    memoryGroups: MemoryGroup[]
    topProcesses: ProcessInfo[]
    topByCpu: ProcessInfo[]
  }
  sampledAt: string
}

export type TaskState =
  | 'running'
  | 'waiting'
  | 'unread'
  | 'open'
  | 'done'
  | 'idle'

export type TaskItem = {
  id: string
  kind: 'agent' | 'shell'
  title: string
  subtitle: string
  mode: string
  workspace: string | null
  project: string
  updatedAt: number
  updatedAtIso: string | null
  unread: boolean
  blocking: boolean
  pendingPlan: boolean
  locationStatus: string | null
  contextPercent: number | null
  selected: boolean
  running: boolean
  turnEnded: boolean | null
  turnStatus: string | null
  source: string
  state: TaskState
  runningForMs?: number
}

export type TasksPayload = {
  fetchedAt: string
  selectedId: string | null
  counts: {
    total: number
    running: number
    waiting: number
    unread: number
    open: number
    done: number
    shell: number
  }
  tasks: TaskItem[]
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value || 0)
}

export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatRelative(iso: string | null, now = Date.now()): string {
  if (!iso) return '—'
  const diff = Math.max(0, now - new Date(iso).getTime())
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr}h`
  const day = Math.round(hr / 24)
  return `${day}d`
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(value, 100))
}

export function taskStateLabel(state: TaskState): string {
  switch (state) {
    case 'running':
      return '実行中'
    case 'waiting':
      return '待機'
    case 'unread':
      return '未読'
    case 'open':
      return '開く'
    case 'done':
      return '完了'
    default:
      return '休止'
  }
}
