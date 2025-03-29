# Entity Resolution Strategy

## Overview

The Entity Resolution Strategy is a core component of SheetGPT's sports data management system, providing a robust mechanism for resolving entity references across different entity types. This document explains the implementation details, usage patterns, and best practices for leveraging the enhanced entity resolution capabilities.

## Key Features

### 1. Unified Resolution Interface

The new entity resolution system provides a unified interface for resolving entities across all entity types with consistent behavior:

```python
# Resolve an entity to its full data
entity = await entity_resolver.resolve_entity(db, entity_type, name_or_id, context)

# Resolve an entity to just its ID (for foreign key references)
entity_id = await entity_resolver.resolve_entity_reference(db, entity_type, name_or_id, context)

# Batch resolve multiple references in a single operation
results = await entity_resolver.resolve_references(db, references)
```

### 2. Multi-stage Resolution Strategy

Entities are resolved through a multi-stage process with progressive fallback strategies:

1. **ID Lookup**: If the input is a valid UUID, try direct ID lookup first
2. **Exact Name Match**: Try to find an entity with the exact name
3. **Case-insensitive Match**: Try case-insensitive name matching
4. **Fuzzy Name Matching**: Apply fuzzy matching for similar names
5. **Context-aware Resolution**: Use related entity information for better matching
6. **Cross-entity Type Fallbacks**: Try alternative entity types for specific cases

### 3. Configurable Resolution Paths

Resolution paths define the sequence of entity types to try when resolving an entity:

```python
RESOLUTION_PATHS = {
    "broadcast_company": ["broadcast_company", "brand"],
    "production_company": ["production_company", "brand"],
    "division": ["division_conference"],
    # ...
}
```

This allows for intelligent fallbacks between related entity types, such as trying to resolve a "broadcast_company" as a "brand" if no direct match is found.

### 4. Fuzzy Name Matching

The system includes sophisticated fuzzy name matching with configurable threshold:

```python
# Configure fuzzy matching threshold (0.0 to 1.0)
resolver = EntityResolver(fuzzy_threshold=0.8)
```

Name standardization is applied before fuzzy matching to improve results:
- Converting to lowercase
- Removing special characters
- Handling common abbreviations (e.g., "United States" → "USA")
- Normalizing alternative forms (e.g., "FC" → "Football Club")

### 5. Context-aware Resolution

Context information can be provided to improve resolution accuracy:

```python
# Resolve "Cowboys" in the context of NFL
context = {"league_id": "NFL"}
team = await resolver.resolve_entity(db, "team", "Cowboys", context)
```

This allows for more accurate resolution of ambiguous names by using related entity information.

### 6. Virtual Entity Handling

Special handling is provided for virtual entity types that don't have database tables:

```python
# Resolve a championship (virtual entity)
championship = await resolver.resolve_entity(db, "championship", "Super Bowl")
```

Virtual entities receive deterministic UUIDs based on their type and name, ensuring consistent identification across the system.

### 7. Detailed Resolution Metadata

The resolver provides rich metadata about how entities were resolved:

```json
{
  "entity": {
    "id": "c8a7f982-3d60-4f36-b7d1-718337373cc4",
    "name": "Dallas Cowboys",
    "league_id": "d3ba3718-ef8e-4eaf-8a55-7e9a1d2452a9"
  },
  "resolution_info": {
    "fuzzy_matched": true,
    "match_score": 0.82,
    "resolved_via": "team",
    "original_request": {
      "entity_type": "team",
      "name_or_id": "dallas cowbys"
    }
  }
}
```

This metadata is valuable for debugging and providing user feedback on how entities were matched.

### 8. Standardized Error Handling

The resolver provides a structured error class for entity resolution failures:

```python
try:
    entity = await resolver.resolve_entity(db, "team", "Unknown Team")
except EntityResolutionError as e:
    error_dict = e.to_dict()
    # {
    #   "error": "entity_resolution_error",
    #   "message": "Could not resolve team with identifier: Unknown Team",
    #   "entity_type": "team",
    #   "name": "Unknown Team",
    #   "context": { ... }
    # }
```

## Integration with Frontend

The frontend includes a corresponding entity resolver utility:

```typescript
// Resolve an entity to its full data
const team = await entityResolver.resolveEntity<Team>('team', 'Dallas Cowboys');

// Resolve an entity to just its ID
const teamId = await entityResolver.resolveEntityId('team', 'Dallas Cowboys');

// Batch resolve multiple references
const references = {
  league: { name: 'NFL' },
  team: { name: 'Dallas Cowboys', context: { league_id: 'NFL' } }
};
const result = await entityResolver.resolveReferences(references);
```

