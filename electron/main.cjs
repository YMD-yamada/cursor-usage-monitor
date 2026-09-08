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
const APP_ID = 'jp.ymd.usageboard'

app.setName('Usageboard for Cursor')
app.setAppUserModelId(APP_ID)

const DEFAULT_SIZE = { width: 400, height: 680 }
const MIN_SIZE = { width: 260, height: 240 }

const EXTERNAL_ALLOW = [
  /^https:\/\/([\w-]+\.)?cursor\.com(\/|$)/i,
  /^https:\/\/github\.com\/(YMD-yamada|sponsors\/YMD-yamada)(\/|$)/i,
  /^https:\/\/personal-site-taupe-gamma\.vercel\.app(\/|$)/i,
]

let serverProcess = null
let mainWindow = null
let windowCreating = false
let tray = null
let bootUrl = null
let dragTimer = null
let dragOffset = null
let dragSize = null
let resizeTimer = null
let resizeSession = null

function stopDrag() {
  if (dragTimer) {
    clearInterval(dragTimer)
    dragTimer = null
  }
  dragOffset = null
  dragSize = null
}

function stopResize() {
  if (resizeTimer) {
    clearInterval(resizeTimer)
    resizeTimer = null
  }
  resizeSession = null
}

function liveWindowSize() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds()
    return { width: bounds.width, height: bounds.height }
  }
  return { ...DEFAULT_SIZE }
}

function sizeLimitsFor(display) {
  const work = display.workArea
  return {
    minW: MIN_SIZE.width,
    minH: MIN_SIZE.height,
    maxW: Math.max(MIN_SIZE.width, work.width - 16),
    maxH: Math.max(MIN_SIZE.height, work.height - 16),
  }
}

function clampSize(width, height, display) {
  const lim = sizeLimitsFor(display)
  return {
    width: Math.round(Math.min(lim.maxW, Math.max(lim.minW, width))),
    height: Math.round(Math.min(lim.maxH, Math.max(lim.minH, height))),
  }
}

const RESIZE_EDGES = new Set(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'])

function resizeBoundsFromEdge(session, point) {
  const display = screen.getDisplayMatching({
    x: session.x,
    y: session.y,
    width: session.width,
    height: session.height,
  })
  const work = display.workArea
  const lim = sizeLimitsFor(display)
  const dx = point.x - session.originX
  const dy = point.y - session.originY
  const edge = RESIZE_EDGES.has(session.edge) ? session.edge : 'se'

  let left = session.x
  let top = session.y
  let right = session.x + session.width
  let bottom = session.y + session.height

  if (edge.includes('e')) right = session.x + session.width + dx
  if (edge.includes('s')) bottom = session.y + session.height + dy
  if (edge.includes('w')) left = session.x + dx
  if (edge.includes('n')) top = session.y + dy

  if (right - left < lim.minW) {
    if (edge.includes('w')) left = right - lim.minW
    else right = left + lim.minW
  }
  if (bottom - top < lim.minH) {
    if (edge.includes('n')) top = bottom - lim.minH
    else bottom = top + lim.minH
  }

  left = Math.max(left, work.x)
  top = Math.max(top, work.y)
  right = Math.min(right, work.x + work.width)
  bottom = Math.min(bottom, work.y + work.height)

  if (right - left < lim.minW) {
    if (edge.includes('w')) left = Math.max(work.x, right - lim.minW)
    else right = Math.min(work.x + work.width, left + lim.minW)
  }
  if (bottom - top < lim.minH) {
    if (edge.includes('n')) top = Math.max(work.y, bottom - lim.minH)
    else bottom = Math.min(work.y + work.height, top + lim.minH)
  }

  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(Math.max(lim.minW, right - left)),
    height: Math.round(Math.max(lim.minH, bottom - top)),
  }
}

function applyResizeLimits(win) {
  if (!win || win.isDestroyed()) return
  const lim = sizeLimitsFor(screen.getDisplayMatching(win.getBounds()))
  win.setMinimumSize(lim.minW, lim.minH)
  win.setMaximumSize(lim.maxW, lim.maxH)
}

function freezeWindowSize(win, size) {
  if (!win || win.isDestroyed()) return
  win.setMinimumSize(size.width, size.height)
  win.setMaximumSize(size.width, size.height)
}

function displayForBounds(bounds) {
  const x = Number.isFinite(bounds?.x) ? bounds.x : 0
  const y = Number.isFinite(bounds?.y) ? bounds.y : 0
  return screen.getDisplayNearestPoint({ x, y })
}

function resolveStartSize(saved, display) {
  const width = Number(saved?.width)
  const height = Number(saved?.height)
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return clampSize(width, height, display)
  }
  return clampSize(DEFAULT_SIZE.width, DEFAULT_SIZE.height, display)
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
          width: bounds.width,
          height: bounds.height,
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

