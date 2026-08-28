# Cockpit deploy — Windows (host is Windows).
# Builds Cockpit, stops any existing :3001 dashboard (NOT the desktop's :9119),
# and relaunches `hermes dashboard` pointed at Cockpit's dist via HERMES_WEB_DIST.
# This is the entire configuration surface: one env var. `hermes update` cannot
# break it because Cockpit lives outside the Hermes install.
$ErrorActionPreference = 'Stop'

$Repo = Split-Path $MyInvocation.MyCommand.Path
$Dist = Join-Path $Repo 'dist'

Push-Location $Repo
try {
    npm install
    npm run build
} finally {
    Pop-Location
}

# Stop the existing :3001 dashboard listener only (leave :9119 desktop alone).
$conn = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($conn) {
    $pid = $conn[0].OwningProcess
    Write-Host "Stopping existing :3001 dashboard (PID $pid)…"
    cmd /c "taskkill /F /PID $pid /T" | Out-Null
    Start-Sleep -Seconds 1
}

# Relaunch with Cockpit's dist. --no-open avoids spawning a browser.
$env:HERMES_WEB_DIST = $Dist
Start-Process -FilePath 'hermes' `
    -ArgumentList 'dashboard','--port','3001','--host','0.0.0.0','--no-open' `
    -WindowStyle Hidden

Start-Sleep -Seconds 2
Write-Host "Cockpit live:"
Write-Host "  Local: http://127.0.0.1:3001"
Write-Host "  LAN:   http://<LAN-IP>:3001   (replace <LAN-IP> with this machine's LAN address)"
