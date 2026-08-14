import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import process from 'node:process'

const execFileAsync = promisify(execFile)

const previousCpu = new Map()

async function runPowerShell(script) {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 12,
      encoding: 'utf8',
    },
  )
  return stdout
}

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function mapProcess(p, now, totalMem) {
  const pid = Number(p.Id)
  const cpuTimeSec = Number(p.CPU || 0)
  const prev = previousCpu.get(pid)
  let cpuPercent = 0
  if (prev) {
    const dt = (now - prev.t) / 1000
    if (dt > 0) {
      cpuPercent = ((cpuTimeSec - prev.cpu) / dt) * 100
      cpuPercent = Math.max(0, Math.min(cpuPercent, os.cpus().length * 100))
    }
  }
  previousCpu.set(pid, { cpu: cpuTimeSec, t: now })
  const workingSetBytes = Number(p.WorkingSet || 0)
  const privateBytes = Number(p.PrivateMemory || 0)
  return {
    pid,
    name: p.ProcessName || 'unknown',
    cpuTimeSec,
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    workingSetBytes,
    privateBytes,
    memPercent:
      totalMem > 0
        ? Math.round((workingSetBytes / totalMem) * 1000) / 10
        : 0,
    startTime: p.StartTime || null,
    path: p.Path || null,
  }
}

async function getWindowsMetrics() {
  const script = `
$ErrorActionPreference = 'Stop'
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
$cursor = @(Get-Process -Name Cursor,cursor -ErrorAction SilentlyContinue |
  Select-Object Id, ProcessName, CPU,
    @{N='WorkingSet';E={$_.WorkingSet64}},
    @{N='PrivateMemory';E={$_.PrivateMemorySize64}})
[pscustomobject]@{
  cpuLoad = [math]::Round([double]$cpu.Average, 1)
  totalMem = [int64]$os.TotalVisibleMemorySize * 1024
  freeMem = [int64]$os.FreePhysicalMemory * 1024
  processes = $cursor
} | ConvertTo-Json -Compress -Depth 4
`

  const stdout = await runPowerShell(script)
  const data = JSON.parse(stdout)
  const now = Date.now()
  const totalMem = Number(data.totalMem || 0)
  const freeMem = Number(data.freeMem || 0)
  const usedMem = Math.max(totalMem - freeMem, 0)

  const processes = asArray(data.processes).map((p) =>
    mapProcess(p, now, totalMem),
  )
  const tracked = new Set(processes.map((p) => p.pid))
  for (const pid of previousCpu.keys()) {
    if (!tracked.has(pid)) previousCpu.delete(pid)
  }

  const cursorWs = processes.reduce((s, p) => s + p.workingSetBytes, 0)

  return {
    platform: 'win32',
    cpu: {
      loadPercent: Number(data.cpuLoad || 0),
      cores: os.cpus().length,
    },
    memory: {
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: freeMem,
      usedPercent:
        totalMem > 0 ? Math.round((usedMem / totalMem) * 1000) / 10 : 0,
    },
    cursor: {
      processCount: processes.length,
      totalWorkingSetBytes: cursorWs,
      totalPrivateBytes: processes.reduce((s, p) => s + p.privateBytes, 0),
      totalCpuPercent:
        Math.round(processes.reduce((s, p) => s + p.cpuPercent, 0) * 10) / 10,
      memPercent:
        totalMem > 0 ? Math.round((cursorWs / totalMem) * 1000) / 10 : 0,
    },
    sampledAt: new Date().toISOString(),
  }
}

async function getUnixMetrics() {
  const cpus = os.cpus()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  let all = []
  try {
    const { stdout } = await execFileAsync(
      'ps',
      ['-axo', 'pid=,pcpu=,rss=,comm='],
      { encoding: 'utf8' },
    )
    all = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/)
        if (!m) return null
        const workingSetBytes = Number(m[3]) * 1024
        return {
          pid: Number(m[1]),
          name: m[4],
          cpuTimeSec: 0,
          cpuPercent: Number(m[2]),
          workingSetBytes,
          privateBytes: workingSetBytes,
          memPercent:
            totalMem > 0
              ? Math.round((workingSetBytes / totalMem) * 1000) / 10
              : 0,
          startTime: null,
          path: null,
        }
      })
      .filter(Boolean)
  } catch {
    all = []
  }

  const processes = all
    .filter((p) => /cursor/i.test(p.name))
    .sort((a, b) => b.workingSetBytes - a.workingSetBytes)

  const topProcesses = [...all]
    .sort((a, b) => b.workingSetBytes - a.workingSetBytes)
    .slice(0, 12)

  const groupMap = new Map()
  for (const p of all) {
    const key = p.name.split('/').at(-1) || p.name
    const cur = groupMap.get(key) || {
      name: key,
      count: 0,
      workingSetBytes: 0,
      privateBytes: 0,
      cpuTimeSec: 0,
    }
    cur.count += 1
    cur.workingSetBytes += p.workingSetBytes
    cur.privateBytes += p.privateBytes
    groupMap.set(key, cur)
  }
  const memoryGroups = [...groupMap.values()]
    .map((g) => ({
      ...g,
      memPercent:
        totalMem > 0
          ? Math.round((g.workingSetBytes / totalMem) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.workingSetBytes - a.workingSetBytes)
    .slice(0, 15)

  const idle = cpus.reduce((s, c) => s + c.times.idle, 0)
  const total = cpus.reduce(
    (s, c) =>
      s + c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq,
    0,
  )

  const cursorWs = processes.reduce((s, p) => s + p.workingSetBytes, 0)

  return {
    platform: process.platform,
    cpu: {
      loadPercent: total > 0 ? Math.round((1 - idle / total) * 1000) / 10 : 0,
      cores: cpus.length,
    },
    memory: {
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: freeMem,
      usedPercent: Math.round((usedMem / totalMem) * 1000) / 10,
    },
    cursor: {
      processCount: processes.length,
      totalWorkingSetBytes: cursorWs,
      totalPrivateBytes: processes.reduce((s, p) => s + p.privateBytes, 0),
      totalCpuPercent:
        Math.round(processes.reduce((s, p) => s + p.cpuPercent, 0) * 10) / 10,
      memPercent:
        totalMem > 0 ? Math.round((cursorWs / totalMem) * 1000) / 10 : 0,
    },
    sampledAt: new Date().toISOString(),
  }
}

export async function getSystemMetrics() {
  if (process.platform === 'win32') {
    return getWindowsMetrics()
  }
  return getUnixMetrics()
}
