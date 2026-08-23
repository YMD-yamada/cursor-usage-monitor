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
- Windows Search: `npm run install:windows` (names: Usageboard for Cursor, Usageboard, Cursor Usageboard)
- Window: compact 320×348, expanded 400×780
- Store display name: **Usageboard for Cursor** (Microsoft Store identity stays Usageboard). Not affiliated with Cursor.



## Status

- This PC (2026-08-23): Windows Search は `Usageboard for Cursor` / `Usageboard` / `Cursor Usageboard`。常駐 API `http://127.0.0.1:8787/api/health` = ok。
- 起動ショートカットは `electron.exe` + アプリフォルダ（`electron.exe` 単体も `wscript.exe` も使わない。Search の「使用できません」対策）。AppUserModelId = `jp.ymd.usageboard`。
- 使用量の正本は Cursor 公式 Dashboard API（`/api/usage-summary` + `get-current-period-usage`）。CCUsage 相当の公式 CLI は無し。コミュニティ `cursor-usage` と同じ非公式 API。
- このアカウント: `pro_plus` / Pro+（$60/月）。Cursor Models ％と Other Models ％が公式の主表示。Included $ は会計（Pro+ の Other Models 下限 $70）。
- 起動: スタート検索で **Usageboard for Cursor**（`Usageboard` でも可）。再登録は `npm run install:resident`。
- Public GitHub MIT: https://github.com/YMD-yamada/cursor-usage-monitor
- Releases v1.2.1 (setup/appx): https://github.com/YMD-yamada/cursor-usage-monitor/releases/latest
- Portfolio: https://ymd-portfolio-site.pages.dev/
- Store hub: https://personal-site-taupe-gamma.vercel.app/apps/usageboard/
- Microsoft Store 本体の提出は Partner Center（人間必須）。APPX は Release にあり。

- Store name **Usageboard for Cursor** 1.2.1. Persona: daily Windows Cursor user. Store ¥980. No Cursor affiliate.

- **Aligned with official 2026 dashboard**: primary display is two pools — **Cursor Models** (`autoPercentUsed`) and **Other Models** (`apiPercentUsed`). Included $ / bonus are secondary accounting only (official Usage no longer leads with a single combined % or $ for self-serve).

- Sources: `GET /api/usage-summary` + `POST /api/dashboard/get-current-period-usage`

- Docs: https://cursor.com/docs/models-and-pricing · https://cursor.com/help/models-and-usage/usage-limits

- Usage SVG area charts (compact + expanded)

- Debug probe scripts removed from tree (2026-07-30)


