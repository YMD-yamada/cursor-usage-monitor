# RELEASE_FLOW — Cursor Usage Monitor

Windows 向け Cursor Usage 常駐ウィジェット。公式製品ではない。ストア申請はしない（GitHub MIT）。

## ローカル（自分用）

```
npm install
npm run smoke
npm start
```

ログイン時に自動起動:

```
npm run install:resident
```

解除: `npm run uninstall:resident`

## GitHub（第三者向け）

1. `main` へ merge / push
2. 公開リポ: https://github.com/YMD-yamada/cursor-usage-monitor
3. セットアップは README（`npm install` → `npm run build` → `npm start`）

インストーラー配布や Microsoft Store は対象外。Node.js 20+ と Cursor サインインが必要。

## 掲載

エージェントが `personal-site` の `tools/publish-app-listing.mjs --portfolio-only` でポートフォリオへ登録する（ストア法務ハブには載せない）。

- GitHub: https://github.com/YMD-yamada/cursor-usage-monitor
- ポートフォリオ: https://ymd-portfolio-site.pages.dev/

## 法務・表現

- NG: 「Cursor 公式」「公式ダッシュボードの代替」「他ユーザーの Usage を見る」
- OK: 「非公式のローカルウィジェット」「自分の Cursor セッションで Usage を可視化」
- プライバシー: ローカル `state.vscdb` のみ。API は `127.0.0.1`。第三者への Usage 送信なし。詳細は [SECURITY.md](../SECURITY.md)
