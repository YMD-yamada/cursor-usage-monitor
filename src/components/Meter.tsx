type Props = {
  label: string
  value: number
  detail: string
  tone?: 'ok' | 'warn' | 'danger'
}

export function Meter({ label, value, detail, tone = 'ok' }: Props) {
  const width = Math.max(0, Math.min(value, 100))
  return (
    <div className={`meter tone-${tone}`}>
      <div className="meter-head">
        <span>{label}</span>
        <span className="mono">{detail}</span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
