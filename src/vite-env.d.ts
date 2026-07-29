/// <reference types="vite/client" />

interface Window {
  cursorMonitor?: {
    platform: string
    isElectron: boolean
    getState: () => Promise<{
      expanded: boolean
      autostart?: boolean
      resident?: boolean
    }>
    setExpanded: (value: boolean) => Promise<{ expanded: boolean }>
    toggleExpanded: () => Promise<{ expanded: boolean }>
    snapRight: () => Promise<boolean>
    hide: () => Promise<boolean>
    quit: () => Promise<boolean>
    setAutostart?: (enabled: boolean) => Promise<{ autostart: boolean }>
    startDrag?: () => void
    endDrag?: () => void
    openExternal: (url: string) => Promise<boolean>
    onExpanded: (callback: (value: boolean) => void) => () => void
  }
}
