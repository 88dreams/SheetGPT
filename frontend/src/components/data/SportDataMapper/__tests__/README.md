# SportDataMapper Component Tests

This directory contains tests for the SportDataMapper component and its related hooks and subcomponents.

## Test Files

The following test files are included in this directory:

- `useFieldMapping.test.ts`: Tests for the `useFieldMapping` hook
- `useRecordNavigation.test.ts`: Tests for the `useRecordNavigation` hook
- `useImportProcess.test.ts`: Tests for the `useImportProcess` hook
- `useUiState.test.ts`: Tests for the `useUiState` hook
- `useDataManagement.test.ts`: Tests for the `useDataManagement` hook
- `FieldItem.test.tsx`: Tests for the `FieldItem` component
- `FieldHelpTooltip.test.tsx`: Tests for the `FieldHelpTooltip` component
- `GuidedWalkthrough.test.tsx`: Tests for the `GuidedWalkthrough` component
- `SportDataMapperContainer.test.tsx`: Tests for the `SportDataMapperContainer` component
- `SportDataMapper.test.tsx`: Tests for the wrapper `SportDataMapper` component

## Running Tests

### Locally

To run the tests locally, use the following command from the project root:

```bash
./run-tests-local.sh
```

Or navigate to the frontend directory and run:

```bash
npm test
```

### Using Docker

To run the tests in a Docker container, use the following command from the project root:

```bash
./run-tests.sh
```

This will build and run the frontend-test service defined in the docker-compose.yml file.

## Test Coverage

These tests cover:

1. **Custom Hooks**:
   - State initialization
   - State updates
   - Helper functions
   - Edge cases

2. **Components**:
   - Rendering
   - User interactions
   - Conditional rendering
   - Props handling

3. **Integration**:
   - Component interactions
   - Data flow
   - Event handling

## Mocking

The tests use Jest's mocking capabilities to mock:

- API calls
- Services
- Utility functions
- React hooks
- External libraries

This allows for isolated testing of components and hooks without dependencies on external services.

### Headless UI Mocking

The `@headlessui/react` library is mocked in the Jest setup file (`src/jest-setup.ts`) to provide simplified implementations of its components:

- **Dialog**: Mocked with subcomponents (Panel, Title, Overlay, Description) to render appropriate elements
- **Transition**: Mocked to conditionally render children based on the `show` prop
- **Menu** and **Listbox**: Mocked with their respective subcomponents (Button, Items, Item, etc.)

This approach allows testing components that use Headless UI without the complexity of the actual implementation.

### React DnD Mocking

The `react-dnd` library is also mocked to provide simplified implementations of its hooks:

- **useDrag**: Returns a mock ref and drag state
- **useDrop**: Returns a mock ref and drop state
- **DndProvider**: Renders its children without actual DnD functionality

This allows testing components that use drag-and-drop functionality without the need for a full DnD implementation.

## Testing Challenges and Solutions

### Challenge: Text Split Across Multiple Elements

When testing text that is split across multiple elements, use a custom matcher function:

```typescript
screen.getByText((content, element) => {
  return element?.textContent?.includes('Your Text') || false;
});
```

### Challenge: Multiple Elements with Same Role

When dealing with multiple elements that have the same role (e.g., buttons without text):

```typescript
const buttons = screen.getAllByRole('button', { name: '' });
const specificButton = buttons[0]; // Select the first button
```

### Challenge: Component Rendering in Tests

For components that use complex UI libraries or context providers, use the custom `renderWithDnd` function that wraps the component in the necessary providers.

## Adding New Tests

When adding new tests, follow these guidelines:

1. Create a new test file with the `.test.ts` or `.test.tsx` extension
2. Import the necessary testing utilities
3. Mock any dependencies
4. Write descriptive test cases
5. Run the tests to ensure they pass 