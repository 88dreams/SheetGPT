import { apiCache } from './apiCache';
import sportsService from '../services/sportsService';
import { EntityType } from '../services/SportsDatabaseService';
import { FilterConfig } from '../components/sports/EntityFilter';

/**
 * Interface for relationship definition
 */
export interface RelationshipConfig {
  entityType: EntityType;
  idField: string;
  relatedEntityType: EntityType;
  // The field on the target entity used for filtering
  filterField: string; 
  // Optional custom name for relationship (defaults to relatedEntityType)
  name?: string;
}

/**
 * Common relationship definitions
 */
export const COMMON_RELATIONSHIPS: Record<EntityType, RelationshipConfig[]> = {
  league: [
    {
      entityType: 'league',
      idField: 'id',
      relatedEntityType: 'division_conference',
      filterField: 'league_id'
    },
    {
      entityType: 'league',
      idField: 'id',
      relatedEntityType: 'team',
      filterField: 'league_id'
    },
    {
      entityType: 'league',
      idField: 'id', 
      relatedEntityType: 'league_executive',
      filterField: 'league_id'
    },
    {
      entityType: 'league',
      idField: 'id',
      relatedEntityType: 'broadcast',
      filterField: 'entity_id',
      name: 'broadcast_rights'
    }
  ],
  division_conference: [
    {
      entityType: 'division_conference',
      idField: 'id',
      relatedEntityType: 'team',
      filterField: 'division_conference_id'
    },
    {
      entityType: 'division_conference',
      idField: 'league_id',
      relatedEntityType: 'league', 
      filterField: 'id',
      name: 'league'
    },
    {
      entityType: 'division_conference',
      idField: 'id',
      relatedEntityType: 'broadcast',
      filterField: 'entity_id',
      name: 'broadcast_rights'
    }
  ],
  team: [
    {
      entityType: 'team',
      idField: 'id',
      relatedEntityType: 'player',
      filterField: 'team_id'
    },
    {
      entityType: 'team',
      idField: 'league_id',
      relatedEntityType: 'league',
      filterField: 'id',
      name: 'league'
    },
    {
      entityType: 'team',
      idField: 'division_conference_id',
      relatedEntityType: 'division_conference',
      filterField: 'id', 
      name: 'division_conference'
    },
    {
      entityType: 'team',
      idField: 'stadium_id',
      relatedEntityType: 'stadium',
      filterField: 'id',
      name: 'stadium'
    },
    {
      entityType: 'team',
      idField: 'id',
      relatedEntityType: 'broadcast',
      filterField: 'entity_id',
      name: 'broadcast_rights'
    }
  ],
  player: [
    {
      entityType: 'player',
      idField: 'team_id',
      relatedEntityType: 'team',
      filterField: 'id',
      name: 'team'
    }
  ],
  game: [
    {
      entityType: 'game',
      idField: 'home_team_id',
      relatedEntityType: 'team',
      filterField: 'id',
      name: 'home_team'
    },
    {
      entityType: 'game',
      idField: 'away_team_id',
      relatedEntityType: 'team',
      filterField: 'id',
      name: 'away_team'
    },
    {
      entityType: 'game',
      idField: 'stadium_id',
      relatedEntityType: 'stadium',
      filterField: 'id',
      name: 'stadium'
    },
    {
      entityType: 'game',
      idField: 'league_id',
      relatedEntityType: 'league',
      filterField: 'id',
      name: 'league'
    },
    {
      entityType: 'game',
      idField: 'id',
      relatedEntityType: 'game_broadcast',
      filterField: 'game_id'
    }
  ],
  stadium: [
    {
      entityType: 'stadium',
      idField: 'id',
      relatedEntityType: 'team',
      filterField: 'stadium_id'
    },
    {
      entityType: 'stadium',
      idField: 'host_broadcaster_id',
      relatedEntityType: 'brand',
      filterField: 'id',
      name: 'host_broadcaster'
    }
  ],
  broadcast: [
    {
      entityType: 'broadcast',
      idField: 'broadcast_company_id',
      relatedEntityType: 'brand',
      filterField: 'id',
      name: 'broadcast_company'
    },
    {
      entityType: 'broadcast',
      idField: 'entity_id',
      relatedEntityType: 'league',
      filterField: 'id',
      name: 'league'
    },
    {
      entityType: 'broadcast',
      idField: 'entity_id',
      relatedEntityType: 'division_conference',
      filterField: 'id',
      name: 'division_conference'
    },
    {
      entityType: 'broadcast',
      idField: 'entity_id',
      relatedEntityType: 'team',
      filterField: 'id',
      name: 'team'
    },
    {
      entityType: 'broadcast',
      idField: 'entity_id',
      relatedEntityType: 'game',
      filterField: 'id',
      name: 'game'
    }
  ],
  production: [
    {
      entityType: 'production',
      idField: 'production_company_id',
      relatedEntityType: 'brand',
      filterField: 'id',
      name: 'production_company'
    },
    {
      entityType: 'production',
      idField: 'entity_id',
      relatedEntityType: 'league',
      filterField: 'id',
      name: 'league'
    },
    {
      entityType: 'production',
      idField: 'entity_id',
      relatedEntityType: 'division_conference',
      filterField: 'id',
      name: 'division_conference'
    },
    {
      entityType: 'production',
      idField: 'entity_id',
      relatedEntityType: 'team',
      filterField: 'id',
      name: 'team'
    },
    {
      entityType: 'production',
      idField: 'entity_id',
      relatedEntityType: 'game',
      filterField: 'id',
      name: 'game'
    }
  ],
  brand: [
    {
      entityType: 'brand',
      idField: 'id',
      relatedEntityType: 'broadcast',
      filterField: 'broadcast_company_id',
      name: 'broadcast_rights'
    },
    {
      entityType: 'brand',
      idField: 'id',
      relatedEntityType: 'production',
      filterField: 'production_company_id',
      name: 'production_services'
    }
  ],
  game_broadcast: [
    {
      entityType: 'game_broadcast',
      idField: 'game_id',
      relatedEntityType: 'game',
      filterField: 'id',
      name: 'game'
    },
    {
      entityType: 'game_broadcast',
      idField: 'broadcast_company_id',
      relatedEntityType: 'brand',
      filterField: 'id',
      name: 'broadcast_company'
    },
    {
      entityType: 'game_broadcast',
      idField: 'production_company_id',
      relatedEntityType: 'brand',
      filterField: 'id',
      name: 'production_company'
    }
  ],
  league_executive: [
    {
      entityType: 'league_executive',
      idField: 'league_id',
      relatedEntityType: 'league',
      filterField: 'id',
      name: 'league'
    }
  ]
};

