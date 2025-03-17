# DataManagement Feature

This module provides a consolidated implementation of the Data Management feature for SheetGPT.

## Structure

The module follows a feature-based organization:

```
/frontend/src/features/DataManagement/
├── README.md                # This documentation file
├── index.tsx                # Main container component
├── components/              # UI components
│   ├── DataList.tsx         # List of data items in sidebar
│   ├── DataPreview.tsx      # Preview extracted data before saving
│   ├── NoDataView.tsx       # Empty state view
│   └── index.ts             # Component exports
├── hooks/                   # Custom hooks
│   ├── useDataFlow.ts       # DataFlow context integration
│   ├── useDataSelection.ts  # Data selection and management
│   ├── useExtractedData.ts  # Extraction data handling
│   └── index.ts             # Hook exports
```

## Key Features

- Browse and select structured data from a sidebar
- Preview extracted data before saving to database
- View and manipulate data in a table interface
- Delete unwanted data items
- Handles data loading states and error conditions

## Implementation Notes

1. **State Management**
   - Uses React Query for data fetching and caching
   - Preserves selection state with session storage
   - Integrates with DataFlow context for app-wide awareness

2. **Data Flow**
   - Handles data from chat extraction via session storage
   - Supports direct data selection from sidebar
   - Preserves selections across page navigation

3. **Hooks**
   - Follows single responsibility principle
   - Uses proper dependency tracking
   - Implements proper error handling

## Usage

```tsx
import DataManagement from '@/features/DataManagement';

// Simply render the component for full functionality
<DataManagement />
```

## Performance Optimizations

- Memoized filtering and derived state
- Proper dependency tracking in all effects
- Uses React Query's staleTime and caching policies
- Batched updates for UI operations