function isCursorPoolModel(m) {
  return (
    m?.pool === 'cursor' ||
    m?.billingLane === 'auto' ||
    m?.category === 'auto'
  )
}

function shortModelName(model) {
  const s = String(model || '')
  return s.replace(/^cursor-/, '').replace(/^anthropic\//, '')
}

/**
 * Concise model / settings advice for Cursor (Japanese).
 * Uses live usage to personalize when Auto feels weaker than Claude Code.
 */
export function buildModelAdvice({
  account,
  breakdown,
  models = [],
  autoBucketModels = [],
}) {
  const membership = String(account?.membershipType || '').toLowerCase()
  const isProPlus =
    membership === 'pro_plus' || membership === 'pro-plus' || membership === 'proplus'
  const isPro = membership === 'pro'
  const isUltra = membership === 'ultra'

  const cursorPct = Number(
    breakdown?.cursorModels?.percent ?? breakdown?.auto?.percent ?? 0,
  )
  const otherPct = Number(
    breakdown?.otherModels?.percent ?? breakdown?.named?.percent ?? 0,
  )
  const onDemand = Boolean(breakdown?.onDemand?.allowed)

  const totalCost = models.reduce((s, m) => s + (Number(m.costUsd) || 0), 0)
  const cursorCost = models
    .filter(isCursorPoolModel)
    .reduce((s, m) => s + (Number(m.costUsd) || 0), 0)
  const otherCost = totalCost - cursorCost
  const cursorShare = totalCost > 0 ? cursorCost / totalCost : null

  const top = models[0]
  const topName = top ? shortModelName(top.model) : null
  const topIsCursor = top ? isCursorPoolModel(top) : true

  const autoExamples = autoBucketModels
    .slice(0, 4)
    .map((m) => shortModelName(m))
    .filter(Boolean)

  let yourPattern = null
  if (models.length === 0) {
    yourPattern =
      '今月のモデル内訳はまだ少ないです。Auto 常用なら Cursor Models 中心になるのが普通です。'
  } else if (cursorShare != null && cursorShare >= 0.85) {
    yourPattern = topName
      ? `今月は Cursor Models が中心（主に ${topName}）。Other Models は ${otherPct.toFixed(0)}% 残り。`
      : `今月は Cursor Models が中心。Other Models は ${otherPct.toFixed(0)}% 残り。`
  } else if (otherCost > cursorCost) {
    yourPattern = `Other Models（指名）の利用が多め。Claude / GPT 中心の運用です。`
  } else {
    yourPattern = `Cursor Models と Other Models を混在利用中（CM ${cursorPct.toFixed(0)}% · OM ${otherPct.toFixed(0)}%）。`
  }

  const feelsWeakWithAuto =
    topIsCursor && (cursorShare == null || cursorShare >= 0.7) && otherPct < 80

  let headline = '普段 Auto、難しいときだけ Claude 指名'
  if (feelsWeakWithAuto && isProPlus) {
    headline =
      'Auto だけだと物足りない → 重要作業は Claude 指名（Pro+ の OM 枠を使う）'
  } else if (feelsWeakWithAuto && isPro) {
    headline =
      'Auto 中心＋難問だけ Claude 指名（Other Models を温存する運用）'
  } else if (otherPct >= 90 && !onDemand) {
    headline = 'Other Models 残り少 — 急ぎは Cursor Models / Composer へ'
  } else if (cursorPct >= 90 && !onDemand) {
    headline = 'Cursor Models 残り少 — 指名 Claude は Other Models 枠を確認してから'
  }

  const summary =
    feelsWeakWithAuto
      ? 'Claude Code は常時 Claude 指名。Cursor の Auto は Cursor Models プール内で Composer / Grok 等へ振り分けるため、速くて枠に優しい一方、難しい推理・設計では指名 Claude の方が安定しやすいです。'
      : 'Auto は Cursor Models のルーター任せ。単純な編集・探索は Auto のまま、推理・デバッグ・設計判断ではモデルを指名すると精度が上がりやすいです。'

  const defaultPick = {
    label: 'Auto（または Composer 2.5）',
    why: 'Cursor Models 枠。毎日の Agent / Chat の大半はここで十分。コスパと速度が良い。',
  }

  const whenToSwitch = [
    {
      situation: 'Claude Code 並みの精度が欲しい',
      pick: 'Claude Sonnet 4 / Opus（指名）',
      why: 'Other Models 枠。Auto より推理・長文の一貫性が出やすい。Pro+ なら OM 枠が厚いので常用してもよい。',
    },
    {
      situation: '大規模リファクタ・設計・バグの根因',
      pick: 'Claude Opus または GPT-5 系（指名）',
      why: '難度が高いほど指名モデルを上げる。Max Mode は必要なときだけ ON。',
    },
    {
      situation: '軽い修正・ファイル探索・定型実装',
      pick: 'Auto / Composer 2.5 Fast',
      why: 'Cursor Models で枠を節約。速度優先の並列 Agent に向く。',
    },
    {
      situation: '枠を使い切りそう（従量 OFF）',
      pick: 'Composer / Cursor Grok のみ',
      why: `CM ${cursorPct.toFixed(0)}% · OM ${otherPct.toFixed(0)}%。指名 Claude は OM 残量を見てから。`,
    },
  ]

  const claudeCodeNote =
    'Claude Code = 常に Anthropic Claude。Cursor Auto = Cursor 側ルーターが CM プールから選ぶ（Grok / Composer 等になりがち）。「Auto 常用で精度が落ちた」と感じるのはこの差が原因のことが多いです。'

  const settings = [
    {
      label: 'モデル選択',
      value: feelsWeakWithAuto
        ? 'Auto 常用 → 難所だけ Claude 指名'
        : 'Auto 日常 / 指名は難所のみ',
      note: 'チャット入力横のモデルピッカーで切り替え。Agent も同じ設定が効く。',
    },
    {
      label: 'Max Mode',
      value: '基本 OFF',
      note: '長コンテキスト・重い推理が必要なセッションだけ ON。枠と単価が増えやすい。',
    },
    {
      label: 'Agent vs Chat',
      value: '複数ファイルは Agent',
      note: '単一質問は Chat。リポ全体の変更は Agent + 指名 Claude が安定しやすい。',
    },
    {
      label: 'Rules / AGENTS.md',
      value: 'プロジェクトごとに短く',
      note: 'Auto でもルールが効く。Claude Code 相当の「文脈固定」は Rules で補う。',
    },
  ]

  if (isProPlus) {
    settings.push({
      label: 'Pro+ の OM 枠',
      value: 'Claude 常用 OK',
      note: `Other Models 約 $70 相当。精度優先の月は OM を厚く使ってよい（従量 OFF 方針と両立）。`,
    })
  } else if (isPro) {
    settings.push({
      label: 'Pro の OM 枠',
      value: 'Claude は要点だけ',
      note: 'Other Models は約 $20 相当。毎日 Claude 指名だと月途中で枯れやすい。',
    })
  }

  const tips = []
  if (feelsWeakWithAuto) {
    tips.push(
      'いまの利用は Cursor Models 偏重。次の難しいタスクからモデルピッカーで Claude を指名して比較してみてください。',
    )
  }
  if (autoExamples.length > 0) {
    tips.push(
      `Auto が選びやすい例: ${autoExamples.join(' · ')}（公式の CM プール）。`,
    )
  }
  if (isUltra) {
    tips.push('Ultra は OM / CM とも厚い。精度優先で Claude 常用して問題ありません。')
  }

  const steps = [
    {
      title: '① 普段（Auto のまま）',
      items: [
        'Cursor の Agent チャットを開く',
        '入力欄左のモデル名が「Auto」ならそのまま',
        '軽い修正・探索・定型コードは Auto / Composer で十分',
      ],
    },
    {
      title: '② 精度が足りないとき（Claude 指名）',
      items: [
        '入力欄左の「Auto」をクリック',
        '一覧から Claude Sonnet 4（または Opus）を選択',
        '同じスレッドを続けると指名が維持される（Other Models 枠を使用）',
        feelsWeakWithAuto && isProPlus
          ? 'Pro+ なら OM 枠が厚いので、難しい作業は Claude 指名を恐れなくてよい'
          : 'Pro なら OM 枠は月 $20 相当 — 難所だけ指名がコスパ良い',
      ].filter(Boolean),
    },
    {
      title: '③ Max Mode・Agent',
      items: [
        'Max Mode はデフォルト OFF。長文・重い推理のときだけ ON',
        '複数ファイル変更 → Agent モード + Claude 指名',
        '単発の質問 → Chat で十分',
      ],
    },
    {
      title: '④ プロジェクトの文脈固定',
      items: [
        'リポに .cursor/rules または AGENTS.md を置く',
        'Claude Code 相当の「いつも同じ前提」は Rules で補う',
        'Auto でも Rules は読まれる',
      ],
    },
  ]

  return {
    headline,
    summary,
    defaultPick,
    whenToSwitch,
    claudeCodeNote,
    settings,
    yourPattern,
    tips,
    steps,
  }
}
