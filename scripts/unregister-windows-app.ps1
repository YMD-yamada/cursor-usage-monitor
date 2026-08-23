#Requires -Version 5.1
param(
  [string]$RepoRoot = ""
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }

$programs = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$startup = Join-Path $programs "Startup"
$names = @(
  "Usageboard for Cursor",
  "Usageboard",
  "UsageBoard",
  "Cursor Usageboard",
  "CursorUsageMonitor",
  "Cursor Usage Monitor"
)
foreach ($n in $names) {
  $p = Join-Path $programs ($n + ".lnk")
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }
}
foreach ($n in @("Usageboard.lnk", "Usageboard for Cursor.lnk", "CursorUsageMonitor.vbs")) {
  $p = Join-Path $startup $n
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }
}

$desk = [Environment]::GetFolderPath("Desktop")
foreach ($n in @("Usageboard.lnk", "UsageBoard.lnk", "Usageboard for Cursor.lnk")) {
  $p = Join-Path $desk $n
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }
}

foreach ($vbs in @(
    (Join-Path $programs "Cursor Usage Monitor.vbs"),
    (Join-Path $startup "CursorUsageMonitor.vbs")
  )) {
  if (Test-Path -LiteralPath $vbs) { Remove-Item -LiteralPath $vbs -Force }
}

foreach ($key in @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\Usageboard.exe",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Usageboard"
  )) {
  if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key -Recurse -Force }
}

$installDir = Join-Path $env:LOCALAPPDATA "Programs\Usageboard"
if (Test-Path -LiteralPath $installDir) {
  Remove-Item -LiteralPath $installDir -Recurse -Force
}

Write-Host "Unregistered Usageboard for Cursor from Start Menu / Search."
