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
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/metrics', async (_req, res) => {
  try {
    const metrics = await getSystemMetrics()
    res.json(metrics)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/tasks', (_req, res) => {
  try {
    const data = getTaskOverview()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/usage', async (req, res) => {
  const force = req.query.refresh === '1'
  const now = Date.now()
  if (!force && usageCache.data && now - usageCache.fetchedAt < USAGE_TTL_MS) {
    res.json({ ...redactUsagePayload(usageCache.data), cached: true })
    return
  }

  try {
    const data = await fetchCursorUsage()
    usageCache = { data, error: null, fetchedAt: now }
    res.json({ ...redactUsagePayload(data), cached: false })
  } catch (error) {
    if (usageCache.data) {
      res.json({
        ...redactUsagePayload(usageCache.data),
        cached: true,
        staleError: error.message,
      })
      return
    }
    res.status(500).json({ error: error.message })
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
