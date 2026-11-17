# Render docs/demo.gif from docs/demo.html with a headless Chromium.
#
# Requirements: Chrome or Edge on Windows, ffmpeg on PATH.
# Usage: pwsh -File scripts/render-demo-gif.ps1
param(
  [int]$Fps = 15,
  [double]$Duration = 6.0,
  [int]$Width = 640,
  [int]$Height = 400,
  [string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
  [string]$Out = 'docs/demo.gif'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$page = (Join-Path $root 'docs/demo.html').Replace('\', '/')
$frames = Join-Path $env:TEMP 'ai-dream-gif-frames'
$profile = Join-Path $env:TEMP 'ai-dream-gif-profile'

Remove-Item $frames -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $frames | Out-Null

$total = [int][Math]::Round($Fps * $Duration)
$demoUrl = "file:///$page"
Write-Host "page: $demoUrl"
Write-Host "rendering $total frames at ${Width}x${Height}..."

for ($i = 0; $i -lt $total; $i++) {
  $t = $i / $Fps
  $png = Join-Path $frames ('frame_{0:0000}.png' -f $i)
  $chromeArgs = @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    "--user-data-dir=$profile", "--window-size=$Width,$Height", "--screenshot=$png",
    "file:///${page}?t=$($t.ToString('0.###', [System.Globalization.CultureInfo]::InvariantCulture))"
  )
  Start-Process -FilePath $Chrome -ArgumentList $chromeArgs -Wait
}

$count = (Get-ChildItem $frames -File -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "captured $count frames"
if ($count -eq 0) { throw 'no frames were captured; check the Chrome path' }

$outPath = Join-Path $root $Out
Write-Host "encoding $outPath..."
& ffmpeg -y -loglevel error -framerate $Fps -i (Join-Path $frames 'frame_%04d.png') `
  -vf "split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" `
  -loop 0 $outPath

Write-Host ('done: ' + (Get-Item $outPath).Length + ' bytes')
