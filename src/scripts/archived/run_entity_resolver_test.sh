#!/bin/bash

# Run the entity resolver test script
# This demonstrates the enhanced entity resolution capabilities

echo "Running Entity Resolver test script..."
echo "======================================="

# Make sure the backend is running
if [ "$(docker-compose ps | grep backend | grep Up)" == "" ]; then
  echo "Starting backend service..."
  docker-compose up -d backend
  echo "Waiting for backend to start..."
  sleep 10
fi

# Run the test script
docker-compose run --rm backend python test_entity_resolver.py

echo "Test complete!"
echo "See entity_resolver_test_results.json for detailed results"
echo "You can also try the V2 API endpoints directly:"
echo "  - POST /api/v1/v2/sports/resolve-entity"
echo "  - POST /api/v1/v2/sports/resolve-references"
echo "  - GET /api/v1/v2/sports/entities/{entity_type}"