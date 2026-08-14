import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const RUNNING_WINDOW_MS = 15 * 60 * 1000
const RECENT_LIMIT = 40

function getDbPath() {
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || '',
      'Cursor',
      'User',
      'globalStorage',
      'state.vscdb',
    )
  }
  if (process.platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Cursor',
      'User',
      'globalStorage',
      'state.vscdb',
    )
  }
  return path.join(
    os.homedir(),
    '.config',
    'Cursor',
    'User',
    'globalStorage',
    'state.vscdb',
  )
}

function projectsRoot() {
  return path.join(os.homedir(), '.cursor', 'projects')
}

function readTailLines(filePath, maxBytes = 12_000) {
  const st = fs.statSync(filePath)
  const size = st.size
  if (size <= 0) return []
  const start = Math.max(0, size - maxBytes)
  const length = size - start
  const fd = fs.openSync(filePath, 'r')
  try {
    const buf = Buffer.alloc(length)
    fs.readSync(fd, buf, 0, length, start)
    return buf.toString('utf8').trim().split(/\r?\n/).filter(Boolean)
  } finally {
    fs.closeSync(fd)
  }
}

function readHeadText(filePath, maxBytes = 6_000) {
  const st = fs.statSync(filePath)
  if (st.size <= 0) return ''
  const fd = fs.openSync(filePath, 'r')
  try {
    const length = Math.min(st.size, maxBytes)
    const buf = Buffer.alloc(length)
    fs.readSync(fd, buf, 0, length, 0)
    return buf.toString('utf8')
  } finally {
    fs.closeSync(fd)
  }
}

function projectLabel(projectDirName, workspacePath) {
  if (workspacePath) {
    const base = workspacePath.replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean).at(-1)
    if (base) return base
  }
  return (projectDirName || '')
    .replace(/^c-Users-[^-]+-Projects-/i, '')
    .replace(/^c-Users-[^-]+-/i, '')
    .replace(/^empty-window$/i, 'home')
    .slice(0, 40)
}

function parseComposerHeaders() {
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) return { composers: [], selectedId: null }

  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    const get = (key) =>
      db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key)?.value
    const raw = get('composer.composerHeaders')
    const selectedId = get('cursor/glass.selectedAgent') || null
    if (!raw) return { composers: [], selectedId }
    const parsed = JSON.parse(raw)
    return {
      composers: Array.isArray(parsed.allComposers) ? parsed.allComposers : [],
      selectedId,
    }
  } finally {
    db.close()
  }
}

function scanTranscripts() {
  const root = projectsRoot()
  if (!fs.existsSync(root)) return []

  const items = []
  for (const project of fs.readdirSync(root)) {
    const transcriptsDir = path.join(root, project, 'agent-transcripts')
    if (!fs.existsSync(transcriptsDir)) continue
    let ids = []
    try {
      ids = fs.readdirSync(transcriptsDir)
    } catch {
      continue
    }
    for (const id of ids) {
      const file = path.join(transcriptsDir, id, `${id}.jsonl`)
      if (!fs.existsSync(file)) continue
      let st
      try {
        st = fs.statSync(file)
      } catch {
        continue
      }
      items.push({
        id,
        project,
        file,
        mtimeMs: st.mtimeMs,
        size: st.size,
      })
    }
  }

  items.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return items.slice(0, RECENT_LIMIT)
}

function inspectTranscript(entry) {
  const lines = readTailLines(entry.file)
  let last = null
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      last = JSON.parse(lines[i])
      break
    } catch {
      // continue
    }
  }

  const lastType = last?.type || (last?.role ? `role:${last.role}` : 'unknown')
  const turnEnded = last?.type === 'turn_ended'
  const turnStatus = last?.status || null
  const ageMs = Date.now() - entry.mtimeMs

  let possiblyRunning = false
  if (!turnEnded && ageMs <= RUNNING_WINDOW_MS) {
    if (last?.role === 'user') {
      // Waiting for / receiving agent response
      possiblyRunning = true
    } else if (last?.role === 'assistant' && ageMs <= 2 * 60 * 1000) {
      // Recently streaming / just finished a chunk
      possiblyRunning = true
    } else if (last?.type && last.type !== 'turn_ended' && ageMs <= 2 * 60 * 1000) {
      possiblyRunning = true
    }
  }

  return {
    lastType,
    turnEnded,
    turnStatus,
    possiblyRunning,
    ageMs,
  }
}

function isPidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function scanTerminals() {
  const root = projectsRoot()
  if (!fs.existsSync(root)) return []
  const running = []

  for (const project of fs.readdirSync(root)) {
    const dir = path.join(root, project, 'terminals')
    if (!fs.existsSync(dir)) continue
    let files = []
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'))
    } catch {
      continue
    }
    for (const file of files) {
      const full = path.join(dir, file)
      let head = ''
      let tail = ''
      try {
        head = readHeadText(full, 2500)
        tail = readTailLines(full, 1500).join('\n')
      } catch {
        continue
      }
      const pidMatch = head.match(/^pid:\s*(\d+)/m)
      const pid = pidMatch ? Number(pidMatch[1]) : NaN
      const hasExit =
        /^exit_code:/m.test(head) ||
        /^exit_code:/m.test(tail) ||
        /\nexit_code:/m.test(tail)
      const runningFor = head.match(/running_for_ms:\s*(\d+)/)
      const command =
        head.match(/^command:\s*"?(.*?)"?\s*$/m)?.[1] ||
        head.match(/^last_command:\s*"?(.*?)"?\s*$/m)?.[1] ||
        'shell'
      const cwdRaw =
        head.match(/^cwd:\s*"?(.*?)"?\s*$/m)?.[1] ||
        null
      const cwd = cwdRaw ? cwdRaw.replace(/\\"/g, '"').replace(/^"|"$/g, '') : null

      if (!pidMatch || hasExit || !runningFor) continue
      if (!isPidAlive(pid)) continue

      running.push({
        id: `term:${project}:${file.replace(/\.txt$/, '')}`,
        project,
        cwd,
        command: command.replace(/\\"/g, '"'),
        runningForMs: Number(runningFor[1] || 0),
        file: full,
        pid,
      })
    }
  }

  running.sort((a, b) => (b.runningForMs || 0) - (a.runningForMs || 0))
  return running.slice(0, 8)
}

function deriveState(task) {
  if (task.kind === 'shell') return 'running'
  if (task.blocking || task.pendingPlan) return 'waiting'
  if (task.running) return 'running'
  if (task.unread) return 'unread'
  if (task.turnEnded) return 'done'
  if (task.locationStatus === 'active') return 'open'
  return 'idle'
}

function stateRank(state) {
  switch (state) {
    case 'running':
      return 0
    case 'waiting':
      return 1
    case 'unread':
      return 2
    case 'open':
      return 3
    case 'done':
      return 4
    default:
      return 5
  }
}

export function getTaskOverview() {
  const { composers, selectedId } = parseComposerHeaders()
  const byId = new Map()

  for (const c of composers) {
    if (c?.isArchived || c?.isDraft) continue
    const id = c.composerId
    if (!id) continue
    const workspace =
      c.workspaceIdentifier?.uri?.fsPath ||
      c.agentLocation?.environment?.uri?.fsPath ||
      null
    byId.set(id, {
      id,
      kind: 'agent',
      title: c.name || 'Untitled',
      subtitle: c.subtitle || '',
      mode: c.unifiedMode || 'agent',
      workspace,
      project: projectLabel('', workspace),
      updatedAt: c.lastUpdatedAt || c.createdAt || 0,
      unread: Boolean(c.hasUnreadMessages),
      blocking: Boolean(c.hasBlockingPendingActions),
      pendingPlan: Boolean(c.hasPendingPlan),
      locationStatus: c.agentLocation?.status || null,
      contextPercent:
        typeof c.contextUsagePercent === 'number'
          ? Math.round(c.contextUsagePercent * 10) / 10
          : null,
      selected: id === selectedId,
      running: false,
      turnEnded: null,
      turnStatus: null,
      source: 'composer',
    })
  }

  for (const entry of scanTranscripts()) {
    const info = inspectTranscript(entry)
    const existing = byId.get(entry.id)
    const title = existing?.title && existing.title !== 'Untitled'
      ? existing.title
      : 'Agent'

    byId.set(entry.id, {
      id: entry.id,
      kind: 'agent',
      title,
      subtitle: existing?.subtitle || info.lastType,
      mode: existing?.mode || 'agent',
      workspace: existing?.workspace || null,
      project: existing?.project || projectLabel(entry.project, existing?.workspace),
      updatedAt: Math.max(existing?.updatedAt || 0, entry.mtimeMs),
      unread: Boolean(existing?.unread),
      blocking: Boolean(existing?.blocking),
      pendingPlan: Boolean(existing?.pendingPlan),
      locationStatus: existing?.locationStatus || null,
      contextPercent: existing?.contextPercent ?? null,
      selected: entry.id === selectedId || Boolean(existing?.selected),
      running: info.possiblyRunning,
      turnEnded: info.turnEnded,
      turnStatus: info.turnStatus,
      source: existing ? 'composer+transcript' : 'transcript',
      transcriptProject: entry.project,
    })
  }

  const shells = scanTerminals().map((t) => ({
    id: t.id,
    kind: 'shell',
    title: t.command.length > 70 ? `${t.command.slice(0, 67)}…` : t.command,
    subtitle: t.cwd || t.project,
    mode: 'shell',
    workspace: t.cwd,
    project: projectLabel(t.project, t.cwd),
    updatedAt: Date.now(),
    unread: false,
    blocking: false,
    pendingPlan: false,
    locationStatus: 'active',
    contextPercent: null,
    selected: false,
    running: true,
    turnEnded: false,
    turnStatus: null,
    source: 'terminal',
    runningForMs: t.runningForMs,
  }))

  // Prefer agent/chat tasks in the overview; keep a few live shells.
  const agents = [...byId.values()]
  const merged = [...agents, ...shells]
    .map((task) => {
      const state = deriveState(task)
      return {
        ...task,
        state,
        updatedAtIso: task.updatedAt
          ? new Date(task.updatedAt).toISOString()
          : null,
      }
    })
    .sort((a, b) => {
      const rank = stateRank(a.state) - stateRank(b.state)
      if (rank !== 0) return rank
      if (a.kind !== b.kind) return a.kind === 'agent' ? -1 : 1
      return (b.updatedAt || 0) - (a.updatedAt || 0)
    })

  const tasks = merged.slice(0, RECENT_LIMIT)

  const counts = {
    total: tasks.length,
    running: tasks.filter((t) => t.state === 'running').length,
    waiting: tasks.filter((t) => t.state === 'waiting').length,
    unread: tasks.filter((t) => t.state === 'unread').length,
    open: tasks.filter((t) => t.state === 'open').length,
    done: tasks.filter((t) => t.state === 'done').length,
    shell: tasks.filter((t) => t.kind === 'shell').length,
  }

  return {
    fetchedAt: new Date().toISOString(),
    counts,
  }
}
