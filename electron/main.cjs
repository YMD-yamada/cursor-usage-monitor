const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  shell,
  ipcMain,
  screen,
} = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')

const PORT = Number(process.env.PORT || 8787)
const isDev = process.env.CURSOR_MONITOR_DEV === '1'
const APP_ROOT = path.join(__dirname, '..')

const COMPACT = { width: 320, height: 348 }
const EXPANDED = { width: 400, height: 780 }

const EXTERNAL_ALLOW = [
  /^https:\/\/([\w-]+\.)?cursor\.com(\/|$)/i,
  /^https:\/\/github\.com\/(YMD-yamada|sponsors\/YMD-yamada)(\/|$)/i,
  /^https:\/\/personal-site-taupe-gamma\.vercel\.app(\/|$)/i,
]

let serverProcess = null
let mainWindow = null
let tray = null
let expanded = false
let bootUrl = null
let dragTimer = null
let dragOffset = null
let dragSize = null

function stopDrag() {
  if (dragTimer) {
    clearInterval(dragTimer)
    dragTimer = null
  }
  dragOffset = null
  dragSize = null
}

function currentSize() {
  return expanded ? EXPANDED : COMPACT
}

function isAllowedExternal(url) {
  return typeof url === 'string' && EXTERNAL_ALLOW.some((re) => re.test(url))
}

function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window.json')
}

function readWindowState() {
  try {
    return JSON.parse(fs.readFileSync(getWindowStatePath(), 'utf8'))
  } catch {
    return null
  }
}

function writeWindowState(bounds) {
  try {
    fs.mkdirSync(path.dirname(getWindowStatePath()), { recursive: true })
    fs.writeFileSync(
      getWindowStatePath(),
      JSON.stringify(
        {
          x: bounds.x,
          y: bounds.y,
          expanded,
        },
        null,
        2,
      ),
      'utf8',
    )
  } catch {
    // ignore
  }
}

function lockSize(win, size) {
  if (!win || win.isDestroyed()) return
  win.setMinimumSize(size.width, size.height)
  win.setMaximumSize(size.width, size.height)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showWidget()
  })
}

function isPackaged() {
  return Boolean(app.isPackaged)
}

function getAppRoot() {
  if (isPackaged()) {
    return path.join(process.resourcesPath, 'app')
  }
  return APP_ROOT
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'resident.json')
}

function startServer() {
  if (isDev) return null
  const root = getAppRoot()
  const entry = path.join(root, 'server', 'index.mjs')
  const packaged = isPackaged()
  return spawn(packaged ? process.execPath : 'node', ['--experimental-sqlite', entry], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(PORT),
      ...(packaged ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
    },
    stdio: 'ignore',
    windowsHide: true,
    shell: !packaged,
    detached: false,
  })
}

function waitForServer(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    let left = attempts
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        left -= 1
        if (left <= 0) reject(new Error('API server did not start'))
        else setTimeout(tick, 250)
      })
    }
    tick()
  })
}

function waitForUrl(url, attempts = 60) {
  return waitForServer(url, attempts)
}

function createTrayIcon() {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAhElEQVQ4T2NkYGD4z0ABYBzVMKoBBgYGBv+/f/8zEBlGDRg1gIEBGwN+//7N8P//f4b~/P8Z/v37x/D371+Gf//+Mfz794/h379/DP/+/WP4+/cvw79//xj+/v3L8O/fP4Z///4x/P37l+Hfv38M//79Y/j79y/Dv3//GP79+8fw798/hn///jH8/fuX4d+/f4wApVwY/5m2Z0YAAAAASUVORK5CYII='
  return nativeImage.createFromDataURL(`data:image/png;base64,${pngBase64}`)
}

function placeOnRightEdge(win, size) {
  const display = screen.getPrimaryDisplay()
  const work = display.workArea
  const x = work.x + work.width - size.width - 12
  const y = work.y + Math.max(48, Math.round(work.height * 0.12))
  win.setBounds({ x, y, width: size.width, height: size.height })
}

