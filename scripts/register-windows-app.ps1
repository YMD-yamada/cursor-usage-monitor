#Requires -Version 5.1
# Register "Usageboard for Cursor" for Windows Search / Start Menu.
# Shortcuts must target electron.exe WITH the app folder. Bare electron.exe
# opens the official Electron page; wscript/.cmd App Paths often show as 使用できません.
param(
  [string]$RepoRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent $PSScriptRoot
}

$displayName = "Usageboard for Cursor"
$appId = "jp.ymd.usageboard"
$names = @(
  "Usageboard for Cursor",
  "Usageboard",
  "Cursor Usageboard",
  "Cursor Usage Monitor"
)
$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "node.exe not found" }

$launchJs = Join-Path $RepoRoot "scripts\launch-resident.mjs"
if (-not (Test-Path -LiteralPath $launchJs)) { throw "missing $launchJs" }

$electron = Join-Path $RepoRoot "node_modules\electron\dist\electron.exe"
if (-not (Test-Path -LiteralPath $electron)) { throw "missing electron.exe (run npm install)" }

$png = Join-Path $RepoRoot "build\icon.png"
$ico = Join-Path $RepoRoot "build\icon.ico"
if ((Test-Path -LiteralPath $png) -and -not (Test-Path -LiteralPath $ico)) {
  & node (Join-Path $RepoRoot "scripts\write-ico.mjs")
}

$installDir = Join-Path $env:LOCALAPPDATA "Programs\Usageboard"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$cmdPath = Join-Path $installDir "Usageboard.cmd"
@(
  "@echo off",
  "cd /d `"$RepoRoot`"",
  "`"$electron`" `"$RepoRoot`""
) | Set-Content -LiteralPath $cmdPath -Encoding ASCII

$programs = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$startup = Join-Path $programs "Startup"
New-Item -ItemType Directory -Force -Path $programs, $startup | Out-Null

$iconLocation = if (Test-Path -LiteralPath $ico) { "$ico,0" } else { "$electron,0" }

$script:aumidReady = $false
if (-not ("LnkAppId" -as [type])) {
  try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

[ComImport, Guid("00021401-0000-0000-C000-000000000046")]
public class CShellLink {}

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("0000010b-0000-0000-C000-000000000046")]
public interface IPersistFile {
  void GetClassID(out Guid pClassID);
  [PreserveSig] int IsDirty();
  void Load([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, uint dwMode);
  void Save([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, [MarshalAs(UnmanagedType.Bool)] bool fRemember);
  void SaveCompleted([MarshalAs(UnmanagedType.LPWStr)] string pszFileName);
  void GetCurFile([MarshalAs(UnmanagedType.LPWStr)] out string ppszFileName);
}

[StructLayout(LayoutKind.Sequential, Pack = 4)]
public struct PROPERTYKEY {
  public Guid fmtid;
  public uint pid;
}

[StructLayout(LayoutKind.Explicit)]
public struct PROPVARIANT {
  [FieldOffset(0)] public ushort vt;
  [FieldOffset(8)] public IntPtr pointerValue;
}

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99")]
public interface IPropertyStore {
  uint GetCount(out uint cProps);
  uint GetAt(uint iProp, out PROPERTYKEY pkey);
  uint GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
  uint SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
  uint Commit();
}

public static class LnkAppId {
  public static void Set(string path, string appId) {
    var sl = new CShellLink();
    var pf = (IPersistFile)sl;
    pf.Load(path, 2);
    var ps = (IPropertyStore)sl;
    var pk = new PROPERTYKEY {
      fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"),
      pid = 5
    };
    var pv = new PROPVARIANT { vt = 31, pointerValue = Marshal.StringToCoTaskMemUni(appId) };
    ps.SetValue(ref pk, ref pv);
    ps.Commit();
    pf.Save(path, true);
    Marshal.FreeCoTaskMem(pv.pointerValue);
  }
}
"@
    $script:aumidReady = $true
  } catch {
    Write-Warning "AUMID helper unavailable: $_"
  }
} else {
  $script:aumidReady = $true
}

