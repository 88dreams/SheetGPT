# SheetGPT Testing Documentation

This directory contains the testing infrastructure for the SheetGPT application. The testing framework is designed to validate functionality across frontend, backend, and integration points.

## Test Structure

The testing structure is organized as follows:

```
tests/
├── README.md                      # This file
├── conftest.py                    # Pytest configuration for backend tests
├── frontend/                      # Frontend unit and component tests
│   ├── components/                # Tests for React components
│   │   ├── common/                # Common component tests
│   │   ├── data/                  # Data management component tests
│   │   │   └── DataTable/         # DataTable component tests
│   │   └── sports/                # Sports database component tests
│   ├── hooks/                     # Tests for custom React hooks
│   ├── services/                  # Tests for frontend services
│   ├── utils/                     # Tests for utility functions
│   ├── component.test.template.tsx # Template for component tests
│   └── hook.test.template.ts      # Template for hook tests
├── backend/                       # Backend unit and integration tests
│   ├── routes/                    # API endpoint tests
│   │   └── test_sports_routes.py  # Tests for sports API endpoints
│   ├── services/                  # Service layer tests
│   │   └── sports/                # Sports service tests
│   │       └── test_brand_service.py # Tests for BrandService
│   ├── models/                    # Data model tests
│   ├── schemas/                   # Schema validation tests
│   ├── utils/                     # Utility function tests
│   ├── route.test.template.py     # Template for route tests
│   └── service.test.template.py   # Template for service tests
└── integration/                   # End-to-end integration tests
    ├── data_flow/                 # Tests for complete data workflows
    │   └── test_data_import_export.ts # Test for import/export flow
    └── integration.test.template.ts # Template for integration tests
```

## Testing Frameworks

### Frontend Testing
- **Framework**: Jest with React Testing Library
- **Config**: `jest.config.js` in the frontend directory
- **Setup**: `jest-setup.ts` contains global mocks and configuration
- **Run**: `npm run test:frontend` or `cd frontend && npm test`

### Backend Testing
- **Framework**: Pytest with unittest for Python backend
- **Config**: `conftest.py` and `pyproject.toml`
- **Fixtures**: Common test fixtures defined in `conftest.py`
- **Run**: `npm run test:backend` or `pytest tests/backend`

### Integration Testing
- **Framework**: Jest with Axios for API calls
- **Config**: Uses the same Jest config as frontend tests
- **Run**: `npm run test:integration`

## Test Templates

We provide template files to maintain consistency across tests:

- **Component Tests**: Use `component.test.template.tsx` for React components
- **Hook Tests**: Use `hook.test.template.ts` for React hooks
- **Service Tests**: Use `service.test.template.py` for backend services
- **Route Tests**: Use `route.test.template.py` for API routes
- **Integration Tests**: Use `integration.test.template.ts` for end-to-end flows

## Running Tests

### All Tests
```
npm run test:all
```

### Frontend Tests
```
npm run test:frontend
```

### Backend Tests
```
npm run test:backend
```

### Integration Tests
```
npm run test:integration
```

### Code Coverage
```
npm run test:coverage
```

## Test Configuration

### Frontend Test Configuration
The frontend tests are configured in `jest.config.js` with the following settings:
- Uses ts-jest for TypeScript support
- JSDOM for browser environment simulation
- Module aliases for clean import paths
- Jest setup file for global mocks

### Backend Test Configuration
The backend tests are configured in `conftest.py` and `pyproject.toml` with:
- Test database configuration
- Session and transaction management
- Dependency injection overrides
- Test fixtures for common test scenarios

### Integration Test Configuration
Integration tests require:
- A running instance of the application
- Test user credentials
- API URL configuration (defaults to localhost:8000)

## Writing New Tests

1. **Component Tests**:
   - Copy the component test template
   - Mock dependencies using Jest mock functions
   - Test rendering, user interaction, and state changes

2. **Hook Tests**:
   - Copy the hook test template
   - Use `renderHook` and `act` from React Testing Library
   - Test state initialization and updates

3. **Service Tests**:
   - Copy the service test template
   - Mock database and external dependencies
   - Test success and error cases

4. **Route Tests**:
   - Copy the route test template
   - Use FastAPI TestClient
   - Mock service layer

5. **Integration Tests**:
   - Copy the integration test template
   - Test complete user flows
   - Clean up test data in afterAll

## Best Practices

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

5. **CI Integration**:
   - All tests should run in CI pipeline
   - Tests should be fast enough for CI feedback
   - Fail the build on test failures

## Troubleshooting

### Frontend Tests
- **Failing Component Tests**: Check for missing mocks
- **React Warnings**: Ensure proper cleanup in useEffect hooks
- **Timeout Errors**: Increase timeout for async tests

### Backend Tests
- **Database Errors**: Verify test database is set up correctly
- **Import Errors**: Check Python path in conftest.py
- **Async Test Errors**: Use pytest-asyncio markers

### Integration Tests
- **Authentication Issues**: Verify test user credentials
- **Timeout Errors**: Increase TEST_TIMEOUT value
- **API Connection Errors**: Ensure the application is running