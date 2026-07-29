import type { UsagePayload } from '../lib/format'
import { formatTokens, formatUsd } from '../lib/format'

type Props = {
  usage: UsagePayload | null
}

export function ModelBreakdown({ usage }: Props) {
  const models = usage?.models ?? []
  const maxCost = Math.max(...models.map((m) => m.costUsd), 0.01)

  return (
    <section className="panel models-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Models</p>
          <h2>モデル別コスト</h2>
        </div>
        <p className="section-note">
          {models.length ? `${models.length} models` : 'no data'}
        </p>
      </div>

      {models.length === 0 ? (
        <p className="empty">この請求サイクルのモデル集計はまだありません。</p>
      ) : (
        <ul className="model-list">
          {models.map((model) => (
            <li key={model.model} className="model-row">
              <div className="model-main">
                <span className="model-name">{model.model}</span>
                <span className="model-cost">{formatUsd(model.costUsd)}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(model.costUsd / maxCost) * 100}%` }}
                />
              </div>
              <div className="model-meta">
                <span>in {formatTokens(model.inputTokens)}</span>
                <span>out {formatTokens(model.outputTokens)}</span>
                <span>cache {formatTokens(model.cacheReadTokens)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
