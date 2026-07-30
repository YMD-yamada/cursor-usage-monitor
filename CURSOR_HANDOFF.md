# CURSOR_HANDOFF

## Project

`cursor-usage-monitor` — resident Electron widget for Cursor Usage + billing education + ops policy deep-links. Designed for any Cursor user (shareable / MIT).

## Ops policy (2026-07-29)

User preference (default): **no on-demand**, prefer plan change when needed, stretch base plan via Cursor Models.

- Prefs: `localStorage` key `cursor-usage-monitor.opsPrefs.v1` (`src/lib/prefs.ts`)
- UI tab **運用** (`OpsPanel`): policy toggles + live on-demand status + deep links
- Cannot flip Cursor billing via API → open official pages:
  - Spending OFF: https://cursor.com/dashboard/spending
  - Plan change: https://cursor.com/dashboard/billing
  - Pricing: https://cursor.com/pricing
- Links helper: `src/lib/cursorLinks.ts`

## Guide tabs

いま / 運用 / 課金 / プール / プラン

## Privacy (for publishing)

- Reads local Cursor `state.vscdb` session only
- Calls cursor.com dashboard APIs as that user
- No third-party telemetry

## Commands

- `npm start` / `npm run build` / `npm run install:resident`
- Window: compact 300×300, expanded 380×760

## Usage charts (2026-07-28)

- Compact: 14-day SVG area/line sparkline under hero (`UsageMiniBars`)
- Expanded: area chart (cost solid + events dashed) + model bars + token mix
- Data: `usage.charts.daily` from filtered usage events (`server/usage.mjs`)

## Status

- Ops panel + public README/LICENSE ready for sharing (2026-07-29)
- Minimize to taskbar enabled (– button / tray); × still hides to tray (2026-07-29)
- Usage area/line graphs added for compact + expanded views (2026-07-28)
- User rule + sessionStart hook: Full delegation / operator mode (2026-07-30)
- Propagated operator-mode to ~/.cursor/rules + 17 git repos + DevHub/Ops standards (2026-07-30)
