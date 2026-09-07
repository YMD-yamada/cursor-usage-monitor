import { useState } from 'react'
import type { UsagePayload } from '../lib/format'
import { formatUsd } from '../lib/format'
import { CURSOR_LINKS, openCursorLink } from '../lib/cursorLinks'
import { OpsPanel } from './OpsPanel'
import { ModelAdvicePanel } from './ModelAdvicePanel'
import { CurrentState } from './GuideCurrent'

type Props = {
  usage: UsagePayload
}

type TabId = 'now' | 'models' | 'ops' | 'billing'

export { UsageAlert, GuideChip } from './UsageAlert'

export function BillingGuide({ usage }: Props) {
  const guide = usage.guide
  const [tab, setTab] = useState<TabId>('now')

  if (!guide) return null

  return (
    <div className="billing-guide">
      <div className="guide-tabs four">
        {(
          [
            ['now', '概要'],
            ['models', 'モデル'],
            ['ops', '運用'],
            ['billing', '課金'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`guide-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'now' && (
        <div className="guide-panel">
          <CurrentState guide={guide} />
        </div>
      )}

      {tab === 'models' && guide.modelAdvice && (
        <div className="guide-panel">
          <ModelAdvicePanel advice={guide.modelAdvice} />
        </div>
      )}

      {tab === 'ops' && (
        <div className="guide-panel">
          <OpsPanel usage={usage} help={guide.usageHelp} />
        </div>
      )}

      {tab === 'billing' && (
        <div className="guide-panel">
          <ol className="guide-layers compact-layers">
            {guide.layers.map((layer) => (
              <li key={layer.step}>
                <div className="layer-title">
                  <span className="layer-num">{layer.step}</span>
                  {layer.title}
                </div>
                <p className="layer-state mono">{layer.state}</p>
              </li>
            ))}
          </ol>

          <div className="guide-pools compact-pools">
            {guide.pools.map((pool) => (
              <div key={pool.id} className="guide-pool">
                <p className="pool-title">{pool.title}</p>
                <p className="pool-note mono">{pool.usedNote}</p>
              </div>
            ))}
          </div>

          {guide.modelStates.length > 0 && (
            <ul className="guide-model-states compact-states">
              {guide.modelStates.slice(0, 6).map((m) => (
                <li key={m.model}>
                  <div className="gms-head">
                    <span className="gms-name">{m.model.replace(/^cursor-/, '')}</span>
                    <span className="mono gms-cost">{formatUsd(m.costUsd)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="plan-table compact-plans">
            {guide.plans?.map((p) => (
              <div key={p.id} className={`plan-row ${p.you ? 'you' : ''}`}>
                <div className="plan-row-head">
                  <span className="plan-name">
                    {p.name}
                    {p.you ? ' · 現在' : ''}
                  </span>
                  <span className="mono plan-price">{p.price}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="guide-links">
            <button
              type="button"
              className="text-link"
              onClick={() => openCursorLink(guide.dashboardUrl)}
            >
              Usage
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() =>
                openCursorLink(guide.spendingUrl || CURSOR_LINKS.spending)
              }
            >
              Spending
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => openCursorLink(CURSOR_LINKS.pricing)}
            >
              Pricing
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
