import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = path.join(root, 'dist', 'index.html')
const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
const electronCli = path.join(root, 'node_modules', 'electron', 'cli.js')
const PORT = Number(process.env.PORT || 8787)

function existsLock() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
      res.resume()
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(800, () => {
      req.destroy()
      resolve(false)
    })
  })
}

function runSync(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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

if (!fs.existsSync(distIndex)) {
  console.log('Building UI…')
  await runSync('npm', ['run', 'build'])
}

// Always pass the app directory. Bare electron.exe opens the official default window.
const winElectron = process.platform === 'win32' && fs.existsSync(electronExe)
const child = spawn(
  winElectron ? electronExe : process.execPath,
  winElectron ? [root] : [electronCli, root],
  {
  cwd: root,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  env: {
    ...process.env,
    PORT: String(PORT),
  },
})
child.unref()

const apiUp = await existsLock()
console.log(
  apiUp
    ? 'Cursor Usage Monitor: launching resident widget (API already up)'
    : 'Cursor Usage Monitor: launching resident widget',
)
process.exit(0)
