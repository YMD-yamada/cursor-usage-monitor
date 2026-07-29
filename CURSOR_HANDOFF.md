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

## Status

- Ops panel + public README/LICENSE ready for sharing (2026-07-29)
