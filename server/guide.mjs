function planLabel(membershipType) {
  const key = String(membershipType || '').toLowerCase()
  if (key === 'pro') return 'Pro（$20/月）'
  if (key === 'pro_plus' || key === 'pro-plus' || key === 'proplus') return 'Pro+（$60/月）'
  if (key === 'ultra') return 'Ultra（$200/月）'
  if (key === 'free' || key === 'hobby') return 'Hobby（無料）'
  if (key === 'business' || key === 'team') return 'Teams'
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
  const included = breakdown?.included
  const bonus = breakdown?.bonus
  const onDemand = breakdown?.onDemand
  const auto = breakdown?.auto
  const named = breakdown?.named

  const whyStillWorking = []
  if (included?.exhausted && bonus?.active) {
    whyStillWorking.push(
      `プラン枠は使い切りですが、ボーナス ${formatUsd(bonus.usedUsd)} 分が載っているため、まだ動いています。`,
    )
  } else if (!included?.exhausted) {
    whyStillWorking.push(
      `プラン枠がまだ ${formatUsd(included?.remainingUsd ?? 0)} 残っています。`,
    )
  }
  if (onDemand?.allowed) {
    whyStillWorking.push('従量課金が ON なので、枠を超えても有料で続けられます。')
  } else if (included?.exhausted && !bonus?.active) {
    whyStillWorking.push(
      '従量課金は OFF です。ボーナスも尽きた場合は、サイクル更新か従量 ON / プラン上げが必要です。',
    )
  } else if (!onDemand?.allowed) {
    whyStillWorking.push(
      '従量課金は OFF です。ボーナスが尽きたあとは止まるで、続けたいなら Dashboard で従量を ON にしてください。',
    )
  }

  const headline = included?.exhausted
    ? bonus?.active
      ? 'プラン枠は使い切り。いまはボーナスで継続中'
      : onDemand?.allowed
        ? 'プラン枠は使い切り。従量課金で継続中'
        : 'プラン枠は使い切り。追加手段がないと停止します'
    : `プラン枠の残り ${formatUsd(included?.remainingUsd ?? 0)}`

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

  if (!included?.exhausted || bonus?.active || onDemand?.allowed) {
    current.canDo.push('Auto / Composer / Cursor Models（Grok 4.5 など）')
  }
  if (!included?.exhausted || bonus?.active || onDemand?.allowed) {
    current.canDo.push('Claude / GPT など（Other Models。枠・ボーナス・従量のいずれかが残っている間）')
  }
  if (included?.exhausted && !bonus?.active && !onDemand?.allowed) {
    current.cannotDo.push('ほぼすべての Agent / Chat（枠・ボーナス切れ & 従量 OFF）')
  }
  if (!onDemand?.allowed && included?.exhausted) {
    current.cannotDo.push('ボーナス尽きたあとの追加利用（従量を ON にするまで）')
  }

  const bonusExplainer = {
    title: 'ボーナス枠の扱い',
    summary:
      'ボーナスは「毎月必ずもらえる無料枠」ではありません。Cursor がモデル提供者と組んで載せる追加無料で、額は月によって変わり、保証され。',
    points: [
      'プランの保証分（Pro なら Other Models 少なくとも $20）を使い切ったあとに見えることが多い',
      'Dashboard に「ボーナス $○」と独立表示されないこともあり、合計 Usage に紛れて見える',
      '従量課金（on-demand）にはボーナスは付かない。払った分だけ使える',
      '「枠 100% なのにまだ使える」のは、だいたいこのボーナスか、まだ残っている Cursor Models 側',
      bonus?.active
        ? `いまのあなた: ボーナス側でおよそ ${formatUsd(bonus.usedUsd)} 使っている（保証外の追加無料）`
        : 'いまのあなた: ボーナスは見えていない / まだ載っていない',
    ],
  }

  const layers = [
    {
      step: 1,
      title: 'プラン枠（保証される分）',
      body:
        '月額に含まれる利用額。Claude の「無料枠」に一番近い。Pro の Other Models は少なくとも $20。',
      state: included?.exhausted
        ? `いま: 使い切り ${formatUsd(included.usedUsd)} / ${formatUsd(included.limitUsd)}`
        : `いま: ${formatUsd(included?.usedUsd ?? 0)} / ${formatUsd(included?.limitUsd ?? 0)}（残 ${formatUsd(included?.remainingUsd ?? 0)}）`,
    },
    {
      step: 2,
      title: 'ボーナス（保証されない追加無料）',
      body: bonusExplainer.summary,
      state: bonus?.active
        ? `いま: ${formatUsd(bonus.usedUsd)} 利用済み（ボーナス稼働中）`
        : 'いま: ボーナスなし / まだ載っていない',
    },
    {
      step: 3,
      title: '従量課金（自分で ON する有料継続）',
      body:
        '枠とボーナスのあとも続ける pay-as-you-go。Dashboard で上限を設定。品質を落とす「低速無料」ではなく、同じ API 単価で課金される。',
      state: onDemand?.allowed
        ? 'いま: ON（超過分が請求される）'
        : 'いま: OFF（超過後はボーナス以外では止める設定）',
    },
    {
      step: 4,
      title: '請求サイクルのリセット',
      body:
        '毎月のサイクル開始でプラン枠が戻る。未使用分の繰り越しなし。ボーナス額は次月も同じとは限らない。',
      state:
        cycleDaysLeft == null
          ? 'いま: サイクル終了日不明'
          : `いま: あと約 ${cycleDaysLeft} 日で更新（${billing?.cycleEnd ? new Date(billing.cycleEnd).toLocaleDateString('ja-JP') : '—'}）`,
    },
  ]

  const pools = [
    {
      id: 'cursor-models',
      title: '① Cursor Models（標準寄り）',
      body:
        'Composer 2.5 や Cursor Grok 4.5 など。プランに「多め」に含まれる別プール。Auto を選ぶとここに寄りやすい。',
      examples: (autoBucketModels || [])
        .filter((m) => /composer|grok|vega|default/i.test(m))
        .slice(0, 8),
      usedNote: `このサイクルの自動系コスト目安 ${formatUsd(auto?.costUsd ?? 0)} · Auto 表示 ${Number(auto?.percent || 0).toFixed(0)}%`,
    },
    {
      id: 'other-models',
      title: '② Other Models（ほかの AI）',
      body:
        'Claude / GPT / Gemini などをモデルピッカーで指名したとき。API 単価で減る。Pro は少なくとも $20 込み。',
      examples: models
        .filter((m) => m.category === 'named' && m.billingLane !== 'auto')
        .map((m) => m.model)
        .slice(0, 6),
      usedNote: `API 枠表示 ${Number(named?.percent || 0).toFixed(0)}% · 外部見た目の実コスト ${formatUsd(named?.costUsd ?? 0)}`,
    },
  ]

  const poolsExplainer = {
    title: '利用枠は2つに分かれている',
    summary:
      'はい。Cursor 標準寄り（Cursor Models）と、ほかの AI 指名（Other Models）は別プールです。片方を使い切っても、もう片方が残っていればそちらは使えることがあります。',
    points: [
      'Cursor Models: Composer / Cursor Grok など。含まれ量が多め',
      'Other Models: Claude / GPT など指名。Pro は少なくとも $20',
      'モデルピッカーで何を選ぶかで、どのプールが減るかが変わる',
      'Grok（Cursor 版）は「ほかの会社のモデル」に見えても Cursor Models / Auto 枠側が多い',
    ],
  }

  const history = {
    title: '昔の「計量でもずっと無料」はどうなった？',
    summary:
      '以前は Auto（や遅い救済モード）が実質ほぼ無制限に近い時期がありました。2025年後半以降、個人プランでも Auto は月次の利用枠に算入され方針に変わり、枠切れ後は従量 ON か上位プランが基本です。',
    points: [
      '旧: Auto 無制限／低速なら枠後も無料、のような体験があった',
      '現: Auto もトークン課金でプールを消費する。枠切れ後の「ずっと無料の計量モデル」は期待しないのが安全',
      '公式の救済は「従量を ON」または「プランを上げる」。品質を落とす無料継続は現行の前提ではない',
      'ボーナスが出る月は「まだ無料で動く」ように見えるが、保証された制度ではない',
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
      'Claude / GPT は難しいときだけ指名（Other Models の $20 を温存）',
      '枠 100% 後も動くのはボーナス頼みになりやすい。重要な締切前は従量に小さな上限（例: $10）を付けて保険にする',
      '従量は「使った分だけ」。ボーナスのようなおまけは付かない',
      '毎月すぐ $20 を超えて Claude ばかりなら、その月だけ Pro+ を検討（Other Models $70）',
      cycleDaysLeft != null
        ? `次の枠リセットまでおよそ ${cycleDaysLeft} 日`
        : 'リセット日は Dashboard の Spending / Usage で確認',
    ],
  }

  const modelStates = models.slice(0, 8).map((m) => {
    const isAutoLane = m.billingLane === 'auto'
    const isExternalLook = m.category === 'named'
    let status = '利用中'
    let meaning = ''
    if (isExternalLook && isAutoLane) {
      meaning =
        '見た目は外部でも Cursor Models / Auto 枠側で消化（Grok などが典型）。'
      status = 'Auto枠で消化'
    } else if (isExternalLook) {
      meaning = 'Other Models（指名）として API 単価で消化。'
      status = '外部プール'
    } else {
      meaning = 'Cursor の自動 / Composer 系。Cursor Models 側。'
      status = '自動系'
    }
    return {
      model: m.model,
      costUsd: m.costUsd,
      category: m.category,
      billingLane: m.billingLane,
      status,
      meaning,
    }
  })

  const faq = [
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
      a: 'まず Auto/Composer 中心にする。足りなければ従量に上限を付けて ON。Claude 常用で毎月不足するならその月だけ Pro+。',
    },
    {
      q: 'なぜ枠 100% なのにまだ使える？',
      a: included?.exhausted && bonus?.active
        ? `ボーナス ${formatUsd(bonus.usedUsd)} が載っているからです。保証の無料枠ではありません。`
        : 'プラン枠の残り、ボーナス、または従量のいずれかが残っているためです。',
    },
  ]

  const tips = []
  if (membership === 'pro') {
    tips.push(
      'Pro 据え置き方針なら「Auto 主戦 + Claude は必要なときだけ」が一番コスパが安定します。',
    )
  }
  if (included?.exhausted && bonus?.active && !onDemand?.allowed) {
    tips.push(
      'いま動いている主因はボーナスです。額は保証されないので、重要な作業前に従量の上限を決めて ON しておくと安心です。',
    )
  }
  if ((named?.onAutoLaneUsd || 0) > 0) {
    tips.push(
      `外部に見えるモデルのうち ${formatUsd(named.onAutoLaneUsd)} は Auto 枠消化です。Claude を指名すると Other Models が減りやすいです。`,
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
    dashboardUrl: 'https://cursor.com/dashboard?tab=usage',
    spendingUrl: 'https://cursor.com/dashboard/spending',
  }
}
