#!/bin/bash
# Solvent AI Desktop Launch Script

echo "🚀 Starting Solvent AI Desktop Suite..."

# Ensure we are in the script directory
cd "$(dirname "$0")"

# Check if Frontend is running (Port 5173)
if ! lsof -i :5173 > /dev/null; then
  echo "⚠️  Frontend (Port 5173) is not running!"
  echo "🔄 Switching to full stack launch via ./start.sh..."
  ./start.sh
  exit 0
fi

# Build Electron preload
npm run build:electron

# Launch Electron
npm run desktop
