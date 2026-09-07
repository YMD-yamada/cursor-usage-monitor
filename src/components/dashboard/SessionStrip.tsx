import type { TasksPayload } from '../../lib/format'

const STATE_LABEL: Record<string, string> = {
  running: '実行中',
  waiting: '待機',
  unread: '未読',
  open: '開いている',
  done: '完了',
  idle: '待機',
}

type Props = {
  tasks: TasksPayload | null
  compact?: boolean
}

export function SessionStrip({ tasks, compact = false }: Props) {
  const c = tasks?.counts
  if (!c) {
    return (
      <section className="dash-sessions" aria-label="セッション">
        <p className="dash-hint">セッションを確認中…</p>
      </section>
    )
  }

  const chips = [
    { key: 'running', label: '実行', count: c.running, tone: 'active' as const },
    { key: 'waiting', label: '待機', count: c.waiting, tone: 'warn' as const },
    { key: 'open', label: '開く', count: c.open, tone: 'neutral' as const },
  ]

  if (compact) {
    const active = chips.filter((x) => x.count > 0)
    if (!active.length) {
      return (
        <section className="dash-sessions compact" aria-label="セッション">
          <span className="dash-session-quiet">Agent なし</span>
        </section>
      )
    }
    return (
      <section className="dash-sessions compact" aria-label="セッション">
        <div className="dash-session-chips">
          {active.map((chip) => (
            <span
              key={chip.key}
              className={`dash-chip tone-${chip.tone} has-count`}
            >
              <span className="dash-chip-count">{chip.count}</span>
              <span className="dash-chip-label">{chip.label}</span>
            </span>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className={`dash-sessions ${compact ? 'compact' : ''}`} aria-label="セッション">
      {!compact && <h3 className="dash-section-title">セッション</h3>}
      <div className="dash-session-chips">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className={`dash-chip tone-${chip.tone} ${chip.count ? 'has-count' : ''}`}
          >
            <span className="dash-chip-count">{chip.count}</span>
            <span className="dash-chip-label">{chip.label}</span>
          </span>
        ))}
      </div>
    </section>
  )
}

export function SessionList({
  tasks,
  hideEmpty = false,
}: {
  tasks: TasksPayload | null
  hideEmpty?: boolean
}) {
  const sessions = (tasks?.sessions ?? []).filter(
    (s) =>
      s.selected ||
      s.state === 'running' ||
      s.state === 'waiting' ||
      s.state === 'unread',
  )
  if (!sessions.length) {
    if (hideEmpty) return null
    return <p className="dash-empty">いま動いている Agent はありません</p>
  }

  return (
    <ul className="dash-session-list">
      {sessions.map((s) => (
        <li
          key={s.id}
          className={`dash-session-card state-${s.state} ${s.selected ? 'selected' : ''}`}
        >
          <span className={`dash-session-dot state-${s.state}`} aria-hidden />
          <div className="dash-session-body">
            <span className="dash-session-project">{s.project}</span>
            <span className="dash-session-meta">
              {s.kind === 'shell' ? 'ターミナル' : 'Agent'}
              {' · '}
              {STATE_LABEL[s.state] || s.state}
              {s.contextPercent != null ? ` · 文脈 ${s.contextPercent.toFixed(0)}%` : ''}
            </span>
          </div>
          {s.selected && <span className="dash-session-badge">選択中</span>}
        </li>
      ))}
    </ul>
  )
}
