# Security

## Threat model

This app runs **on your PC** and reads your local Cursor login session to call Cursor dashboard APIs as you. It is intended for personal use on a trusted machine.

## Guarantees

- HTTP API binds to `127.0.0.1` only (not LAN / public internet)
- Requests whose `Host` is not `127.0.0.1` / `localhost` are rejected
- CORS allowlist is limited to local Vite / app origins
- Access tokens are never written to disk by this app and are not returned by the HTTP API
- Email / user id are redacted from API JSON responses
- Usage / account errors do not echo Cursor API bodies
- `/api/tasks` returns counts only (no chat titles, workspace paths, or shell commands)
- `/api/metrics` returns aggregates only (no process path / PID lists)
- Renderer cannot open arbitrary URLs (allowlisted Cursor / GitHub / legal hub only)
- No third-party telemetry, ads, or remote logging
- Optional GitHub Sponsors link is outbound-only; the app stays free

## Not in scope

- Malware already running as your user can still read Cursor’s local DB (same as any local tool)
- Cursor’s own dashboard APIs and terms still apply
- Do not expose the local port via reverse proxy, Tailscale funnel, or port forwarding

## Reporting

Open a GitHub Issue if you find a vulnerability. Do not paste live session tokens or cookies.
