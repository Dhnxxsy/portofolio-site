param(
  [string]$Root = "Assets",
  [int]$Quality = 82
)

# Compress images to WebP using sharp-cli via npx (works offline after first install)
# Requires Node.js and internet once to download sharp binaries

function Get-NpxCommand {
  $paths = @('npx', 'npx.cmd', "${env:APPDATA}\npm\npx.cmd", "${env:ProgramFiles}\nodejs\npx.cmd")
  foreach($p in $paths){
    try {
      $v = & $p -v 2>$null
      if($LASTEXITCODE -eq 0 -and $v){ return $p }
    } catch { }
  }
  return $null
}

${npxCmd} = Get-NpxCommand
if(-not $npxCmd){
  Write-Error "npx not available. Please install Node.js (https://nodejs.org) and reopen PowerShell before running this script."
  exit 1
}

# Gather image files
$files = Get-ChildItem -Path $Root -Recurse -File -Include *.png,*.jpg,*.jpeg
if(-not $files){ Write-Host "No images found under $Root."; exit 0 }

foreach($f in $files){
  $outPath = [System.IO.Path]::ChangeExtension($f.FullName, '.webp')
  $needs = $true
  if(Test-Path $outPath){
    $srcTime = (Get-Item $f.FullName).LastWriteTimeUtc
    $dstTime = (Get-Item $outPath).LastWriteTimeUtc
    if($dstTime -ge $srcTime){ $needs = $false }
  }
  if(-not $needs){
    Write-Host "Skip (up-to-date): $($f.FullName)"
    continue
  }

  Write-Host "Converting -> WebP (sharp): $($f.FullName)"
  $args = @('--yes', 'sharp-cli', '--input', $f.FullName, '--output', $outPath, '--format', 'webp', '--quality', $Quality)
  & $npxCmd @args
  if($LASTEXITCODE -ne 0){
    Write-Warning "sharp-cli failed for: $($f.FullName) (exit $LASTEXITCODE)"
  }
}

Write-Host "Done. WebP files created alongside originals (sharp-cli)."
