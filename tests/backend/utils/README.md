# Error Handling Test Suite

This directory contains tests for the error handling utilities in SheetGPT.

## Testing Strategy

### Unit Tests for Error Classes

The `test_errors.py` file contains isolated unit tests for:

1. Error class initialization and behavior
2. Error decorator functionality 
3. Error utility functions

These tests run without database dependencies and can verify:
- Correct error message formatting
- Proper error type hierarchy
- Appropriate error transformation in decorators
- Consistent error logging patterns

### Testing Database Operations

For testing error handling in database operations:

1. **Mocking Strategy**: Use AsyncMock for SQLAlchemy sessions
   - Mock session.execute() to return custom result objects
   - Mock commit/rollback/refresh for verifying transaction behavior

2. **Result Mocking**: Create custom MockQueryResult classes
   - Implement scalars().first() pattern to simulate SQLAlchemy returns
   - Return None to test not-found scenarios

3. **Exception Simulation**: Configure mocks to raise exceptions
   - Simulate SQLAlchemyError for database failures
   - Simulate IntegrityError for constraint violations

### API Error Handling Tests

The `test_error_middleware.py` file tests how errors propagate through the API layer:

1. Create a minimal FastAPI application with test routes
2. Trigger different error types with specific endpoints
3. Verify response format, status codes, and content

### Integration Testing Approach

For full end-to-end testing:

1. Use the main application with its middleware components
2. Modify routes to intentionally trigger error conditions
3. Verify the complete error handling chain works as expected

## Running the Tests

```bash
# Run just the error utility tests
docker-compose run --rm backend pytest tests/backend/utils/test_errors.py -v

# Run API error handling tests
docker-compose run --rm backend pytest tests/backend/api/test_error_middleware.py -v 

# Run all utility tests with coverage
docker-compose run --rm backend pytest tests/backend/utils/ --cov=src/utils/errors -v
```

## Future Improvements

As we refactor more components to use the standardized error handling:

1. Add more specific test cases for each error type
2. Create integration tests that verify real database errors are properly caught
3. Add tests for frontend error handling components
4. Create end-to-end tests that verify errors propagate correctly from backend to frontend