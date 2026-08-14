# Microsoft Store listing — Usageboard

Reserved / display name: **Usageboard**  
Fallback if taken: **Usageboard by ymd**

Not an official Cursor product. Do not claim Cursor affiliation or dashboard replacement.

## Japanese (primary)

**短い説明**  
Cursor の Usage（Cursor Models / Other Models）を、この PC の常駐ウィジェットで見ます。

**長い説明**  
Usageboard は、Windows 向けの非公式ウィジェットです。Cursor にサインインした自分のアカウントの Usage を、公式と同じ2つのプール（Cursor Models と Other Models）で常駐表示します。従量課金の ON/OFF と、公式ダッシュボードへの案内も出します。

このアプリは Cursor 公式製品ではありません。他の人の Usage は見えません。オンデマンド課金の切替やプラン変更は、公式の Spending / Billing ページで行います。データはインターネット上の自社サーバーへ送りません。Cursor のダッシュボード API だけを、この PC のログインセッションで呼び出します。広告・アカウント登録・解析ツールはありません。

**キーワード**  
Cursor, Usage, 使用量, 課金, ウィジェット, 開発者ツール

## English

**Short description**  
See your Cursor Usage pools on a small always-on Windows widget.

**Full description**  
Usageboard is an unofficial Windows widget. It shows your own Cursor Usage as two pools — Cursor Models and Other Models — matching the official dashboard. It also shows on-demand status and opens official Spending / Billing pages.

Not affiliated with Cursor or Anysphere. It cannot see another person’s Usage, and it cannot change your plan or on-demand setting by itself. No ads, no account of our own, no analytics. It reads the local Cursor session and calls Cursor dashboard APIs as you.

**Keywords**  
Cursor, usage, quota, billing, widget, developer tools

## Age / properties

- Age: 3+ / Everyone
- Category: Developer tools (or Productivity)
- Privacy URL: https://personal-site-taupe-gamma.vercel.app/apps/usageboard/
- Support URL: https://personal-site-taupe-gamma.vercel.app/support/
- Website: https://github.com/YMD-yamada/cursor-usage-monitor
- Screenshots: `store/screenshot-1366x768.png`
- Icon: `build/icon.png`

## Submission

1. Partner Center で **Usageboard** を予約（Timeboard と同じ個人開発者アカウント。入口は [storedeveloper.microsoft.com](https://storedeveloper.microsoft.com)）
2. Product identity を `electron-builder.yml` の `appx` に反映して `npm run pack:store`
3. Partner Center の **Packages** に arm64 / x64 の `.appx` をアップロード
4. 下記「入力早見表」どおりに listings / age / properties を埋めて提出
5. 公開 URL が付いたら `storeUrls.windows` を personal-site に追記

## Partner Center 入力早見表

### Packages

- `Usageboard-1.1.0-win-arm64.appx`（Arm64、優先 1）
- `Usageboard-1.1.0-win-x64.appx`（X64、優先 2）
- デバイスは **Windows.Desktop だけ**
- `runFullTrust` の黄色警告はそのまま残してよい（Electron デスクトップ常駐に必要）

### Pricing and availability

- 価格: **無料**（アプリ内課金なし。任意の GitHub Sponsors のみ）
- 国と地域: **すべての国**（少なくとも 日本 + 米国）
- 公開: **認定が終わり次第公開**
- 試用版: **なし**

### Properties

- カテゴリ: **Developer tools**（第2があれば Productivity）
- プライバシー ポリシー URL: `https://personal-site-taupe-gamma.vercel.app/apps/usageboard/`
- サポート URL: `https://personal-site-taupe-gamma.vercel.app/support/`
- Web サイト: `https://github.com/YMD-yamada/cursor-usage-monitor`
- アクセシビリティ対応: **いいえ**
- ハードウェア / Xbox / ゲーム機能: **すべていいえ**

### Age ratings

ほぼすべて **いいえ**。

- 暴力・ホラー・性的表現・裸体・薬物・ギャンブル: いいえ
- チャット / UGC: いいえ
- 位置情報を他人と共有: いいえ
- アプリ内課金: いいえ
- 広告: いいえ
- 不特定の Web をアプリ内で開く: いいえ（公式ダッシュボードは外部ブラウザ）

### Store listings

言語は **日本語（ja-JP）を主**、英語（en-US）も追加。上の短い説明 / 長い説明 / キーワードを貼る。

画面: `store/screenshot-1366x768.png`（1366×768）  
「Cursor 公式」「公式ダッシュボードの代替」は書かない。

### Submission options

`runFullTrust` の理由:

```
Usageboard is an Electron desktop widget. It needs runFullTrust to stay resident, read the local Cursor session, and show Usage on this PC. It does not upload Usage to our servers.
```

認定担当者へのメモ:

```
Unofficial widget. Requires Cursor installed and signed in. Open the widget to see Cursor Models / Other Models percents. Not affiliated with Cursor. Data stays on this PC except Cursor dashboard API calls as the signed-in user.
```

全部 Save したあと、概要に戻って **Submit for certification / 認定のために提出**。
