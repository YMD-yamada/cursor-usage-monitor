# RELEASE_FLOW — Usageboard (`cursor-usage-monitor`)

Windows 向け Cursor Usage 常駐ウィジェット。**Cursor 公式製品ではない。**

## ローカル（自分用）

```
npm install
npm run smoke
npm start
```

ログイン時に自動起動: `npm run install:resident`  
解除: `npm run uninstall:resident`

開発: `npm run desktop:dev`

## 配布パッケージ

```
npm run icons
npm run pack:win
```

Microsoft Store 用 APPX のみ:

```
npm run pack:store
```

成果物は `release/`。

## GitHub

公開リポ: https://github.com/YMD-yamada/cursor-usage-monitor

## Microsoft Store

手順と掲載文: [STORE_LISTING.md](STORE_LISTING.md)  
Identity: `store-identity.json`（Timeboard と同じ発行者）

人間必須: Partner Center でアプリ名予約・本人ログイン・提出。認定後の Store URL をエージェントが personal-site に追記する。

## 掲載

エージェントが `personal-site` の `tools/publish-app-listing.mjs --store` で法務ハブ＋ポートフォリオへ登録する。

- 法務: https://personal-site-taupe-gamma.vercel.app/apps/usageboard/
- サポート: https://personal-site-taupe-gamma.vercel.app/support/
- GitHub: https://github.com/YMD-yamada/cursor-usage-monitor

## 法務・表現

- NG: 「Cursor 公式」「公式ダッシュボードの代替」「他ユーザーの Usage を見る」
- OK: 「非公式のローカルウィジェット」「自分の Cursor セッションで Usage を可視化」
- プライバシー: ローカル `state.vscdb` のみ。API は `127.0.0.1`。自社サーバーへの Usage 送信なし。詳細は [SECURITY.md](../SECURITY.md)
