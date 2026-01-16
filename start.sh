#!/bin/bash

# Cleanup function to kill background processes on exit
cleanup() {
  echo "🛑 Shutting down Solvent AI..."
  kill $(jobs -p) 2>/dev/null
  exit
}

trap cleanup EXIT

echo "🚀 Initializing Solvent AI Desktop Suite..."

# 1. Start Backend
echo "Starting Backend..."
npm run dev:backend > backend.log 2>&1 &
BACKEND_PID=$!

# 2. Start Frontend
echo "Starting Frontend..."
npm run dev:frontend > frontend.log 2>&1 &
FRONTEND_PID=$!

# 3. Wait for services to be ready
echo "Waiting for services to spin up (12s)..."
sleep 12

# 4. Check if they are still running
if ! ps -p $BACKEND_PID > /dev/null; then
  echo "❌ Backend failed to start. Check backend.log"
  exit 1
fi
if ! ps -p $FRONTEND_PID > /dev/null; then
  echo "❌ Frontend failed to start. Check frontend.log"
  exit 1
fi

# 5. Build Electron
echo "Building Desktop App..."
npm run build:electron

# 6. Launch Electron
echo "🖥️  Launching Desktop UI..."
# We use the locally installed electron
./node_modules/.bin/electron electron/main.js

# When Electron closes, the trap will kill backend/frontend