function clampToWorkArea(bounds, size) {
  const display = displayForBounds(bounds)
  const work = display.workArea
  const clamped = clampSize(size.width, size.height, display)
  const width = clamped.width
  const height = clamped.height
  const maxX = work.x + Math.max(work.width - width - 8, 8)
  const maxY = work.y + Math.max(work.height - height - 8, 8)
  const point = {
    x: Number.isFinite(bounds?.x) ? bounds.x : work.x + 8,
    y: Number.isFinite(bounds?.y) ? bounds.y : work.y + 8,
  }
  const x = Math.min(Math.max(work.x + 8, Math.round(point.x)), maxX)
  const y = Math.min(Math.max(work.y + 8, Math.round(point.y)), maxY)
  return { x, y, width, height }
}

function persistWindowState(win = mainWindow) {
  if (!win || win.isDestroyed()) return
  writeWindowState(win.getBounds())
}

function ensureVisible() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (bootUrl) createWindow(bootUrl)
    return
  }
  applyResizeLimits(mainWindow)
  const bounds = mainWindow.getBounds()
  const next = clampToWorkArea(bounds, { width: bounds.width, height: bounds.height })
  mainWindow.setBounds(next)
  writeWindowState(next)
  mainWindow.setSkipTaskbar(false)
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.moveTop()
  mainWindow.focus()
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    ensureVisible()
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

function bootLog(msg) {
  try {
    const file = path.join(app.getPath('userData'), 'boot.log')
    fs.appendFileSync(file, `${new Date().toISOString()} ${msg}\n`)
  } catch {
    // ignore
  }
}

function waitForServer(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    let left = attempts
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume()
        if (res.statusCode === 200) resolve()
        else retry()
      })
      req.on('error', retry)
      req.setTimeout(1200, () => {
        req.destroy()
      })
      function retry() {
        left -= 1
        if (left <= 0) reject(new Error('API server did not start'))
        else setTimeout(tick, 250)
      }
    }
    tick()
  })
}

function waitForUrl(url, attempts = 60) {
  return waitForServer(url, attempts)
}

function getIconPath(file = 'icon.png') {
  const candidates = [
    path.join(getAppRoot(), 'build', file),
    path.join(APP_ROOT, 'build', file),
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

function createAppIcon() {
  const ico = getIconPath('icon.ico')
  const png = getIconPath('icon.png')
  const file = ico || png
  if (!file) return nativeImage.createEmpty()
  const image = nativeImage.createFromPath(file)
  return image.isEmpty() ? nativeImage.createEmpty() : image
}

function createTrayIcon() {
  const small =
    getIconPath('icon-32.png') || getIconPath('icon-16.png') || getIconPath('icon.png')
  if (!small) return createAppIcon()
  const image = nativeImage.createFromPath(small)
  if (image.isEmpty()) return createAppIcon()
  return image.resize({ width: 16, height: 16 })
}

function placeOnRightEdge(win, size) {
  const display = screen.getPrimaryDisplay()
  const work = display.workArea
  const x = work.x + work.width - size.width - 12
  const y = work.y + Math.max(48, Math.round(work.height * 0.12))
  win.setBounds({ x, y, width: size.width, height: size.height })
}

function minimizeWidget() {
  if (!mainWindow) return
  // Ensure it can appear on the taskbar when minimized.
  mainWindow.setSkipTaskbar(false)
  if (mainWindow.isMinimized()) return
  mainWindow.minimize()
}

function showWidget() {
  ensureVisible()
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
        placeOnRightEdge(mainWindow, liveWindowSize())
        writeWindowState(mainWindow.getBounds())
      },
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
  if (windowCreating) return
  bootLog(`createWindow url=${url}`)
  if (mainWindow && !mainWindow.isDestroyed()) {
    bootLog('createWindow reuse')
    ensureVisible()
    return
  }
  windowCreating = true
  try {
    createWindowBody(url)
  } catch (error) {
    bootLog(`createWindow error ${error && error.message}`)
    console.error('createWindow failed', error)
  } finally {
    windowCreating = false
  }
}

function createWindowBody(url) {
  const saved = readWindowState()
  const savedPos =
    saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? saved : null
  const display = savedPos
    ? screen.getDisplayNearestPoint({ x: savedPos.x, y: savedPos.y })
    : screen.getPrimaryDisplay()
  const size = resolveStartSize(saved, display)
  const appIcon = createAppIcon()
  mainWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    show: true,
    frame: false,
    transparent: true,
    resizable: true,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    thickFrame: true,
    skipTaskbar: false,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    title: 'Usageboard for Cursor',
    icon: appIcon.isEmpty() ? undefined : appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  applyResizeLimits(mainWindow)
  const work = display.workArea
  const onScreen =
    savedPos &&
    savedPos.x >= work.x - 40 &&
    savedPos.y >= work.y - 40 &&
    savedPos.x + size.width <= work.x + work.width + 40 &&
    savedPos.y + size.height <= work.y + work.height + 40
  if (onScreen) {
    mainWindow.setBounds(clampToWorkArea(savedPos, size))
  } else {
    placeOnRightEdge(mainWindow, size)
    mainWindow.setBounds(clampToWorkArea(mainWindow.getBounds(), size))
  }

  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setMovable(true)
  mainWindow.setResizable(true)
  mainWindow.setMenu(null)

  let revealed = false
  const reveal = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    revealed = true
    ensureVisible()
  }
  mainWindow.once('ready-to-show', reveal)

  let loaded = false
  let loadTries = 0
  const tryLoad = () => {
    if (!mainWindow || mainWindow.isDestroyed() || loaded) return
    if (loadTries >= 24) return
    loadTries += 1
    bootLog(`loadURL try=${loadTries} ${url}`)
    mainWindow.loadURL(url)
  }
  mainWindow.webContents.on('did-finish-load', () => {
    loaded = true
    bootLog('did-finish-load')
    setTimeout(reveal, 50)
  })
  mainWindow.webContents.on('did-fail-load', (_event, code, desc) => {
    bootLog(`did-fail-load ${code} ${desc}`)
    setTimeout(tryLoad, 500)
    setTimeout(reveal, 50)
  })
  setTimeout(() => {
    if (!revealed) reveal()
  }, 1500)
  tryLoad()
  reveal()

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
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('renderer gone', details.reason)
    if (!mainWindow || mainWindow.isDestroyed() || app.isQuitting) return
    mainWindow.loadURL(url).finally(() => ensureVisible())
  })
  mainWindow.on('blur', () => {
    stopDrag()
    stopResize()
    applyResizeLimits(mainWindow)
  })
  mainWindow.on('moved', () => {
    if (!dragTimer && !resizeTimer) applyResizeLimits(mainWindow)
    persistWindowState()
  })
  mainWindow.on('resize', () => persistWindowState())

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
  if (tray) return
  tray = new Tray(createTrayIcon())
  tray.setToolTip('Usageboard for Cursor（常駐中）')
  rebuildTrayMenu()
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) {
      showWidget()
      return
    }
    if (!mainWindow.isVisible()) {
      showWidget()
      return
    }
    const b = mainWindow.getBounds()
    const work = screen.getDisplayMatching(b).workArea
    const off =
      b.x + 40 > work.x + work.width ||
      b.y + 40 > work.y + work.height ||
      b.x + b.width < work.x + 40 ||
      b.y + b.height < work.y + 40
    if (off) showWidget()
    else hideWidget()
  })
}

