import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import process from 'node:process'
import fs from 'node:fs'

const dbPath = path.join(
  process.env.APPDATA,
  'Cursor',
  'User',
  'globalStorage',
  'state.vscdb',
)
const db = new DatabaseSync(dbPath, { readOnly: true })
const keys = db
  .prepare(
    "SELECT key FROM ItemTable WHERE key LIKE '%running%' OR key LIKE '%generating%' OR key LIKE '%inProgress%' OR key LIKE '%pendingAction%' OR key LIKE 'workbench.panel.composer%' OR key LIKE 'composer.%' LIMIT 100",
  )
  .all()
console.log(keys.map((k) => k.key).join('\n'))

const selected = db
  .prepare("SELECT value FROM ItemTable WHERE key = 'cursor/glass.selectedAgent'")
  .get()?.value
console.log('\nselected', selected)

const headers = JSON.parse(
  db.prepare("SELECT value FROM ItemTable WHERE key = 'composer.composerHeaders'").get().value,
)
const hit = headers.allComposers.find((c) => c.composerId === selected)
console.log('selected header', hit ? { name: hit.name, updated: hit.lastUpdatedAt, status: hit.agentLocation?.status } : null)

// Find monitor-related
for (const c of headers.allComposers) {
  if (/usage|monitor|常駐|タスク/i.test(`${c.name} ${c.subtitle || ''}`)) {
    console.log('match', c.composerId, c.name, new Date(c.lastUpdatedAt || 0).toISOString())
  }
}

// Recent transcripts by mtime across projects
const projectsRoot = path.join(process.env.USERPROFILE, '.cursor', 'projects')
const recent = []
for (const proj of fs.readdirSync(projectsRoot)) {
  const dir = path.join(projectsRoot, proj, 'agent-transcripts')
  if (!fs.existsSync(dir)) continue
  for (const id of fs.readdirSync(dir)) {
    const file = path.join(dir, id, `${id}.jsonl`)
    if (!fs.existsSync(file)) continue
    const st = fs.statSync(file)
    recent.push({ id, proj, mtime: st.mtimeMs, size: st.size })
  }
}
recent.sort((a, b) => b.mtime - a.mtime)
console.log('\nrecent transcripts')
for (const r of recent.slice(0, 12)) {
  console.log(new Date(r.mtime).toISOString(), r.proj, r.id.slice(0, 8), 'bytes', r.size)
  // last line type
  const lines = fs.readFileSync(path.join(projectsRoot, r.proj, 'agent-transcripts', r.id, `${r.id}.jsonl`), 'utf8').trim().split('\n')
  try {
    const last = JSON.parse(lines.at(-1))
    const firstUser = lines.find((l) => l.includes('"role":"user"'))
    let title = ''
    if (firstUser) {
      const m = firstUser.match(/<user_query>\\n?([\s\S]*?)\\n?<\/user_query>/) || firstUser.match(/user_query>([^<]{0,80})/)
      title = (m?.[1] || '').replace(/\\n/g, ' ').slice(0, 60)
    }
    console.log('  last=', last.type || last.role || last.status, 'title=', title)
  } catch {}
}

db.close()
