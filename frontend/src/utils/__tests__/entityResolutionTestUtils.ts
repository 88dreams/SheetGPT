import { Entity, EntityType } from '../../types/sports';
import { EntityResolutionOptions } from '../entityResolver';

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
 * @param entityType The entity type (from ../../types/sports)
 * @param namePattern Name pattern (exact, fuzzy, context, virtual)
 */
export const mockEntity = (entityType: EntityType, namePattern: string): Entity => {
  const namePrefix = namePattern.includes('exact') ? 'Exact' :
                     namePattern.includes('fuzzy') ? 'Fuzzy' :
                     namePattern.includes('context') ? 'Context' :
                     namePattern.includes('virtual') ? 'Virtual' : 'UnknownPattern';
  
  const typeName = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  const baseId = `${entityType}_${namePrefix.toLowerCase()}`;
  const baseName = `${namePrefix} ${typeName}`;

  // Base properties common to many entities, ensure these align with your actual base Entity if one exists
  const baseEntityPart = {
    id: baseId,
    name: baseName,
    type: entityType,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  };

  switch (entityType) {
    case 'league':
      return { ...baseEntityPart, sport: 'MockSport', country: 'MockCountry' } as Entity;
    case 'team':
      return { 
        ...baseEntityPart, 
        league_id: 'league_mock', 
        division_conference_id: 'div_mock', 
        stadium_id: 'stadium_mock', 
        city: 'MockCity', 
        country: 'MockCountry' 
      } as Entity;
    case 'player':
      return { ...baseEntityPart, team_id: 'team_mock', position: 'Forward' } as Entity;
    case 'game':
      return { 
        ...baseEntityPart, 
        league_id: 'league_mock', 
        home_team_id: 'team_home_mock', 
        away_team_id: 'team_away_mock', 
        stadium_id: 'stadium_mock', 
        date: '2023-10-26', 
        season_year: 2023, 
        season_type: 'Regular Season' 
      } as Entity;
    case 'stadium':
      return { ...baseEntityPart, city: 'MockCity', country: 'MockCountry' } as Entity;
    case 'division_conference':
      return { ...baseEntityPart, league_id: 'league_mock', type: 'Conference' } as Entity; 
    case 'broadcast': // This maps to BroadcastRights usually
      return { 
        ...baseEntityPart, 
        broadcast_company_id: 'bc_mock', 
        entity_id: 'ent_mock', // ID of the entity this right is for (e.g. league_id)
        entity_type: 'league',   // Type of the entity this right is for (e.g. 'league')
        territory: 'National', 
        start_date: '2023-01-01', // Added missing field
        end_date: '2024-01-01'     // Added missing field
      } as Entity;
    case 'production': // This might map to ProductionService
      return { 
        ...baseEntityPart, 
        production_company_id: 'pc_mock', 
        entity_id: 'ent_mock', // ID of the entity this service is for
        entity_type: 'game',   // Type of the entity this service is for
        service_type: 'Full Game', 
        start_date: '2023-01-01', // Added missing field
        end_date: '2024-01-01'     // Added missing field
      } as Entity;
    case 'brand':
      return { ...baseEntityPart, industry: 'Sports' } as Entity;
    case 'game_broadcast':
      return { 
        ...baseEntityPart, 
        game_id: 'game_mock', 
        broadcast_company_id: 'bc_mock', 
        broadcast_type: 'National', 
        territory: 'USA' // Added missing field
      } as Entity;
    case 'league_executive':
      return { ...baseEntityPart, league_id: 'league_mock', position: 'Commissioner' } as Entity;
    // Cases for 'person', 'production_company', 'production_service' are removed 
    // as they are not part of the EntityType imported from ../../types/sports
    default:
      // This default needs to be careful. If entityType is a specific type not handled above
      // but is part of the imported EntityType union, this generic object might still be invalid.
      // For a robust mock, all members of the EntityType union should be handled explicitly.
      console.warn(`mockEntity: Unhandled or unknown entityType "${entityType}" from types/sports. Returning a generic structure.`);
      // Return a structure that has a chance of being a common base, or cast to any for mocks.
      // This is a fallback and might not satisfy specific entity type requirements if EntityType is broad.
      return { 
        id: baseId, 
        name: baseName, 
        type: entityType 
        // Consider adding other absolutely minimal common fields if they exist across ALL Entity types
        // Forcing it to Entity to satisfy the return type, but this may be unsafe for unhandled types.
      } as any as Entity; 
  }
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