## Implementation Details

### Core Components

1. **EntityResolver Class**: Centralized resolver with methods for entity resolution
2. **RESOLUTION_PATHS**: Configuration of entity type fallback paths
3. **RELATED_ENTITY_TYPES**: Map of related entity types for context-aware resolution
4. **VIRTUAL_ENTITY_TYPES**: Set of virtual entity types for special handling
5. **EntityResolutionError**: Structured error class for resolution failures

### Resolution Algorithm

1. Check if input is UUID, if so try direct ID lookup
2. Normalize entity type and get resolution path
3. For each entity type in the resolution path:
   a. Try exact name match
   b. Try case-insensitive match
   c. Try fuzzy name matching
4. If no match found and context provided, try context-aware resolution
5. If still no match, raise EntityResolutionError

### Name Standardization

Name standardization improves matching success through:

1. Converting to lowercase
2. Removing extra whitespace
3. Removing special characters
4. Handling common abbreviations and alternative forms
5. Removing leading/trailing whitespace

### Virtual Entity Handling

Virtual entities (championships, tournaments, etc.) are handled with:

1. Deterministic UUID generation based on entity type and name
2. Consistent representation in the system despite lack of database tables
3. Special flags in entity data to identify virtual entities

## Best Practices

### When to Use Entity Resolution

1. **Foreign Key References**: Use `resolve_entity_reference` for entity references in create/update operations
2. **Entity Lookup**: Use `resolve_entity` when looking up an entity by name or ID
3. **Multiple References**: Use `resolve_references` when dealing with multiple entity references at once

### Providing Effective Context

Context can significantly improve resolution accuracy:

1. **League Context**: When resolving teams or divisions, include the league_id
2. **Team Context**: When resolving players, include the team_id
3. **Parent Entity Context**: Always include parent entity references when available

### Handling Resolution Errors

Implement proper error handling for resolution failures:

1. **Display Helpful Messages**: Use the structured error information to explain why resolution failed
2. **Suggest Alternatives**: For fuzzy matches below threshold, suggest close matches to the user
3. **Fallback Behavior**: Define appropriate fallback behavior when resolution fails

### Performance Considerations

1. **Batch Operations**: Use `resolve_references` for batch operations to reduce API calls
2. **Caching**: Results are automatically cached through the API cache layer
3. **Reuse Entity IDs**: Once resolved, store entity IDs to avoid repeated resolution

## Migration Guide

When migrating existing code to use the new entity resolution:

1. Replace direct entity lookup code with `resolver.resolve_entity`
2. Replace ID lookups with `resolver.resolve_entity_reference`
3. Replace multiple sequential lookups with `resolver.resolve_references`
4. Add proper error handling for EntityResolutionError
5. Update frontend code to use the entityResolver utility

## API Reference

### Backend (Python)

```python
class EntityResolver:
    def __init__(self, fuzzy_threshold: float = 0.8):
        """Initialize with fuzzy matching threshold."""
        
    async def resolve_entity(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        name_or_id: Union[str, UUID],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Resolve an entity by name or ID."""
        
    async def resolve_entity_reference(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        name_or_id: Union[str, UUID],
        context: Optional[Dict[str, Any]] = None
    ) -> UUID:
        """Resolve an entity to just its ID."""
        
    async def resolve_references(
        self, 
        db: AsyncSession, 
        references: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Batch resolve multiple references."""
```

### Frontend (TypeScript)

```typescript
class EntityResolver {
    async resolveEntity<T = Record<string, any>>(
        entityType: EntityType | string,
        nameOrId: string,
        options: EntityResolutionOptions = {}
    ): Promise<T | null>;
    
    async resolveEntityId(
        entityType: EntityType | string,
        nameOrId: string,
        options: EntityResolutionOptions = {}
    ): Promise<string | null>;
    
    async resolveReferences(
        references: ReferenceResolutionRequest,
        throwOnAnyError: boolean = false
    ): Promise<ReferenceResolutionResponse>;
}
```

## Conclusion

The enhanced Entity Resolution Strategy provides a robust, flexible, and user-friendly approach to entity reference handling in SheetGPT's sports data management system. By centralizing this functionality and implementing sophisticated matching algorithms, we've significantly improved the system's ability to handle entity references in various formats, making it more resilient to input variations and providing better user feedback when resolution fails.