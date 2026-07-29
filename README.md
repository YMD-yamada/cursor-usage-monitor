# Cursor Usage Monitor

Cursor 利用者向けの **常駐デスクトップウィジェット**（Windows / Electron）。

- Usage（プラン枠・ボーナス・従量・2プール）を可視化
- 課金の仕組み・モデル状態の解説
- **従量なし / 基本プラン使い倒し / 必要ならプラン変更** の運用方針を端末に保存し、公式 Dashboard へ案内
- Cursor プロセスの CPU / メモリ、複数 Agent の概況

> Cursor 公式アプリではありません。個人の Cursor セッション（ローカル）を読んで Usage API を呼びます。第三者利用・公開を想定した設計です。

## 必要環境

- Windows 10/11
- インストール済みの [Cursor](https://cursor.com/)（ログイン済み）
- Node.js 20+

## セットアップ

```bash
git clone <このリポジトリ>
cd cursor-usage-monitor
npm install
npm run build
npm start
```

常駐（ログイン時起動）:

```bash
npm run install:resident
```

解除:

```bash
npm run uninstall:resident
```

## できること / できないこと

| できる | できない（公式ページへ誘導） |
|--------|------------------------------|
| Usage・ボーナス・従量ON/OFF状態の監視 | 従量のON/OFFをAPIで直接変更 |
| 運用方針の保存（従量なし・プラン変更検討など） | プランの課金変更をAPIで実行 |
| Spending / Billing / Pricing をワンクリックで開く | Cursor 以外のアカウントの Usage |

従量の無効化: [Spending](https://cursor.com/dashboard/spending) → Monthly Limit → **Disabled**  
プラン変更: [Billing](https://cursor.com/dashboard/billing) → Adjust plan  
料金表: [Pricing](https://cursor.com/pricing)

## プライバシー

- 認証は `%APPDATA%\Cursor\User\globalStorage\state.vscdb` のローカルセッションを使用
- Usage 取得は `cursor.com` のダッシュボード API へのリクエストのみ
- 運用方針はブラウザ/Electron の `localStorage` に保存（このPCのみ）
- 第三者サーバーへの Usage 送信はしません

## 操作

- **▾** … 詳細（いま / 運用 / 課金 / プール / プラン）
- **×** … トレイに隠す（終了しない）
- トレイ右クリック → 終了

## 開発

```bash
npm run desktop:dev
```

## ライセンス

MIT（`LICENSE`）
