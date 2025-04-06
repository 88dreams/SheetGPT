#!/bin/bash
set -e

# Remove node_modules entirely and install fresh
echo "Removing node_modules..."
rm -rf node_modules
rm -rf package-lock.json

# Use npm 8 which has fewer issues with optional dependencies
echo "Downgrading npm to version 8..."
npm install -g npm@8

# Install esbuild directly first
echo "Installing esbuild directly..."
npm install esbuild@latest

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build the application
echo "Building application..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo "Build completed successfully!"