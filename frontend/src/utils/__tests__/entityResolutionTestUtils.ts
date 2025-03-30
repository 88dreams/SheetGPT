import { Entity, EntityType } from '../../../frontend/src/types/sports';
import { EntityResolutionOptions } from '../../../frontend/src/utils/entityResolver';

/**
 * Generate mock resolution info for testing
 * @param type Resolution type (exact, fuzzy, context, virtual, error, loading)
 * @param score Match score (0.0-1.0) for fuzzy matches
 */
export const mockResolutionInfo = (type: 'exact' | 'fuzzy' | 'context' | 'virtual', score = 0.85) => {
  switch (type) {
    case 'exact':
      return {
        match_score: 1.0,
        fuzzy_matched: false,
        context_matched: false,
        virtual_entity: false,
        resolved_via: 'exact_match'
      };
    case 'fuzzy':
      return {
        match_score: score,
        fuzzy_matched: true,
        context_matched: false,
        virtual_entity: false,
        resolved_via: 'fuzzy_match'
      };
    case 'context':
      return {
        match_score: score,
        fuzzy_matched: false,
        context_matched: true,
        virtual_entity: false,
        resolved_via: 'context_match'
      };
    case 'virtual':
      return {
        match_score: 1.0,
        fuzzy_matched: false,
        context_matched: false,
        virtual_entity: true,
        resolved_via: 'virtual_entity'
      };
    default:
      return {};
  }
};

/**
 * Generate mock entity with specified type and name pattern
 * @param entityType The entity type
 * @param namePattern Name pattern (exact, fuzzy, context, virtual)
 */
export const mockEntity = (entityType: EntityType, namePattern: string): Entity => {
  const type = namePattern.includes('exact') ? 'exact' :
               namePattern.includes('fuzzy') ? 'fuzzy' :
               namePattern.includes('context') ? 'context' :
               namePattern.includes('virtual') ? 'virtual' : 'unknown';
  
  const typeName = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  
  return {
    id: `${entityType}_${type}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${typeName}`,
    type: entityType as string
  };
};

/**
 * Mock entity resolution result for testing
 * @param entityType The entity type
 * @param nameOrId Name or ID to resolve
 * @param options Resolution options
 */
export const mockEntityResolution = (
  entityType: EntityType, 
  nameOrId: string | null,
  options?: EntityResolutionOptions
) => {
  if (!nameOrId) {
    return {
      entity: null,
      isLoading: false,
      error: null,
      resolutionInfo: {}
    };
  }
  
  if (nameOrId === 'loading') {
    return {
      entity: null,
      isLoading: true,
      error: null,
      resolutionInfo: {}
    };
  }
  
  if (nameOrId.includes('error')) {
    return {
      entity: null,
      isLoading: false,
      error: new Error('Entity not found'),
      resolutionInfo: {}
    };
  }
  
  const type = nameOrId.includes('exact') ? 'exact' :
               nameOrId.includes('fuzzy') ? 'fuzzy' :
               nameOrId.includes('context') ? 'context' :
               nameOrId.includes('virtual') ? 'virtual' : null;
  
  if (!type) {
    return {
      entity: null,
      isLoading: false,
      error: null,
      resolutionInfo: {}
    };
  }
  
  const entity = mockEntity(entityType, nameOrId);
  const resolutionInfo = mockResolutionInfo(type);
  
  return {
    entity,
    isLoading: false,
    error: null,
    resolutionInfo: {
      matchScore: resolutionInfo.match_score,
      fuzzyMatched: resolutionInfo.fuzzy_matched,
      contextMatched: resolutionInfo.context_matched,
      virtualEntity: resolutionInfo.virtual_entity,
      resolvedEntityType: entityType,
      resolvedVia: resolutionInfo.resolved_via
    }
  };
};

/**
 * Generate mock related entity data for testing
 */
export const mockRelatedEntityData = () => {
  return {
    leagues: [
      { id: 'league_1', name: 'Test League', sport: 'Football' },
      { id: 'league_2', name: 'Another League', sport: 'Basketball' }
    ],
    teams: [
      { id: 'team_1', name: 'Test Team', league_id: 'league_1' },
      { id: 'team_2', name: 'Another Team', league_id: 'league_2' }
    ],
    division_conferences: [
      { id: 'div_1', name: 'Test Division', league_id: 'league_1', type: 'division' },
      { id: 'conf_1', name: 'Test Conference', league_id: 'league_2', type: 'conference' }
    ],
    stadiums: [
      { id: 'stadium_1', name: 'Test Stadium', capacity: 50000 },
      { id: 'stadium_2', name: 'Another Stadium', capacity: 30000 }
    ],
    broadcasts: [
      { id: 'broadcast_1', name: 'Test Broadcast', broadcast_company_id: 'company_1' },
      { id: 'broadcast_2', name: 'Another Broadcast', broadcast_company_id: 'company_2' }
    ],
    productions: [
      { id: 'production_1', name: 'Test Production', production_company_id: 'company_1' },
      { id: 'production_2', name: 'Another Production', production_company_id: 'company_2' }
    ],
    brands: [
      { id: 'brand_1', name: 'Test Brand', industry: 'Sports' },
      { id: 'brand_2', name: 'Another Brand', industry: 'Media' }
    ]
  };
};

/**
 * Create mock entity field definitions for testing
 */
export const mockEntityFields = () => {
  return {
    name: { label: 'Name', type: 'string' },
    description: { label: 'Description', type: 'string' },
    score: { label: 'Score', type: 'number' },
    active: { label: 'Active', type: 'boolean' },
    created_at: { label: 'Created At', type: 'date' },
    updated_at: { label: 'Updated At', type: 'date' },
    league_id: { 
      label: 'League', 
      type: 'relation', 
      entity_type: 'league',
      help: 'Select the league this team belongs to'
    },
    division_conference_id: { 
      label: 'Division/Conference', 
      type: 'relation', 
      entity_type: 'division_conference',
      help: 'Select the division or conference this team belongs to'
    },
    stadium_id: { 
      label: 'Stadium', 
      type: 'relation', 
      entity_type: 'stadium',
      help: 'Select the home stadium for this team'
    }
  };
};

/**
 * Create mock field categories for testing
 */
export const mockFieldCategories = () => {
  return {
    'Basic Info': ['name', 'description'],
    'Statistics': ['score'],
    'Status': ['active'],
    'Timestamps': ['created_at', 'updated_at'],
    'Relationships': ['league_id', 'division_conference_id', 'stadium_id']
  };
};