function registerIpc() {

  ipcMain.handle('widget:getState', () => ({
    autostart: getAutostartEnabled(),
    resident: true,
  }))
  ipcMain.handle('widget:setExpanded', () => ({ expanded: true }))
  ipcMain.handle('widget:toggleExpanded', () => ({ expanded: true }))
  ipcMain.handle('widget:snapRight', () => {
    if (mainWindow) {
      placeOnRightEdge(mainWindow, liveWindowSize())
      writeWindowState(mainWindow.getBounds())
    }
    return true
  })
  ipcMain.handle('widget:hide', () => {
    hideWidget()
    return true
  })
  ipcMain.handle('widget:show', () => {
    ensureVisible()
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
    stopResize()
    stopDrag()
    const cursor = screen.getCursorScreenPoint()
    const bounds = win.getBounds()
    const size = { width: bounds.width, height: bounds.height }
    freezeWindowSize(win, size)
    dragSize = size
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
      applyResizeLimits(mainWindow)
      writeWindowState(mainWindow.getBounds())
    }
  })

  ipcMain.on('widget:resize-start', (event, edge) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    stopDrag()
    stopResize()
    const cursor = screen.getCursorScreenPoint()
    const bounds = win.getBounds()
    resizeSession = {
      edge: RESIZE_EDGES.has(edge) ? edge : 'se',
      originX: cursor.x,
      originY: cursor.y,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    }
    resizeTimer = setInterval(() => {
      if (!resizeSession || win.isDestroyed()) {
        stopResize()
        return
      }
      const next = resizeBoundsFromEdge(resizeSession, screen.getCursorScreenPoint())
      win.setBounds(next)
    }, 16)
  })
  ipcMain.on('widget:resize-end', () => {
    stopResize()
    if (mainWindow && !mainWindow.isDestroyed()) {
      applyResizeLimits(mainWindow)
      writeWindowState(mainWindow.getBounds())
    }
  })
}

if (gotLock) {
  app.whenReady().then(async () => {
    bootLog('whenReady')
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
      waitForUrl('http://127.0.0.1:5173/').catch((error) => {
        console.error('dev server wait failed', error)
      })
    } else if (!serverProcess) {
      const health = `http://127.0.0.1:${PORT}/api/health`
      const probe = http.get(health, (res) => {
        res.resume()
        bootLog(`health probe ${res.statusCode}`)
        if (res.statusCode !== 200) serverProcess = startServer()
      })
      probe.on('error', () => {
        bootLog('health probe error; startServer')
        if (!serverProcess) serverProcess = startServer()
      })
      probe.setTimeout(400, () => {
        probe.destroy()
      })
    }

    try {
      createTray()
    } catch (error) {
      console.error('tray failed', error)
    }

    createWindow(bootUrl)

    app.on('activate', () => {
      showWidget()
    })
  }).catch((error) => {
    console.error('startup failed', error)
    try {
      createTray()
    } catch {
      // ignore
    }
    if (bootUrl) createWindow(bootUrl)
  })

  app.on('before-quit', () => {
    app.isQuitting = true
    stopDrag()
    stopResize()
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