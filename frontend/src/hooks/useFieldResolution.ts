import { useState, useEffect, useMemo } from 'react';
import { entityResolver } from '../utils/entityResolver';
import { useEntityResolution } from './useEntityResolution';
import { createMemoEqualityFn } from '../utils/fingerprint';
import { apiCache } from '../utils/apiCache';

/**
 * Interface for field resolution options
 */
interface FieldResolutionOptions {
  contextFields?: Record<string, string>;
  dependentFields?: string[];
  required?: boolean;
  minimumMatchScore?: number;
  autoResolve?: boolean;
}

/**
 * Interface for field resolution result
 */
interface FieldResolutionResult {
  resolvedEntity: any;
  resolvedValue: string | null;
  isResolving: boolean;
  error: Error | null;
  resolutionInfo: {
    matchScore?: number;
    fuzzyMatched?: boolean;
    contextMatched?: boolean;
    virtualEntity?: boolean;
    resolved?: boolean;
  };
  resolveField: (nameOrId: string) => Promise<string | null>;
  clearResolution: () => void;
}

/**
 * Custom hook for resolving entity fields in forms
 */
export function useFieldResolution(
  entityType: string, 
  fieldName: string,
  formValues: Record<string, any>,
  options: FieldResolutionOptions = {}
): FieldResolutionResult {
  const {
    contextFields = {},
    dependentFields = [],
    required = false,
    minimumMatchScore = 0.6,
    autoResolve = true
  } = options;

  const [nameOrId, setNameOrId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [resolvedValue, setResolvedValue] = useState<string | null>(null);
  const [resolvedEntity, setResolvedEntity] = useState<any>(null);
  const [resolutionInfo, setResolutionInfo] = useState<any>({});

  // Create context from context fields and form values
  const context = useMemo(() => {
    const ctx: Record<string, any> = {};
    
    // Add context from contextFields option
    Object.entries(contextFields).forEach(([ctxField, formField]) => {
      if (formValues[formField]) {
        ctx[ctxField] = formValues[formField];
      }
    });
    
    return ctx;
  }, [createMemoEqualityFn(contextFields), createMemoEqualityFn(formValues)]);

  // Set the name or ID to resolve based on form value
  useEffect(() => {
    if (formValues[fieldName] && formValues[fieldName] !== resolvedValue) {
      setNameOrId(formValues[fieldName]);
    }
  }, [fieldName, formValues, resolvedValue]);

  // Auto-resolve when nameOrId changes
  useEffect(() => {
    if (!autoResolve || !nameOrId) return;
    
    const resolveEntity = async () => {
      setIsResolving(true);
      setError(null);
      
      try {
        const entity = await entityResolver.resolveEntity(
          entityType,
          nameOrId,
          {
            context,
            minimumMatchScore,
            allowFuzzy: true,
            throwOnError: false
          }
        );
        
        if (entity) {
          setResolvedEntity(entity);
          setResolvedValue(entity.id);
          
          // Get resolution info
          const cacheKey = `resolve_entity_${entityType}_${nameOrId}`;
          const cachedResponse = apiCache.get(cacheKey);
          const resInfo = cachedResponse?.resolution_info || {};
          
          setResolutionInfo({
            matchScore: resInfo.match_score,
            fuzzyMatched: resInfo.fuzzy_matched,
            contextMatched: resInfo.context_matched,
            virtualEntity: resInfo.virtual_entity,
            resolved: true
          });
        } else {
          setResolvedEntity(null);
          setResolvedValue(null);
          setResolutionInfo({
            resolved: false
          });
          
          if (required) {
            setError(new Error(`Could not resolve ${entityType} "${nameOrId}"`));
          }
        }
      } catch (error) {
        console.error(`Error resolving ${entityType}:`, error);
        setResolvedEntity(null);
        setResolvedValue(null);
        setError(error instanceof Error ? error : new Error(`Error resolving ${entityType}`));
        setResolutionInfo({
          resolved: false
        });
      } finally {
        setIsResolving(false);
      }
    };
    
    resolveEntity();
  }, [entityType, nameOrId, createMemoEqualityFn(context), minimumMatchScore, required, autoResolve]);

  // Function to manually resolve a field
  const resolveField = async (name: string): Promise<string | null> => {
    if (!name) return null;
    
    setIsResolving(true);
    setError(null);
    
    try {
      const entity = await entityResolver.resolveEntity(
        entityType,
        name,
        {
          context,
          minimumMatchScore,
          allowFuzzy: true,
          throwOnError: required
        }
      );
      
      if (entity) {
        setResolvedEntity(entity);
        setResolvedValue(entity.id);
        
        // Get resolution info
        const cacheKey = `resolve_entity_${entityType}_${name}`;
        const cachedResponse = apiCache.get(cacheKey);
        const resInfo = cachedResponse?.resolution_info || {};
        
        setResolutionInfo({
          matchScore: resInfo.match_score,
          fuzzyMatched: resInfo.fuzzy_matched,
          contextMatched: resInfo.context_matched,
          virtualEntity: resInfo.virtual_entity,
          resolved: true
        });
        
        return entity.id;
      } else {
        setResolvedEntity(null);
        setResolvedValue(null);
        setResolutionInfo({
          resolved: false
        });
        
        if (required) {
          const error = new Error(`Could not resolve ${entityType} "${name}"`);
          setError(error);
          throw error;
        }
        
        return null;
      }
    } catch (error) {
      console.error(`Error resolving ${entityType}:`, error);
      setResolvedEntity(null);
      setResolvedValue(null);
      setError(error instanceof Error ? error : new Error(`Error resolving ${entityType}`));
      setResolutionInfo({
        resolved: false
      });
      
      if (required) {
        throw error;
      }
      
      return null;
    } finally {
      setIsResolving(false);
    }
  };

  // Function to clear resolution
  const clearResolution = () => {
    setNameOrId(null);
    setResolvedEntity(null);
    setResolvedValue(null);
    setError(null);
    setResolutionInfo({});
  };

  return {
    resolvedEntity,
    resolvedValue,
    isResolving,
    error,
    resolutionInfo,
    resolveField,
    clearResolution
  };
}

export default useFieldResolution;