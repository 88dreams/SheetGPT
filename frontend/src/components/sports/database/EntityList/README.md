# EntityList Component

## Overview

The EntityList component displays and manages entity data in a tabular format, with support for various operations like filtering, sorting, editing, and exporting. It has been refactored from a monolithic component into a modular structure with focused components and hooks.

## Structure

The component is organized according to the pattern described in the CLAUDE.md guidelines:

```
EntityList/
├── index.tsx              # Main component with minimal orchestration logic
├── components/            # Sub-components
│   ├── EntityListHeader.tsx
│   ├── ColumnSelector.tsx
│   ├── EntityTable.tsx
│   ├── EntityRow.tsx
│   ├── Pagination.tsx
│   ├── BulkActionBar.tsx
│   ├── ExportDialog.tsx
│   └── index.ts           # Exports all components
├── hooks/                 # Component-specific hooks
│   ├── useColumnVisibility.ts
│   ├── useEntityExport.ts
│   ├── useInlineEdit.ts
│   └── index.ts           # Exports all hooks
└── utils/                 # Component-specific utilities
    ├── csvExport.ts
    ├── formatters.ts
    └── index.ts           # Exports all utilities
```

## Components

- **EntityListHeader** - Header with search, export, and column configuration buttons
- **ColumnSelector** - Dropdown for selecting which columns to display
- **EntityTable** - Main table component for displaying entity data
- **EntityRow** - Row component for displaying and interacting with a single entity
- **Pagination** - Controls for navigating between pages of data
- **BulkActionBar** - Bar for bulk operations on selected entities
- **ExportDialog** - Dialog for configuring and initiating exports

## Hooks

- **useColumnVisibility** - Manages column visibility state and persistence
- **useEntityExport** - Handles exporting data to CSV or Google Sheets
- **useInlineEdit** - Manages inline editing of entity names and nicknames

## Utilities

- **csvExport** - Functions for generating and saving CSV files
- **formatters** - Functions for formatting entity data for display

## Testing

Tests for this component are located in the `tests/frontend/components/sports/database/EntityList` directory. To run these tests:

```bash
docker-compose run --rm frontend-test npm run test:entitylist
```

The tests directory is now mounted in the Docker container, allowing tests to be run directly without copying.

See the ENTITYLIST_TESTING.md document for details on the testing approach.

## Features

- **Column Management**: Show/hide columns with persistence
- **Column Reordering**: Drag and drop column headers to reorder
- **Column Resizing**: Resize columns and persist sizes
- **Sorting**: Sort by any column
- **Pagination**: Navigate through pages of data
- **Inline Editing**: Edit names and nicknames directly in the table
- **Bulk Actions**: Select multiple entities for bulk operations
- **Export**: Export to CSV or Google Sheets
- **ID Display Toggle**: Show full UUIDs or human-readable names
- **Search**: Quick search functionality within loaded data

## Implementation Notes

- Uses React's context (SportsDatabaseContext) for data and state management
- Implements File System Access API for native file saving
- Uses localStorage and sessionStorage for persistence
- Manages drag and drop with custom hooks
- Supports special display for broadcast and production entities
- Handles special formatting for relationship fields