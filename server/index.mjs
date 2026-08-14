import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchCursorUsage } from './usage.mjs'
import { getSystemMetrics } from './metrics.mjs'
import { readCursorAuth } from './auth.mjs'
import { getTaskOverview } from './tasks.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')

const PORT = Number(process.env.PORT || 8787)
const HOST = '127.0.0.1'
const app = express()
let lastForceUsageAt = 0
const FORCE_MIN_MS = 15_000

app.use((req, res, next) => {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase()
  if (host !== '127.0.0.1' && host !== 'localhost') {
    res.status(403).json({ error: 'forbidden' })
    return
  }
  next()
})

// Localhost-only UI. Do not reflect request Origin (avoids cross-origin browser reads).
app.use(
  cors({
    origin: [
      `http://${HOST}:${PORT}`,
      'http://127.0.0.1:5173',
      'http://localhost:5173',
    ],
    credentials: false,
  }),
)
app.use(express.json({ limit: '32kb' }))

let usageCache = { data: null, error: null, fetchedAt: 0 }
const USAGE_TTL_MS = 60_000

function redactAccount(account) {
  if (!account || typeof account !== 'object') return account
  return {
    ...account,
    email: account.email ? '[redacted]' : null,
    userId: account.userId ? '[redacted]' : null,
  }
}

function redactUsagePayload(data) {
  if (!data || typeof data !== 'object') return data
  return {
    ...data,
    account: redactAccount(data.account),
  }
}

function publicError(error, fallback) {
  const msg = error instanceof Error ? error.message : String(error)
  if (/access token not found|Sign in/i.test(msg)) {
    return 'Cursor にサインインしてください'
  }
  if (/failed \(\d{3}\)/.test(msg)) return 'Cursor の Usage を取得できませんでした'
  return fallback
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'cursor-usage-monitor' })
})

/** Membership only — never return email / raw userId to the renderer. */
app.get('/api/account', (_req, res) => {
  try {
    const auth = readCursorAuth()
    res.json({
      membershipType: auth.membershipType,
      subscriptionStatus: auth.subscriptionStatus,
      signedIn: Boolean(auth.userId),
    })
  } catch (error) {
    res.status(500).json({ error: publicError(error, 'account unavailable') })
  }
})

app.get('/api/metrics', async (_req, res) => {
  try {
    const metrics = await getSystemMetrics()
    res.json(metrics)
  } catch (error) {
    res.status(500).json({ error: publicError(error, 'metrics unavailable') })
  }
})

app.get('/api/tasks', (_req, res) => {
  try {
    const data = getTaskOverview()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: publicError(error, 'tasks unavailable') })
  }
})

app.get('/api/usage', async (req, res) => {
  const force = req.query.refresh === '1'
  const now = Date.now()
  const allowForce = force && now - lastForceUsageAt >= FORCE_MIN_MS
  if (allowForce) lastForceUsageAt = now
  if (!allowForce && usageCache.data && now - usageCache.fetchedAt < USAGE_TTL_MS) {
    res.json({ ...redactUsagePayload(usageCache.data), cached: true })
    return
  }

  try {
    const data = await fetchCursorUsage()
    usageCache = { data, error: null, fetchedAt: now }
    res.json({ ...redactUsagePayload(data), cached: false })
  } catch (error) {
    const message = publicError(error, 'Usage を取得できませんでした')
    if (usageCache.data) {
      res.json({
        ...redactUsagePayload(usageCache.data),
        cached: true,
        staleError: message,
      })
      return
    }
    res.status(500).json({ error: message })
  }
})

app.use(express.static(dist))
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) {
      res
        .status(404)
        .type('text')
        .send('UI not built yet. Run npm run dev or npm run build.')
    }
  })
})

app.listen(PORT, HOST, () => {
  console.log(`Cursor Usage Monitor API http://${HOST}:${PORT}`)
})
