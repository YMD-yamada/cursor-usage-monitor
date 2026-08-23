import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const settingsPath = path.join(root, '.resident.json')

function run(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file, ...args],
      { cwd: root, stdio: 'inherit', windowsHide: true },
    )
    child.on('exit', (code) => {
      if (code) reject(new Error(`${path.basename(file)} failed: ${code}`))
      else resolve()
    })
  })
}

await run(path.join(root, 'scripts', 'register-windows-app.ps1'), [
  '-RepoRoot',
  root,
])

fs.writeFileSync(
  settingsPath,
  JSON.stringify(
    {
      autostartConfigured: true,
      enabledAt: new Date().toISOString(),
      searchNames: [
        'Usageboard for Cursor',
        'Usageboard',
        'Cursor Usageboard',
        'Cursor Usage Monitor',
      ],
    },
    null,
    2,
  ),
  'utf8',
)

console.log('Installed Usageboard for Cursor (Start Menu / Search / Startup).')

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

console.log('Resident widget started. Tray = 常駐中. 「終了」で完全停止。')
