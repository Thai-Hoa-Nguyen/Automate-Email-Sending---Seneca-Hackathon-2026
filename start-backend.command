#!/bin/bash
# Double-click this file to start the backend server.
# A Terminal window will open and keep the server running.

cd "$(dirname "$0")"

export NVM_DIR="$PWD/.nvm"
source "$NVM_DIR/nvm.sh"

echo ""
echo "================================================"
echo "  Student Success Email Tool — Backend Server"
echo "================================================"
echo ""
echo "  Starting on http://localhost:3001"
echo "  Keep this window open while using the app."
echo ""

cd backend
node server.js
