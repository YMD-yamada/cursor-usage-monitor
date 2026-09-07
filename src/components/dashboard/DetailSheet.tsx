import type { UsagePayload } from '../../lib/format'
import { formatUsd } from '../../lib/format'
import { CURSOR_LINKS, openCursorLink } from '../../lib/cursorLinks'
import { DETAIL_ITEMS, type DetailId } from '../../lib/viewPrefs'
import { ModelAdvicePanel } from '../ModelAdvicePanel'
import { OpsPanel } from '../OpsPanel'
import { CurrentState } from '../GuideCurrent'

type BodyProps = {
  section: DetailId
  usage: UsagePayload | null
}

function BillingBody({ usage }: { usage: UsagePayload }) {
  const guide = usage.guide
  if (!guide) return <p className="dash-empty">ガイドを読み込み中…</p>

  return (
    <div className="guide-sheet">
      <CurrentState guide={guide} />
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
          onClick={() => openCursorLink(guide.spendingUrl || CURSOR_LINKS.spending)}
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
  )
}

function LaunchBody({ usage }: { usage: UsagePayload }) {
  const launch = usage.guide?.usageHelp?.launch
  if (!launch?.length) return <p className="dash-empty">起動ガイドはありません</p>
  return (
    <ul className="guide-launch-list">
      {launch.map((row) => (
        <li key={row.label}>
          <strong>{row.label}</strong>
          <span>{row.detail}</span>
        </li>
      ))}
    </ul>
  )
}

export function DetailBody({ section, usage }: BodyProps) {
  if (!usage) return <p className="dash-empty">使用量を読み込み中…</p>
  const guide = usage.guide

  if (section === 'models') {
    if (!guide?.modelAdvice) {
      return <p className="dash-empty">モデル助言はまだありません</p>
    }
    return <ModelAdvicePanel advice={guide.modelAdvice} />
  }
  if (section === 'ops') {
    return <OpsPanel usage={usage} help={guide?.usageHelp} />
  }
  if (section === 'billing') {
    return <BillingBody usage={usage} />
  }
  return <LaunchBody usage={usage} />
}

type OverlayProps = BodyProps & {
  onClose: () => void
}

export function DetailOverlay({
  section,
  usage,
  onClose,
}: OverlayProps) {
  const title = DETAIL_ITEMS.find((row) => row.id === section)?.label || 'くわしく'

  return (
    <div className="detail-overlay">
      <header className="detail-overlay-head">
        <button type="button" className="text-btn" onClick={onClose}>
          戻る
        </button>
        <h2 className="detail-overlay-title">{title}</h2>
      </header>
      <div className="detail-overlay-body">
        <DetailBody section={section} usage={usage} />
      </div>
    </div>
  )
}
