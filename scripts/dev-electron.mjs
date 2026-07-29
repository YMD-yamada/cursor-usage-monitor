import { spawn } from 'node:child_process'
import process from 'node:process'

const children = []

function run(command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  for (const child of children) {
    try {
      child.kill()
    } catch {
      // ignore
    }
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run('node', ['scripts/dev.mjs'])
setTimeout(() => {
  run('npx', ['electron', '.'], { CURSOR_MONITOR_DEV: '1' })
}, 1500)
