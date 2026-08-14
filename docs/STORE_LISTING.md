# Microsoft Store listing — Usageboard

Reserved / display name: **Usageboard**  
Subtitle / short name: **for Cursor**  
Fallback if taken: **Usageboard by ymd**

Not an official Cursor product. Do not claim Cursor affiliation, partnership, or dashboard replacement.

## Persona

毎日 Windows の Cursor でコードを書く人。自分の Cursor Models / Other Models を常時見たい。従量の不意打ちを避けたい。

## Japanese (primary)

**短い説明**  
Cursor ユーザー専用。自分の Usage 2プールを常駐表示します。

**長い説明**  
Usageboard は、Cursor を毎日使う人向けの非公式 Windows ウィジェットです。公式ダッシュボードと同じ2つのプール（Cursor Models と Other Models）を、エディタの横に常時出します。従量が ON かどうか、更新までの日数、Spending / Billing への案内も出します。

Cursor 公式製品ではありません。提携・アフィリエイトもありません（Cursor の紹介プログラムは公式に終了）。他の人の Usage は見えません。従量の切替やプラン変更は公式ページで行います。データは自社サーバーへ送りません。この PC の Cursor ログインで、cursor.com のダッシュボード API だけを呼びます。広告・解析ツール・アプリ内課金はありません。買い切りです。

ソースは GitHub で公開（MIT）。Store 版はインストールしやすい買い切りパッケージです。

**キーワード**  
Cursor, Usage, Cursor Models, 従量, ウィジェット, 開発者

## English

**Short description**  
For Cursor users: your two Usage pools, always on.

**Full description**  
Usageboard is an unofficial Windows widget for people who live in Cursor. It shows your own Cursor Models and Other Models pools the same way the official dashboard does, plus on-demand status and one-tap Spending / Billing.

Not affiliated with Cursor or Anysphere. Cursor has no public affiliate program; this app does not add referral tracking. It cannot see another person’s Usage. No ads, no analytics, no in-app purchases. One-time purchase. Source is MIT on GitHub.

**Keywords**  
Cursor, usage, Cursor Models, on-demand, widget, developer

## Age / properties

- Age: 3+ / Everyone
- Category: Developer tools
- Price: **¥980 / $6.99** 買い切り（IAP なし）
- Privacy URL: https://personal-site-taupe-gamma.vercel.app/apps/usageboard/
- Support URL: https://personal-site-taupe-gamma.vercel.app/support/
- Website: https://github.com/YMD-yamada/cursor-usage-monitor
- Screenshots: `store/screenshot-1366x768.png`
- Icon: `build/icon.png`

## Submission

1. Partner Center で **Usageboard** を予約
2. `npm run pack:store`（成果物は 1.2.0 の appx）
3. Packages に arm64 / x64 の `.appx` をアップロード
4. 価格を ¥980（または $6.99）にして提出
5. 公開 URL が付いたら `storeUrls.windows` を personal-site に追記

## Partner Center 入力早見表

### Packages

- `Usageboard-1.2.0-win-arm64.appx`
- `Usageboard-1.2.0-win-x64.appx`
- デバイスは **Windows.Desktop だけ**
- `runFullTrust` の黄色警告はそのまま残してよい

### Pricing and availability

- 価格: **¥980**（USD $6.99）買い切り
- 試用版: **なし**（GitHub ソースが無料の試用になる）
- 国と地域: **すべての国**
- 公開: **認定が終わり次第公開**

### Properties

- カテゴリ: **Developer tools**
- プライバシー / サポート / Web は上の URL
- アクセシビリティ対応: **いいえ**
- ハードウェア / Xbox / ゲーム: **すべていいえ**

### Age ratings

ほぼすべて **いいえ**。アプリ内課金・広告も **いいえ**（アプリ価格は買い切り）。

### Store listings

日本語を主、英語も追加。上の短い説明 / 長い説明 / キーワードを貼る。  
「Cursor 公式」「提携」「紹介で稼げる」は書かない。

### Submission options

```
Usageboard is an Electron widget for Cursor users. It needs runFullTrust to stay resident, read the local Cursor session, and show Usage on this PC. It does not upload Usage to our servers.
```

認定担当者へのメモ:

```
Unofficial. Requires Cursor installed and signed in. Shows Cursor Models / Other Models percents. Not affiliated with Cursor. Paid app, no IAP. GitHub source is MIT.
```
