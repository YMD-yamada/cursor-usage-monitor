import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const targets = [
  path.join(
    process.env.APPDATA || '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup',
    'CursorUsageMonitor.vbs',
  ),
  path.join(
    process.env.APPDATA || '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Cursor Usage Monitor.vbs',
  ),
]

for (const file of targets) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
    console.log('Removed', file)
  }
}

const settingsPath = path.join(root, '.resident.json')
if (fs.existsSync(settingsPath)) {
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        autostartConfigured: true,
        enabledAt: null,
        disabledAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  )
}

console.log('Autostart removed. Running widget is unchanged; quit from tray if needed.')
