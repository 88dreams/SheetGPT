# SmartColumn Component

This document describes the SmartColumn component which provides visual indicators for sortable relationship fields across the SheetGPT application.

## Overview

The SmartColumn component enhances table headers by visually highlighting relationship fields and standardizing column rendering across different data grids in the application. It helps users understand the data model by clearly identifying which columns are relationships to other entities.

## Implementation

### Component Design

The SmartColumn component replaces standard `<th>` elements in tables and provides:

1. **Visual Identification**: Relationship fields are shown in blue text with a link icon
2. **Consistent Sorting Interface**: Standardized sort icons and behavior
3. **Resizing Capability**: Column width resizing with consistent UI
4. **Drag and Drop Support**: Column reordering with visual feedback
5. **Extensibility**: Support for additional header content (like hide column buttons)

### Features

- **Relationship Detection**: Automatically identifies relationship fields
- **Field Name Formatting**: Converts snake_case to Title Case for display
- **Visual Indicators**: Uses blue text and a link icon for relationship fields
- **Sort Direction Display**: Shows appropriate sort direction icons
- **Reusability**: Used across multiple grid components in the application

### Example Usage

```tsx
<SmartColumn
  field="league_id"
  sortField={sortField}
  sortDirection="asc"
  handleSort={handleSort}
  entities={entityData}
  handleResizeStart={onColumnResize}
  columnWidth={150}
  draggedHeader={draggedHeader}
  dragOverHeader={dragOverHeader}
  handleColumnDragStart={onDragStart}
  handleColumnDragOver={onDragOver}
  handleColumnDrop={onDrop}
  handleColumnDragEnd={onDragEnd}
  additionalHeaderContent={<button>Additional UI</button>}
/>
```

## Integration Points

The SmartColumn component has been integrated in:

1. **EntityList**: For displaying entity tables with relationship indicators
2. **DataTable / DataGrid**: For data preview and export workflows
3. **DatabaseQuery**: For displaying query results with relationship context

## Relationship Detection Logic

The component determines if a field is a relationship field by:

1. Checking if the field name is in a known list of relationship fields (e.g., `league_name`, `entity_name`)
2. For ID fields, checking if there's a corresponding name field (e.g., `team_id` + `team_name`)

```typescript
function isRelationshipSortField(field: string, entities: any[]): boolean {
  if (entities.length === 0) return false;
  
  // Known relationship fields
  const knownRelationshipFields = [
    'league_name', 
    'league_sport',
    'division_conference_name',
    'team_name',
    'stadium_name',
    'broadcast_company_name',
    'production_company_name',
    'entity_name',
    'entity_type'
  ];
  
  if (knownRelationshipFields.includes(field)) {
    return true;
  }
  
  // Check if it's an ID field with a corresponding _name field
  if (field.endsWith('_id') && entities[0]?.hasOwnProperty(field.replace('_id', '_name'))) {
    return true;
  }
  
  return false;
}
```

## Testing

The SmartColumn component has comprehensive test coverage:

- Unit tests for the component's rendering and behavior
- Tests for relationship field detection logic
- Tests for sorting icon display and interactions
- Tests for drag-and-drop and resize handle functionality

## Benefits

1. **Improved User Experience**: Users can easily identify relationship fields
2. **Consistent UI**: Standardized column headers across the application
3. **Visual Data Model**: Helps users understand entity relationships
4. **DRY Implementation**: Eliminates code duplication for column header logic
5. **Better Maintainability**: Centralizes column header logic in one component

## Future Improvements

1. **Tooltips for Relationship Fields**: Add tooltips that explain the relationship
2. **Show Related Entity Type**: Display the type of entity the field relates to
3. **Improved Filtering**: Add specialized filtering controls for relationship fields
4. **Relationship Path Visualization**: Show full relationship paths for nested entities
5. **Custom Column Types**: Extend SmartColumn to support other specialized column types

## Usage Guidelines

1. **Import from Common Components**: Always import from `components/common/SmartColumn`
2. **Pass Real Entity Data**: Ensure `entities` prop has actual data for relationship detection
3. **Add Custom Header Content**: Use `additionalHeaderContent` for column-specific controls
4. **Set Appropriate Column Width**: Provide `columnWidth` for proper sizing
5. **Use with Type Safety**: Ensure all required props are provided with correct types