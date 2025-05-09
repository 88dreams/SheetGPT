import { useState, useEffect, useMemo } from 'react';
import { EntityType } from '../services/SportsDatabaseService';
import { relationshipLoader, COMMON_ENTITY_SETS, COMMON_RELATIONSHIPS } from '../utils/relationshipLoader';
import { createMemoEqualityFn } from '../utils/fingerprint';

/**
 * Interface for the hook return value
 */
interface UseRelationshipDataReturn {
  // All related entities by type
  entitiesByType: Record<EntityType, any[]>;
  // Relationship mapping by entity ID
  relationshipsByEntityId: Record<string, Record<string, any[]>>;
  // Key-based access to specific entity types
  [key: string]: any;
  // Loading state
  isLoading: boolean;
  // Error state
  error: Error | null;
  // Function to reload data
  reload: () => Promise<void>;
  // Function to preload a specific entity set
  preloadEntitySet: (setName: string) => Promise<void>;
}

/**
 * Hook for efficiently loading relationship data
 */
export function useRelationshipData(
  entityType: EntityType,
  entityIds?: string[],
  options: {
    loadOnMount?: boolean;
    preloadSet?: string;
    relationships?: typeof COMMON_RELATIONSHIPS[EntityType];
    useCaching?: boolean;
  } = {}
): UseRelationshipDataReturn {
  // Default options
  const {
    loadOnMount = true,
    preloadSet,
    relationships,
    useCaching = true
  } = options;
  
  // State for entities by type
  const [entitiesByType, setEntitiesByType] = useState<Record<EntityType, any[]>>({} as Record<EntityType, any[]>);
  
  // State for relationship mapping
  const [relationshipsByEntityId, setRelationshipsByEntityId] = useState<Record<string, Record<string, any[]>>>({});
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Memoize entity IDs to prevent unnecessary reloads
  const memoizedEntityIds = useMemo(() => entityIds || [], [
    entityIds
  ]);
  
  /**
   * Function to preload a set of entities
   */
  const preloadEntitySet = async (setName: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await relationshipLoader.preloadEntitySet(setName, 200, useCaching);
      setEntitiesByType(prevState => ({
        ...prevState,
        ...results
      }));
    } catch (err) {
      console.error(`Error preloading entity set ${setName}:`, err);
      setError(err instanceof Error ? err : new Error(`Error preloading entity set ${setName}`));
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Function to load relationships for the specified entities
   */
  const loadRelationships = async (): Promise<void> => {
    if (!entityType || memoizedEntityIds.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get entities first
      const entitiesResponse = await relationshipLoader._fetchEntitiesWithFilter(
        entityType,
        'id',
        memoizedEntityIds.join(','),
        useCaching
      );
      
      // Update entities by type
      setEntitiesByType(prevState => ({
        ...prevState,
        [entityType]: entitiesResponse
      }));
      
      // If we have entities, load their relationships
      if (entitiesResponse.length > 0) {
        const relationshipsConfig = relationships || COMMON_RELATIONSHIPS[entityType] || [];
        const relationshipsResult = await relationshipLoader.loadRelationshipsForMultiple(
          entitiesResponse,
          entityType,
          relationshipsConfig,
          useCaching
        );
        
        // Update relationships by entity ID
        setRelationshipsByEntityId(relationshipsResult);
        
        // Also update entitiesByType with any related entities we've loaded
        const allRelatedEntities: Record<EntityType, any[]> = {} as Record<EntityType, any[]>;
        
        // Collect all related entities by type
        Object.values(relationshipsResult).forEach(entityRelationships => {
          Object.entries(entityRelationships).forEach(([relationshipName, entities]) => {
            // Find the actual entity type from the relationship config
            const relationshipConfig = relationshipsConfig.find(
              config => config.name === relationshipName || config.relatedEntityType === relationshipName
            );
            
            if (relationshipConfig) {
              const relatedEntityType = relationshipConfig.relatedEntityType;
              
              if (!allRelatedEntities[relatedEntityType]) {
                allRelatedEntities[relatedEntityType] = [];
              }
              
              // Add unique entities by ID
              entities.forEach(entity => {
                if (!allRelatedEntities[relatedEntityType].some(e => e.id === entity.id)) {
                  allRelatedEntities[relatedEntityType].push(entity);
                }
              });
            }
          });
        });
        
        // Update entities by type with related entities
        setEntitiesByType(prevState => {
          const newState = { ...prevState };
          
          // Merge related entities with existing ones
          Object.entries(allRelatedEntities).forEach(([type, entities]) => {
            const entityType = type as EntityType;
            const existing = newState[entityType] || [];
            
            // Merge avoiding duplicates
            const idSet = new Set(existing.map(e => e.id));
            const newEntities = entities.filter(e => !idSet.has(e.id));
            
            newState[entityType] = [...existing, ...newEntities];
          });
          
          return newState;
        });
      }
    } catch (err) {
      console.error(`Error loading relationships for ${entityType}:`, err);
      setError(err instanceof Error ? err : new Error(`Error loading relationships for ${entityType}`));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data on mount if requested
  useEffect(() => {
    if (loadOnMount) {
      if (preloadSet) {
        preloadEntitySet(preloadSet);
      } else {
        loadRelationships();
      }
    }
  }, [entityType, memoizedEntityIds.join(','), loadOnMount, preloadSet]);
  
  // Create a dynamic return object with named access to entity types
  const returnValue = useMemo(() => {
    // Start with the base properties
    const result: UseRelationshipDataReturn = {
      entitiesByType,
      relationshipsByEntityId,
      isLoading,
      error,
      reload: loadRelationships,
      preloadEntitySet
    };
    
    // Add entity type accessors for convenience (e.g., leagues, teams, etc.)
    Object.entries(entitiesByType).forEach(([type, entities]) => {
      // Add plural form (e.g., leagues, teams)
      const pluralType = type.endsWith('y') 
        ? `${type.slice(0, -1)}ies` // e.g., entity -> entities
        : `${type}s`; // e.g., league -> leagues
      
      result[pluralType] = entities;
    });
    
    return result;
  }, [entitiesByType, relationshipsByEntityId, isLoading, error]);
  
  return returnValue;
}

/**
 * Hook for loading common entity reference data (leagues, teams, stadiums, etc.)
 */
export function useCommonEntityData(
  setName: keyof typeof COMMON_ENTITY_SETS = 'FORM_BASICS'
): UseRelationshipDataReturn {
  return useRelationshipData('league', [], {
    loadOnMount: true,
    preloadSet: setName
  });
}

/**
 * Hook for loading relationship data for a single entity
 */
export function useEntityRelationships(
  entityType: EntityType,
  entityId?: string
): UseRelationshipDataReturn & {
  entity: any;
  relationships: Record<string, any[]>;
} {
  const result = useRelationshipData(
    entityType,
    entityId ? [entityId] : [],
    { loadOnMount: !!entityId }
  );
  
  // Extract the entity and its relationships for convenience
  const entity = useMemo(() => {
    const entities = result.entitiesByType[entityType] || [];
    return entities.find(e => e.id === entityId) || null;
  }, [result.entitiesByType, entityType, entityId]);
  
  const relationships = useMemo(() => {
    return entityId && result.relationshipsByEntityId[entityId] 
      ? result.relationshipsByEntityId[entityId] 
      : {};
  }, [result.relationshipsByEntityId, entityId]);
  
  // Return enhanced result with entity and relationships
  return {
    ...result,
    entity,
    relationships
  };
}

export default useRelationshipData;