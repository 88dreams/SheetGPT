# Frontend Tests

This directory contains tests for the SheetGPT frontend components, hooks, and utilities.

## Entity Resolution Tests

These tests verify the functionality of the entity resolution UI components:

### Component Tests

- `EntityResolutionBadge.test.tsx`: Tests the badge component that displays resolution confidence levels with appropriate styling.
- `EntityCard.test.tsx`: Tests the entity card component with resolution information display.
- `SmartEntitySearch.test.tsx`: Tests the enhanced entity search with fuzzy matching and resolution feedback.
- `EnhancedFieldInput.test.tsx`: Tests form field components with resolution capabilities.
- `EnhancedBulkEditModal.test.tsx`: Tests bulk editing with resolution-enhanced fields.

### Hook Tests

- `useEntityResolution.test.ts`: Tests the hooks that provide entity resolution capabilities to components.

### Integration Tests

- `test_entity_resolution_flow.ts`: End-to-end test for the entity resolution workflow.

### Test Utilities

The `entityResolutionTestUtils.ts` file provides helper functions for testing entity resolution components:

- `mockResolutionInfo(type, score)`: Generates resolution metadata for different match types.
- `mockEntity(entityType, namePattern)`: Creates mock entities with different resolution patterns.
- `mockEntityResolution(entityType, nameOrId, options)`: Mocks resolution hook responses.
- `mockRelatedEntityData()`: Provides mock data for relationship fields.
- `mockEntityFields()`: Generates field definitions for form testing.

## Test Structure

Tests follow a consistent structure:

1. Import components and dependencies
2. Mock dependencies using Jest
3. Create test cases for different component behavior
4. Verify rendering and interaction with screen queries
5. Check callback invocation for user interactions

## Running Tests

To run tests for specific components:

```
docker-compose run --rm frontend-test npm test -- src/components/data/EntityUpdate/__tests__/EntityResolutionBadge.test.tsx
```

To run all entity resolution tests:

```
docker-compose run --rm frontend-test npm test -- --testPathPattern="EntityResolution|useEntityResolution"
```