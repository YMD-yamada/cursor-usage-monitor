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
- Window: compact 300×300, expanded 380×760

## Status

- Public GitHub MIT app
- Usage SVG area charts (compact + expanded)
- Debug probe scripts removed from tree (2026-07-30)
