function planLabel(membershipType) {
  const key = String(membershipType || '').toLowerCase()
  if (key === 'pro') return 'Pro（$20/月）'
  if (key === 'pro_plus' || key === 'pro-plus' || key === 'proplus') return 'Pro+（$60/月）'
  if (key === 'ultra') return 'Ultra（$200/月）'
  if (key === 'free' || key === 'hobby') return 'Hobby（無料）'
  if (key === 'business' || key === 'team') return 'Teams'
  if (key === 'start') return 'Start（India）'
  return membershipType || '不明なプラン'
}

function daysUntil(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

function formatUsd(n) {
  return `$${(Number(n) || 0).toFixed(2)}`
}

/**
 * Personalized Japanese guide explaining Cursor billing + current account state.
 * Aligned with official docs (two pools: Cursor Models / Other Models).
 */
export function buildBillingGuide({
  account,
  billing,
  breakdown,
  models,
  autoBucketModels = [],
}) {
  const membership = String(account?.membershipType || '').toLowerCase()
  const plan = planLabel(account?.membershipType)
  const cycleDaysLeft = daysUntil(billing?.cycleEnd)
  const cursor = breakdown?.cursorModels || breakdown?.auto
  const other = breakdown?.otherModels || breakdown?.named
  const included = breakdown?.included
  const bonus = breakdown?.bonus
  const onDemand = breakdown?.onDemand

  const cursorPct = Number(cursor?.percent || 0)
  const otherPct = Number(other?.percent || 0)

  const whyStillWorking = []
  if (cursorPct < 99.5) {
    whyStillWorking.push(
      `Cursor Models プールはまだ ${cursorPct.toFixed(0)}%（公式 Usage / Spending と同じ％）。`,
    )
  } else {
    whyStillWorking.push(
      'Cursor Models は上限付近。超過分は Other Models 枠か従量へロールオーバーします（公式の説明どおり）。',
    )
  }
  if (otherPct < 99.5) {
    whyStillWorking.push(
      `Other Models（第三者API）は ${otherPct.toFixed(0)}%。Pro なら少なくとも $20 相当がプランに含まれます。`,
    )
  } else {
    whyStillWorking.push(
      'Other Models は上限付近。続きは従量 ON かプラン上げが必要です。',
    )
  }
  if (bonus?.active) {
    whyStillWorking.push(
      `ボーナス会計 ${formatUsd(bonus.usedUsd)} あり（保証外の提供側無料。公式の主表示は2プール％）。`,
    )
  }
  if (onDemand?.allowed) {
    whyStillWorking.push('従量課金が ON なので、枠を超えても有料で続けられます。')
  } else {
    whyStillWorking.push(
      '従量課金は OFF。両プールが尽きたあとはサイクル更新か従量 ON / プラン上げが必要です。',
    )
  }

  const headline =
    cursorPct >= 99.5 && otherPct >= 99.5
      ? onDemand?.allowed
        ? '両プール使い切り。従量課金で継続中'
        : '両プール使い切り。追加手段がないと停止します'
      : `Cursor Models ${cursorPct.toFixed(0)}% · Other Models ${otherPct.toFixed(0)}%`

  const current = {
    headline,
    plan,
    membershipType: account?.membershipType || null,
    subscriptionStatus: account?.subscriptionStatus || null,
    cycleStart: billing?.cycleStart || null,
    cycleEnd: billing?.cycleEnd || null,
    cycleDaysLeft,
    whyStillWorking,
    canDo: [],
    cannotDo: [],
  }

  if (cursorPct < 99.5 || onDemand?.allowed) {
    current.canDo.push('Cursor Models（Composer / Cursor Grok / Auto）')
  }
  if (otherPct < 99.5 || onDemand?.allowed) {
    current.canDo.push('Other Models（Claude / GPT / Gemini など）')
  }
  if (cursorPct >= 99.5 && otherPct >= 99.5 && !onDemand?.allowed) {
    current.cannotDo.push('ほぼすべての Agent / Chat（両プール切れ & 従量 OFF）')
  }

  const bonusExplainer = {
    title: 'ボーナス枠の扱い',
    summary:
      'ボーナスは「毎月必ずもらえる無料枠」ではありません。Cursor がモデル提供者と組んで載せる追加無料で、額は月によって変わり、保証され。公式ダッシュボードの主表示は2プールの％です。',
    points: [
      '公式 Usage / Spending は Cursor Models と Other Models の％を別表示（合算％はない）',
      '個人プランでは Usage の $ 表示が外されことがある（トークン／％中心）',
      'ボーナスは会計上の追加無料。保証された制度ではない',
      '従量課金（on-demand）にはボーナスは付かない',
      bonus?.active
        ? `いまのあなた: ボーナス会計でおよそ ${formatUsd(bonus.usedUsd)}`
        : 'いまのあなた: ボーナス会計は見えていない / まだ載っていない',
    ],
  }

  const layers = [
    {
      step: 1,
      title: 'Cursor Models プール',
      body:
        'Composer 2.5 / Cursor Grok 4.5 / Auto。プランに多めに含まれる別枠。上限を超えると Other Models 枠または従量へロールオーバー。',
      state: `いま: ${cursorPct.toFixed(0)}%${cursor?.message ? ` · ${cursor.message}` : ''}`,
    },
    {
      step: 2,
      title: 'Other Models プール',
      body:
        'Claude / GPT / Gemini などを指名したとき。API 単価。Pro は少なくとも $20。上限超過は従量のみ。',
      state: `いま: ${otherPct.toFixed(0)}%${other?.message ? ` · ${other.message}` : ''}`,
    },
    {
      step: 3,
      title: '従量課金（自分で ON する有料継続）',
      body:
        '両プール超過後も続ける pay-as-you-go。Spending で上限を設定。品質を落とす「低速無料」ではなく、同じ API 単価で課金。',
      state: onDemand?.allowed
        ? `いま: ON${onDemand.usedUsd ? ` · ${formatUsd(onDemand.usedUsd)}` : ''}`
        : 'いま: OFF',
    },
    {
      step: 4,
      title: '請求サイクルのリセット',
      body: '毎月のサイクル開始で両プールが戻る。未使用分の繰り越しなし。',
      state:
        cycleDaysLeft == null
          ? 'いま: サイクル終了日不明'
          : `いま: あと約 ${cycleDaysLeft} 日で更新（${billing?.cycleEnd ? new Date(billing.cycleEnd).toLocaleDateString('ja-JP') : '—'}）`,
    },
  ]

  const pools = [
    {
      id: 'cursor-models',
      title: '① Cursor Models',
      body:
        'Composer 2.5 や Cursor Grok 4.5 など。プランに「多め」に含まれる別プール。Auto を選ぶとここに寄りやすい。',
      examples: (autoBucketModels || [])
        .filter((m) => /composer|grok|vega|default/i.test(m))
        .slice(0, 8),
      usedNote: `${cursorPct.toFixed(0)}% · 集計コスト目安 ${formatUsd(cursor?.costUsd ?? 0)}`,
    },
    {
      id: 'other-models',
      title: '② Other Models',
      body:
        'Claude / GPT / Gemini などをモデルピッカーで指名したとき。API 単価で減る。Pro は少なくとも $20 込み。',
      examples: models
        .filter((m) => m.pool === 'other' || (m.category === 'named' && m.billingLane !== 'auto'))
        .map((m) => m.model)
        .slice(0, 6),
      usedNote: `${otherPct.toFixed(0)}% · 集計コスト目安 ${formatUsd(other?.costUsd ?? 0)}`,
    },
  ]

  const poolsExplainer = {
    title: '利用枠は2つに分かれている',
    summary:
      '公式どおり、Cursor Models と Other Models は別プールです。合算の1本％はありません。片方を使い切っても、もう片方が残っていればそちらは使えることがあります。',
    points: [
      'Cursor Models: Composer / Cursor Grok など。含まれ量が多め。超過は Other Models または従量へ',
      'Other Models: Claude / GPT など指名。Pro は少なくとも $20。超過は従量のみ',
      'モデルピッカーで何を選ぶかで、どのプールが減るかが変わる',
      '確認は Dashboard の Spending / Usage（公式と同じ％）',
    ],
  }

  const history = {
    title: '昔の「計量でもずっと無料」はどうなった？',
    summary:
      '以前は Auto が実質ほぼ無制限に近い時期がありました。現行は両プールの月次枠があり、枠切れ後は従量 ON か上位プランが基本です。',
    points: [
      '旧: Auto 無制限／低速なら枠後も無料、のような体験があった',
      '現: 公式は2プール％表示。個人プランの Usage から $ 表示が外されることもある',
      '公式の救済は「従量を ON」または「プランを上げる」',
      'ボーナス会計が出る月は「まだ無料で動く」ように見えるが、保証された制度ではない',
    ],
  }

  const plans = [
    {
      id: 'hobby',
      name: 'Hobby',
      price: '無料',
      otherModels: 'ごく限定',
      cursorModels: '限定',
      fit: '試す用。常用には不足しやすい',
      you: membership === 'free' || membership === 'hobby',
    },
    {
      id: 'start',
      name: 'Start',
      price: '₹649/月',
      otherModels: '$0（なし）',
      cursorModels: '多め（非 Fast）',
      fit: 'India 向け。Cursor Models 中心',
      you: membership === 'start',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$20/月',
      otherModels: '少なくとも $20',
      cursorModels: '多め（Composer / Grok など）',
      fit: '日常＋たまに強いモデル。据え置き向き',
      you: membership === 'pro',
    },
    {
      id: 'pro_plus',
      name: 'Pro+',
      price: '$60/月',
      otherModels: '少なくとも $70',
      cursorModels: '多め',
      fit: '毎日 Agent・Claude 多用で Pro がすぐ切れる人',
      you: membership.includes('pro') && membership.includes('plus'),
    },
    {
      id: 'ultra',
      name: 'Ultra',
      price: '$200/月',
      otherModels: '少なくとも $400',
      cursorModels: '多め',
      fit: '複数 Agent・重いモデルを常時',
      you: membership === 'ultra',
    },
  ]

  const stayOnPro = {
    title: 'Pro のまま行く場合の運用',
    points: [
      '普段は Auto / Composer / Cursor Grok を主戦にして Cursor Models を厚く使う',
      'Claude / GPT は難しいときだけ指名（Other Models を温存）',
      '両プールの％は Spending / Usage で確認（このアプリも同じ％を表示）',
      '従量は「使った分だけ」。ボーナスのようなおまけは付かない',
      '毎月 Other Models がすぐ切れるなら、その月だけ Pro+ を検討',
      cycleDaysLeft != null
        ? `次の枠リセットまでおよそ ${cycleDaysLeft} 日`
        : 'リセット日は Dashboard の Spending / Usage で確認',
    ],
  }

  const modelStates = models.slice(0, 8).map((m) => {
    const isCursor = m.pool === 'cursor' || m.billingLane === 'auto'
    let status = '利用中'
    let meaning = ''
    if (isCursor) {
      meaning = 'Cursor Models プールで消化。'
      status = 'Cursor Models'
    } else {
      meaning = 'Other Models（指名）として API 単価で消化。'
      status = 'Other Models'
    }
    return {
      model: m.model,
      costUsd: m.costUsd,
      category: m.category,
      billingLane: m.billingLane,
      pool: m.pool,
      status,
      meaning,
    }
  })

  const faq = [
    {
      q: '公式と％が違う？',
      a: '主表示は Cursor Models と Other Models の2本％です。Included $ の使い切り％は会計で、公式ダッシュボードの主バーではありません。',
    },
    {
      q: 'ボーナス枠とは何？',
      a: bonusExplainer.summary,
    },
    {
      q: '標準とほかの AI で枠は別？',
      a: poolsExplainer.summary,
    },
    {
      q: '昔みたいに枠後も無料でずっと使える？',
      a: history.summary,
    },
    {
      q: 'Pro のままがいい。足りなくなったら？',
      a: 'まず Cursor Models 中心にする。足りなければ従量に上限を付けて ON。Claude 常用で毎月不足するならその月だけ Pro+。',
    },
  ]

  const tips = []
  if (membership === 'pro') {
    tips.push(
      'Pro 据え置き方針なら「Cursor Models 主戦 + Claude は必要なときだけ」が一番コスパが安定します。',
    )
  }
  if (cursorPct >= 90 && !onDemand?.allowed) {
    tips.push(
      'Cursor Models が残り少ないです。超過は Other Models 枠へ回るか止まります。重要な作業前に Spending を確認してください。',
    )
  }
  if (otherPct >= 90 && !onDemand?.allowed) {
    tips.push(
      'Other Models が残り少ないです。従量なし方針ならプラン変更、または Cursor Models 中心に切り替えてください。',
    )
  }
  if (included?.exhausted && cursorPct < 90) {
    tips.push(
      `Included 会計は ${formatUsd(included.usedUsd)} / ${formatUsd(included.limitUsd)} ですが、公式の主表示はプール％（Cursor ${cursorPct.toFixed(0)}% · Other ${otherPct.toFixed(0)}%）です。`,
    )
  }

  return {
    current,
    layers,
    bonusExplainer,
    poolsExplainer,
    pools,
    history,
    plans,
    stayOnPro,
    modelStates,
    faq,
    tips,
    docsUrl: 'https://cursor.com/docs/models-and-pricing',
    dashboardUrl: 'https://cursor.com/dashboard/usage',
    spendingUrl: 'https://cursor.com/dashboard/spending',
  }
}
