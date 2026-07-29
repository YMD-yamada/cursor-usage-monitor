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
const app = express()

app.use(cors())
app.use(express.json())

let usageCache = { data: null, error: null, fetchedAt: 0 }
const USAGE_TTL_MS = 60_000

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'cursor-usage-monitor' })
})

app.get('/api/account', (_req, res) => {
  try {
    const auth = readCursorAuth()
    res.json({
      email: auth.email,
      membershipType: auth.membershipType,
      subscriptionStatus: auth.subscriptionStatus,
      userId: auth.userId,
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
    res.json({ ...usageCache.data, cached: true })
    return
  }

  try {
    const data = await fetchCursorUsage()
    usageCache = { data, error: null, fetchedAt: now }
    res.json({ ...data, cached: false })
  } catch (error) {
    if (usageCache.data) {
      res.json({
        ...usageCache.data,
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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Cursor Usage Monitor API http://127.0.0.1:${PORT}`)
})
