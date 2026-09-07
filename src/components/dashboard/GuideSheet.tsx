import type { UsagePayload } from '../../lib/format'
import { ModelAdvicePanel } from '../ModelAdvicePanel'
import { OpsPanel } from '../OpsPanel'
import { PoolDiagram } from './PoolDiagram'

type Props = {
  usage: UsagePayload
  cursorPct: number
  otherPct: number
}

export function GuideSheet({ usage, cursorPct, otherPct }: Props) {
  const guide = usage.guide
  if (!guide) return null

  return (
    <div className="guide-sheet">
      <PoolDiagram cursorPct={cursorPct} otherPct={otherPct} />

      {guide.modelAdvice && (
        <details className="guide-fold">
          <summary>モデルの選び方</summary>
          <ModelAdvicePanel advice={guide.modelAdvice} />
        </details>
      )}

      <details className="guide-fold">
        <summary>運用・設定</summary>
        <OpsPanel usage={usage} help={guide.usageHelp} />
      </details>

      {guide.usageHelp && (
        <details className="guide-fold">
          <summary>起動方法</summary>
          <ul className="guide-launch-list">
            {guide.usageHelp.launch.map((row) => (
              <li key={row.label}>
                <strong>{row.label}</strong>
                <span>{row.detail}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
