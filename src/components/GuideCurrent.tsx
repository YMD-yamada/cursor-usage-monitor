import type { UsageGuide } from '../lib/format'

/** Expanded overview — no duplicate headline (hero shows pools). */
export function CurrentState({ guide }: { guide: UsageGuide }) {
  const c = guide.current
  const notices = [
    ...c.cannotDo.map((line) => ({ text: line, warn: true })),
    ...c.whyStillWorking.slice(0, 2).map((line) => ({ text: line, warn: false })),
  ]

  if (!notices.length && guide.tips.length === 0) {
    return (
      <p className="guide-empty">
        枠に余裕あり。画面の数字とグラフを見てください。
      </p>
    )
  }

  return (
    <div className="guide-current slim">
      {guide.tips.slice(0, 1).map((t) => (
        <p key={t} className="guide-tip-lead">
          {t}
        </p>
      ))}
      {notices.length > 0 && (
        <ul className="guide-notices">
          {notices.map((n) => (
            <li key={n.text} className={n.warn ? 'warn' : undefined}>
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
