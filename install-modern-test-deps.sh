#!/bin/bash

# Navigate to the frontend directory
cd frontend

# Install modern testing dependencies compatible with React 18
npm install --save-dev \
  @jest/globals \
  @testing-library/jest-dom \
  @testing-library/react \
  @testing-library/react-hooks@^7.0.2 \
  @types/jest \
  jest \
  jest-environment-jsdom \
  ts-jest

# Print a success message
echo "Modern testing dependencies installed successfully!" 