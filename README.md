# Usageboard

Resident desktop widget for **Cursor** users (Windows / Electron). Store name: **Usageboard**.

- Visualize Usage as two official pools (Cursor Models / Other Models)
- Explain billing / model pools in-app
- Save a local “no on-demand / stretch plan / change plan when needed” ops preference and deep-link to Cursor Dashboard
- Show Cursor process CPU / memory
- 14-day Usage area charts (compact + expanded)

## Install

Windows 向けの無料インストーラー:

https://github.com/YMD-yamada/cursor-usage-monitor/releases/latest

- `Usageboard-*-win-x64-setup.exe`（推奨）
- portable exe はインストールなし
- Microsoft Store は審査提出待ち（無料・アプリ内課金なし）

> Not an official Cursor product. Reads your **local** Cursor session and calls Cursor dashboard APIs as you.

## Requirements

- Windows 10/11
- [Cursor](https://cursor.com/) installed and signed in
- Node.js 20+ (source run). The Store / packaged build does not need a separate Node install.

## Setup (from source)

```bash
git clone https://github.com/YMD-yamada/cursor-usage-monitor.git
cd cursor-usage-monitor
npm install
npm run build
npm start
```

Autostart on login:

```bash
npm run install:resident
```

Remove autostart:

```bash
npm run uninstall:resident
```

## What it can / cannot do

| Can | Cannot (opens official pages) |
|-----|--------------------------------|
| Monitor Usage, bonus, on-demand status | Toggle on-demand via API |
| Save ops prefs locally | Change your paid plan via API |
| One-click Spending / Billing / Pricing | Read another user’s Usage |

Disable on-demand: [Spending](https://cursor.com/dashboard/spending) → Monthly Limit → **Disabled**  
Change plan: [Billing](https://cursor.com/dashboard/billing)  
Pricing: [Pricing](https://cursor.com/pricing)

## Privacy & security

- Auth: local Cursor `state.vscdb` session only
- Network: `cursor.com` dashboard APIs only; API server listens on `127.0.0.1`
- Prefs: Electron/`localStorage` on this PC
- No third-party Usage upload
- Details: [SECURITY.md](./SECURITY.md)

## Controls

- **▾** … details (usage / ops / billing guide)
- **–** … minimize to taskbar
- **×** … hide to tray (keeps running)
- Tray → Quit

## Development

```bash
npm run desktop:dev
```

```bash
npm run smoke
```

Microsoft Store packaging: [docs/STORE_LISTING.md](./docs/STORE_LISTING.md) · [docs/RELEASE_FLOW.md](./docs/RELEASE_FLOW.md)

## License

MIT — see [LICENSE](./LICENSE)
