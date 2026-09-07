# CURSOR_HANDOFF

## Active claim (multi-session)
- Session focus: (none)
- Last touch: 2026-09-07 21:36
- Do not duplicate:

## Progress (source of truth)
- Done:
  - 1画面 UI（タブ/大小サイズ廃止、リセット期限、重複整理）
  - 常駐ウィジェット起動（Electron Usageboard for Cursor）
  - GitHub **v1.3.0** https://github.com/YMD-yamada/cursor-usage-monitor/releases/tag/v1.3.0
  - 法務ハブ / ポートフォリオの紹介文を 1.3.0 向けに更新
- In progress: (none)
- Next:
  1. [人間] Microsoft Partner Center に APPX を出すと Store 検索に出る（任意）

## Monetization
- 稼働中（Microsoft Store 予定 ¥980 / 現行は GitHub Release）。Cursor 非公式・非提携

## 確認チェック (2026-09-07 21:36)
- [x] Security/legal OK（ローカル 127.0.0.1、秘密なし。Store 提出はしていない）
- [x] No secrets in git/chat
- [x] PC/NAS load OK（pack 完了。Dockerなし）
- [x] なくす行為なし
- [x] GitHub v1.3.0 公開。ウィジェット起動中

## Project



`cursor-usage-monitor` — resident Electron widget for Cursor Usage + billing education + ops policy deep-links (MIT / public).



## Ops policy (product default)



Default UX nudges: **no on-demand**, stretch base plan via Cursor Models, plan change when needed.



- Prefs keys: `cursor-usage-monitor.opsPrefs.v1`（運用方針） / `cursor-usage-monitor.viewPrefs.v1`（画面に出す項目）

- 詳細の運用パネルはヘッダーメニュー「くわしく」→ 運用・設定（`OpsPanel` + `src/lib/cursorLinks.ts`）



## Privacy



- Local Cursor `state.vscdb` session only

- `127.0.0.1` API; email/userId redacted in HTTP responses

- See `SECURITY.md`



## Commands



- `npm start` / `npm run build` / `npm run install:resident` / `npm run smoke`
- Windows Search: `npm run install:windows` (names: Usageboard for Cursor, Usageboard, Cursor Usageboard)
- Window: 400×680（1サイズ。表示項目はヘッダーメニューで選択）
- Store display name: **Usageboard for Cursor** (Microsoft Store identity stays Usageboard). Not affiliated with Cursor.



## Future (operator — not in app yet)

- **2026-08-27**: Pro+ 一本に頼らず、他メーカー製 AI ツールを複数併用する運用も検討中（Claude Code 等）。Usageboard への機能化は未定。記録: `90_Ops/ai-memory/DECISIONS.jsonl`（tags: decision, ops, consult）。

## Status

- 2026-09-07: **UI v3** — タブなし・サイズ1つ（400×680）。使用量にリセット日と使い切り目安。≡で項目切替。枠の図／一覧の重複なし。
- 2026-09-03: **UI v2** — コンパクト＝使用量リング+メモリ/CPU+セッション数のみ。詳細＝4ページ（使用量/PC/セッション/くわしく）で大きく表示。説明は図解+折りたたみ。`/api/tasks` に redacted sessions 追加。 — コンパクト＝リング+アラート+グラフ+CPU/RAM。詳細＝タブ4つ（概要/モデル/運用/課金）+ グラフのみ。重複ヘッドライン・7タブ・プール二重表示を削除。（RAM と同型。システム % · Cursor プロセス合計 %）。ウィンドウ高 376px。
- 2026-08-26: **ショートカット修復** — work-ops-hub `Install-AppShortcuts.ps1` の `$Args` 名前衝突で Arguments が空→PowerShell だけ開く不具合を修正。
- 2026-08-26: **モデル選びアドバイス** — `server/modelAdvice.mjs` + ガイドタブ「モデル」「使い方」。使用量から CM/OM 偏重を判定し、Auto vs Claude 指名・Claude Code との差・具体手順を日本語で表示。「いま」タブにも要約。
- 2026-08-26: 「運用」タブで真っ白 → `OpsPanel` 未 import で React クラッシュ。import 修正 + ErrorBoundary + `npm run typecheck` を build/smoke に追加。
- 2026-08-26: ウィジェット非表示は Electron 落ち＋API 残留と、透明ウィンドウの ready-to-show 漏れ。ensureVisible で画面内・最前面に出す。Startup の古い VBS は削除済み。
- This PC (2026-08-23): Windows Search は `Usageboard for Cursor` / `Usageboard` / `Cursor Usageboard`。常駐 API `http://127.0.0.1:8787/api/health` = ok。
- 起動ショートカットは `electron.exe` + アプリフォルダ（`electron.exe` 単体も `wscript.exe` も使わない。Search の「使用できません」対策）。AppUserModelId = `jp.ymd.usageboard`。
- 使用量の正本は Cursor 公式 Dashboard API（`/api/usage-summary` + `get-current-period-usage`）。CCUsage 相当の公式 CLI は無し。コミュニティ `cursor-usage` と同じ非公式 API。
- このアカウント: `pro_plus` / Pro+（$60/月）。Cursor Models ％と Other Models ％が公式の主表示。Included $ は会計（Pro+ の Other Models 下限 $70）。
- 起動: スタート検索で **Usageboard for Cursor**（`Usageboard` でも可）。再登録は `npm run install:resident`。
- Public GitHub MIT: https://github.com/YMD-yamada/cursor-usage-monitor
- Releases v1.3.0 (setup/appx): https://github.com/YMD-yamada/cursor-usage-monitor/releases/latest
- Portfolio: https://ymd-portfolio-site.pages.dev/
- Store hub: https://personal-site-taupe-gamma.vercel.app/apps/usageboard/
- Microsoft Store 本体の提出は Partner Center（人間必須）。APPX は Release にあり。

- Store name **Usageboard for Cursor** 1.3.0. Persona: daily Windows Cursor user. Store ¥980. No Cursor affiliate.

- **Aligned with official 2026 dashboard**: primary display is two pools — **Cursor Models** (`autoPercentUsed`) and **Other Models** (`apiPercentUsed`). Included $ / bonus are secondary accounting only (official Usage no longer leads with a single combined % or $ for self-serve).

- Sources: `GET /api/usage-summary` + `POST /api/dashboard/get-current-period-usage`

- Docs: https://cursor.com/docs/models-and-pricing · https://cursor.com/help/models-and-usage/usage-limits

- Usage SVG area charts (compact + expanded)

- Debug probe scripts removed from tree (2026-07-30)


