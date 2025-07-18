# API Caching and Prefetching Strategies

## Overview

This document explains the advanced API caching and prefetching strategies implemented in the SheetGPT application to improve performance, reduce network traffic, and enhance the user experience.

## Core Components

### 1. Enhanced API Client

The Enhanced API Client wraps the standard Axios client with advanced features:

- **Transparent Caching**: Automatically caches GET requests based on configurable policies
- **Request Deduplication**: Prevents duplicate network requests for concurrent identical calls
- **Automatic Retries**: Intelligently retries failed requests with exponential backoff
- **Error Normalization**: Converts various errors into consistent application error types

### 2. Tiered Caching

The caching system uses a tiered approach to balance performance and persistence:

- **Memory Cache**: Fastest access for the current session
- **Session Storage**: Persists across page refreshes within the same tab
- **Local Storage**: Persists across browser sessions and tabs

### 3. Prefetching Strategies

Prefetching loads data before users explicitly request it:

- **On-Mount Prefetching**: Loads data as soon as a component mounts
- **Hover Prefetching**: Loads data when users hover over elements
- **Proximity Prefetching**: Loads nearby items in lists and tables

## API Caching Implementation

### Cache Key Generation

Cache keys are generated based on the request method, URL, parameters, and data:

```typescript
const cacheKey = `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
```

### Cache Entry Structure

Each cache entry includes:

- **Response Data**: The full response object
- **Timestamp**: When the entry was created
- **Expiration**: When the entry will expire

### Cache Invalidation

Cache entries are invalidated:

- **Automatically**: Based on TTL (Time To Live)
- **Manually**: Using `clearCache()` API
- **Selectively**: Using pattern-based invalidation

### Request Deduplication

Concurrent identical requests are handled efficiently:

1. **First Request**: Becomes the canonical request
2. **Subsequent Requests**: Linked to the first request's promise
3. **Resolution**: All requests receive the same response

## Prefetching Implementation

### Hover-Based Prefetching

```tsx
const EntityListItem = ({ entity }) => {
  const { onMouseEnter, onMouseLeave } = usePrefetchOnHover(
    `/api/v1/entities/${entity.id}/details`,
    { hoverDelay: 200 }
  );
  
  return (
    <div 
      onMouseEnter={onMouseEnter} 
      onMouseLeave={onMouseLeave}
    >
      {entity.name}
    </div>
  );
};
```

### Virtualizing with Prefetching

```tsx
const VirtualizedList = ({ items }) => {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 50,
  });
  
  const virtualItems = virtualizer.getVirtualItems();
  const visibleStartIndex = virtualItems[0]?.index || 0;
  const visibleEndIndex = virtualItems[virtualItems.length - 1]?.index || 0;
  
  // Prefetch items just outside the visible range
  usePrefetchNearbyItems(
    '/api/v1/entities',
    items.map(item => item.id),
    visibleStartIndex,
    visibleEndIndex,
    { lookahead: 5 }
  );
  
  // Render virtualized list...
};
```

## Performance Benefits

### Reduced Network Traffic

- **Cache Hits**: Avoid redundant network requests for identical data
- **Deduplication**: Prevents duplicate requests for the same resource
- **Batch Loading**: Efficiently loads related data in batches

### Improved User Experience

- **Faster Interactions**: Data is often available immediately from cache
- **Reduced Loading States**: Prefetching minimizes visible loading spinners
- **Smoother Navigation**: Next pages load faster due to preloaded data

### Resource Efficiency

- **Controlled Concurrency**: Limits parallel requests to prevent API overload
- **Data-Saver Awareness**: Respects user preferences for data usage
- **Abort Cleanup**: Properly cancels in-flight requests when no longer needed

## Usage Guidelines

### When to Use Caching

- **Static Data**: Lists, reference data, and configuration rarely change
- **Read-Heavy Operations**: Frequently accessed but rarely modified data
- **Expensive Computations**: Results of complex API operations

### When to Use Prefetching

- **List Detail Views**: Prefetch details for items in a list
- **Sequential Workflows**: Prefetch next steps in a multi-step process
- **Related Data**: Prefetch related entities based on the current view

### Caching Considerations

- **Stale Data**: Set appropriate TTLs based on data volatility
- **Cache Size**: Monitor cache size in storage-constrained environments
- **Write Operations**: Always invalidate relevant cache entries after writes

## Monitoring and Debugging

The API caching system includes comprehensive statistics and debugging tools:

- **Cache Stats**: Hits, misses, and size information
- **Cache Inspection**: View current cache contents
- **Development Mode**: Special behavior in development for easier debugging

## Integration with React Query

The caching system works alongside React Query for components that use it:

- **Shared Cache Keys**: Consistent key generation between systems
- **Complementary Prefetching**: Works with React Query's prefetchQuery
- **Query Invalidation**: APIs to invalidate both caches when needed
