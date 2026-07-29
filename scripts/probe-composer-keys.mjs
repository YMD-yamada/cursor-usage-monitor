import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import process from 'node:process'

const dbPath = path.join(
  process.env.APPDATA,
  'Cursor',
  'User',
  'globalStorage',
  'state.vscdb',
)
const db = new DatabaseSync(dbPath, { readOnly: true })
const rows = db
  .prepare(
    "SELECT key FROM ItemTable WHERE key LIKE '%composer%' OR key LIKE '%agent%' OR key LIKE '%chat%' OR key LIKE '%aichat%' OR key LIKE '%bubble%' LIMIT 80",
  )
  .all()
console.log(rows.map((r) => r.key).join('\n'))
db.close()
