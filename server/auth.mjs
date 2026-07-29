import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import process from 'node:process'
import os from 'node:os'

function getCursorDbPath() {
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

function decodeJwtPayload(token) {
  const payload = token.split('.')[1]
  const json = Buffer.from(payload, 'base64url').toString('utf8')
  return JSON.parse(json)
}

export function readCursorAuth() {
  const dbPath = getCursorDbPath()
  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    const get = (key) =>
      db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key)?.value

    const accessToken = get('cursorAuth/accessToken')
    if (!accessToken) {
      throw new Error('Cursor access token not found. Sign in to Cursor first.')
    }

    const claims = decodeJwtPayload(accessToken)
    const sub = String(claims.sub || '')
    const userId = sub.includes('|') ? sub.split('|')[1] : sub
    const sessionToken = `${userId}%3A%3A${accessToken}`

    return {
      userId,
      sessionToken,
      email: get('cursorAuth/cachedEmail') || null,
      membershipType: get('cursorAuth/stripeMembershipType') || null,
      subscriptionStatus: get('cursorAuth/stripeSubscriptionStatus') || null,
      dbPath,
    }
  } finally {
    db.close()
  }
}
