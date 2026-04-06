#!/bin/bash
set -e
PROJ="$(cd "$(dirname "$0")" && pwd)"

# ── Find Node ──────────────────────────────────────────────────────────────────
# 1. Use system node if available
# 2. Fall back to the project-local nvm install (your Mac)
if ! command -v node &>/dev/null; then
  NVM_DIR="$PROJ/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
  else
    echo ""
    echo "❌  Node.js not found."
    echo "    Please install it from https://nodejs.org  (download the LTS version)"
    echo "    Then run this script again."
    echo ""
    exit 1
  fi
fi

# ── Install dependencies if needed ────────────────────────────────────────────
if [ ! -d "$PROJ/backend/node_modules" ]; then
  echo "📦  Installing backend packages (first run only)..."
  cd "$PROJ/backend" && npm install --silent
fi
if [ ! -d "$PROJ/frontend/node_modules" ]; then
  echo "📦  Installing frontend packages (first run only)..."
  cd "$PROJ/frontend" && npm install --silent
fi

# ── Build frontend ────────────────────────────────────────────────────────────
echo ""
echo "🔨  Building frontend..."
cd "$PROJ/frontend" && npx vite build

# ── Start unified server ──────────────────────────────────────────────────────
echo ""
echo "🚀  Starting app..."
cd "$PROJ/backend"
node server.js
