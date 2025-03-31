# Relationship Field Sorting

This document outlines the implementation of sortable relationship fields in the SheetGPT application.

## Overview

Relationship field sorting allows users to sort entities by fields from related entities, such as sorting teams by their league name or sorting games by team names. This feature enhances the user experience by providing more intuitive data organization options.

## Backend Implementation

The backend implementation handles two types of relationship sorting:

1. **Direct Relationships**: Fields that can be sorted using SQL JOINs (e.g., `team.league_id → league.name`)
2. **Polymorphic Relationships**: Relationships that require in-memory sorting due to the `entity_type` and `entity_id` pattern

### Key Components

#### 1. Relationship Sort Configuration

The `get_relationship_sort_config` method in `facade.py` defines mappings between entity types, relationship fields, and join configurations:

```python
def get_relationship_sort_config(self, entity_type: str) -> dict:
    """Return a configuration for sortable relationship fields for the given entity type."""
    
    # Common configuration pattern for direct relationships
    config = {
        # Entity Type: {
        #   "field_name": {
        #       "join_table": "table_name",
        #       "join_field": "field_to_join_on",
        #       "sort_field": "field_to_sort_by"
        #   }
        # }
    }
    
    # Team entity relationships
    if entity_type == "team":
        config = {
            "league_name": {
                "join_table": "league",
                "join_field": "league_id",
                "sort_field": "name"
            },
            "league_sport": {
                "join_table": "league",
                "join_field": "league_id",
                "sort_field": "sport"
            },
            # Additional relationship fields...
        }
    
    # ... configurations for other entity types ...
    
    return config
```

#### 2. Enhanced Entity Query

The `get_entities` method detects if sorting is by a relationship field and applies the appropriate strategy:

```python
async def get_entities(self, entity_type: str, sort_field=None, sort_order="asc", ...):
    """Get entities with support for relationship sorting."""
    
    # Normalize entity_type
    entity_type = self.normalize_entity_type(entity_type)
    
    # Get entity model and relationship sort configuration
    model_class = self.get_model_class(entity_type)
    sort_config = self.get_relationship_sort_config(entity_type)
    
    # Determine if we're sorting by a relationship field
    is_relationship_sort = sort_field in sort_config
    
    # Handle direct relationship sorting with JOIN
    if is_relationship_sort and not is_polymorphic_relationship(entity_type, sort_field):
        config = sort_config[sort_field]
        join_table = config["join_table"]
        join_field = config["join_field"]
        sort_field_actual = config["sort_field"]
        
        # Build query with JOIN
        query = (
            select(model_class)
            .join(
                aliased(get_model_class(join_table)), 
                getattr(model_class, join_field) == getattr(get_model_class(join_table), "id")
            )
            .order_by(
                getattr(get_model_class(join_table), sort_field_actual).asc() 
                if sort_order == "asc" 
                else getattr(get_model_class(join_table), sort_field_actual).desc()
            )
        )
    
    # Handle polymorphic relationships with in-memory sorting
    elif is_relationship_sort and is_polymorphic_relationship(entity_type, sort_field):
        # Fetch entities without sorting
        entities = await self.get_entities_without_sort(entity_type, ...)
        
        # Apply in-memory sorting based on related entity names
        entities = await self.get_entities_with_related_names(entities, entity_type)
        
        # Sort the entities in memory
        return sorted(
            entities,
            key=lambda x: x.get(sort_field, ""),
            reverse=(sort_order == "desc")
        )
    
    # Standard sorting for non-relationship fields
    else:
        # ... standard sorting implementation ...
    
    return result
```

#### 3. Special Cases

Special handling is implemented for:

- **Null Values**: Using `nulls_last` for consistent ordering
- **Polymorphic Fields**: In-memory sorting for entity_type/entity_id relationships
- **Special Entity Types**: Proper sorting for fields like `league_sport`

## Frontend Implementation

### 1. SmartColumn Component

A new `SmartColumn` component visually indicates sortable relationship fields:

