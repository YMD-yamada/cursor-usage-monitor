import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const startupDir = path.join(
  process.env.APPDATA || '',
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup',
)
const startMenuDir = path.join(
  process.env.APPDATA || '',
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
)
const vbsPath = path.join(startupDir, 'CursorUsageMonitor.vbs')
const launchJs = path.join(root, 'scripts', 'launch-resident.mjs')
const settingsPath = path.join(root, '.resident.json')

fs.mkdirSync(startupDir, { recursive: true })
fs.mkdirSync(startMenuDir, { recursive: true })

const rootEscaped = root.replace(/\\/g, '\\\\')
const launchEscaped = launchJs.replace(/\\/g, '\\\\')
const vbs = [
  'Set sh = CreateObject("WScript.Shell")',
  `sh.CurrentDirectory = "${rootEscaped}"`,
  `sh.Run "node ""${launchEscaped}""", 0, False`,
  '',
].join('\r\n')
fs.writeFileSync(vbsPath, vbs, 'utf8')

// Start Menu launcher (same silent VBS)
const startMenuVbs = path.join(startMenuDir, 'Cursor Usage Monitor.vbs')
fs.writeFileSync(startMenuVbs, vbs, 'utf8')

fs.writeFileSync(
  settingsPath,
  JSON.stringify(
    {
      autostartConfigured: true,
      enabledAt: new Date().toISOString(),
      startupVbs: vbsPath,
      startMenuVbs,
    },
    null,
    2,
  ),
  'utf8',
)

console.log('Installed resident autostart:')
console.log(`  Startup: ${vbsPath}`)
console.log(`  Start Menu: ${startMenuVbs}`)

// Launch now
await new Promise((resolve, reject) => {
  const child = spawn('node', [path.join(root, 'scripts', 'launch-resident.mjs')], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  child.on('exit', (code) => {
    if (code) reject(new Error(`launch failed: ${code}`))
    else resolve()
  })
})

console.log('Resident widget started. Tray icon = 常駐中. 「終了」で完全停止。')
