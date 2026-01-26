#!/bin/bash
set -e

echo "🚀 Starting Production Build Sequence..."

# 1. Clean previous builds
echo "🧹 Cleaning..."
rm -rf release
rm -rf backend/dist
rm -rf frontend/dist

# 2. Build Frontend
echo "🎨 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 3. Build Backend
echo "⚙️  Building Backend..."
cd backend
npm install
npm run build
# Prune dev dependencies for lighter package
npm prune --production
cd ..

# 4. Build Electron Main Process
echo "🖥️  Compiling Electron..."
npm run build:electron

# 5. Package Application
echo "📦 Packaging for $(uname)..."
./node_modules/.bin/electron-builder

echo "✅ Build Complete! Check the 'release' directory."
