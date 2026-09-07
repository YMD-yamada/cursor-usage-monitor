# Release flow — Usageboard for Cursor (cursor-usage-monitor)

Store display name: **Usageboard for Cursor**. Not affiliated with Cursor.

## This PC (Surface)

```powershell
cd $HOME\Projects\cursor-usage-monitor
npm run install:resident
```

Windows Search names: `Usageboard for Cursor`, `Usageboard`, `Cursor Usageboard`, `Cursor Usage Monitor`.
Shortcuts launch `electron.exe` with the app folder (never bare `electron.exe`, never `wscript.exe`).

## Third-party publish

| Channel | Status | URL |
|---|---|---|
| GitHub source | Public MIT | https://github.com/YMD-yamada/cursor-usage-monitor |
| GitHub Releases | v1.3.0 installers | https://github.com/YMD-yamada/cursor-usage-monitor/releases/latest |
| Portfolio | Listed | https://ymd-portfolio-site.pages.dev/ |
| Store legal hub | Listed (development until Partner Center) | https://personal-site-taupe-gamma.vercel.app/apps/usageboard/ |
| Microsoft Store | Human submit | Partner Center package is `Usageboard-*-win-*.appx` |

## Pack

```powershell
npm run pack:win
```

Upload `release/Usageboard-for-Cursor-*-setup.exe` and `.appx` with `gh release`.

## Human-only

1. Microsoft Partner Center: create/submit the APPX (identity `KentoYamada.Usageboard`). After submit, the listing goes live in Store Search.
2. Any paid Store price / tax / identity forms.

Do not ask the operator to run npm. Agent packs, lists, and installs locally.
