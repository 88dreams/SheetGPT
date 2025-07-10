import { EntityType } from '../types/sports';
import apiClient from './apiClient';
import { createMemoEqualityFn } from './fingerprint';

/**
 * Type for entity resolution request
 */
interface EntityResolutionRequest {
  entity_type: string;
  name_or_id: string;
  context?: Record<string, any>;
}

/**
 * Type for entity resolution response
 */
interface EntityResolutionResponse {
  entity: Record<string, any>;
  resolution_info: {
    original_request: {
      entity_type: string;
      name_or_id: string;
    };
    resolved_entity_type: string;
    resolved_via?: string;
    match_score?: number;
    fuzzy_matched?: boolean;
    context_matched?: boolean;
    context_type?: string;
    virtual_entity?: boolean;
  };
}

/**
 * Type for batch reference resolution request
 */
interface ReferenceResolutionRequest {
  [key: string]: {
    type?: string;
    name: string;
    context?: Record<string, any>;
  };
}

/**
 * Type for batch reference resolution response
 */
interface ReferenceResolutionResponse {
  resolved: Record<string, string>;
  errors: Record<string, any>;
}

/**
 * Type for entity resolution error
 */
export interface EntityResolutionError {
  error: string;
  message: string;
  entity_type: string;
  name: string;
  context: Record<string, any>;
}

/**
 * Type for entity resolution options
 */
export interface EntityResolutionOptions {
  context?: Record<string, any>;
  allowFuzzy?: boolean;
  minimumMatchScore?: number;
  throwOnError?: boolean;
}

/**
 * Client-side entity resolver that works with the enhanced backend
 * entity resolution capabilities.
 */
export class EntityResolver {
  /**
   * Resolves an entity by name or ID
   * 
   * @param entityType The entity type to resolve
   * @param nameOrId The name or ID to resolve
   * @param options Resolution options
   * @returns The resolved entity or null if resolution failed
   * @throws Error if throwOnError is true and resolution fails
   */
  async resolveEntity<T = Record<string, any>>(
    entityType: EntityType | string,
    nameOrId: string,
    options: EntityResolutionOptions = {}
  ): Promise<T | null> {
    try {
      const request: EntityResolutionRequest = {
        entity_type: entityType,
        name_or_id: nameOrId,
        context: options.context
      };
      
      const response = await apiClient.post<EntityResolutionResponse>(
        '/v2/sports/resolve-entity',
        request
      );
      
      const resolutionInfo = response.data.resolution_info;
      
      // Check match score if requested
      if (
        options.minimumMatchScore !== undefined && 
        resolutionInfo.match_score !== undefined &&
        resolutionInfo.match_score < options.minimumMatchScore
      ) {
        if (options.throwOnError) {
          throw new Error(
            `Entity resolution match score ${resolutionInfo.match_score} below required threshold ${options.minimumMatchScore}`
          );
        }
        return null;
      }
      
      // Check if fuzzy matching is allowed
      if (
        resolutionInfo.fuzzy_matched && 
        options.allowFuzzy === false
      ) {
        if (options.throwOnError) {
          throw new Error(
            `Entity resolution used fuzzy matching but allowFuzzy is false`
          );
        }
        return null;
      }
      
      return response.data.entity as T;
    } catch (error) {
      if (options.throwOnError) {
        throw error;
      }
      console.error(`Error resolving ${entityType} entity:`, error);
      return null;
    }
  }
  
  /**
   * Resolves an entity reference to an ID
   * 
   * @param entityType The entity type to resolve
   * @param nameOrId The name or ID to resolve
   * @param options Resolution options
   * @returns The resolved entity ID or null if resolution failed
   * @throws Error if throwOnError is true and resolution fails
   */
  async resolveEntityId(
    entityType: EntityType | string,
    nameOrId: string,
    options: EntityResolutionOptions = {}
  ): Promise<string | null> {
    const entity = await this.resolveEntity(entityType, nameOrId, options);
    
    if (entity && entity.id) {
      return entity.id;
    }
    
    return null;
  }
  
  /**
   * Resolves multiple entity references in a single request
   * 
   * @param references The references to resolve
   * @param throwOnAnyError Whether to throw if any resolution fails
   * @returns Object with resolved references and any errors
   * @throws Error if throwOnAnyError is true and any resolution fails
   */
  async resolveReferences(
    references: ReferenceResolutionRequest,
    throwOnAnyError: boolean = false
  ): Promise<ReferenceResolutionResponse> {
    try {
      const response = await apiClient.post<ReferenceResolutionResponse>(
        '/v2/sports/resolve-references',
        references
      );
      
      // Check if we should throw on any error
      if (throwOnAnyError && Object.keys(response.data.errors).length > 0) {
        throw new Error(
          `Failed to resolve some references: ${JSON.stringify(response.data.errors)}`
        );
      }
      
      return response.data;
    } catch (error) {
      if (throwOnAnyError) {
        throw error;
      }
      
      console.error('Error resolving references:', error);
      
      // Return a partial result if available
      if (error.response?.data) {
        return error.response.data;
      }
      
      // Return empty result
      return {
        resolved: {},
        errors: {
          _general: {
            error: 'request_failed',
            message: error.message || 'Failed to resolve references',
            entity_type: 'unknown',
            name: 'unknown',
            context: {}
          }
        }
      };
    }
  }
  
  /**
   * Gets entities with enhanced related information
   * 
   * @param entityType The entity type to get
   * @param includeRelatedNames Whether to include related entity names
   * @param page Page number for pagination
   * @param limit Number of items per page
   * @returns The entities response
   */
  async getEntities<T = Record<string, any>>(
    entityType: EntityType | string,
    includeRelatedNames: boolean = true,
    page: number = 1,
    limit: number = 50
  ): Promise<{ items: T[]; total: number; page: number; pages: number }> {
    try {
      const response = await apiClient.get(
        `/v2/sports/entities/${entityType}`,
        {
          params: {
            include_related_names: includeRelatedNames,
            page,
            limit
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error getting ${entityType} entities:`, error);
      throw error;
    }
  }
}

// Create a singleton instance for convenience
export const entityResolver = new EntityResolver();
export default entityResolver;