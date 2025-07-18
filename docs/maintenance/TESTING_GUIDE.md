# SheetGPT Testing Guide

## Overview

This guide describes the testing architecture, patterns, and best practices for the SheetGPT application. The testing framework is designed to validate functionality across frontend, backend, and integration points, ensuring a reliable and maintainable codebase.

## Testing Architecture

The testing structure is organized into three main categories:

1. **Frontend Tests**: Unit and component tests for React components, hooks, and utilities
2. **Backend Tests**: Unit and integration tests for Python services, routes, and utilities
3. **Integration Tests**: End-to-end tests that validate complete workflows and user journeys

### Directory Structure

```text
tests/
├── README.md                      # Testing overview
├── conftest.py                    # Pytest configuration for backend tests
├── frontend/                      # Frontend unit and component tests
│   ├── components/                # Tests for React components
│   ├── hooks/                     # Tests for custom React hooks
│   ├── services/                  # Tests for frontend services
│   └── utils/                     # Tests for utility functions
├── backend/                       # Backend unit and integration tests
│   ├── routes/                    # API endpoint tests
│   ├── services/                  # Service layer tests
│   ├── models/                    # Data model tests
│   ├── schemas/                   # Schema validation tests
│   └── utils/                     # Utility function tests
└── integration/                   # End-to-end integration tests
    └── data_flow/                 # Tests for complete data workflows
```

## Testing Frameworks

### Frontend Testing

- **Framework**: Jest with React Testing Library
- **Configuration**: `jest.config.js` in the frontend directory
- **Setup**: `jest-setup.ts` contains global mocks and configuration
- **Key Features**:
  - Component rendering and interaction testing
  - Hook state management testing
  - Snapshot testing for UI components
  - Mocking of external dependencies
  - Code coverage reporting

### Backend Testing

- **Framework**: Pytest with unittest for Python backend
- **Configuration**: `conftest.py` and `pyproject.toml`
- **Fixtures**: Common test fixtures defined in `conftest.py`
- **Key Features**:
  - Async testing support with pytest-asyncio
  - Database session mocking
  - Service layer testing
  - API endpoint testing
  - Validation logic testing

### Integration Testing

- **Framework**: Jest with Axios for API calls
- **Configuration**: Uses the same Jest config as frontend tests
- **Key Features**:
  - End-to-end workflow testing
  - API authentication and authorization testing
  - Data flow validation
  - UI interaction simulation

## Running Tests

### All Tests

```bash
npm run test:all
```

### Frontend Tests

```bash
# Run all frontend tests
npm run test:frontend

# Run with Docker
docker-compose run --rm frontend-test

# Run specific test file
docker-compose run --rm frontend-test npm test -- --testPathPattern=DataTable
```

### Backend Tests

```bash
# Run all backend tests
npm run test:backend

# Run with Docker
docker-compose run --rm backend pytest

# Run specific test file
docker-compose run --rm backend pytest tests/backend/services/test_brand_service.py
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with Docker
docker-compose run --rm integration-test
```

### Code Coverage

```bash
# Generate coverage report
npm run test:coverage
```

## Writing Tests

### Frontend Component Tests

Follow these patterns for testing React components:

```tsx
// Import testing utilities
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from './DataTable';

// Mock dependencies
jest.mock('../../hooks/useDataTransformer', () => ({
  useDataTransformer: jest.fn().mockReturnValue({
    transformedData: mockData,
    isLoading: false,
  }),
}));

describe('DataTable Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('renders table with correct columns', () => {
    // Arrange
    const columns = [{ key: 'name', header: 'Name' }];
    const data = [{ name: 'Test Item' }];

    // Act
    render(<DataTable columns={columns} data={data} />);

    // Assert
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('handles row selection correctly', () => {
    // Arrange
    const onSelect = jest.fn();
    const columns = [{ key: 'name', header: 'Name' }];
    const data = [{ id: '1', name: 'Test Item' }];

    // Act
    render(<DataTable columns={columns} data={data} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Test Item'));

    // Assert
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

### Frontend Hook Tests

Follow these patterns for testing React hooks:

```tsx
// Import testing utilities
import { renderHook, act } from '@testing-library/react-hooks';
import { useDataTransformer } from './useDataTransformer';