```tsx
const SmartColumn: React.FC<SmartColumnProps> = ({
  field,
  sortField,
  sortDirection,
  handleSort,
  entities,
  // ...other props
}) => {
  // Check if this is a relationship field
  const isRelationship = useMemo(() => 
    isSortableRelationshipField(field, entities), 
    [field, entities]
  );
  
  return (
    <th onClick={() => handleSort(field)} /* other props */>
      <div className="flex items-center">
        {/* Display the field name with special styling for relationship fields */}
        <span className={`${isRelationship ? 'text-blue-600' : ''}`}>
          {displayName}
        </span>
        
        {/* Relationship indicator */}
        {isRelationship && (
          <FaLink className="ml-1 text-blue-400 text-xs" title="Relationship field" />
        )}
        
        {/* Sort icon */}
        {renderSortIcon()}
      </div>
    </th>
  );
};
```

### 2. Relationship Field Detection

The `isSortableRelationshipField` utility identifies relationship fields:

```tsx
export function isSortableRelationshipField(field: string, entities: any[]): boolean {
  if (entities.length === 0) return false;
  
  // Known relationship sort fields
  const knownRelationshipFields = [
    'league_name', 
    'league_sport',
    'division_conference_name',
    'team_name',
    'stadium_name',
    'broadcast_company_name',
    'production_company_name',
    'entity_name'
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

### 3. Sorting Hook

The `useSorting` hook manages sorting state:

```tsx
export function useSorting() {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Handle sort column change
  const handleSort = useCallback((field: string) => {
    // If clicking the same field, toggle direction
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Reset pagination when sorting changes
    if (resetPagination) {
      resetPagination();
    }
  }, [sortField, resetPagination]);
  
  // ... other sorting functions ...
  
  return {
    sortField,
    sortDirection,
    handleSort,
    // ... other properties ...
  };
}
```

## Supported Entity Types and Fields

The following entity types support relationship field sorting:

### Team
- `league_name` - Sort by the name of the team's league
- `league_sport` - Sort by the sport of the team's league
- `division_conference_name` - Sort by division/conference name

### Division/Conference
- `league_name` - Sort by the name of the division's league
- `league_sport` - Sort by the sport of the division's league

### Game
- `team_name` - Sort by home team name
- `away_team_name` - Sort by away team name
- `stadium_name` - Sort by stadium name
- `league_name` - Sort by league name
- `league_sport` - Sort by league sport

### Broadcast Rights
- `broadcast_company_name` - Sort by broadcast company name
- `entity_name` - Sort by the name of the related entity (game, team, etc.)
- `entity_type` - Sort by entity type
- `league_name` - Sort by league name (for related entities)
- `league_sport` - Sort by league sport (for related entities)

### Production Services
- `production_company_name` - Sort by production company name
- `entity_name` - Sort by the name of the related entity
- `entity_type` - Sort by entity type
- `league_name` - Sort by league name (for related entities)
- `league_sport` - Sort by league sport (for related entities)

## Testing

### Automated Testing

1. **SmartColumn Component**
   - Tests render behavior with different field types
   - Verifies proper styling and icon display for relationship fields
   - Tests sort icon display based on sort state
   - Tests interaction handlers
   
2. **Formatter Utilities**
   - Tests `isSortableRelationshipField` with various field types
   - Verifies identification of known relationship fields
   - Checks behavior with empty entity arrays

### Manual Testing

1. **Test Page**: `sort_test.html` provides a simple interface for testing the sorting behavior directly.

2. **API Testing Script**: `direct_sorting_test.py` tests the backend sorting implementation using direct SQLAlchemy interactions.

## Limitations and Future Improvements

1. **Performance**: In-memory sorting for polymorphic relationships may have performance implications with large datasets. Future optimizations could include:
   - Adding materialized views for frequently sorted polymorphic relationships
   - Implementing database-level sorting for more complex relationship patterns
   - Adding caching for complex sorting operations

2. **Additional Fields**: Consider supporting more relationship fields:
   - Secondary relationships (e.g., team → division → league)
   - Many-to-many relationships
   - Nested polymorphic relationships

3. **UI Improvements**:
   - Implement more robust visual feedback for active sorts
   - Add tooltips explaining the relationship source
   - Provide context information about where relationship data comes from

## Conclusion

The relationship field sorting implementation enhances the SheetGPT application by allowing users to sort entities by related fields in a consistent manner. The backend implementation balances database-level optimization with in-memory flexibility, while the frontend provides clear visual indicators for sortable relationship fields.