function applySize(nextExpanded) {
  expanded = nextExpanded
  const size = currentSize()
  if (!mainWindow || mainWindow.isDestroyed()) return
  lockSize(mainWindow, size)
  const bounds = mainWindow.getBounds()
  const display = screen.getDisplayMatching(bounds)
  const work = display.workArea
  const x = Math.min(bounds.x, work.x + work.width - size.width - 8)
  const y = Math.min(bounds.y, work.y + work.height - size.height - 8)
  const next = {
    x: Math.max(work.x + 8, Math.round(x)),
    y: Math.max(work.y + 8, Math.round(y)),
    width: size.width,
    height: size.height,
  }
  mainWindow.setBounds(next)
  writeWindowState(next)
  mainWindow.webContents.send('widget:expanded', expanded)
}

function minimizeWidget() {
  if (!mainWindow) return
  // Ensure it can appear on the taskbar when minimized.
  mainWindow.setSkipTaskbar(false)
  if (mainWindow.isMinimized()) return
  mainWindow.minimize()
}

function showWidget() {
  if (!mainWindow) {
    if (bootUrl) createWindow(bootUrl)
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.setSkipTaskbar(false)
  mainWindow.focus()
}

function hideWidget() {
  if (mainWindow) mainWindow.hide()
}

function quitApp() {
  app.isQuitting = true
  if (tray) {
    tray.destroy()
    tray = null
  }
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
    mainWindow.close()
  }
  app.quit()
}

function getStartupVbsPath() {
  return path.join(
    process.env.APPDATA || '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup',
    'CursorUsageMonitor.vbs',
  )
}

function writeStartupVbs() {
  const vbsPath = getStartupVbsPath()
  const startupDir = path.dirname(vbsPath)
  fs.mkdirSync(startupDir, { recursive: true })

  let vbs
  if (isPackaged()) {
    const exe = process.execPath.replace(/"/g, '')
    vbs = [
      'Set sh = CreateObject("WScript.Shell")',
      `sh.Run """${exe}""", 0, False`,
      '',
    ].join('\r\n')
  } else {
    const launchJs = path
      .join(APP_ROOT, 'scripts', 'launch-resident.mjs')
      .replace(/\\/g, '\\\\')
    const rootEscaped = APP_ROOT.replace(/\\/g, '\\\\')
    vbs = [
      'Set sh = CreateObject("WScript.Shell")',
      `sh.CurrentDirectory = "${rootEscaped}"`,
      `sh.Run "node ""${launchJs}""", 0, False`,
      '',
    ].join('\r\n')
  }
  fs.writeFileSync(vbsPath, vbs, 'utf8')
  return vbsPath
}

function persistAutostartPreference(enabled, vbsPath) {
  const settingsPath = getSettingsPath()
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
  let prev = {}
  try {
    prev = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  } catch {
    prev = {}
  }
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        ...prev,
        autostartConfigured: true,
        autostartEnabled: Boolean(enabled),
        enabledAt: enabled ? new Date().toISOString() : prev.enabledAt || null,
        disabledAt: enabled ? null : new Date().toISOString(),
        startupVbs: vbsPath || prev.startupVbs || getStartupVbsPath(),
      },
      null,
      2,
    ),
    'utf8',
  )
}

function getAutostartEnabled() {
  // Unpackaged Electron on Windows often fails to persist Login Items.
  // Startup-folder VBS is the real source of truth for this app.
  try {
    if (fs.existsSync(getStartupVbsPath())) return true
  } catch {
    // fall through
  }
  try {
    return Boolean(app.getLoginItemSettings().openAtLogin)
  } catch {
    return false
  }
}

