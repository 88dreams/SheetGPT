#!/bin/bash
set -e

# Clean everything thoroughly
echo "Cleaning existing node_modules..."
rm -rf node_modules
rm -rf .npm

# Install dependencies with --no-optional flag to avoid esbuild issues
echo "Installing dependencies..."
npm install --no-optional

# Build the application
echo "Building application..."
npm run build

echo "Build completed successfully!"