/**
 * Common related entity data sets that often need to be preloaded together
 */
export const COMMON_ENTITY_SETS: Record<string, EntityType[]> = {
  // Common entities needed for forms
  FORM_BASICS: ['league', 'division_conference', 'team', 'stadium', 'brand'],
  
  // Media related entities
  MEDIA_ENTITIES: ['brand', 'broadcast', 'production', 'game_broadcast'],
  
  // League view related entities
  LEAGUE_VIEW: ['league', 'division_conference', 'team', 'league_executive'],
  
  // Game day related entities
  GAME_DAY: ['game', 'team', 'stadium', 'game_broadcast']
};

/**
 * RelationshipLoader class for efficient multi-fetch operations
 */
export class RelationshipLoader {
  private _cache = apiCache;
  private _pendingFetches: Map<string, Promise<any[]>> = new Map();
  
  /**
   * Gets a unique cache key for a fetch operation
   */
  private _getCacheKey(entityType: EntityType, field: string, value: string): string {
    return `relationship_${entityType}_${field}_${value}`;
  }
  
  /**
   * Fetches entities with a filter, with caching and deduplication of in-flight requests
   */
  async _fetchEntitiesWithFilter(
    entityType: EntityType, 
    field: string, 
    value: string, 
    useCaching: boolean = true
  ): Promise<any[]> {
    const cacheKey = this._getCacheKey(entityType, field, value);
    
    // Check if we have a cached result
    if (useCaching) {
      const cachedResult = this._cache.get(cacheKey);
      if (cachedResult) {
        console.log(`RelationshipLoader: Using cached result for ${entityType} with ${field}=${value}`);
        return cachedResult;
      }
    }
    
    // Check if we have an in-flight request
    const pendingFetch = this._pendingFetches.get(cacheKey);
    if (pendingFetch) {
      console.log(`RelationshipLoader: Reusing in-flight request for ${entityType} with ${field}=${value}`);
      return pendingFetch;
    }
    
    // Create the filter
    const filters: FilterConfig[] = [{
      field,
      operator: 'eq',
      value
    }];
    
    // Start the fetch and store it in the pending map
    console.log(`RelationshipLoader: Fetching ${entityType} with ${field}=${value}`);
    const fetchPromise = sportsService.getEntities(entityType, filters)
      .then(response => {
        // Explicitly type response or ensure sportsService.getEntities has correct return type propagation
        const items = (response as { items?: any[] }).items || [];
        
        // Store in cache
        if (useCaching) {
          this._cache.set(cacheKey, items);
        }
        
        // Remove from pending fetches
        this._pendingFetches.delete(cacheKey);
        
        return items;
      })
      .catch(error => {
        // Remove from pending fetches
        this._pendingFetches.delete(cacheKey);
        
        console.error(`RelationshipLoader: Error fetching ${entityType} with ${field}=${value}:`, error);
        throw error;
      });
    
    // Store the pending fetch
    this._pendingFetches.set(cacheKey, fetchPromise);
    
    return fetchPromise;
  }
  