function setAutostartEnabled(enabled) {
  const want = Boolean(enabled)

  // Best-effort Electron login item (may not stick while unpackaged).
  try {
    app.setLoginItemSettings({
      openAtLogin: want,
      openAsHidden: false,
      path: process.execPath,
      args: isPackaged() ? [] : [APP_ROOT],
    })
  } catch (error) {
    console.error('autostart login-item update failed', error)
  }

  let vbsPath = getStartupVbsPath()
  try {
    if (want) {
      vbsPath = writeStartupVbs()
    } else if (fs.existsSync(vbsPath)) {
      fs.unlinkSync(vbsPath)
    }
  } catch (error) {
    console.error('autostart startup-folder update failed', error)
  }

  try {
    persistAutostartPreference(want, vbsPath)
  } catch (error) {
    console.error('autostart preference persist failed', error)
  }

  return getAutostartEnabled()
}

function rebuildTrayMenu() {
  if (!tray) return
  const autostart = getAutostartEnabled()
  const menu = Menu.buildFromTemplate([
    {
      label: 'ウィジェットを表示',
      click: () => showWidget(),
    },
    {
      label: '最小化',
      click: () => minimizeWidget(),
    },
    {
      label: 'トレイに隠す',
      click: () => hideWidget(),
    },
    {
      label: '右端にスナップ',
      click: () => {
        if (!mainWindow) return
        placeOnRightEdge(mainWindow, currentSize())
        writeWindowState(mainWindow.getBounds())
      },
    },
    {
      label: '詳細を開く / 閉じる',
      click: () => applySize(!expanded),
    },
    { type: 'separator' },
    {
      label: 'ログイン時に起動',
      type: 'checkbox',
      checked: autostart,
      click: (item) => {
        setAutostartEnabled(item.checked)
        rebuildTrayMenu()
      },
    },
    {
      label: 'Cursor Dashboard',
      click: () =>
        shell.openExternal('https://cursor.com/dashboard?tab=usage'),
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => quitApp(),
    },
  ])
  tray.setContextMenu(menu)
}

function createWindow(url) {
  const size = currentSize()
  mainWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: size.width,
    minHeight: size.height,
    maxWidth: size.width,
    maxHeight: size.height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    title: 'Usageboard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  lockSize(mainWindow, size)
  const saved = readWindowState()
  const display = saved
    ? screen.getDisplayNearestPoint({ x: saved.x || 0, y: saved.y || 0 })
    : screen.getPrimaryDisplay()
  const work = display.workArea
  if (
    saved &&
    Number.isFinite(saved.x) &&
    Number.isFinite(saved.y) &&
    saved.x >= work.x - 40 &&
    saved.y >= work.y - 40 &&
    saved.x < work.x + work.width &&
    saved.y < work.y + work.height
  ) {
    mainWindow.setBounds({
      x: Math.round(saved.x),
      y: Math.round(saved.y),
      width: size.width,
      height: size.height,
    })
  } else {
    placeOnRightEdge(mainWindow, size)
  }

  mainWindow.setAlwaysOnTop(true, 'floating')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setMovable(true)
  mainWindow.setMenu(null)

  mainWindow.loadURL(url)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isAllowedExternal(target)) shell.openExternal(target)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, target) => {
    const local =
      target.startsWith(`http://127.0.0.1:${PORT}`) ||
      target.startsWith('http://127.0.0.1:5173/')
    if (!local) event.preventDefault()
  })
  mainWindow.on('blur', () => {
    stopDrag()
  })

  // Close / × → hide to tray (stay resident)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      hideWidget()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('Usageboard for Cursor（常駐中）')
  rebuildTrayMenu()
  tray.on('click', () => {
    if (!mainWindow) {
      showWidget()
      return
    }
    if (mainWindow.isVisible()) hideWidget()
    else showWidget()
  })
}

