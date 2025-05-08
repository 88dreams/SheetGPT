# SheetGPT Testing Infrastructure Guide

This guide provides a comprehensive introduction to the testing infrastructure in the SheetGPT project. It explains how Jest and React Testing Library are used, how to run tests, and best practices for writing tests.

## Table of Contents

1. [Testing Stack Overview](#testing-stack-overview)
2. [Setting Up the Testing Environment](#setting-up-the-testing-environment)
3. [Running Tests](#running-tests)
4. [Test File Structure](#test-file-structure)
5. [Writing Tests](#writing-tests)
6. [Mocking](#mocking)
7. [Common Testing Patterns](#common-testing-patterns)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Testing Stack Overview

SheetGPT uses the following testing tools:

- **Jest**: A JavaScript testing framework that provides a test runner, assertion library, and mocking capabilities.
- **React Testing Library**: A library for testing React components that encourages testing components as users would interact with them.
- **ts-jest**: A TypeScript preprocessor for Jest that allows testing TypeScript code.
- **jest-dom**: Provides custom DOM element matchers for Jest.

These tools work together to provide a comprehensive testing solution for the React/TypeScript frontend.

## Setting Up the Testing Environment

The testing environment is configured in several key files:

### 1. `jest.config.js`

This file configures Jest for the project:

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/jest-setup.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!react-dnd|react-dnd-html5-backend|dnd-core)/'
  ]
};
```

Key configuration points:
- Uses `jsdom` as the test environment to simulate a browser environment
- Configures TypeScript support with `ts-jest`
- Sets up test matching patterns to find test files
- Specifies `jest-setup.ts` for global setup and mocks
- Configures module transformations and path mappings

### 2. `tsconfig.test.json`

This file extends the main TypeScript configuration with testing-specific settings:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "types": ["jest", "node", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/jest-setup.ts"]
}
```

### 3. `src/jest-setup.ts`

This file sets up global mocks and configurations for all tests:

```typescript
// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Mock console.error to filter out specific warnings
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out act() warnings
  if (
    args[0] && 
    typeof args[0] === 'string' && 
    args[0].includes('Warning: An update to') && 
    args[0].includes('inside a test was not wrapped in act')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock react-dnd
jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => children,
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()]
}));

// Mock @headlessui/react
jest.mock('@headlessui/react', () => {
  const React = require('react');
  const Dialog = ({ children, open, onClose, ...props }) => {
    if (!open) return null;
    return React.createElement('div', { role: 'dialog', ...props }, children);
  };
  
  // Add subcomponents to Dialog
  Dialog.Panel = ({ children, ...props }) => 
    React.createElement('div', props, children);
  Dialog.Title = ({ children, ...props }) => 
    React.createElement('h2', props, children);
  Dialog.Overlay = ({ children, ...props }) => 
    React.createElement('div', props, children);
  Dialog.Description = ({ children, ...props }) => 
    React.createElement('div', props, children);
  
  return {
    Dialog,
    Transition: {
      Child: ({ children }) => children,
      Root: ({ children, show }) => {
        if (!show) return null;
        return children;
      }
    },
    Menu: {
      Button: ({ children }) => React.createElement('button', null, children),
      Items: ({ children }) => React.createElement('div', null, children),
      Item: ({ children }) => React.createElement('div', null, children)
    },
    Listbox: {
      Button: ({ children }) => React.createElement('button', null, children),
      Options: ({ children }) => React.createElement('div', null, children),
      Option: ({ children }) => React.createElement('div', null, children)
    }
  };
});
```

This file:
- Imports Jest DOM matchers for enhanced DOM testing
- Mocks `console.error` to filter out specific React warnings
- Mocks browser APIs like `ResizeObserver`
- Provides mocks for complex libraries like React DnD and Headless UI

### 4. `src/types/jest-dom.d.ts`

This file provides TypeScript type definitions for Jest DOM matchers:

```typescript
/// <reference types="jest" />

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      // DOM Testing Library matchers
      toBeInTheDocument(): R;
      toBeVisible(): R;
      // ... other matchers
    }
  }
}

// Add declarations for @testing-library/react
declare module '@testing-library/react' {
  interface Screen {
    getByText(text: string | RegExp): HTMLElement;
    queryByText(text: string | RegExp): HTMLElement | null;
  }
}

export {};
```

## Running Tests

There are several ways to run tests in the SheetGPT project:

### 1. Running Tests Locally

You can run tests locally using the npm test script:

```bash
# From the project root
./run-tests-local.sh

# Or navigate to the frontend directory and run
cd frontend
npm test
```

To run specific tests, you can use the Jest test pattern:

```bash
# Run tests for a specific file or pattern
npm test -- --testPathPattern=SportDataMapper

# Run tests without TypeScript type checking (faster)
npm test -- --no-typecheck

# Run tests with coverage report
npm test -- --coverage
```

### 2. Running Tests in Docker

You can also run tests in a Docker container:

```bash
# From the project root
./run-tests.sh
```

This will build and run the frontend-test service defined in the docker-compose.yml file.

### 3. CI/CD Integration

The SheetGPT project uses GitHub Actions for continuous integration and deployment. Tests are automatically run in the CI/CD pipeline when code is pushed to the main branch or when a pull request is created.

#### CI/CD Workflow

The CI/CD workflow is defined in `.github/workflows/ci-cd.yml` and includes the following steps:

1. **Checkout Code**: Retrieves the latest code from the repository
2. **Set up Docker Buildx**: Prepares the Docker build environment
3. **Create Network Volume**: Sets up a Docker volume for networking
4. **Run Tests**: Executes the test suite using Docker Compose
5. **Check Test Results**: Verifies that all tests passed successfully

#### Monitoring CI/CD Runs

You can monitor CI/CD workflow runs using the GitHub CLI:

```bash
# List recent workflow runs
gh run list

# View details of a specific run
gh run view [run-id]

# Watch a workflow run in real-time
gh run watch [run-id]
```

Or through the GitHub web interface under the "Actions" tab of the repository.

#### Troubleshooting CI/CD Issues

If tests pass locally but fail in the CI/CD pipeline, check for:

1. **Environment Differences**: Ensure your local Docker setup matches the CI environment
2. **Dependency Issues**: Verify that all dependencies are correctly installed in the Docker image
3. **Test Timing**: Some tests may be sensitive to timing issues in the CI environment

For more detailed information about the CI/CD pipeline, see [CI/CD Pipeline](../docs/CI_CD_PIPELINE.md).

## Test File Structure

Tests are organized in `__tests__` directories alongside the components they test:

```
frontend/src/
├── components/
│   └── data/
│       └── SportDataMapper/
│           ├── components/
│           │   ├── FieldItem.tsx
│           │   └── GuidedWalkthrough.tsx
│           ├── hooks/
│           │   ├── useFieldMapping.ts
│           │   └── useRecordNavigation.ts
│           ├── __tests__/
│           │   ├── FieldItem.test.tsx
│           │   ├── GuidedWalkthrough.test.tsx
│           │   ├── useFieldMapping.test.ts
│           │   ├── useRecordNavigation.test.ts
│           │   └── README.md
│           └── SportDataMapperContainer.tsx
```

Each test file follows a naming convention of `ComponentName.test.tsx` or `hookName.test.ts`.

## Writing Tests

### Component Tests

Here's an example of a component test:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import FieldHelpTooltip from '../components/FieldHelpTooltip';
import '@testing-library/jest-dom';

describe('FieldHelpTooltip', () => {
  it('should not render when showFieldHelp does not match field', () => {
    render(
      <FieldHelpTooltip 
        field="name"
        showFieldHelp="city" // Different field
      />
    );
    
    // The component should not render anything
    const tooltipText = screen.queryByText(/The name of the entity/i);
    expect(tooltipText).not.toBeInTheDocument();
  });
  
  it('should render help text for name field', () => {
    render(
      <FieldHelpTooltip 
        field="name"
        showFieldHelp="name" // Matching field
      />
    );
    
    // Should render help text for name field
    const tooltipText = screen.getByText(/The name of the entity/i);
    expect(tooltipText).toBeInTheDocument();
  });
});
```

### Hook Tests

Here's an example of a hook test:

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import useFieldMapping from '../hooks/useFieldMapping';

describe('useFieldMapping', () => {
  it('should initialize with empty mappings', () => {
    const { result } = renderHook(() => useFieldMapping());
    
    expect(result.current.mappingsByEntityType).toEqual({});
    expect(result.current.selectedEntityType).toBeNull();
  });
  
  it('should handle field mapping', () => {
    const { result } = renderHook(() => useFieldMapping('team'));
    
    act(() => {
      result.current.handleFieldMapping('sourceName', 'name');
    });
    
    expect(result.current.mappingsByEntityType).toEqual({
      team: {
        name: 'sourceName'
      }
    });
  });
});
```

## Mocking

Mocking is a crucial part of testing in SheetGPT. Here are the main mocking strategies:

### 1. Component Mocks

Components can be mocked using Jest's mock function:

```typescript
jest.mock('../SportDataMapperContainer', () => {
  return jest.fn(() => <div data-testid="mock-container">Mocked Container</div>);
});
```

### 2. Hook Mocks

Custom hooks can be mocked to provide controlled test data:

```typescript
jest.mock('../hooks/useFieldMapping', () => ({
  __esModule: true,
  default: () => ({
    mappingsByEntityType: {},
    selectedEntityType: 'team',
    setSelectedEntityType: jest.fn(),
    handleFieldMapping: jest.fn(),
    clearMappings: jest.fn(),
    removeMapping: jest.fn(),
    getCurrentMappings: jest.fn().mockReturnValue({})
  })
}));
```

### 3. Library Mocks

External libraries are mocked to simplify testing:

```typescript
// Mock react-dnd
jest.mock('react-dnd', () => ({
  DndProvider: ({ children }) => children,
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()]
}));
```

### 4. API Mocks

API calls can be mocked using Jest's mock function:

```typescript
jest.mock('../../services/api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'mocked data' })
}));
```

## Common Testing Patterns

### 1. Testing Component Rendering

```typescript
it('should render the component', () => {
  render(<MyComponent />);
  expect(screen.getByText('My Component')).toBeInTheDocument();
});
```

### 2. Testing User Interactions

```typescript
it('should handle button click', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click Me</Button>);
  
  const button = screen.getByText('Click Me');
  fireEvent.click(button);
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### 3. Testing Conditional Rendering

```typescript
it('should show content when isOpen is true', () => {
  render(<Modal isOpen={true}>Modal Content</Modal>);
  expect(screen.getByText('Modal Content')).toBeInTheDocument();
});

it('should not show content when isOpen is false', () => {
  render(<Modal isOpen={false}>Modal Content</Modal>);
  expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
});
```

### 4. Testing with Custom Render Functions

For components that require specific context or providers, create custom render functions:

```typescript
const renderWithDnd = (ui) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {ui}
    </DndProvider>
  );
};

it('should render with DnD provider', () => {
  renderWithDnd(<DraggableComponent />);
  // Test assertions
});
```

## Troubleshooting

### 1. Text Split Across Multiple Elements

When testing text that is split across multiple elements, use a custom matcher function:

```typescript
screen.getByText((content, element) => {
  return element?.textContent?.includes('Your Text') || false;
});
```

### 2. Multiple Elements with Same Role

When dealing with multiple elements that have the same role:

```typescript
const buttons = screen.getAllByRole('button');
const specificButton = buttons[0]; // Select the first button
```

### 3. Act Warnings

If you see warnings about updates not wrapped in act(), you can:

1. Wrap your code in act():
```typescript
act(() => {
  // Code that causes state updates
});
```

2. Use the mock in jest-setup.ts that filters these warnings

### 4. Testing Asynchronous Code

Use `async/await` with `findBy` queries:

```typescript
it('should load data asynchronously', async () => {
  render(<AsyncComponent />);
  
  // Initially loading
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // Wait for data to load
  const dataElement = await screen.findByText('Data Loaded');
  expect(dataElement).toBeInTheDocument();
});
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on testing what the component does, not how it does it.

2. **Use Semantic Queries**: Prefer queries like `getByRole`, `getByLabelText`, and `getByText` over `getByTestId`.

3. **Mock External Dependencies**: Always mock external dependencies to isolate the component being tested.

4. **Keep Tests Simple**: Each test should test one thing and have a clear purpose.

5. **Use Descriptive Test Names**: Test names should describe what the test is checking.

6. **Organize Tests Logically**: Group related tests together using `describe` blocks.

7. **Clean Up After Tests**: Use `afterEach` to clean up any side effects from tests.

8. **Test Edge Cases**: Don't just test the happy path; test error states and edge cases.

9. **Avoid Testing Implementation Details**: Don't test internal state or methods directly.

10. **Keep Mocks Simple**: Only mock what you need to, and keep mocks as simple as possible.

By following these guidelines, you can write effective tests that provide confidence in your code and catch regressions early. 