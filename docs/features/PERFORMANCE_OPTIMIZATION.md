# Performance Optimization Guide

This document provides guidance on the performance optimization techniques being applied in Phase 4 of the SheetGPT refactoring plan.

## Memoization Strategy

### When to Use React.memo

Apply React.memo to components that:
- Render frequently but rarely change their props
- Have expensive rendering logic
- Receive complex object props that maintain reference equality

```tsx
// Before
const ExpensiveComponent = (props: Props) => {
  // Component implementation
};

// After
const ExpensiveComponent = React.memo((props: Props) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom equality function
  return prevProps.id === nextProps.id && 
         prevProps.name === nextProps.name &&
         areEqual(prevProps.data, nextProps.data);
});
```

### Proper useCallback Usage

Always use useCallback for:
- Event handlers passed as props to child components
- Functions used in dependency arrays of hooks
- Functions that create or manipulate expensive resources

```tsx
// Before
const handleClick = () => {
  // Event handler implementation
};

// After
const handleClick = useCallback(() => {
  // Event handler implementation
}, [dependencies]);
```

### Optimizing useMemo

Use useMemo for:
- Expensive calculations
- Creating derived data from props or state
- Preventing unnecessary re-creation of complex objects

```tsx
// Before
const sortedData = data.slice().sort((a, b) => a.name.localeCompare(b.name));

// After
const sortedData = useMemo(() => {
  return data.slice().sort((a, b) => a.name.localeCompare(b.name));
}, [data]);
```

## Object Fingerprinting

### Concept and Implementation

Object fingerprinting creates a stable "hash" representation of an object, allowing for efficient comparison of complex objects by converting them to strings that can be directly compared.

```ts
// Basic implementation
function generateFingerprint(obj: any, depth: number = 1): string {
  if (depth <= 0 || obj === null || obj === undefined) {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(item => generateFingerprint(item, depth - 1)).join(',')}]`;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    return `{${keys.map(key => `${key}:${generateFingerprint(obj[key], depth - 1)}`).join(',')}}`;
  }

  return String(obj);
}
```

### Application in React Components

Use fingerprinting in dependency arrays:

```tsx
const complexObjectFingerprint = useMemo(() => 
  generateFingerprint(complexObject), [complexObject]);

useEffect(() => {
  // Effect uses complexObjectFingerprint instead of complexObject
  // This prevents unnecessary effect runs when the object changes reference but not content
}, [complexObjectFingerprint]);
```

## Virtualization for Large Datasets

### Window-based Rendering

For large lists and tables, only render items visible in the viewport:

```tsx
import { FixedSizeList } from 'react-window';

const VirtualizedList = ({ items }) => (
  <FixedSizeList
    height={500}
    width="100%"
    itemCount={items.length}
    itemSize={50}
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </FixedSizeList>
);
```

### Dynamic Item Sizes

For items with varying heights:

```tsx
import { VariableSizeList } from 'react-window';

const getItemSize = index => {
  // Calculate size based on content
  return items[index].content.length > 100 ? 100 : 50;
};

const VirtualizedList = ({ items }) => (
  <VariableSizeList
    height={500}
    width="100%"
    itemCount={items.length}
    itemSize={getItemSize}
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </VariableSizeList>
);
```

## Performance Measurement

### React DevTools Profiler

Use the React DevTools Profiler to:
- Identify components that render too often
- Measure render durations
- Visualize component updates in the component tree

### Custom Performance Monitoring

Implement performance markers for critical operations:

```tsx
function MeasuredComponent() {
  useEffect(() => {
    // Start performance measurement
    performance.mark('component-start');
    
    // Simulating some operation
    const cleanup = setupExpensiveOperation();
    
    return () => {
      // End performance measurement
      performance.mark('component-end');
      performance.measure('component-lifecycle', 'component-start', 'component-end');
      console.log(performance.getEntriesByName('component-lifecycle'));
      
      cleanup();
    };
  }, []);
  
  return <div>Measured Component</div>;
}
```

## API and Caching Strategies

### Request Deduplication

Prevent multiple identical API requests:

```ts
const inFlightRequests = {};

