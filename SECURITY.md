# Security

## Threat model

This app runs **on your PC** and reads your local Cursor login session to call Cursor dashboard APIs as you. It is intended for personal use on a trusted machine.

## Guarantees

- HTTP API binds to `127.0.0.1` only (not LAN / public internet)
- CORS allowlist is limited to local Vite / app origins
- Access tokens are never written to disk by this app and are not returned by the HTTP API
- Email / user id are redacted from API JSON responses
- No third-party telemetry or remote logging

## Not in scope

- Malware already running as your user can still read Cursor’s local DB (same as any local tool)
- Cursor’s own dashboard APIs and terms still apply
- Do not expose the local port via reverse proxy, Tailscale funnel, or port forwarding

## Reporting

Open a GitHub Issue if you find a vulnerability. Do not paste live session tokens or cookies.
