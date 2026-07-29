import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = path.join(root, 'dist', 'index.html')

async function run(command, args) {
  await new Promise((resolve, reject) => {
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
  await run('npm', ['run', 'build'])
}

// Detached resident launch (terminal can close)
await run('node', ['scripts/launch-resident.mjs'])
