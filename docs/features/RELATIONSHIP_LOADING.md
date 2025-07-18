# Relationship Loading Optimization

This document describes the implementation of optimized relationship data loading in the SheetGPT application, created as part of Phase 4 of the refactoring plan.

## Overview

The relationship loading system implements efficient loading of related entities, providing significant optimizations compared to the previous approach:

1. **Multi-fetch operations**: Loading related entities in parallel rather than sequentially
2. **Deduplication of in-flight requests**: Preventing duplicate API calls for the same data
3. **Caching of relationship data**: Using memory cache with configurable TTL
4. **Smart preloading of common entity sets**: Preloading frequently used entity types together
5. **Efficient hooks for relationship data**: React hooks that efficiently manage relationship data loading

## Implementation Details

### 1. RelationshipLoader Utility

The core of the system is the `RelationshipLoader` class, which provides methods for efficiently loading entity relationships:

```typescript
// Load relationships for a single entity
async loadRelationships(
  entity: any, 
  entityType: EntityType, 
  relationshipConfigs?: RelationshipConfig[], 
  useCaching: boolean = true
): Promise<Record<string, any[]>>

// Load relationships for multiple entities of the same type
async loadRelationshipsForMultiple(
  entities: any[],
  entityType: EntityType,
  relationshipConfigs?: RelationshipConfig[],
  useCaching: boolean = true
): Promise<Record<string, Record<string, any[]>>>

// Preload a set of entity types (e.g., all leagues, divisions, teams)
async preloadEntitySet(
  setName: string, 
  limit: number = 50, 
  useCaching: boolean = true
): Promise<Record<EntityType, any[]>>
```

### 2. Relationship Configuration

Relationships are defined through a type-safe configuration system:

```typescript
interface RelationshipConfig {
  entityType: EntityType;      // The source entity type
  idField: string;             // The field containing the ID to use for filtering
  relatedEntityType: EntityType; // The target entity type to load
  filterField: string;         // The field on the target to filter by
  name?: string;               // Optional custom name for the relationship
}
```

The system includes predefined relationship configurations for all entity types in the `COMMON_RELATIONSHIPS` constant, making it easy to load standard relationships without additional configuration.

### 3. Common Entity Sets

Frequently used combinations of entity types can be preloaded together using the `COMMON_ENTITY_SETS` configuration:

```typescript
const COMMON_ENTITY_SETS: Record<string, EntityType[]> = {
  // Common entities needed for forms
  FORM_BASICS: ['league', 'division_conference', 'team', 'stadium', 'brand'],
  
  // Media related entities
  MEDIA_ENTITIES: ['brand', 'broadcast', 'production', 'game_broadcast'],
  
  // League view related entities
  LEAGUE_VIEW: ['league', 'division_conference', 'team', 'league_executive'],
  
  // Game day related entities
  GAME_DAY: ['game', 'team', 'stadium', 'game_broadcast']
};
```

### 4. Caching and Request Deduplication

The system uses the `apiCache` utility to cache relationship data and prevent duplicate API calls:

- **Request Deduplication**: When multiple components request the same data simultaneously, only one API call is made
- **Caching**: Relationship data is cached with a configurable TTL to avoid repeated API calls
- **Cache Invalidation**: Methods are provided to clear specific cache entries or all relationship cache

### 5. React Hooks

Three React hooks are provided for consuming relationship data:

#### useRelationshipData

The core hook for loading relationship data:

```typescript
function useRelationshipData(
  entityType: EntityType,
  entityIds?: string[],
  options: {
    loadOnMount?: boolean;
    preloadSet?: string;
    relationships?: RelationshipConfig[];
    useCaching?: boolean;
  } = {}
): UseRelationshipDataReturn
```

#### useCommonEntityData

A specialized hook for loading common entity reference data:

```typescript
function useCommonEntityData(
  setName: keyof typeof COMMON_ENTITY_SETS = 'FORM_BASICS'
): UseRelationshipDataReturn
```

#### useEntityRelationships

A hook for loading relationship data for a single entity:

```typescript
function useEntityRelationships(
  entityType: EntityType,
  entityId?: string
): UseRelationshipDataReturn & {
  entity: any;
  relationships: Record<string, any[]>;
}
```

## Performance Improvements

The relationship loading implementation provides several significant performance improvements:

1. **Reduced API Calls**: By loading related entities in parallel and caching results, the total number of API calls is significantly reduced
2. **Faster Initial Load**: Preloading common entity sets reduces the need for individual API calls as the user navigates the application
3. **Better User Experience**: By deduplicating requests and using cached data, the UI feels more responsive
4. **Lower Server Load**: The reduction in API calls reduces the load on the backend server
5. **Optimized Network Usage**: Batch loading and caching reduce the amount of data transferred over the network

## Usage Examples

### Basic Usage with useEntityRelationships

```tsx
function TeamDetails({ teamId }: { teamId: string }) {
  const { 
    entity: team, 
    relationships, 
    isLoading, 
    error 
  } = useEntityRelationships('team', teamId);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!team) return <NotFound type="team" id={teamId} />;
  
  return (
    <div>
      <h1>{team.name}</h1>
      
      {/* Related league */}
      {relationships.league && relationships.league.length > 0 && (
        <div>
          <h2>League</h2>
          <p>{relationships.league[0].name}</p>
        </div>
      )}
      
      {/* Related players */}
      {relationships.player && relationships.player.length > 0 && (
        <div>
          <h2>Players</h2>
          <ul>
            {relationships.player.map(player => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Preloading Common Entity Sets

```tsx
function EntitySelector() {
  const { 
    leagues, 
    divisions_conferences, 
    teams, 
    isLoading 
  } = useCommonEntityData('FORM_BASICS');
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <h2>Select League</h2>
      <select>
        {leagues.map(league => (
          <option key={league.id} value={league.id}>{league.name}</option>
        ))}
      </select>
      
      <h2>Select Division</h2>
      <select>
        {divisions_conferences.map(division => (
          <option key={division.id} value={division.id}>{division.name}</option>
        ))}
      </select>
      
      <h2>Select Team</h2>
      <select>
        {teams.map(team => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>
    </div>
  );
}
```

### Advanced Usage with Custom Relationship Configurations

```tsx
function CustomEntityView({ entityIds }: { entityIds: string[] }) {
  // Define custom relationship configurations
  const customRelationships = [
    {
      entityType: 'team',
      idField: 'id',
      relatedEntityType: 'game',
      filterField: 'home_team_id',
      name: 'home_games'
    },
    {
      entityType: 'team',
      idField: 'id',
      relatedEntityType: 'game',
      filterField: 'away_team_id',
      name: 'away_games'
    }
  ];
  
  const { 
    entitiesByType,
    relationshipsByEntityId,
    isLoading
  } = useRelationshipData('team', entityIds, {
    relationships: customRelationships
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      {entitiesByType.team?.map(team => (
        <div key={team.id}>
          <h2>{team.name}</h2>
          
          <h3>Home Games</h3>
          <ul>
            {relationshipsByEntityId[team.id]?.home_games?.map(game => (
              <li key={game.id}>{game.name}</li>
            ))}
          </ul>
          
          <h3>Away Games</h3>
          <ul>
            {relationshipsByEntityId[team.id]?.away_games?.map(game => (
              <li key={game.id}>{game.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

## Integrating with Existing Components

The relationship loading system is designed to work with existing components with minimal changes. Here's how to migrate a component from the old approach to the new one:

### Before

```tsx
function TeamForm({ teamId }: { teamId?: string }) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [divisions, setDivisions] = useState<DivisionConference[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [leaguesResponse, divisionsResponse, stadiumsResponse] = await Promise.all([
          api.sports.getLeagues(),
          api.sports.getDivisionConferences(),
          api.sports.getStadiums()
        ]);
        
        setLeagues(leaguesResponse.data.items || []);
        setDivisions(divisionsResponse.data.items || []);
        setStadiums(stadiumsResponse.data.items || []);
      } catch (error) {
        console.error('Error loading form data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Rest of component
}
```

### After

```tsx
function TeamForm({ teamId }: { teamId?: string }) {
  const { 
    leagues, 
    divisions_conferences, 
    stadiums, 
    isLoading 
  } = useCommonEntityData();
  
  // Rest of component remains the same, but with access to the preloaded data
}
```

## Conclusion

The relationship loading system provides a powerful and efficient way to load and manage relationship data in the SheetGPT application. By using this system, components can efficiently load and display relationship data without the overhead of multiple API calls or complex state management logic.

The system integrates with the existing caching and request deduplication infrastructure to provide a seamless experience with minimal changes to existing components.
