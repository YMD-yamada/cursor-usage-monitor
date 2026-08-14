# Usageboard for Cursor

毎日 **Cursor** を使う人向けの、非公式 Windows 常駐ウィジェット。公式と同じ2プール（Cursor Models / Other Models）を横に置きます。

対象: Windows で Cursor にサインインしている個人開発者。従量の不意打ちを避け、ダッシュボード往復を減らしたい人。  
非対象: Cursor を使っていない人。公式の代替が欲しい人。

> Not an official Cursor product. Not affiliated with Cursor / Anysphere. Reads your **local** Cursor session and calls Cursor dashboard APIs as you.

## Install

| 経路 | 価格 |
|------|------|
| [Microsoft Store](https://personal-site-taupe-gamma.vercel.app/apps/usageboard/)（審査後） | 買い切り ¥980 / $6.99 |
| [GitHub Release](https://github.com/YMD-yamada/cursor-usage-monitor/releases/latest) | コミュニティビルド |
| ソースから `npm start` | MIT・無料 |

Cursor 本体の契約は [cursor.com/pricing](https://cursor.com/pricing) のみ。年払いは公式で月額比およそ20%安いです。**Cursor の紹介・アフィリエイトは公式に終了**しています（[一次情報](https://cursor.com/help/account-and-billing/referral-program)）。このアプリに紹介トラッキングはありません。

## What it does

- 自分の Cursor Models / Other Models ％を常駐表示
- 従量 ON/OFF、更新までの日数
- Spending / Billing / Pricing への公式ディープリンク
- ローカルの「従量を使わない」運用メモ

できないこと: 従量の API 切替、プラン変更、他人の Usage。

## Requirements

- Windows 10/11
- Cursor installed and signed in

## Setup (from source)

```bash
git clone https://github.com/YMD-yamada/cursor-usage-monitor.git
cd cursor-usage-monitor
npm install
npm run build
npm start
```

Autostart: `npm run install:resident`  
Remove: `npm run uninstall:resident`

## Privacy

- Auth: local Cursor `state.vscdb` only
- Network: `cursor.com` dashboard APIs; server on `127.0.0.1`
- No third-party Usage upload — [SECURITY.md](./SECURITY.md)

## Docs

- [Persona](./docs/PERSONA.md)
- [Affiliate (none)](./docs/AFFILIATE.md)
- [Store listing](./docs/STORE_LISTING.md)
- [Release flow](./docs/RELEASE_FLOW.md)

## License

MIT — see [LICENSE](./LICENSE)
