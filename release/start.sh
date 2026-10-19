#!/usr/bin/env sh
# BOM Studio launcher (Linux / macOS). Requires Node.js 20 or newer.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required: https://nodejs.org/"
  exit 1
fi

# Optional: DigiKey credentials for the server (they can also be entered in Settings)
# export DIGIKEY_CLIENT_ID=...
# export DIGIKEY_CLIENT_SECRET=...
[ -f ./bom-studio.env ] && . ./bom-studio.env

export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
URL="http://localhost:${PORT}"

echo "Starting BOM Studio on ${URL} (Ctrl+C to stop)"
( sleep 2
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1
  elif command -v open >/dev/null 2>&1; then open "$URL"
  fi ) &
exec node server.js
