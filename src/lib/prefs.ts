export type OpsPrefs = {
  /** Prefer included plan + bonus only; avoid on-demand charges. */
  noOnDemand: boolean
  /** When included quota runs low, consider plan upgrade (not on-demand). */
  preferPlanChange: boolean
  /** Prefer Cursor Models / Auto to stretch the base plan. */
  preferCursorModels: boolean
}

const KEY = 'cursor-usage-monitor.opsPrefs.v1'

export const DEFAULT_OPS_PREFS: OpsPrefs = {
  noOnDemand: true,
  preferPlanChange: true,
  preferCursorModels: true,
}

export function loadOpsPrefs(): OpsPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_OPS_PREFS }
    const parsed = JSON.parse(raw) as Partial<OpsPrefs>
    return {
      noOnDemand: parsed.noOnDemand ?? true,
      preferPlanChange: parsed.preferPlanChange ?? true,
      preferCursorModels: parsed.preferCursorModels ?? true,
    }
  } catch {
    return { ...DEFAULT_OPS_PREFS }
  }
}

export function saveOpsPrefs(prefs: OpsPrefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
