/** Official Cursor pages any user can open from the widget. */
export const CURSOR_LINKS = {
  usage: 'https://cursor.com/dashboard/usage',
  spending: 'https://cursor.com/dashboard/spending',
  billing: 'https://cursor.com/dashboard/billing',
  pricing: 'https://cursor.com/pricing',
  docsPricing: 'https://cursor.com/docs/models-and-pricing',
  spendLimitsHelp: 'https://cursor.com/help/account-and-billing/spend-limits',
  overagesHelp: 'https://cursor.com/help/account-and-billing/overages',
  usageLimitsHelp: 'https://cursor.com/help/models-and-usage/usage-limits',
  github: 'https://github.com/YMD-yamada/cursor-usage-monitor',
  sponsors: 'https://github.com/sponsors/YMD-yamada',
} as const

export type CursorLinkKey = keyof typeof CURSOR_LINKS

export function openCursorLink(url: string) {
  if (window.cursorMonitor?.openExternal) {
    void window.cursorMonitor.openExternal(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
