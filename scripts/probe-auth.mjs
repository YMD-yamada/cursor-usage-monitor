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
  .prepare("SELECT key FROM ItemTable WHERE key LIKE 'cursorAuth%'")
  .all()
console.log('authKeys', rows)

const tokenRow = db
  .prepare("SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken'")
  .get()
console.log(
  'hasToken',
  Boolean(tokenRow?.value),
  'len',
  tokenRow?.value?.length ?? 0,
)

const emailRow = db
  .prepare("SELECT value FROM ItemTable WHERE key = 'cursorAuth/cachedEmail'")
  .get()
console.log('email', emailRow?.value)

db.close()
