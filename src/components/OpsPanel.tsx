import { useEffect, useMemo, useState } from 'react'
import type { UsagePayload } from '../lib/format'
import { formatUsd } from '../lib/format'
import { CURSOR_LINKS, openCursorLink } from '../lib/cursorLinks'
import {
  DEFAULT_OPS_PREFS,
  loadOpsPrefs,
  saveOpsPrefs,
  type OpsPrefs,
} from '../lib/prefs'

type Props = {
  usage: UsagePayload
}

type Action = {
  id: string
  title: string
  detail: string
  href: string
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
  cta: string
}

function LinkBtn({
  href,
  children,
  tone = 'neutral',
}: {
  href: string
  children: string
  tone?: 'ok' | 'warn' | 'danger' | 'neutral'
}) {
  return (
    <button
      type="button"
      className={`ops-link-btn tone-${tone}`}
      onClick={() => openCursorLink(href)}
    >
      {children}
    </button>
  )
}

/**
 * Operations / settings for “base plan only, no on-demand”.
 * Cursor does not expose a public API to flip these switches, so we:
 * 1) store the user’s policy locally
 * 2) mirror live on-demand status from Cursor
 * 3) deep-link to official dashboard pages to change settings
 */
export function OpsPanel({ usage }: Props) {
  const [prefs, setPrefs] = useState<OpsPrefs>(DEFAULT_OPS_PREFS)

  useEffect(() => {
    setPrefs(loadOpsPrefs())
  }, [])

  function update(partial: Partial<OpsPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...partial }
      saveOpsPrefs(next)
      return next
    })
  }

  const onDemandOn = Boolean(usage.breakdown?.onDemand.allowed)
  const exhausted = Boolean(usage.breakdown?.included.exhausted)
  const bonusActive = Boolean(usage.breakdown?.bonus.active)
  const planName = usage.account.membershipType || 'plan'

  const actions = useMemo(() => {
    const list: Action[] = []

    if (prefs.noOnDemand && onDemandOn) {
      list.push({
        id: 'disable-ondemand',
        title: '従量課金が ON です',
        detail:
          '方針「従量なし」と不一致です。Spending で Monthly Limit を Disabled にしてください。',
        href: CURSOR_LINKS.spending,
        tone: 'danger',
        cta: 'Spending で従量をOFF',
      })
    }

    if (prefs.noOnDemand && !onDemandOn) {
      list.push({
        id: 'ondemand-ok',
        title: '従量課金は OFF（方針どおり）',
        detail:
          '枠＋ボーナスの範囲で運用中。変更や確認は Spending からできます。',
        href: CURSOR_LINKS.spending,
        tone: 'ok',
        cta: 'Spending を開く',
      })
    }

    if (prefs.preferPlanChange && exhausted) {
      list.push({
        id: 'consider-upgrade',
        title: 'プラン枠を使い切りました',
        detail: bonusActive
          ? `いまはボーナス ${formatUsd(usage.spend.bonusUsd)} で継続中（保証外）。足りなければプラン変更を検討。`
          : 'ボーナスも薄い／なし。従量なし方針なら Pro+ / Ultra への変更が本筋です。',
        href: CURSOR_LINKS.billing,
        tone: 'warn',
        cta: 'Billing でプラン変更',
      })
    }

    if (prefs.preferCursorModels) {
      list.push({
        id: 'stretch-plan',
        title: '基本プランを使い切るコツ',
        detail:
          '普段は Auto / Composer / Cursor Grok（Cursor Models）。Claude / GPT は必要なときだけ指名。',
        href: CURSOR_LINKS.usageLimitsHelp,
        tone: 'neutral',
        cta: '利用枠の説明',
      })
    }

    list.push({
      id: 'compare-plans',
      title: 'プラン比較・料金表',
      detail: `いまのプラン: ${planName}。Pro / Pro+ / Ultra の差を確認できます。`,
      href: CURSOR_LINKS.pricing,
      tone: 'neutral',
      cta: 'Pricing を開く',
    })

    return list
  }, [
    prefs,
    onDemandOn,
    exhausted,
    bonusActive,
    usage.spend.bonusUsd,
    planName,
  ])

  return (
    <div className="ops-panel">
      <p className="guide-intro">
        Cursor の従量ON/OFFやプラン変更は公式サイト側の設定です。このアプリは方針を覚え、状態を監視し、必要なページへ案内します（どの Cursor ユーザーでも同じ流れ）。
      </p>

      <div className="ops-prefs">
        <p className="pool-title">運用方針（この端末に保存）</p>
        <label className="ops-check">
          <input
            type="checkbox"
            checked={prefs.noOnDemand}
            onChange={(e) => update({ noOnDemand: e.target.checked })}
          />
          <span>
            <strong>従量課金は使わない</strong>
            <em>枠＋ボーナス中心。超過課金を避ける</em>
          </span>
        </label>
        <label className="ops-check">
          <input
            type="checkbox"
            checked={prefs.preferPlanChange}
            onChange={(e) => update({ preferPlanChange: e.target.checked })}
          />
          <span>
            <strong>足りなければプラン変更を検討</strong>
            <em>従量ではなく Pro+ / Ultra を案内</em>
          </span>
        </label>
        <label className="ops-check">
          <input
            type="checkbox"
            checked={prefs.preferCursorModels}
            onChange={(e) => update({ preferCursorModels: e.target.checked })}
          />
          <span>
            <strong>基本プランを使い倒す</strong>
            <em>Auto / Composer / Grok を主戦に</em>
          </span>
        </label>
      </div>

      <div className="ops-live">
        <p className="pool-title">いまの Cursor 側の状態</p>
        <div className="ops-live-grid">
          <div>
            <span className="ops-live-label">プラン</span>
            <span className="mono">{planName}</span>
          </div>
          <div>
            <span className="ops-live-label">従量課金</span>
            <span className={`mono ${onDemandOn ? 'warn' : 'ok'}`}>
              {onDemandOn ? 'ON' : 'OFF'}
            </span>
          </div>
          <div>
            <span className="ops-live-label">プラン枠</span>
            <span className="mono">
              {formatUsd(usage.spend.includedUsd)} /{' '}
              {formatUsd(usage.spend.limitUsd)}
            </span>
          </div>
          <div>
            <span className="ops-live-label">ボーナス</span>
            <span className="mono">{formatUsd(usage.spend.bonusUsd)}</span>
          </div>
        </div>
      </div>

      <ul className="ops-actions">
        {actions.map((a) => (
          <li key={a.id} className={`ops-action tone-${a.tone}`}>
            <div className="ops-action-copy">
              <p className="ops-action-title">{a.title}</p>
              <p className="ops-action-detail">{a.detail}</p>
            </div>
            <LinkBtn href={a.href} tone={a.tone}>
              {a.cta}
            </LinkBtn>
          </li>
        ))}
      </ul>

      <div className="ops-quick-links">
        <LinkBtn href={CURSOR_LINKS.spending}>従量のON/OFF</LinkBtn>
        <LinkBtn href={CURSOR_LINKS.billing}>プラン変更</LinkBtn>
        <LinkBtn href={CURSOR_LINKS.usage}>Usage</LinkBtn>
        <LinkBtn href={CURSOR_LINKS.pricing}>料金表</LinkBtn>
      </div>

      <p className="ops-footnote">
        アプリから従量やプランを直接書き換えはできません（Cursor
        公式の公開APIがないため）。ボタンは公式 Dashboard / Pricing
        をブラウザで開きます。
      </p>
    </div>
  )
}
