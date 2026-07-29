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

function get(key) {
  return db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key)?.value
}

function show(key, max = 2500) {
  const v = get(key)
  console.log(`\n===== ${key} =====`)
  if (v == null) {
    console.log('(missing)')
    return
  }
  try {
    const parsed = JSON.parse(v)
    const s = JSON.stringify(parsed, null, 2)
    console.log(s.slice(0, max))
    console.log(`... len=${s.length}`)
  } catch {
    console.log(String(v).slice(0, max))
  }
}

show('composer.composerHeaders')
show('cursor/glass.selectedAgent')
show('cursor/glass.startupDefaultStateRecentChatCache')
show('backgroundComposer.windowBcMapping')
show('glass.localAgentProjects.v1')
show('agentLayout.shared.v6')

// Sample one transcript last lines
const sample = path.join(
  process.env.USERPROFILE,
  '.cursor',
  'projects',
  'c-Users-cz7-Projects-cursor-usage-monitor',
  'agent-transcripts',
  'dba86920-d696-403a-8cf1-385d8779b0ff',
  'dba86920-d696-403a-8cf1-385d8779b0ff.jsonl',
)
if (fs.existsSync(sample)) {
  const lines = fs.readFileSync(sample, 'utf8').trim().split('\n')
  console.log('\n===== transcript sample first =====')
  console.log(lines[0]?.slice(0, 800))
  console.log('\n===== transcript sample last =====')
  console.log(lines.at(-1)?.slice(0, 800))
  console.log('lineCount', lines.length)
}

db.close()
