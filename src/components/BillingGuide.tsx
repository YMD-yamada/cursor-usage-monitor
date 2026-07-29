import { useState } from 'react'
import type { UsageGuide, UsagePayload } from '../lib/format'
import { formatUsd } from '../lib/format'
import { OpsPanel } from './OpsPanel'

type Props = {
  usage: UsagePayload
}

type TabId = 'now' | 'ops' | 'billing' | 'pools' | 'plans'

function CurrentState({ guide }: { guide: UsageGuide }) {
  const c = guide.current
  return (
    <div className="guide-current">
      <p className="guide-kicker">いまの状態</p>
      <p className="guide-headline">{c.headline}</p>
      <p className="guide-plan mono">
        {c.plan}
        {c.subscriptionStatus ? ` · ${c.subscriptionStatus}` : ''}
        {c.cycleDaysLeft != null ? ` · 更新まで約${c.cycleDaysLeft}日` : ''}
      </p>
      <ul className="guide-why">
        {c.whyStillWorking.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {c.canDo.length > 0 && (
        <div className="guide-cans">
          <span className="ok">使える</span>
          <p>{c.canDo.join(' / ')}</p>
        </div>
      )}
      {c.cannotDo.length > 0 && (
        <div className="guide-cans warn">
          <span>注意</span>
          <p>{c.cannotDo.join(' / ')}</p>
        </div>
      )}
    </div>
  )
}

export function GuideChip({ usage }: { usage: UsagePayload }) {
  const guide = usage.guide
  if (!guide) return null
  const onDemandOn = Boolean(usage.breakdown?.onDemand.allowed)
  const prefs =
    typeof localStorage !== 'undefined'
      ? (() => {
          try {
            return JSON.parse(
              localStorage.getItem('cursor-usage-monitor.opsPrefs.v1') || '{}',
            ) as { noOnDemand?: boolean }
          } catch {
            return {}
          }
        })()
      : {}
  const mismatch = prefs.noOnDemand !== false && onDemandOn
  return (
    <p
      className={`guide-chip ${mismatch ? 'danger' : ''}`}
      title={guide.current.whyStillWorking.join(' ')}
    >
      {mismatch
        ? '従量ON中 · 運用タブでOFFへ'
        : guide.current.headline}
    </p>
  )
}

export function BillingGuide({ usage }: Props) {
  const guide = usage.guide
  const [tab, setTab] = useState<TabId>('now')

  if (!guide) return null

  return (
    <div className="billing-guide">
      <div className="guide-tabs five">
        {(
          [
            ['now', 'いま'],
            ['ops', '運用'],
            ['billing', '課金'],
            ['pools', 'プール'],
            ['plans', 'プラン'],
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

      {tab === 'ops' && (
        <div className="guide-panel">
          <OpsPanel usage={usage} />
        </div>
      )}

      {tab === 'now' && (
        <div className="guide-panel">
          <CurrentState guide={guide} />
          {guide.tips.length > 0 && (
            <ul className="guide-tips">
              {guide.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <ul className="guide-faq compact">
            {guide.faq.slice(0, 2).map((item) => (
              <li key={item.q}>
                <p className="faq-q">{item.q}</p>
                <p className="faq-a">{item.a}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'billing' && (
        <div className="guide-panel">
          <p className="guide-intro">
            Cursor は Claude のような「1本の無料枠」ではありません。保証枠 → ボーナス →
            従量 → 月次リセット、の順です。
          </p>

          {guide.bonusExplainer && (
            <div className="guide-callout">
              <p className="pool-title">{guide.bonusExplainer.title}</p>
              <p className="pool-body">{guide.bonusExplainer.summary}</p>
              <ul className="guide-tips">
                {guide.bonusExplainer.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <ol className="guide-layers">
            {guide.layers.map((layer) => (
              <li key={layer.step}>
                <div className="layer-title">
                  <span className="layer-num">{layer.step}</span>
                  {layer.title}
                </div>
                <p className="layer-body">{layer.body}</p>
                <p className="layer-state mono">{layer.state}</p>
              </li>
            ))}
          </ol>

          {guide.history && (
            <div className="guide-callout warn">
              <p className="pool-title">{guide.history.title}</p>
              <p className="pool-body">{guide.history.summary}</p>
              <ul className="guide-tips">
                {guide.history.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'pools' && (
        <div className="guide-panel">
          {guide.poolsExplainer && (
            <div className="guide-callout">
              <p className="pool-title">{guide.poolsExplainer.title}</p>
              <p className="pool-body">{guide.poolsExplainer.summary}</p>
              <ul className="guide-tips">
                {guide.poolsExplainer.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="guide-pools">
            {guide.pools.map((pool) => (
              <div key={pool.id} className="guide-pool">
                <p className="pool-title">{pool.title}</p>
                <p className="pool-body">{pool.body}</p>
                <p className="pool-note mono">{pool.usedNote}</p>
                {pool.examples?.length ? (
                  <p className="pool-examples mono">{pool.examples.join(' · ')}</p>
                ) : null}
              </div>
            ))}
          </div>
          {guide.modelStates.length > 0 && (
            <ul className="guide-model-states">
              {guide.modelStates.map((m) => (
                <li key={m.model}>
                  <div className="gms-head">
                    <span className="gms-name">{m.model.replace(/^cursor-/, '')}</span>
                    <span className={`model-tag ${m.category === 'named' ? 'named' : 'auto'}`}>
                      {m.status}
                    </span>
                    <span className="mono gms-cost">{formatUsd(m.costUsd)}</span>
                  </div>
                  <p className="gms-meaning">{m.meaning}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div className="guide-panel">
          <p className="guide-intro">
            Pro 据え置きでも運用できます。足りなくなったときの選択肢を並べます。
          </p>
          <div className="plan-table">
            {guide.plans?.map((p) => (
              <div key={p.id} className={`plan-row ${p.you ? 'you' : ''}`}>
                <div className="plan-row-head">
                  <span className="plan-name">
                    {p.name}
                    {p.you ? ' · いまここ' : ''}
                  </span>
                  <span className="mono plan-price">{p.price}</span>
                </div>
                <p className="pool-body">
                  Other Models: {p.otherModels}
                  <br />
                  Cursor Models: {p.cursorModels}
                </p>
                <p className="pool-note">{p.fit}</p>
              </div>
            ))}
          </div>
          {guide.stayOnPro && (
            <div className="guide-callout">
              <p className="pool-title">{guide.stayOnPro.title}</p>
              <ul className="guide-tips">
                {guide.stayOnPro.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <ul className="guide-faq">
            {guide.faq.slice(2).map((item) => (
              <li key={item.q}>
                <p className="faq-q">{item.q}</p>
                <p className="faq-a">{item.a}</p>
              </li>
            ))}
          </ul>
          <div className="guide-links">
            <a href={guide.dashboardUrl} target="_blank" rel="noreferrer">
              Usage
            </a>
            <a
              href={guide.spendingUrl || 'https://cursor.com/dashboard/spending'}
              target="_blank"
              rel="noreferrer"
            >
              Spending
            </a>
            <a href={guide.docsUrl} target="_blank" rel="noreferrer">
              Pricing docs
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
