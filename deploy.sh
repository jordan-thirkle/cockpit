#!/usr/bin/env bash
# Cockpit deploy — Linux/macOS.
# Builds Cockpit and relaunches `hermes dashboard` pointed at Cockpit's dist
# via HERMES_WEB_DIST. The only config is that one env var; `hermes update`
# cannot break it because Cockpit lives outside the Hermes install.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$REPO/dist"

cd "$REPO"
npm install
npm run build

# Stop an existing :3001 listener (leave :9119 desktop untouched).
if command -v lsof >/dev/null 2>&1; then
  PID="$(lsof -ti tcp:3001 || true)"
  [ -n "$PID" ] && kill -9 $PID 2>/dev/null || true
fi

HERMES_WEB_DIST="$DIST" nohup hermes dashboard --port 3001 --host 0.0.0.0 --no-open >/tmp/cockpit.log 2>&1 &
sleep 2
echo "Cockpit live at http://127.0.0.1:3001  (or http://<LAN-IP>:3001 on your network)"
