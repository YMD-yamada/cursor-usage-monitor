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
const token = db
  .prepare("SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken'")
  .get().value
db.close()

const parts = JSON.parse(
  Buffer.from(token.split('.')[1], 'base64url').toString(),
)
const sub = parts.sub || ''
const userId = sub.includes('|') ? sub.split('|')[1] : sub
const sessionToken = `${userId}%3A%3A${token}`

const headers = {
  Cookie: `WorkosCursorSessionToken=${sessionToken}`,
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://cursor.com',
  Referer: 'https://cursor.com/dashboard?tab=usage',
}

const now = Date.now()
const start = now - 21 * 24 * 60 * 60 * 1000
const bodies = [
  { startDate: start, endDate: now, page: 1, pageSize: 50 },
  { startDate: String(start), endDate: String(now), page: 1, pageSize: 50 },
  {},
]

for (const [i, body] of bodies.entries()) {
  const res = await fetch(
    'https://cursor.com/api/dashboard/get-filtered-usage-events',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
  )
  const text = await res.text()
  console.log(`\n=== body${i} ${res.status} ===`)
  console.log(text.slice(0, 1800))
}
