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
const raw = db
  .prepare('SELECT value FROM ItemTable WHERE key = ?')
  .get('composer.composerHeaders')?.value
db.close()

const data = JSON.parse(raw)
const list = data.allComposers || []
console.log('total', list.length)

const statuses = new Map()
const modes = new Map()
for (const c of list) {
  const st = c.agentLocation?.status || 'none'
  statuses.set(st, (statuses.get(st) || 0) + 1)
  modes.set(c.unifiedMode || '?', (modes.get(c.unifiedMode || '?') || 0) + 1)
}
console.log('statuses', Object.fromEntries(statuses))
console.log('modes', Object.fromEntries(modes))

const interesting = list
  .filter(
    (c) =>
      !c.isArchived &&
      !c.isDraft &&
      (c.hasBlockingPendingActions ||
        c.hasPendingPlan ||
        c.hasUnreadMessages ||
        c.agentLocation?.status === 'active' ||
        c.name?.includes('Usage') ||
        c.name?.includes('Monitor')),
  )
  .sort((a, b) => (b.lastUpdatedAt || 0) - (a.lastUpdatedAt || 0))
  .slice(0, 25)

for (const c of interesting) {
  console.log(
    JSON.stringify(
      {
        name: c.name,
        subtitle: c.subtitle,
        status: c.agentLocation?.status,
        unread: c.hasUnreadMessages,
        blocking: c.hasBlockingPendingActions,
        plan: c.hasPendingPlan,
        mode: c.unifiedMode,
        updated: c.lastUpdatedAt
          ? new Date(c.lastUpdatedAt).toISOString()
          : null,
        workspace: c.workspaceIdentifier?.uri?.fsPath || c.agentLocation?.environment?.uri?.fsPath,
        context: c.contextUsagePercent,
      },
      null,
      0,
    ),
  )
}

// Recent 10 by update
console.log('\n--- recent 10 ---')
for (const c of [...list]
  .filter((c) => !c.isArchived && !c.isDraft)
  .sort((a, b) => (b.lastUpdatedAt || 0) - (a.lastUpdatedAt || 0))
  .slice(0, 10)) {
  console.log(
    `${new Date(c.lastUpdatedAt).toISOString()} | ${c.agentLocation?.status || '-'} | unread=${c.hasUnreadMessages} block=${c.hasBlockingPendingActions} | ${c.name} | ${c.subtitle}`,
  )
}
