# EntityList Component Testing Strategy

## Overview

This document outlines the testing strategy for the refactored EntityList component, which has been broken down into smaller, more focused components and hooks. The tests follow the best practices described in the TESTING_GUIDE.md document and are designed to validate the functionality of each component and hook in isolation.

## Test Files

We have created the following test files in the `tests/frontend/components/sports/database/EntityList` directory:

1. **EntityListHeader.test.tsx** - Tests for the list header component
2. **EntityTable.test.tsx** - Tests for the data table component
3. **Pagination.test.tsx** - Tests for the pagination controls
4. **ExportDialog.test.tsx** - Tests for the export dialog
5. **useColumnVisibility.test.ts** - Tests for the column visibility hook
6. **useEntityExport.test.ts** - Tests for the export functionality hook

## Testing Patterns

### Component Tests

For each component, we follow this testing pattern:

1. **Rendering tests** - Verify that the component renders correctly with default props
2. **Interaction tests** - Verify that user interactions (clicks, inputs) work as expected
3. **State change tests** - Verify that the component responds correctly to prop changes
4. **Conditional rendering tests** - Verify that conditional elements appear/disappear as expected
5. **Event handler tests** - Verify that callbacks are called with the correct arguments

Example from EntityListHeader.test.tsx:

```tsx
it('should render the component with correct entity type name', () => {
  render(<EntityListHeader {...defaultProps} />);
  
  // Verify the entity type name is rendered correctly
  expect(screen.getByText('Teams')).toBeInTheDocument();
  
  // Verify the search input is rendered
  expect(screen.getByPlaceholderText('Search Teams')).toBeInTheDocument();
  
  // Verify the buttons are rendered
  expect(screen.getByText('Export')).toBeInTheDocument();
  expect(screen.getByText('Columns')).toBeInTheDocument();
  expect(screen.getByText('Names')).toBeInTheDocument();
});
```

### Hook Tests

For each custom hook, we follow this testing pattern:

1. **Initial state tests** - Verify that the hook initializes with the correct state
2. **State update tests** - Verify that state updates correctly when functions are called
3. **Side effect tests** - Verify that side effects (localStorage, API calls) work correctly
4. **Error handling tests** - Verify that the hook handles errors gracefully

Example from useColumnVisibility.test.ts:

```tsx
it('should toggle column visibility', () => {
  const { result } = renderHook(() => useColumnVisibility('team', mockTeamEntities));
  
  // Initially, ID should be hidden
  expect(result.current.visibleColumns.id).toBe(false);
  
  // Toggle ID visibility
  act(() => {
    result.current.toggleColumnVisibility('id');
  });
  
  // Now ID should be visible
  expect(result.current.visibleColumns.id).toBe(true);
});
```

## Mocking Strategy

We use various mocking strategies to isolate the components and hooks during testing:

1. **Context mocks** - Create a mock version of the NotificationContext to avoid real notifications
2. **Service mocks** - Create mock implementations of services like SaveCsvFile
3. **Storage mocks** - Mock localStorage and sessionStorage to test persistence behavior
4. **Child component mocks** - Mock child components to simplify testing of parent components

Example of localStorage/sessionStorage mock:

```tsx
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
```

## Running Tests

### Running Tests in Docker

The `tests` directory is now mounted in the Docker container at `/tests`, allowing you to run the tests directly from Docker. To run the tests:

```bash
docker-compose run --rm frontend-test npm run test:entitylist
```

This will use the specially configured Jest setup to run all the EntityList tests.

### Local Testing

To run the tests locally:

1. Install dependencies: `npm install`
2. Run all EntityList tests: `npm test -- tests/frontend/components/sports/database/EntityList`
3. Run a specific test: `npm test -- tests/frontend/components/sports/database/EntityList/EntityListHeader.test.tsx`

## State Management Testing

When testing components with complex state management, follow these additional testing patterns:

### Pagination Component State Testing

The Pagination component requires special attention to state ordering:

```tsx
it('should change page size and reset to page 1', async () => {
  // Initial render with pageSize=25, currentPage=2
  const mockSetCurrentPage = jest.fn();
  const mockSetPageSize = jest.fn();
  
  render(
    <Pagination
      currentPage={2}
      setCurrentPage={mockSetCurrentPage}
      totalPages={10}
      pageSize={25}
      setPageSize={mockSetPageSize}
      totalItems={250}
    />
  );
  
  // Simulate changing page size from 25 to 10
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
  
  // Assert the critical order of operations
  expect(mockSetCurrentPage).toHaveBeenCalledWith(1);
  expect(mockSetCurrentPage).toHaveBeenCalledBefore(mockSetPageSize);
  expect(mockSetPageSize).toHaveBeenCalledWith(10);
});
```

### useEffect Dependency Testing

For hooks with useEffect dependencies, validate that the effect runs when expected:

```tsx
it('should properly track dependencies in useEffect', () => {
  // Mock the effect function
  const effectFn = jest.fn();
  
  const TestComponent = ({ value }: { value: string }) => {
    useEffect(() => {
      effectFn(value);
    }, [value]);
    
    return null;
  };
  
  // Initial render
  const { rerender } = render(<TestComponent value="initial" />);
  expect(effectFn).toHaveBeenCalledWith("initial");
  
  // Re-render with same value
  rerender(<TestComponent value="initial" />);
  expect(effectFn).toHaveBeenCalledTimes(1); // Should not be called again
  
  // Re-render with new value
  rerender(<TestComponent value="updated" />);
  expect(effectFn).toHaveBeenCalledTimes(2);
  expect(effectFn).toHaveBeenCalledWith("updated");
});
```

### Circular Dependency Testing

Test components for potential circular dependencies:

```tsx
it('should not have infinite update loops', () => {
  // Mock console.error to catch React maximum update depth errors
  const originalConsoleError = console.error;
  const mockConsoleError = jest.fn();
  console.error = mockConsoleError;
  
  try {
    render(<ComponentWithPotentialCircularDependency />);
    
    // If there's an infinite loop, React will throw a warning
    expect(mockConsoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('Maximum update depth exceeded')
    );
  } finally {
    // Restore original console.error
    console.error = originalConsoleError;
  }
});
```

## Future Improvements

1. **Update Docker configuration** - Mount the tests directory to allow running tests from within the container
2. **Add integration tests** - Test the interaction between components and hooks
3. **Add snapshot tests** - For UI stability verification
4. **Increase test coverage** - Add tests for edge cases and error states
5. **Add test for main EntityList component** - Test the composition of all subcomponents
6. **Add state transition tests** - Test specific state transition flows for complex components
7. **Add React hook dependency tests** - Validate proper dependency array configuration
8. **Implement useEffect tracking tests** - Verify hooks run effects at expected times

## Test Coverage

The current tests cover:

- Basic rendering of all components
- User interactions like clicking buttons and entering text
- State changes in response to prop changes
- Hook state management and side effects
- Error handling for external operations

## Conclusion

The testing approach for the EntityList component follows best practices for React component and hook testing. By testing each piece in isolation, we ensure that the components and hooks work correctly individually, which makes it easier to identify and fix issues.

As we continue to develop and enhance the EntityList component, we'll add more tests to cover new functionality and edge cases.