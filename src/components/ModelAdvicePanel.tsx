import type { UsageGuide } from '../lib/format'

type Props = {
  advice: NonNullable<UsageGuide['modelAdvice']>
  compact?: boolean
}

export function ModelAdvicePanel({ advice, compact = false }: Props) {
  if (compact) {
    return (
      <div className="model-advice compact">
        <p className="guide-kicker">モデル選び</p>
        <p className="guide-headline">{advice.headline}</p>
        <p className="model-advice-summary">{advice.summary}</p>
        {advice.yourPattern && (
          <p className="model-advice-pattern mono">{advice.yourPattern}</p>
        )}
      </div>
    )
  }

  return (
    <div className="model-advice">
      <p className="guide-headline">{advice.headline}</p>
      <p className="model-advice-summary">{advice.summary}</p>
      {advice.yourPattern && (
        <p className="model-advice-pattern mono">{advice.yourPattern}</p>
      )}

      <div className="guide-callout">
        <p className="pool-title">Claude Code との違い</p>
        <p className="pool-body">{advice.claudeCodeNote}</p>
      </div>

      <div className="model-advice-default">
        <p className="pool-title">普段のおすすめ</p>
        <p className="model-advice-pick">
          <strong>{advice.defaultPick.label}</strong>
          <span>{advice.defaultPick.why}</span>
        </p>
      </div>

      <ul className="model-advice-switch">
        {advice.whenToSwitch.map((row) => (
          <li key={row.situation}>
            <p className="mas-situation">{row.situation}</p>
            <p className="mas-pick mono">{row.pick}</p>
            <p className="mas-why">{row.why}</p>
          </li>
        ))}
      </ul>

      <div className="model-advice-settings">
        <p className="pool-title">設定の目安</p>
        <ul>
          {advice.settings.map((s) => (
            <li key={s.label}>
              <div className="mas-setting-head">
                <span>{s.label}</span>
                <span className="mono">{s.value}</span>
              </div>
              <p className="mas-why">{s.note}</p>
            </li>
          ))}
        </ul>
      </div>

      {advice.tips.length > 0 && (
        <ul className="guide-tips">
          {advice.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}

      {advice.steps && advice.steps.length > 0 && (
        <div className="model-advice-steps">
          <p className="pool-title">手順</p>
          <ol className="model-steps">
            {advice.steps.map((block) => (
              <li key={block.title}>
                <p className="ms-title">{block.title}</p>
                <ul>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
