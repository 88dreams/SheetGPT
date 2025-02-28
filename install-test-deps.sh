#!/bin/bash

# Navigate to the frontend directory
cd frontend

# Install all the necessary testing dependencies with legacy-peer-deps flag
npm install --save-dev --legacy-peer-deps \
  @jest/globals \
  @testing-library/jest-dom \
  @testing-library/react \
  @testing-library/react-hooks \
  @types/jest \
  jest \
  jest-environment-jsdom \
  ts-jest

# Print a success message
echo "Testing dependencies installed successfully!" 