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
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${command} exited with code ${code}`)
      shutdown(code)
    }
  })
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

run('node', ['--experimental-sqlite', 'server/index.mjs'], { PORT: '8787' })
run('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'])

console.log('Dev UI: http://127.0.0.1:5173')
console.log('API:    http://127.0.0.1:8787')
