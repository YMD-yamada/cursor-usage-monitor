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
const membership = db
  .prepare(
    "SELECT value FROM ItemTable WHERE key = 'cursorAuth/stripeMembershipType'",
  )
  .get()?.value
const status = db
  .prepare(
    "SELECT value FROM ItemTable WHERE key = 'cursorAuth/stripeSubscriptionStatus'",
  )
  .get()?.value
db.close()

const parts = JSON.parse(
  Buffer.from(token.split('.')[1], 'base64url').toString(),
)
const sub = parts.sub || ''
const userId = sub.includes('|') ? sub.split('|')[1] : sub
const sessionToken = `${userId}%3A%3A${token}`

console.log({ membership, status, userId: userId.slice(0, 12) + '...' })

async function tryFetch(label, url, init) {
  try {
    const res = await fetch(url, init)
    const text = await res.text()
    console.log(`\n=== ${label} ${res.status} ===`)
    console.log(text.slice(0, 800))
  } catch (e) {
    console.log(`\n=== ${label} ERROR ===`, e.message)
  }
}

const cookie = `WorkosCursorSessionToken=${sessionToken}`
const headers = {
  Cookie: cookie,
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://cursor.com',
  Referer: 'https://cursor.com/dashboard',
}

await tryFetch('usage', `https://cursor.com/api/usage?user=${userId}`, {
  headers,
})

await tryFetch('auth/me', 'https://cursor.com/api/auth/me', { headers })

await tryFetch(
  'dashboard/get-current-period-usage',
  'https://cursor.com/api/dashboard/get-current-period-usage',
  { method: 'POST', headers, body: '{}' },
)

await tryFetch(
  'dashboard/get-aggregated-usage-events',
  'https://cursor.com/api/dashboard/get-aggregated-usage-events',
  { method: 'POST', headers, body: '{}' },
)

await tryFetch(
  'dashboard/get-hard-limit',
  'https://cursor.com/api/dashboard/get-hard-limit',
  { method: 'POST', headers, body: '{}' },
)
