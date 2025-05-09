import { useState, useEffect, useCallback } from 'react';
import { entityResolver, EntityResolutionOptions } from '../utils/entityResolver';
import { apiCache } from '../utils/apiCache';
import { createMemoEqualityFn } from '../utils/fingerprint';

/**
 * Interface for the resolution result
 */
interface EntityResolutionResult<T = any> {
  entity: T | null;
  isLoading: boolean;
  error: Error | null;
  resolutionInfo: {
    matchScore?: number;
    fuzzyMatched?: boolean;
    contextMatched?: boolean;
    virtualEntity?: boolean;
    resolvedEntityType?: string;
    resolvedVia?: string;
  };
}

/**
 * Interface for the batch resolution result
 */
interface BatchResolutionResult {
  resolved: Record<string, any>;
  errors: Record<string, any>;
  isLoading: boolean;
}

// Define the explicit return type for the hook
interface UseBatchEntityResolutionReturn extends BatchResolutionResult {
  resolveReferences: () => Promise<void>;
}

/**
 * Hook for resolving an entity using the entity resolver
 */
export function useEntityResolution<T = any>(
  entityType: string,
  nameOrId: string | null,
  options: EntityResolutionOptions = {}
): EntityResolutionResult<T> {
  const [result, setResult] = useState<EntityResolutionResult<T>>({
    entity: null,
    isLoading: false,
    error: null,
    resolutionInfo: {}
  });
  
  // Memoize the context to avoid unnecessary rerenders
  const memoizedContext = createMemoEqualityFn(options.context || {});
  
  // Resolve the entity when inputs change
  useEffect(() => {
    if (!nameOrId) {
      setResult({
        entity: null,
        isLoading: false,
        error: null,
        resolutionInfo: {}
      });
      return;
    }
    
    let isMounted = true;
    
    const resolveEntity = async () => {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const entity = await entityResolver.resolveEntity<T>(
          entityType,
          nameOrId,
          options
        );
        
        // Get the resolution info from cache
        const cacheKey = `resolve_entity_${entityType}_${nameOrId}`;
        const cachedResponse = apiCache.get(cacheKey);
        const resolutionInfo = cachedResponse?.resolution_info || {};
        
        if (isMounted) {
          setResult({
            entity,
            isLoading: false,
            error: null,
            resolutionInfo: {
              matchScore: resolutionInfo.match_score,
              fuzzyMatched: resolutionInfo.fuzzy_matched,
              contextMatched: resolutionInfo.context_matched,
              virtualEntity: resolutionInfo.virtual_entity,
              resolvedEntityType: resolutionInfo.resolved_entity_type,
              resolvedVia: resolutionInfo.resolved_via
            }
          });
        }
      } catch (error) {
        if (isMounted) {
          setResult({
            entity: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Unknown error during entity resolution'),
            resolutionInfo: {}
          });
        }
      }
    };
    
    resolveEntity();
    
    return () => {
      isMounted = false;
    };
  }, [entityType, nameOrId, memoizedContext, options.allowFuzzy, options.minimumMatchScore, options.throwOnError]);
  
  return result;
}

/**
 * Hook for resolving multiple entity references at once
 */
export function useBatchEntityResolution(
  references: Record<string, { name: string; type?: string; context?: Record<string, any> }>,
  throwOnAnyError: boolean = false
): UseBatchEntityResolutionReturn {
  const [result, setResult] = useState<BatchResolutionResult>({
    resolved: {},
    errors: {},
    isLoading: false
  });
  
  // Memoize references to avoid unnecessary rerenders
  const memoizedReferences = createMemoEqualityFn(references);
  
  // Function to manually trigger resolution
  const resolveReferences = useCallback(async () => {
    if (Object.keys(references).length === 0) {
      setResult({
        resolved: {},
        errors: {},
        isLoading: false
      });
      return;
    }
    
    setResult(prev => ({ ...prev, isLoading: true }));
    
    try {
      const resolution = await entityResolver.resolveReferences(
        references,
        throwOnAnyError
      );
      
      setResult({
        resolved: resolution.resolved || {},
        errors: resolution.errors || {},
        isLoading: false
      });
    } catch (error) {
      setResult({
        resolved: {},
        errors: {
          _general: {
            error: 'resolution_failed',
            message: error instanceof Error ? error.message : 'Unknown error during batch resolution',
            entity_type: 'unknown',
            name: 'unknown',
            context: {}
          }
        },
        isLoading: false
      });
    }
  }, [references, throwOnAnyError]);
  
  // Auto-resolve on references change
  useEffect(() => {
    resolveReferences();
  }, [memoizedReferences, throwOnAnyError, resolveReferences]);
  
  return {
    ...result,
    resolveReferences // This is now a valid property of UseBatchEntityResolutionReturn
  };
}

export default useEntityResolution;