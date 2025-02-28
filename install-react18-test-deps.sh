#!/bin/bash

# Navigate to the frontend directory
cd frontend

# Install testing dependencies specifically designed for React 18
npm install --save-dev --force \
  @jest/globals \
  @testing-library/jest-dom \
  @testing-library/react@^14.0.0 \
  @types/jest \
  jest \
  jest-environment-jsdom \
  ts-jest

# Print a success message
echo "React 18 compatible testing dependencies installed successfully!" 