/**
 * Lightweight smoke: build (if needed) → temp API server → probe endpoints → exit.
 * Does not leave Electron running. Uses a free port so it won't fight the resident widget.
 *
 *   npm run smoke
 *   npm run smoke -- --skip-build
 *   npm run smoke -- --check-resident
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = path.join(root, 'dist', 'index.html')
const args = new Set(process.argv.slice(2))
const skipBuild = args.has('--skip-build')
const checkResident = args.has('--check-resident')
const RESIDENT_PORT = Number(process.env.PORT || 8787)
const TIMEOUT_MS = 25_000

const results = []

function log(msg) {
  console.log(`[smoke] ${msg}`)
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? 'OK' : 'FAIL'
  log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

function getJson(url, timeoutMs = 12_000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        let json = null
        try {
          json = JSON.parse(body)
        } catch {
          /* ignore */
        }
        resolve({ status: res.statusCode, body, json })
      })
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error(`timeout ${timeoutMs}ms`))
    })
  })
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close((err) => (err ? reject(err) : resolve(port)))
    })
    srv.on('error', reject)
  })
}

function run(command, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, cmdArgs, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    })
    child.on('exit', (code) => {
      if (code) reject(new Error(`${command} exited ${code}`))
      else resolve()
    })
  })
}

function startServer(port) {
  const entry = path.join(root, 'server', 'index.mjs')
  const child = spawn(
    process.execPath,
    ['--experimental-sqlite', entry],
    {
      cwd: root,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )
  let stderr = ''
  child.stderr?.on('data', (d) => {
    stderr += d.toString()
  })
  return { child, getStderr: () => stderr }
}

async function waitHealth(port, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await getJson(`http://127.0.0.1:${port}/api/health`, 1500)
      if (r.status === 200 && r.json?.ok) return r.json
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('health not ready')
}

async function probe(port) {
  const base = `http://127.0.0.1:${port}`

  const health = await getJson(`${base}/api/health`)
  record(
    'GET /api/health',
    health.status === 200 && health.json?.ok === true,
    `status=${health.status}`,
  )

  const account = await getJson(`${base}/api/account`)
  const emailHint = account.json?.email
    ? `${String(account.json.email).slice(0, 3)}…`
    : '(none)'
  record(
    'GET /api/account',
    account.status === 200 && Boolean(account.json?.email || account.json?.userId),
    account.status === 200
      ? `email=${emailHint} membership=${account.json?.membershipType || '?'}`
      : `status=${account.status} ${account.json?.error || ''}`,
  )

  const metrics = await getJson(`${base}/api/metrics`)
  const cpuOk =
    metrics.status === 200 &&
    typeof metrics.json?.cpu?.loadPercent === 'number' &&
    typeof metrics.json?.memory?.usedPercent === 'number'
  record(
    'GET /api/metrics',
    cpuOk,
    metrics.status === 200
      ? `cpu=${metrics.json?.cpu?.loadPercent}% mem=${metrics.json?.memory?.usedPercent}%`
      : `status=${metrics.status}`,
  )

  const tasks = await getJson(`${base}/api/tasks`)
  const tasksOk = tasks.status === 200 && Array.isArray(tasks.json?.tasks)
  record(
    'GET /api/tasks',
    tasksOk,
    tasks.status === 200
      ? `count=${tasks.json.tasks.length}`
      : `status=${tasks.status} ${tasks.json?.error || ''}`,
  )

  const usage = await getJson(`${base}/api/usage`, 20_000)
  const usageOk =
    usage.status === 200 &&
    (usage.json?.period || usage.json?.charts || usage.json?.totalCost != null)
  record(
    'GET /api/usage',
    usageOk,
    usage.status === 200
      ? `cached=${Boolean(usage.json?.cached)} keys=${Object.keys(usage.json || {}).slice(0, 6).join(',')}`
      : `status=${usage.status} ${usage.json?.error || usage.body?.slice(0, 120) || ''}`,
  )
}

async function checkResidentHealth() {
  try {
    const r = await getJson(`http://127.0.0.1:${RESIDENT_PORT}/api/health`, 1500)
    record(
      'resident :8787 /api/health',
      r.status === 200 && r.json?.ok === true,
      'already running',
    )
  } catch {
    record(
      'resident :8787 /api/health',
      false,
      'not running (ok if widget not installed)',
    )
  }
}

async function main() {
  const started = Date.now()
  log(`root=${root}`)

  if (!skipBuild && !fs.existsSync(distIndex)) {
    log('dist missing — building…')
    await run('npm', ['run', 'build'])
    record('build', fs.existsSync(distIndex), 'created dist')
  } else if (!skipBuild && fs.existsSync(distIndex)) {
    record('build', true, 'dist present (skipped rebuild)')
  } else {
    record('build', fs.existsSync(distIndex), skipBuild ? 'skipped' : '')
  }

  if (checkResident) await checkResidentHealth()

  const port = await findFreePort()
  log(`starting temp API on ${port}`)
  const { child, getStderr } = startServer(port)

  const killServer = () => {
    try {
      if (!child.killed) child.kill()
    } catch {
      /* ignore */
    }
  }

  const watchdog = setTimeout(() => {
    log('watchdog timeout — killing server')
    killServer()
  }, TIMEOUT_MS)

  try {
    await waitHealth(port)
    record('server start', true, `port=${port}`)
    await probe(port)
  } catch (err) {
    record('server start', false, err.message)
    const errOut = getStderr().trim()
    if (errOut) log(`server stderr:\n${errOut.slice(0, 800)}`)
  } finally {
    clearTimeout(watchdog)
    killServer()
    await new Promise((r) => setTimeout(r, 200))
  }

  const failed = results.filter((r) => !r.ok)
  const soft = failed.filter((r) => r.name.startsWith('resident '))
  const hard = failed.filter((r) => !r.name.startsWith('resident '))

  log(`done in ${Date.now() - started}ms — ${results.length - failed.length}/${results.length} passed`)
  if (hard.length) {
    for (const f of hard) log(`  hard fail: ${f.name} — ${f.detail}`)
    process.exit(1)
  }
  if (soft.length) {
    for (const f of soft) log(`  soft: ${f.name} — ${f.detail}`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('[smoke] fatal', err)
  process.exit(1)
})
