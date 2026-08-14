# CURSOR_HANDOFF



## Project



`cursor-usage-monitor` — resident Electron widget for Cursor Usage + billing education + ops policy deep-links (MIT / public).



## Ops policy (product default)



Default UX nudges: **no on-demand**, stretch base plan via Cursor Models, plan change when needed.



- Prefs key: `cursor-usage-monitor.opsPrefs.v1` (`src/lib/prefs.ts`)

- Tab **運用** (`OpsPanel`) + official deep links (`src/lib/cursorLinks.ts`)



## Privacy



- Local Cursor `state.vscdb` session only

- `127.0.0.1` API; email/userId redacted in HTTP responses

- See `SECURITY.md`



## Commands



- `npm start` / `npm run build` / `npm run install:resident` / `npm run smoke`

- Window: compact 320×348, expanded 400×780
- Store name: **Usageboard** (Microsoft Store). Not affiliated with Cursor.



## Status



- Public GitHub MIT: https://github.com/YMD-yamada/cursor-usage-monitor

- Portfolio (仕事): https://ymd-portfolio-site.pages.dev/

- This PC: `npm run install:resident` (Startup + Start Menu). Smoke 2026-08-14: 7/7, signedIn Pro, CM ~32% / OM 0%.

- Store hub: https://personal-site-taupe-gamma.vercel.app/apps/usageboard/ (listing prepared; Partner Center submission is human-must)
- Store name **Usageboard**; dual-pool compact UI (no fake combined %)

- **Aligned with official 2026 dashboard**: primary display is two pools — **Cursor Models** (`autoPercentUsed`) and **Other Models** (`apiPercentUsed`). Included $ / bonus are secondary accounting only (official Usage no longer leads with a single combined % or $ for self-serve).

- Sources: `GET /api/usage-summary` + `POST /api/dashboard/get-current-period-usage`

- Docs: https://cursor.com/docs/models-and-pricing · https://cursor.com/help/models-and-usage/usage-limits

- Usage SVG area charts (compact + expanded)

- Debug probe scripts removed from tree (2026-07-30)


