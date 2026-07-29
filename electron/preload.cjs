const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cursorMonitor', {
  platform: process.platform,
  isElectron: true,
  getState: () => ipcRenderer.invoke('widget:getState'),
  setExpanded: (value) => ipcRenderer.invoke('widget:setExpanded', value),
  toggleExpanded: () => ipcRenderer.invoke('widget:toggleExpanded'),
  snapRight: () => ipcRenderer.invoke('widget:snapRight'),
  hide: () => ipcRenderer.invoke('widget:hide'),
  quit: () => ipcRenderer.invoke('widget:quit'),
  setAutostart: (enabled) => ipcRenderer.invoke('widget:setAutostart', enabled),
  openExternal: (url) => ipcRenderer.invoke('widget:openExternal', url),
  startDrag: () => ipcRenderer.send('widget:drag-start'),
  endDrag: () => ipcRenderer.send('widget:drag-end'),
  onExpanded: (callback) => {
    const listener = (_event, value) => callback(Boolean(value))
    ipcRenderer.on('widget:expanded', listener)
    return () => ipcRenderer.removeListener('widget:expanded', listener)
  },
})
