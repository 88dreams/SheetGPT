#!/bin/bash
# Script to fix dependency issues in the Docker container

# Inside Docker container:
echo "=== SheetGPT Dependency Fix Script ==="
echo "Fixing dependency issues with esbuild and @tanstack/react-query..."
cd /app

# Clear npm cache first
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Remove problematic packages
echo "🗑️ Removing problematic packages specifically..."
rm -rf node_modules/@tanstack
rm -rf node_modules/esbuild
rm -rf node_modules/.vite

# Install esbuild at the exact version needed
echo "🔧 Installing esbuild at exact version 0.17.19..."
npm install esbuild@0.17.19 --save-exact

# Install Tanstack React Query at the correct version
echo "🔧 Installing @tanstack/react-query at exact version 4.29.5..."
npm install @tanstack/react-query@4.29.5 --save-exact

# Check for and fix React versions if needed
if [ -d "node_modules/react" ]; then
  REACT_VERSION=$(node -p "require('./node_modules/react/package.json').version")
  if [ "$REACT_VERSION" != "18.2.0" ]; then
    echo "🔧 Fixing React version to 18.2.0..."
    npm install react@18.2.0 react-dom@18.2.0 --save-exact
  else
    echo "✓ React version is already correct (18.2.0)"
  fi
else
  echo "🔧 Installing React at version 18.2.0..."
  npm install react@18.2.0 react-dom@18.2.0 --save-exact
fi

# Check if Vite needs fixing
if [ -d "node_modules/vite" ]; then
  VITE_VERSION=$(node -p "require('./node_modules/vite/package.json').version")
  if [[ ! "$VITE_VERSION" =~ ^4\. ]]; then
    echo "🔧 Fixing Vite version to 4.2.1..."
    npm install vite@4.2.1 --save-exact
  else
    echo "✓ Vite version is already correct ($VITE_VERSION)"
  fi
fi

# Run optimization to verify everything works
echo "🔍 Verifying module resolution..."
npx vite optimize --force 2>/dev/null || echo "⚠️ Optimization had some issues, but we'll continue..."

echo "✅ Dependencies fixed! Try running the application now."
echo "If you still have issues, try running: 'rm -rf node_modules package-lock.json && npm install --legacy-peer-deps'"
