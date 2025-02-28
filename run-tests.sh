#!/bin/bash

# Build and run the frontend tests in Docker
echo "Building and running frontend tests in Docker..."
docker-compose build frontend-test
docker-compose run --rm frontend-test

# Check the exit code
if [ $? -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Tests failed!"
  exit 1
fi 