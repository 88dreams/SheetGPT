# SheetGPT Refactoring Guide

This document provides guidance for implementing the refactoring patterns established in the SheetGPT refactoring plan. It covers both backend and frontend patterns with practical examples.

## Backend Service Pattern

We've established a consistent pattern for service implementation that includes:

1. **BaseEntityService**: All entity services should inherit from this class for common CRUD operations
2. **Entity Type Normalization**: Use the `normalize_entity_type` utility for consistent handling
3. **Error Handling**: Use the `@handle_database_errors` decorator for automatic transaction management

### Example Implementation

```python
from services.sports.base_service import BaseEntityService
from services.sports.utils import normalize_entity_type
from utils.errors import handle_database_errors

class MyEntityService(BaseEntityService):
    def __init__(self, session=None):
        super().__init__(
            entity_model=MyEntity,  # Your SQLAlchemy model
            entity_name="my_entity",  # Singular entity name
            session=session
        )
    
    @handle_database_errors
    async def get_entity_by_name(self, name, exact_match=True):
        # Use the base service implementation
        return await super().get_entity_by_name(name, exact_match)
    
    @handle_database_errors
    async def create_entity(self, entity_data):
        # Process any special fields before creating
        processed_data = await self._process_special_fields(entity_data)
        return await super().create_entity(processed_data)
    
    async def _process_special_fields(self, entity_data):
        # Handle any entity-specific field processing
        return entity_data
```

## Frontend Hook Pattern

We've established clear patterns for React hooks that prevent circular dependencies and separate concerns:

1. **Single Responsibility**: Each hook should do one thing well
2. **Clear Dependencies**: Hooks should have explicit dependencies
3. **UI vs Data**: Separate UI state from data operations
4. **Consistent Naming**: Use consistent naming conventions

### Hook Design Patterns

#### UI State Hook

```typescript
// useUiState.ts
import { useState, useCallback } from 'react';

export function useUiState(initialState) {
  // State definitions
  const [viewMode, setViewMode] = useState(initialState?.viewMode || 'default');
  
  // Action functions
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'default' ? 'alternate' : 'default');
  }, []);
  
  // Return both state and actions
  return {
    // State
    viewMode,
    
    // Setters
    setViewMode,
    
    // Actions
    toggleViewMode
  };
}
```

#### Data Operation Hook

```typescript
// useDataOperations.ts
import { useState, useCallback } from 'react';

export function useDataOperations(initialData = []) {
  // State definitions
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data operations
  const processData = useCallback((newData) => {
    setIsLoading(true);
    
    // Process the data...
    const processedData = newData.map(item => ({
      ...item,
      processed: true
    }));
    
    setData(processedData);
    setIsLoading(false);
  }, []);
  
  // Return state and operations
  return {
    // State
    data,
    isLoading,
    
    // Operations
    processData
  };
}
```

### Component Integration Pattern

When using these hooks together, follow this pattern to avoid circular dependencies:

```tsx
import React from 'react';
import { useUiState } from './hooks/useUiState';
import { useDataOperations } from './hooks/useDataOperations';

function MyComponent() {
  // Initialize UI state first (no dependencies)
  const uiState = useUiState();
  
  // Initialize data operations (no hook dependencies)
  const dataOps = useDataOperations();
  
  // Handle interactions between hooks with React's useEffect
  React.useEffect(() => {
    if (uiState.viewMode === 'alternate') {
      // Call data operation based on UI state
      dataOps.processData([1, 2, 3]);
    }
  }, [uiState.viewMode, dataOps.processData]);
  
  // Event handlers can call both hook functions
  const handleButtonClick = () => {
    uiState.toggleViewMode();
    dataOps.processData([4, 5, 6]);
  };
  
  return (
    <div>
      <h1>View Mode: {uiState.viewMode}</h1>
      <button onClick={handleButtonClick}>Toggle View Mode</button>
      {dataOps.isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {dataOps.data.map(item => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Testing Patterns

We've established consistent patterns for testing both backend services and frontend hooks:

### Backend Service Tests

```python
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from services.my_entity_service import MyEntityService
from models.models import MyEntity

class TestMyEntityService:
    @pytest.fixture
    def mock_session(self):
        session = MagicMock(spec=AsyncSession)
        return session
    
    @pytest.fixture
    def service(self, mock_session):
        return MyEntityService(session=mock_session)
    
    @pytest.mark.asyncio
    async def test_get_entity_by_name(self, service, mock_session):
        # Arrange
        mock_entity = MyEntity(id="123", name="Test Entity")
        mock_query = MagicMock()
        mock_session.execute.return_value.scalars.return_value.first.return_value = mock_entity
        
        # Act
        result = await service.get_entity_by_name("Test Entity")
        
        # Assert
        assert result.id == "123"
        assert result.name == "Test Entity"
        mock_session.execute.assert_called_once()
```

### Frontend Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useUiState } from '../hooks/useUiState';

describe('useUiState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useUiState());
    expect(result.current.viewMode).toBe('default');
  });
  
  it('should toggle view mode', () => {
    const { result } = renderHook(() => useUiState());
    
    act(() => {
      result.current.toggleViewMode();
    });
    
    expect(result.current.viewMode).toBe('alternate');
  });
});
```

## Migrating Existing Code

When refactoring existing components:

1. Create a new directory with `v2` suffix
2. Implement the new pattern alongside the old one
3. Create a complete test suite for the new implementation
4. Gradually migrate usages from old to new
5. Remove the old implementation once no longer used

This approach allows for gradual migration without disrupting existing functionality.

## Performance Optimization

Follow these patterns for optimal performance:

1. **Memoization**: Use useMemo for expensive calculations
2. **Callback Stability**: Use useCallback for all event handlers
3. **Proper Dependencies**: Always include all dependencies in dependency arrays
4. **Fingerprinting**: Use JSON.stringify for complex object comparisons in dependency arrays
5. **React.memo**: Use for expensive components with custom equality functions

## Documentation

Document your refactored code with:

1. Function/hook documentation with parameters and return values
2. Component documentation with props and usage examples
3. Clear explanations of any complex logic
4. README files for component directories

## Conclusion

By following these consistent patterns across the codebase, we ensure:

- Better maintainability
- Fewer bugs from circular dependencies
- Improved performance
- Easier onboarding for new developers
- More testable components and services
