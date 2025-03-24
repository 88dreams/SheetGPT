# Backend Testing

This directory contains tests for the backend services, APIs, and utilities of the SheetGPT application.

## Test Structure

The tests are organized into the following directories:

- `services/`: Tests for backend services (e.g., sports, data management)
- `api/`: Tests for API routes and endpoints
- `validators/`: Tests for validation logic
- `utils/`: Tests for utility functions

## Running Tests

To run the tests, use the following command:

```bash
docker-compose run --rm backend pytest tests/backend
```

To run a specific test file:

```bash
docker-compose run --rm backend pytest tests/backend/services/test_simple_validator.py
```

## Test Patterns

### Testing SQLAlchemy Async Code

When testing code that uses SQLAlchemy's async ORM, you need to mock the async database session and result objects. The following pattern is recommended:

```python
class MockQueryResult:
    """Simple mock for SQLAlchemy query result."""
    def __init__(self, entity=None):
        self.entity = entity
    
    def scalars(self):
        """Return a mock scalars result"""
        return self
    
    def first(self):
        """Return the entity or None"""
        return self.entity

# In your test
mock_session = AsyncMock(spec=AsyncSession)
mock_session.execute.return_value = MockQueryResult(mock_entity)
```

### Testing Validators

When testing validators that verify entity existence or relationships, you need to mock both the success and failure cases:

1. For success cases, set up the mock to return the expected entity:
   ```python
   mock_session.execute.return_value = MockQueryResult(mock_entity)
   ```

2. For failure cases, set up the mock to return None:
   ```python
   mock_session.execute.return_value = MockQueryResult(None)
   ```

### Testing Exceptions

Use `pytest.raises` to test that the validator raises the expected exceptions:

```python
with pytest.raises(ValueError, match=f"Entity with ID {entity_id} not found"):
    await EntityValidator.validate_entity(mock_session, entity_id)
```

## Tips for Writing Tests

1. Always use `AsyncMock` for mocking async methods or classes
2. Use `@pytest.mark.asyncio` to mark async test classes or functions
3. Mock the exact return structure expected by the code under test
4. Check both success and failure paths
5. Verify function calls using `assert_called_once`, `assert_called_with`, etc.
6. Keep tests focused on a single unit of functionality
7. Use descriptive test names that indicate what's being tested

## Current Test Coverage

The current test coverage is around 36% for the entire backend codebase. Priority areas for increasing coverage include:

1. Sports validators (currently at 37%)
2. Database services
3. API endpoints
4. Data management services

Future test improvements should focus on these areas to improve the overall test coverage and reliability of the backend.