  /**
   * Loads relationships for a single entity
   */
  async loadRelationships(
    entity: any, 
    entityType: EntityType, 
    relationshipConfigs?: RelationshipConfig[], 
    useCaching: boolean = true
  ): Promise<Record<string, any[]>> {
    if (!entity) {
      return {};
    }
    
    // Use provided configs or get the default ones for this entity type
    const configs = relationshipConfigs || COMMON_RELATIONSHIPS[entityType] || [];
    
    // Create a map of relationship name to Promise of results
    const relationshipPromises: Record<string, Promise<any[]>> = {};
    
    // Start all fetches in parallel
    for (const config of configs) {
      const idValue = entity[config.idField];
      if (!idValue) continue;
      
      // Determine relationship name (use provided name or related entity type)
      const relationshipName = config.name || config.relatedEntityType;
      
      // Start the fetch
      relationshipPromises[relationshipName] = this._fetchEntitiesWithFilter(
        config.relatedEntityType, 
        config.filterField, 
        idValue, 
        useCaching
      );
    }
    
    // Wait for all fetches to complete
    const relationshipNames = Object.keys(relationshipPromises);
    const results: Record<string, any[]> = {};
    
    // Process each relationship in parallel
    await Promise.all(
      relationshipNames.map(async name => {
        try {
          results[name] = await relationshipPromises[name];
        } catch (error) {
          console.error(`Error loading relationship ${name}:`, error);
          results[name] = [];
        }
      })
    );
    
    return results;
  }
  
  /**
   * Loads relationships for multiple entities of the same type
   */
  async loadRelationshipsForMultiple(
    entities: any[],
    entityType: EntityType,
    relationshipConfigs?: RelationshipConfig[],
    useCaching: boolean = true
  ): Promise<Record<string, Record<string, any[]>>> {
    if (!entities || entities.length === 0) {
      return {};
    }
    
    // Use provided configs or get the default ones for this entity type
    const configs = relationshipConfigs || COMMON_RELATIONSHIPS[entityType] || [];
    
    // Create a map of entity ID to its relationships
    const results: Record<string, Record<string, any[]>> = {};
    
    // Process each entity in parallel
    await Promise.all(
      entities.map(async entity => {
        const entityId = entity.id;
        if (!entityId) return;
        
        // Load relationships for this entity
        results[entityId] = await this.loadRelationships(
          entity,
          entityType,
          configs,
          useCaching
        );
      })
    );
    
    return results;
  }
  
  /**
   * Preloads a set of entity types
   */
  async preloadEntitySet(
    setName: string, 
    limit: number = 50, 
    useCaching: boolean = true
  ): Promise<Record<EntityType, any[]>> {
    const entityTypes = COMMON_ENTITY_SETS[setName];
    if (!entityTypes) {
      console.error(`RelationshipLoader: Unknown entity set "${setName}"`);
      const allPossibleEntityTypes: EntityType[] = ['league', 'division_conference', 'team', 'player', 'game', 'stadium', 'broadcast', 'production', 'brand', 'game_broadcast', 'league_executive'];
      return Object.fromEntries(allPossibleEntityTypes.map(et => [et, []])) as Record<EntityType, any[]>;
    }
    
    // Initialize results with all keys from the entityTypes set to empty arrays
    const results = Object.fromEntries(
      entityTypes.map(et => [et, []])
    ) as Record<EntityType, any[]>;
    
    // Fetch all entity types in parallel
    await Promise.all(
      entityTypes.map(async entityType => {
        try {
          const cacheKey = `all_${entityType}_limit_${limit}`;
          
          // Check cache
          if (useCaching) {
            const cachedResult = this._cache.get(cacheKey);
            if (cachedResult) {
              results[entityType] = cachedResult;
              return;
            }
          }
          
          // Fetch the entities
          const response = await sportsService.getEntities(entityType, [], 1, limit);
          // Explicitly type response or ensure sportsService.getEntities has correct return type propagation
          const items = (response as { items?: any[] }).items || [];
          
          // Cache the result
          if (useCaching) {
            this._cache.set(cacheKey, items);
          }
          
          // Store in results
          results[entityType] = items;
        } catch (error) {
          console.error(`RelationshipLoader: Error preloading ${entityType}:`, error);
          results[entityType] = [];
        }
      })
    );
    
    return results;
  }
  
  /**
   * Clears the cache for a specific entity type and filter
   */
  clearCache(entityType: EntityType, field: string, value: string): void {
    const cacheKey = this._getCacheKey(entityType, field, value);
    this._cache.delete(cacheKey);
  }
  
  /**
   * Clears all relationship cache
   */
  clearAllCache(): void {
    this._cache.keys().forEach(key => {
      if (key.startsWith('relationship_') || key.startsWith('all_')) {
        this._cache.delete(key);
      }
    });
  }
}

// Create a singleton instance
export const relationshipLoader = new RelationshipLoader();
export default relationshipLoader;