$wsh = New-Object -ComObject WScript.Shell
function New-AppLnk([string]$Path, [string]$Description) {
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  $lnk = $wsh.CreateShortcut($Path)
  $lnk.TargetPath = $electron
  $lnk.Arguments = "`"$RepoRoot`""
  $lnk.WorkingDirectory = $RepoRoot
  $lnk.WindowStyle = 1
  $lnk.Description = $Description
  $lnk.IconLocation = $iconLocation
  $lnk.Save()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($lnk) | Out-Null
  if ($script:aumidReady) {
    try { [LnkAppId]::Set($Path, $appId) } catch { Write-Warning "AUMID not set on $Path : $_" }
  }
}

# Drop launchers that Windows Search cannot run.
$stale = @(
  (Join-Path $programs "UsageBoard.lnk"),
  (Join-Path $programs "CursorUsageMonitor.lnk"),
  (Join-Path $programs "Cursor Usage Monitor.vbs"),
  (Join-Path $startup "CursorUsageMonitor.vbs"),
  (Join-Path $startup "Usageboard.lnk"),
  (Join-Path $installDir "Usageboard.vbs")
)
foreach ($n in $names) { $stale += Join-Path $programs ($n + ".lnk") }
foreach ($s in $stale) {
  if (Test-Path -LiteralPath $s) { Remove-Item -LiteralPath $s -Force }
}

foreach ($n in $names) {
  New-AppLnk (Join-Path $programs ($n + ".lnk")) "Unofficial Cursor usage widget"
}
New-AppLnk (Join-Path $startup ($displayName + ".lnk")) "$displayName autostart"
New-AppLnk (Join-Path $installDir ($displayName + ".lnk")) $displayName

$desk = [Environment]::GetFolderPath("Desktop")
foreach ($n in @("Usageboard.lnk", "UsageBoard.lnk")) {
  $p = Join-Path $desk $n
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }
}
New-AppLnk (Join-Path $desk ($displayName + ".lnk")) $displayName

# Do not register App Paths Usageboard.exe → .cmd. Search treats that as an unusable app.
$appPaths = "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\Usageboard.exe"
if (Test-Path -LiteralPath $appPaths) { Remove-Item -LiteralPath $appPaths -Recurse -Force }

$uninst = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Usageboard"
New-Item -Path $uninst -Force | Out-Null
Set-ItemProperty -Path $uninst -Name "DisplayName" -Value $displayName
Set-ItemProperty -Path $uninst -Name "DisplayIcon" -Value $(if (Test-Path $ico) { $ico } else { $electron })
Set-ItemProperty -Path $uninst -Name "InstallLocation" -Value $installDir
Set-ItemProperty -Path $uninst -Name "Publisher" -Value "ymd"
$pkgJson = Join-Path $RepoRoot "package.json"
$displayVersion = "1.3.0"
if (Test-Path -LiteralPath $pkgJson) {
  $displayVersion = (Get-Content -LiteralPath $pkgJson -Raw | ConvertFrom-Json).version
}
Set-ItemProperty -Path $uninst -Name "DisplayVersion" -Value $displayVersion
$unreg = Join-Path $RepoRoot "scripts\unregister-windows-app.ps1"
Set-ItemProperty -Path $uninst -Name "UninstallString" -Value ("powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$unreg`"")
Set-ItemProperty -Path $uninst -Name "NoModify" -Value 1 -Type DWord
Set-ItemProperty -Path $uninst -Name "NoRepair" -Value 1 -Type DWord

Write-Host "Registered Start Menu / Search names: $($names -join ', ')"
Write-Host "Launch via: $electron `"$RepoRoot`""
Write-Host "Install dir: $installDir"
