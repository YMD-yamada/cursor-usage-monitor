# Cursor Usage Monitor

Resident desktop widget for **Cursor** users (Windows / Electron).

- Visualize Usage (plan quota, bonus, on-demand, Auto vs named models)
- Explain billing / model pools in-app
- Save a local “no on-demand / stretch plan / change plan when needed” ops preference and deep-link to Cursor Dashboard
- Show Cursor process CPU / memory and a light multi-agent overview
- 14-day Usage area charts (compact + expanded)

> Not an official Cursor product. Reads your **local** Cursor session and calls Cursor dashboard APIs as you.

## Requirements

- Windows 10/11
- [Cursor](https://cursor.com/) installed and signed in
- Node.js 20+

## Setup

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

## License

MIT — see [LICENSE](./LICENSE)
