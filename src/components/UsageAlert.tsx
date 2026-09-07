import type { UsagePayload } from '../lib/format'
import { loadOpsPrefs } from '../lib/prefs'

function shortPlan(plan: string) {
  return plan.split('（')[0].split('(')[0].trim()
}

/** Actionable alerts only — short, user-friendly. */
export function UsageAlert({
  usage,
  compact = false,
}: {
  usage: UsagePayload
  compact?: boolean
}) {
  const guide = usage.guide
  if (!guide) return null

  const onDemandOn = Boolean(usage.breakdown?.onDemand.allowed)
  const prefs = loadOpsPrefs()
  const cm =
    usage.breakdown?.cursorModels?.percent ?? usage.breakdown?.auto?.percent ?? 0
  const om =
    usage.breakdown?.otherModels?.percent ?? usage.breakdown?.named?.percent ?? 0

  let message: string | null = null
  let danger = false

  if (prefs.noOnDemand !== false && onDemandOn) {
    message = '従量課金が ON です'
    danger = true
  } else if (!onDemandOn && cm >= 95 && om >= 95) {
    message = '枠がほぼ使い切りです'
    danger = true
  } else if (!onDemandOn && om >= 95) {
    message = 'その他 AI 枠が残りわずか'
    danger = true
  } else if (!onDemandOn && cm >= 95) {
    message = 'Cursor 枠が残りわずか'
    danger = true
  } else if (!compact && guide.tips[0]) {
    message = guide.tips[0]
  }

  if (!message) return null

  return (
    <p className={`usage-alert ${danger ? 'danger' : ''}`}>{message}</p>
  )
}

export function GuideChip({ usage }: { usage: UsagePayload }) {
  return <UsageAlert usage={usage} />
}

export function heroMetaLine({
  planLabel,
  onDemandAllowed,
  loading,
  signedIn,
}: {
  planLabel?: string
  onDemandAllowed?: boolean
  loading?: boolean
  signedIn?: boolean
}) {
  if (loading) return '読み込み中…'
  if (!signedIn) return 'Cursor にサインイン'
  const parts: string[] = []
  if (planLabel) parts.push(shortPlan(planLabel))
  parts.push(`従量 ${onDemandAllowed ? 'ON' : 'OFF'}`)
  return parts.join(' · ')
}
