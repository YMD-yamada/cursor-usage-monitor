# Generate Usageboard icon.png / Store logos / a desktop screenshot mock.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root 'build'
$store = Join-Path $root 'store'
New-Item -ItemType Directory -Force -Path $build | Out-Null
New-Item -ItemType Directory -Force -Path $store | Out-Null

function New-Graphics([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
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
$icon.G.Clear($bg)
$penTeal = New-Object System.Drawing.Pen $teal, 36
$penTeal.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penTeal.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$penBlue = New-Object System.Drawing.Pen $blue, 36
$penBlue.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penBlue.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$penTrack = New-Object System.Drawing.Pen $track, 36
$icon.G.DrawArc($penTrack, 56, 86, 180, 180, 0, 360)
$icon.G.DrawArc($penTrack, 276, 86, 180, 180, 0, 360)
$icon.G.DrawArc($penTeal, 56, 86, 180, 180, 220, 230)
$icon.G.DrawArc($penBlue, 276, 86, 180, 180, 220, 80)
$barBrush = New-Object System.Drawing.SolidBrush $teal
$icon.G.FillRectangle($barBrush, 90, 360, 140, 28)
$barBrush2 = New-Object System.Drawing.SolidBrush $blue
$icon.G.FillRectangle($barBrush2, 282, 360, 70, 28)
Save-Png $icon.Bmp (Join-Path $build 'icon.png')
$icon.G.Dispose(); $icon.Bmp.Dispose()

foreach ($size in 44, 50, 150, 256) {
  $src = New-Object System.Drawing.Bitmap (Join-Path $build 'icon.png')
  $dst = New-Graphics $size $size
  $dst.G.Clear($bg)
  $dst.G.DrawImage($src, 0, 0, $size, $size)
  Save-Png $dst.Bmp (Join-Path $build ("icon-{0}.png" -f $size))
  $dst.G.Dispose(); $dst.Bmp.Dispose(); $src.Dispose()
}

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

Write-Output 'Wrote build/icon.png and store/screenshot-1366x768.png'
