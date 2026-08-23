# Generate Usageboard icon.png / Store logos / a desktop screenshot mock.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root 'build'
$store = Join-Path $root 'store'
New-Item -ItemType Directory -Force -Path $build | Out-Null
New-Item -ItemType Directory -Force -Path $store | Out-Null

function New-Graphics([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @{ Bmp = $bmp; G = $g }
}

function Save-Png($bmp, $path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$bg = [System.Drawing.Color]::FromArgb(255, 18, 24, 32)
$teal = [System.Drawing.Color]::FromArgb(255, 62, 224, 208)
$blue = [System.Drawing.Color]::FromArgb(255, 143, 212, 255)
$card = [System.Drawing.Color]::FromArgb(255, 28, 36, 46)
$ink = [System.Drawing.Color]::FromArgb(255, 242, 246, 248)
$muted = [System.Drawing.Color]::FromArgb(255, 154, 175, 187)
$track = [System.Drawing.Color]::FromArgb(255, 48, 58, 70)

$icon = New-Graphics 512 512
$icon.G.Clear([System.Drawing.Color]::Transparent)
$tile = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 96
$tileRect = New-Object System.Drawing.Rectangle 16, 16, 480, 480
$d = $radius * 2
$tile.AddArc($tileRect.X, $tileRect.Y, $d, $d, 180, 90)
$tile.AddArc($tileRect.Right - $d, $tileRect.Y, $d, $d, 270, 90)
$tile.AddArc($tileRect.Right - $d, $tileRect.Bottom - $d, $d, $d, 0, 90)
$tile.AddArc($tileRect.X, $tileRect.Bottom - $d, $d, $d, 90, 90)
$tile.CloseFigure()
$icon.G.FillPath((New-Object System.Drawing.SolidBrush $bg), $tile)
$penTeal = New-Object System.Drawing.Pen $teal, 34
$penTeal.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penTeal.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$penBlue = New-Object System.Drawing.Pen $blue, 34
$penBlue.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penBlue.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$penTrack = New-Object System.Drawing.Pen $track, 34
$icon.G.DrawArc($penTrack, 68, 96, 168, 168, 0, 360)
$icon.G.DrawArc($penTrack, 276, 96, 168, 168, 0, 360)
$icon.G.DrawArc($penTeal, 68, 96, 168, 168, 220, 250)
$icon.G.DrawArc($penBlue, 276, 96, 168, 168, 220, 90)
$barBrush = New-Object System.Drawing.SolidBrush $teal
$icon.G.FillRectangle($barBrush, 96, 352, 132, 26)
$barBrush2 = New-Object System.Drawing.SolidBrush $blue
$icon.G.FillRectangle($barBrush2, 284, 352, 64, 26)
$ub = New-Object System.Drawing.SolidBrush $ink
$ff = New-Object System.Drawing.FontFamily 'Segoe UI'
$fontMark = New-Object System.Drawing.Font $ff, 22, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Point)
$icon.G.DrawString('UB', $fontMark, $ub, 208, 400)
Save-Png $icon.Bmp (Join-Path $build 'icon.png')
$icon.G.Dispose(); $icon.Bmp.Dispose()

foreach ($size in 16, 32, 44, 48, 50, 150, 256) {
  $src = New-Object System.Drawing.Bitmap (Join-Path $build 'icon.png')
  $dst = New-Graphics $size $size
  $dst.G.Clear([System.Drawing.Color]::Transparent)
  $dst.G.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $dst.G.DrawImage($src, 0, 0, $size, $size)
  Save-Png $dst.Bmp (Join-Path $build ("icon-{0}.png" -f $size))
  $dst.G.Dispose(); $dst.Bmp.Dispose(); $src.Dispose()
}

& node (Join-Path $PSScriptRoot 'write-ico.mjs')
if ($LASTEXITCODE -ne 0) { throw "write-ico.mjs failed" }

$shot = New-Graphics 1366 768
$shot.G.Clear([System.Drawing.Color]::FromArgb(255, 12, 16, 22))
$cardBrush = New-Object System.Drawing.SolidBrush $card
$inkBrush = New-Object System.Drawing.SolidBrush $ink
$mutedBrush = New-Object System.Drawing.SolidBrush $muted
$tealBrush = New-Object System.Drawing.SolidBrush $teal
$blueBrush = New-Object System.Drawing.SolidBrush $blue
$ff = New-Object System.Drawing.FontFamily 'Segoe UI'
$fontTitle = New-Object System.Drawing.Font $ff, 32, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Point)
$fontBody = New-Object System.Drawing.Font $ff, 15, ([System.Drawing.GraphicsUnit]::Point)
$fontSmall = New-Object System.Drawing.Font $ff, 12, ([System.Drawing.GraphicsUnit]::Point)
$fontBig = New-Object System.Drawing.Font $ff, 40, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Point)

$shot.G.FillRectangle($cardBrush, 420, 90, 520, 560)
$shot.G.DrawString('Usageboard', $fontTitle, $inkBrush, 452, 118)
$shot.G.DrawString('Unofficial Cursor Usage widget. Two official pools.', $fontBody, $mutedBrush, 452, 172)

$penTrack2 = New-Object System.Drawing.Pen $track, 14
$penTeal2 = New-Object System.Drawing.Pen $teal, 14
$penBlue2 = New-Object System.Drawing.Pen $blue, 14
$penTeal2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penTeal2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$penBlue2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penBlue2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$shot.G.DrawArc($penTrack2, 470, 230, 150, 150, 0, 360)
$shot.G.DrawArc($penTeal2, 470, 230, 150, 150, 220, 230)
$shot.G.DrawArc($penTrack2, 740, 230, 150, 150, 0, 360)
$shot.G.DrawArc($penBlue2, 740, 230, 150, 150, 220, 80)
$shot.G.DrawString('32%', $fontBig, $tealBrush, 500, 278)
$shot.G.DrawString('0%', $fontBig, $blueBrush, 778, 278)
$shot.G.DrawString('Cursor Models', $fontSmall, $mutedBrush, 488, 400)
$shot.G.DrawString('Other Models', $fontSmall, $mutedBrush, 758, 400)
$shot.G.DrawString('On-demand OFF  ·  stays on this PC', $fontSmall, $mutedBrush, 452, 460)
$shot.G.FillRectangle($tealBrush, 452, 510, 240, 16)
$shot.G.FillRectangle($blueBrush, 452, 542, 90, 16)
$shot.G.DrawString('Not affiliated with Cursor.', $fontSmall, $mutedBrush, 452, 590)
Save-Png $shot.Bmp (Join-Path $store 'screenshot-1366x768.png')
$shot.G.Dispose(); $shot.Bmp.Dispose()

Write-Output 'Wrote build/icon.png, build/icon.ico, and store/screenshot-1366x768.png'
