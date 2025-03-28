#!/bin/bash

# Script to copy test files from /tests to the frontend/src/__tests__ directory
# This allows the tests to be run inside the Docker container

# Create the directory if it doesn't exist
mkdir -p /Users/lucas/Personal/P_CODE/SheetGPT/frontend/src/__tests__/components/sports/database/EntityList

# Copy all the EntityList test files
cp /Users/lucas/Personal/P_CODE/SheetGPT/tests/frontend/components/sports/database/EntityList/*.test.* \
   /Users/lucas/Personal/P_CODE/SheetGPT/frontend/src/__tests__/components/sports/database/EntityList/

echo "Test files copied successfully. You can now run tests inside Docker with:"
echo "docker-compose run --rm frontend npm test -- --testPathPattern=EntityList"