#!/bin/bash

# Navigate to the frontend directory
cd frontend

# Run the tests
echo "Running frontend tests locally..."
npm test

# Check the exit code
if [ $? -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Tests failed!"
  exit 1
fi 