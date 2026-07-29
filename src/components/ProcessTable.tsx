import type { MetricsPayload } from '../lib/format'
import { formatBytes } from '../lib/format'

type Props = {
  metrics: MetricsPayload | null
}

export function ProcessTable({ metrics }: Props) {
  const processes = metrics?.cursor.processes ?? []

  return (
    <section className="panel process-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Task Manager</p>
          <h2>Cursor プロセス</h2>
        </div>
        <p className="section-note">
          {processes.length
            ? `合計 ${formatBytes(metrics?.cursor.totalWorkingSetBytes || 0)}`
            : 'Cursor 未検出'}
        </p>
      </div>

      <div className="table-wrap">
        <table className="process-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>PID</th>
              <th>CPU</th>
              <th>Working set</th>
              <th>Private</th>
            </tr>
          </thead>
          <tbody>
            {processes.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  Cursor プロセスが見つかりません
                </td>
              </tr>
            ) : (
              processes.map((proc) => (
                <tr key={proc.pid}>
                  <td>
                    <span className="proc-name">{proc.name}</span>
                  </td>
                  <td className="mono">{proc.pid}</td>
                  <td className="mono">{proc.cpuPercent.toFixed(1)}%</td>
                  <td className="mono">{formatBytes(proc.workingSetBytes)}</td>
                  <td className="mono">{formatBytes(proc.privateBytes)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
