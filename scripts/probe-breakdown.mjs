import { fetchCursorUsage } from '../server/usage.mjs'

const u = await fetchCursorUsage()
console.log(JSON.stringify(u.breakdown, null, 2))
console.log(
  'models',
  u.models.map((m) => ({ model: m.model, category: m.category, cost: m.costUsd })),
)
