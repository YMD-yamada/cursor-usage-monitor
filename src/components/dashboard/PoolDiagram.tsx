import { clampPercent } from '../../lib/format'

type Props = {
  cursorPct: number
  otherPct: number
}

/** Visual explainer: two billing pools (no prose wall). */
export function PoolDiagram({ cursorPct, otherPct }: Props) {
  const cm = clampPercent(cursorPct)
  const om = clampPercent(otherPct)

  return (
    <figure className="pool-diagram">
      <svg viewBox="0 0 320 140" className="pool-diagram-svg" role="img" aria-label="利用枠の図解">
        <defs>
          <linearGradient id="cmFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="omFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <text x="80" y="18" className="pd-title">Cursor</text>
        <text x="240" y="18" className="pd-title">その他 AI</text>
        <text x="80" y="32" className="pd-sub">Auto · Composer</text>
        <text x="240" y="32" className="pd-sub">Claude · GPT</text>
        <rect x="24" y="44" width="120" height="72" rx="10" className="pd-tank" />
        <rect x="176" y="44" width="120" height="72" rx="10" className="pd-tank" />
        <rect
          x="28"
          y={112 - (cm / 100) * 64}
          width="112"
          height={(cm / 100) * 64}
          rx="6"
          fill="url(#cmFill)"
        />
        <rect
          x="180"
          y={112 - (om / 100) * 64}
          width="112"
          height={(om / 100) * 64}
          rx="6"
          fill="url(#omFill)"
        />
        <text x="80" y="128" textAnchor="middle" className="pd-pct">{cm.toFixed(0)}%</text>
        <text x="236" y="128" textAnchor="middle" className="pd-pct">{om.toFixed(0)}%</text>
      </svg>
      <figcaption className="pool-diagram-cap">
        2つの枠は別々。合算の1本バーはありません。
      </figcaption>
    </figure>
  )
}
