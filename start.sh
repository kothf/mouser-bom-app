#!/usr/bin/env bash
# Mouser BOM Studio Launcher Script

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=3000
URL="http://localhost:${PORT}"

# Check if the application server is responding
if ! curl -s --head --request GET "${URL}" | grep "200 OK" > /dev/null; then
    echo "Starting Mouser BOM Studio service..."
    # Attempt to start via systemd user service
    if systemctl --user is-enabled mouser-bom.service &>/dev/null; then
        systemctl --user start mouser-bom.service
    else
        # Fallback to direct background execution
        cd "${DIR}" && npm run start -- -p ${PORT} > /dev/null 2>&1 &
    fi

    # Wait up to 10 seconds for the server to be ready
    for i in {1..10}; do
        if curl -s "${URL}" > /dev/null; then
            break
        fi
        sleep 1
    done
fi

echo "Opening Mouser BOM Studio in your default browser (${URL})..."
if command -v xdg-open &>/dev/null; then
    xdg-open "${URL}" &>/dev/null &
elif command -v sensible-browser &>/dev/null; then
    sensible-browser "${URL}" &>/dev/null &
elif command -v google-chrome &>/dev/null; then
    google-chrome "${URL}" &>/dev/null &
elif command -v firefox &>/dev/null; then
    firefox "${URL}" &>/dev/null &
else
    echo "Please open ${URL} in your web browser."
fi
