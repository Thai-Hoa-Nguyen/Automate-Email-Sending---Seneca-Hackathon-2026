#!/bin/bash
# Double-click this file to start the frontend.
# A Terminal window will open and keep the app running.

cd "$(dirname "$0")"

export NVM_DIR="$PWD/.nvm"
source "$NVM_DIR/nvm.sh"

echo ""
echo "================================================"
echo "  Student Success Email Tool — Frontend"
echo "================================================"
echo ""
echo "  Open in browser: http://localhost:5173"
echo "  Keep this window open while using the app."
echo ""

cd frontend
npx vite