function registerIpc() {

  ipcMain.handle('widget:getState', () => ({
    expanded,
    autostart: getAutostartEnabled(),
    resident: true,
  }))
  ipcMain.handle('widget:setExpanded', (_event, value) => {
    applySize(Boolean(value))
    return { expanded }
  })
  ipcMain.handle('widget:toggleExpanded', () => {
    applySize(!expanded)
    return { expanded }
  })
  ipcMain.handle('widget:snapRight', () => {
    if (mainWindow) {
      placeOnRightEdge(mainWindow, currentSize())
      writeWindowState(mainWindow.getBounds())
    }
    return true
  })
  ipcMain.handle('widget:hide', () => {
    hideWidget()
    return true
  })
  ipcMain.handle('widget:minimize', () => {
    minimizeWidget()
    return true
  })
  ipcMain.handle('widget:quit', () => {
    quitApp()
    return true
  })
  ipcMain.handle('widget:setAutostart', (_event, enabled) => {
    const value = setAutostartEnabled(Boolean(enabled))
    rebuildTrayMenu()
    return { autostart: value }
  })
  ipcMain.handle('widget:openExternal', (_event, target) => {
    if (isAllowedExternal(target)) {
      shell.openExternal(target)
    }
    return true
  })

  // Custom window drag. Cache size — setPosition on Windows DPI grows the frame.
  ipcMain.on('widget:drag-start', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    stopDrag()
    const cursor = screen.getCursorScreenPoint()
    const bounds = win.getBounds()
    const size = currentSize()
    lockSize(win, size)
    dragSize = { width: size.width, height: size.height }
    dragOffset = {
      x: cursor.x - bounds.x,
      y: cursor.y - bounds.y,
    }
    dragTimer = setInterval(() => {
      if (!dragOffset || !dragSize || win.isDestroyed()) {
        stopDrag()
        return
      }
      const point = screen.getCursorScreenPoint()
      const display = screen.getDisplayNearestPoint(point)
      const work = display.workArea
      let nextX = Math.round(point.x - dragOffset.x)
      let nextY = Math.round(point.y - dragOffset.y)
      nextX = Math.min(
        Math.max(work.x, nextX),
        work.x + work.width - dragSize.width,
      )
      nextY = Math.min(
        Math.max(work.y, nextY),
        work.y + work.height - dragSize.height,
      )
      win.setBounds({
        x: nextX,
        y: nextY,
        width: dragSize.width,
        height: dragSize.height,
      })
    }, 16)
  })
  ipcMain.on('widget:drag-end', () => {
    stopDrag()
    if (mainWindow && !mainWindow.isDestroyed()) {
      writeWindowState(mainWindow.getBounds())
    }
  })
}

if (gotLock) {
  app.whenReady().then(async () => {
    registerIpc()

    // Default: enable login autostart once for resident use
    if (!isDev && process.env.CURSOR_MONITOR_NO_AUTOSTART !== '1') {
      const settingsPath = getSettingsPath()
      let configured = false
      try {
        configured = JSON.parse(fs.readFileSync(settingsPath, 'utf8')).autostartConfigured
      } catch {
        configured = false
      }
      if (!configured) {
        setAutostartEnabled(true)
      }
    }

    bootUrl = isDev
      ? 'http://127.0.0.1:5173'
      : `http://127.0.0.1:${PORT}`

    if (isDev) {
      await waitForUrl('http://127.0.0.1:5173/')
    } else {
      try {
        await waitForServer(`http://127.0.0.1:${PORT}/api/health`, 3)
      } catch {
        serverProcess = startServer()
        await waitForServer(`http://127.0.0.1:${PORT}/api/health`)
      }
    }

    createTray()
    createWindow(bootUrl)

    app.on('activate', () => {
      showWidget()
    })
  })

  app.on('before-quit', () => {
    app.isQuitting = true
    if (serverProcess) {
      try {
        serverProcess.kill()
      } catch {
        // ignore
      }
      serverProcess = null
    }
  })

  // Stay resident: do not quit when all windows are closed/hidden
  app.on('window-all-closed', () => {
    // Intentionally empty — tray keeps the process alive.
  })
}