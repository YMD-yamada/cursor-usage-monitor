export const VIEW_WIDGETS = [
  { id: 'gauges', label: '使用量' },
  { id: 'system', label: 'PC' },
  { id: 'sessions', label: 'セッション' },
  { id: 'charts', label: 'グラフ' },
] as const

export type ViewWidget = (typeof VIEW_WIDGETS)[number]['id']

export type DetailId = 'models' | 'ops' | 'billing' | 'launch'

export const DETAIL_ITEMS: { id: DetailId; label: string }[] = [
  { id: 'models', label: 'モデルの選び方' },
  { id: 'ops', label: '運用・設定' },
  { id: 'billing', label: '課金のしくみ' },
  { id: 'launch', label: '起動方法' },
]

export type ViewPrefs = {
  widgets: Record<ViewWidget, boolean>
}

const KEY = 'cursor-usage-monitor.viewPrefs.v1'

export const DEFAULT_VIEW_PREFS: ViewPrefs = {
  widgets: {
    gauges: true,
    system: true,
    sessions: true,
    charts: true,
  },
}

function normalize(parsed: Partial<ViewPrefs> | null | undefined): ViewPrefs {
  const widgets = { ...DEFAULT_VIEW_PREFS.widgets }
  if (parsed?.widgets) {
    for (const row of VIEW_WIDGETS) {
      const value = parsed.widgets[row.id]
      if (typeof value === 'boolean') widgets[row.id] = value
    }
    const legacy = parsed.widgets as Partial<Record<string, boolean>>
    if (legacy.sessionList === true && widgets.sessions === false) {
      widgets.sessions = true
    }
  }
  return { widgets }
}

export function loadViewPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return normalize(null)
    return normalize(JSON.parse(raw) as Partial<ViewPrefs>)
  } catch {
    return normalize(null)
  }
}

export function saveViewPrefs(prefs: ViewPrefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}

export function widgetVisible(prefs: ViewPrefs, id: ViewWidget) {
  return prefs.widgets[id] !== false
}