function dedupedFetch(url) {
  // If there's already a request in flight for this URL, return its promise
  if (inFlightRequests[url]) {
    return inFlightRequests[url];
  }
  
  // Otherwise, make the request and store the promise
  const promise = fetch(url)
    .then(response => response.json())
    .finally(() => {
      // Clean up after the request completes
      delete inFlightRequests[url];
    });
  
  inFlightRequests[url] = promise;
  return promise;
}
```

### Data Prefetching

Prefetch data that users are likely to need:

```ts
function usePrefetchData(currentId, getAdjacentIds) {
  const prefetchedData = useRef({});
  
  useEffect(() => {
    // Get IDs of adjacent items
    const adjacentIds = getAdjacentIds(currentId);
    
    // Prefetch data for each adjacent ID
    adjacentIds.forEach(id => {
      if (!prefetchedData.current[id]) {
        fetchData(id)
          .then(data => {
            prefetchedData.current[id] = data;
          });
      }
    });
  }, [currentId, getAdjacentIds]);
  
  return prefetchedData.current;
}
```

## Component-Specific Optimization Techniques

### DataTable Component

- Implement row virtualization
- Add column-specific renderers
- Optimize sorting and filtering operations
- Implement progressive loading for large datasets
- Use column width calculations only when necessary

### EntityList Component

- Cache entity data by type
- Implement specialized list item renderers by entity type
- Optimize selection state with bitmasks for large sets
- Use windowing for long entity lists
- Implement pagination with prefetching

### SportDataMapper Component

- Optimize drag and drop operations
- Implement efficient field mapping algorithms
- Cache mapping results for quick switching between records
- Use web workers for complex data transformations
- Implement batch processing for multi-record operations

## React State Management Optimization

### Preventing Update Loops

State update loops can significantly impact performance. Use these techniques to prevent them:

```tsx
// Use a ref to track previous values
function useStateWithPrevious<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const prevValue = useRef<T>(initialValue);
  
  const updateValue = useCallback((newValue: T) => {
    // Only update if different to prevent loops
    if (JSON.stringify(newValue) !== JSON.stringify(value)) {
      prevValue.current = value;
      setValue(newValue);
    }
  }, [value]);
  
  return [value, updateValue, prevValue.current] as const;
}
```

### Sequencing State Updates

For dependent state values, ensure updates happen in the correct order:

```tsx
// Pagination component example
function handlePageSizeChange(newSize: number) {
  // Always update page first, then size
  setCurrentPage(1);
  
  // Use setTimeout to ensure separate render cycles
  setTimeout(() => {
    setPageSize(newSize);
  }, 0);
}
```

### Optimized useEffect Dependencies

Prevent unnecessary effect runs with proper dependency tracking:

```tsx
// Track previous dependencies to prevent loops
const prevDependencyRef = useRef(dependency);

useEffect(() => {
  // Skip effect if dependency hasn't meaningfully changed
  if (dependency !== prevDependencyRef.current) {
    // Perform effect actions
    performSideEffect(dependency);
    
    // Update ref for next comparison
    prevDependencyRef.current = dependency;
  }
}, [dependency]);
```

### Breaking Circular Dependencies

For components with circular state dependencies:

```tsx
// Before - Circular dependency
const [stateA, setStateA] = useState(initialA);
const [stateB, setStateB] = useState(computeFromA(initialA));

// If stateA updates based on stateB, and stateB on stateA, we get loops

// After - Breaking the cycle
const [primaryState, setPrimaryState] = useState(initialA);
// Derive secondary state without useState
const secondaryState = useMemo(() => computeFromA(primaryState), [primaryState]);

// Now there's only one source of truth
```

## Best Practices Checklist

- [ ] Profile component before optimization
- [ ] Apply React.memo with proper equality checks
- [ ] Use useCallback for event handlers
- [ ] Apply useMemo for expensive calculations
- [ ] Implement virtualization for long lists/tables
- [ ] Use fingerprinting for complex object dependencies
- [ ] Track previous values with useRef for comparison
- [ ] Sequence state updates in correct logical order
- [ ] Add explicit change detection before setState calls
- [ ] Carefully review useEffect dependency arrays
- [ ] Break circular dependencies with proper state design
- [ ] Optimize network requests with caching and deduplication
- [ ] Measure performance after optimization
- [ ] Document performance improvements

## Further Reading

- [React Performance Optimization](https://reactjs.org/docs/optimizing-performance.html)
- [useCallback documentation](https://reactjs.org/docs/hooks-reference.html#usecallback)
- [useMemo documentation](https://reactjs.org/docs/hooks-reference.html#usememo)
- [React.memo documentation](https://reactjs.org/docs/react-api.html#reactmemo)
- [react-window for virtualization](https://react-window.vercel.app/)
- [Web Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)