describe('useDataTransformer Hook', () => {
  it('transforms data correctly', () => {
    // Arrange
    const initialData = [{ name: 'Test', value: 123 }];

    // Act
    const { result } = renderHook(() => useDataTransformer(initialData));

    // Assert
    expect(result.current.transformedData).toEqual([
      { name: 'Test', value: 123, formattedValue: '$123.00' }
    ]);
  });

  it('handles state updates', () => {
    // Arrange
    const initialData = [{ name: 'Test', value: 123 }];

    // Act
    const { result, rerender } = renderHook(
      (props) => useDataTransformer(props),
      { initialProps: initialData }
    );

    // Update props
    rerender([{ name: 'Updated', value: 456 }]);

    // Assert
    expect(result.current.transformedData).toEqual([
      { name: 'Updated', value: 456, formattedValue: '$456.00' }
    ]);
  });
});
```

### Backend Service Tests

Follow these patterns for testing backend services:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.services.sports.brand_service import BrandService
from src.models.sports_models import Brand

@pytest.mark.asyncio
class TestBrandService:
    async def test_get_brand_by_id(self):
        # Arrange
        mock_session = AsyncMock()
        mock_brand = MagicMock(spec=Brand)
        mock_brand.id = "test-uuid"
        mock_brand.name = "Test Brand"
        
        # Mock the query result
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_brand
        mock_session.execute.return_value = mock_result
        
        # Act
        result = await BrandService.get_brand_by_id(mock_session, "test-uuid")
        
        # Assert
        assert result == mock_brand
        assert result.name == "Test Brand"
        mock_session.execute.assert_called_once()
        
    async def test_get_brand_by_id_not_found(self):
        # Arrange
        mock_session = AsyncMock()
        
        # Mock the query result
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result
        
        # Act
        result = await BrandService.get_brand_by_id(mock_session, "test-uuid")
        
        # Assert
        assert result is None
        mock_session.execute.assert_called_once()
```

### Backend API Route Tests

Follow these patterns for testing API routes:

```python
from fastapi.testclient import TestClient
import pytest
from unittest.mock import patch, AsyncMock
from src.main import app

client = TestClient(app)

class TestSportsRoutes:
    @patch("src.routes.sports.get_db_session")
    @patch("src.services.sports.brand_service.BrandService.get_all_brands")
    def test_get_brands(self, mock_get_all_brands, mock_get_db):
        # Arrange
        mock_session = AsyncMock()
        mock_get_db.return_value = mock_session
        mock_brands = [{"id": "test-uuid", "name": "Test Brand"}]
        mock_get_all_brands.return_value = mock_brands
        
        # Act
        response = client.get("/api/v1/sports/brands")
        
        # Assert
        assert response.status_code == 200
        assert response.json() == mock_brands
        mock_get_all_brands.assert_called_once_with(mock_session)
```

### Integration Tests - Data Import/Export Flow

Follow these patterns for integration tests:

```tsx
import axios from 'axios';

describe('Data Import/Export Flow', () => {
  let authToken;
  let testDataId;

  beforeAll(async () => {
    // Setup test - login and get auth token
    const response = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    authToken = response.data.access_token;
  });

  it('should extract structured data from chat', async () => {
    // Act
    const response = await axios.post(
      'http://localhost:8000/api/v1/chat/extract',
      {
        text: 'Team: Dallas Cowboys, City: Dallas, State: Texas'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id');
    expect(response.data.data[0]).toHaveProperty('team', 'Dallas Cowboys');
    
    // Store the extracted data ID for subsequent tests
    testDataId = response.data.id;
  });

  it('should export data to Google Sheets', async () => {
    // Skip if testDataId is undefined
    if (!testDataId) {
      console.log('Skipping test: No test data ID available');
      return;
    }

    // Act
    const response = await axios.post(
      'http://localhost:8000/api/v1/export/sheets',
      {
        data_id: testDataId,
        title: 'Test Export'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('sheet_url');
  });

  afterAll(async () => {
    // Cleanup test data
    if (testDataId) {
      await axios.delete(`http://localhost:8000/api/v1/data/${testDataId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }
  });
});
```

## Test Templates

To maintain consistency across tests, use these templates as starting points:

- **Component Tests**: `tests/frontend/component.test.template.tsx`
- **Hook Tests**: `tests/frontend/hook.test.template.ts`
- **Service Tests**: `tests/backend/service.test.template.py`
- **Route Tests**: `tests/backend/route.test.template.py`
- **Integration Tests**: `tests/integration/integration.test.template.ts`

## Best Practices

### General Testing Principles

1. **Test Isolation**:
   - Each test should be independent
   - Use beforeEach/afterEach to reset state
   - Mock external dependencies

2. **Coverage Goals**:
   - Critical components: 90%+ coverage
   - UI components: 80%+ coverage
   - Backend services: 90%+ coverage
   - API routes: 85%+ coverage

3. **Test Organization**:
   - Group related tests together
   - Use descriptive test names
   - Follow the AAA pattern (Arrange, Act, Assert)

4. **Avoid Test Pollution**:
   - Clean up created data
   - Reset mocks between tests
   - Use transaction rollback for database tests

### Frontend Testing - DataTable Component

1. **Component Testing**:
   - Test rendering with different props
   - Test user interactions
   - Test conditional rendering
   - Verify event handlers are called
   - Use snapshot testing sparingly

2. **Hook Testing**:
   - Test initial state
   - Test state updates
   - Test side effects
   - Test cleanup functions
   - Verify dependencies are respected

### Backend Testing - BrandService

1. **Service Testing**:
   - Mock database sessions
   - Test all business logic paths
   - Test error handling
   - Verify DB operations
   - Test transaction rollback

2. **API Testing**:
   - Test all endpoints
   - Test authentication/authorization
   - Test validation logic
   - Test error responses
   - Mock service layer calls

### Integration Testing - Data Import/Export Flow

1. **Workflow Testing**:
   - Test complete user flows
   - Verify data persistence
   - Test frontend-backend integration
   - Clean up test data after tests
   - Use realistic test data

## Troubleshooting

### Frontend Tests - DataTable Component

- **Failing Component Tests**: Check for missing mocks or improper cleanup
- **React Warnings**: Ensure proper cleanup in useEffect hooks
- **Timeout Errors**: Increase timeout for async tests
- **Snapshot Failures**: Update snapshots if UI changes were intentional

### Backend Tests - BrandService

- **Database Errors**: Verify test database is set up correctly
- **Import Errors**: Check Python path in conftest.py
- **Async Test Errors**: Use pytest-asyncio markers
- **Auth Errors**: Mock authentication in middleware

### Integration Tests - Data Import/Export Flow Troubleshooting

- **Authentication Issues**: Verify test user credentials
- **Timeout Errors**: Increase TEST_TIMEOUT value
- **API Connection Errors**: Ensure the application is running
- **Data Consistency Issues**: Use beforeAll to set up test data

## Test Coverage Reports

Coverage reports help identify areas that need additional testing:

```bash
# Generate coverage report
npm run test:coverage
```

The coverage report is generated in the `coverage/` directory and includes:

- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

### Analyzing Coverage Reports

1. Look for files with low coverage percentages
2. Focus on high-risk areas first
3. Prioritize critical paths over edge cases
4. Set coverage thresholds in CI pipeline

## CI/CD Integration

Tests are automatically run in the CI/CD pipeline:

1. **Pull Request Validation**:
   - All tests must pass before merging
   - Coverage must meet minimum thresholds
   - Linting errors must be fixed

2. **Nightly Builds**:
   - Run complete test suite nightly
   - Generate comprehensive coverage reports
   - Report any regressions

## Future Test Improvements

1. **Performance Testing**:
   - Add load tests for API endpoints
   - Test database query performance
   - Measure UI rendering performance

2. **Visual Regression Testing**:
   - Implement screenshot comparison
   - Test responsive layouts
   - Verify visual consistency

3. **Accessibility Testing**:
   - Test keyboard navigation
   - Verify screen reader compatibility
   - Check color contrast

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Pytest Documentation](https://docs.pytest.org/en/latest/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/14/orm/session_transaction.html#session-external-transaction)
