import { useCallback, useMemo } from 'react';
import { EntityType } from '../../../../types/sports';
import { FieldDefinition } from '../types';

/**
 * Hook for detecting and managing field definitions
 */
const useFieldDetection = () => {
  // Extract fields from query results
  const detectFieldsFromQueryResults = useCallback((queryResults: any[]) => {
    if (!queryResults.length) return { fields: [], isTeam: false };
    
    // Extract field info from the first result
    const firstResult = queryResults[0];
    
    // Check if this result looks like a team (has name, city fields)
    const isTeam = firstResult.name && 
                 (firstResult.city || firstResult.league_id) && 
                 !firstResult.sport; // Not a league

    // Extract base fields from the result
    let fields = Object.keys(firstResult).map(name => {
      const value = firstResult[name];
      const type = typeof value === 'number' ? 'number' : 
                  typeof value === 'boolean' ? 'boolean' :
                  (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) ? 'datetime' :
                  'string';
      
      return {
        name,
        type,
        required: false,
        description: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    });
    
    // For teams, ensure division_conference_id is always included
    if (isTeam && !fields.some(f => f.name === 'division_conference_id')) {
      fields.push({
        name: 'division_conference_id',
        type: 'string',
        required: true,
        description: 'Division/Conference ID'
      });
    }
    
    // Return both fields and the detection result
    return { 
      fields: JSON.parse(JSON.stringify(fields)), // Create a clean copy to prevent reference issues
      isTeam 
    };
  }, []);

  // Get entity fields from predefined schemas (simulated API call)
  const getEntityFields = useCallback((entityType: EntityType) => {
    // This is a simplified implementation - will be replaced with actual API call
    const commonFields = [
      { name: 'id', type: 'string', required: false, description: 'Unique identifier' },
      { name: 'name', type: 'string', required: true, description: 'Name of the entity' },
      { name: 'created_at', type: 'datetime', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'datetime', required: false, description: 'Last update timestamp' }
    ];
    
    const entitySpecificFields: Record<EntityType, FieldDefinition[]> = {
      'league': [
        { name: 'nickname', type: 'string', required: false, description: 'League nickname or abbreviation (e.g., NFL, NBA)' },
        { name: 'sport', type: 'string', required: true, description: 'Sport type' },
        { name: 'country', type: 'string', required: true, description: 'Country' },
        { name: 'founded_year', type: 'number', required: false, description: 'Year founded' }
      ],
      'division_conference': [
        { name: 'league_id', type: 'string', required: true, description: 'League ID' },
        { name: 'nickname', type: 'string', required: false, description: 'Nickname or abbreviation (AFC, NFC, etc)' },
        { name: 'type', type: 'string', required: true, description: 'Type (Division, Conference)' },
        { name: 'region', type: 'string', required: false, description: 'Region (East, West, etc)' }
      ],
      'team': [
        { name: 'league_id', type: 'string', required: true, description: 'League ID' },
        { name: 'division_conference_id', type: 'string', required: true, description: 'Division/Conference ID' },
        { name: 'city', type: 'string', required: true, description: 'City' },
        { name: 'country', type: 'string', required: true, description: 'Country' },
        { name: 'state', type: 'string', required: false, description: 'State/Province' },
        { name: 'founded_year', type: 'number', required: false, description: 'Year founded' }
      ],
      'player': [
        { name: 'team_id', type: 'string', required: true, description: 'Team ID' },
        { name: 'position', type: 'string', required: true, description: 'Position' }
      ],
      'game': [
        { name: 'league_id', type: 'string', required: true, description: 'League ID' },
        { name: 'home_team_id', type: 'string', required: true, description: 'Home Team ID' },
        { name: 'away_team_id', type: 'string', required: true, description: 'Away Team ID' },
        { name: 'date', type: 'date', required: true, description: 'Game Date' }
      ],
      'stadium': [
        { name: 'city', type: 'string', required: true, description: 'City' },
        { name: 'country', type: 'string', required: true, description: 'Country' },
        { name: 'capacity', type: 'number', required: false, description: 'Capacity' }
      ],
      'broadcast': [
        { name: 'broadcast_company_id', type: 'string', required: true, description: 'Broadcast Company ID' },
        { name: 'entity_type', type: 'string', required: true, description: 'Entity Type' },
        { name: 'entity_id', type: 'string', required: true, description: 'Entity ID' }
      ],
      'production': [
        { name: 'production_company_id', type: 'string', required: true, description: 'Production Company ID' },
        { name: 'entity_type', type: 'string', required: true, description: 'Entity Type' },
        { name: 'entity_id', type: 'string', required: true, description: 'Entity ID' }
      ],
      'brand': [
        { name: 'industry', type: 'string', required: true, description: 'Industry' }
      ],
      'game_broadcast': [
        { name: 'game_id', type: 'string', required: true, description: 'Game ID' },
        { name: 'broadcast_company_id', type: 'string', required: true, description: 'Broadcast Company ID' }
      ],
      'league_executive': [
        { name: 'league_id', type: 'string', required: true, description: 'League ID' },
        { name: 'position', type: 'string', required: true, description: 'Position' }
      ]
    };
    
    // Combine common fields with entity-specific fields
    const allFields = [...commonFields, ...(entitySpecificFields[entityType] || [])];
    
    // Filter out read-only fields like id, created_at, updated_at
    return allFields.filter(field => 
      !['id', 'created_at', 'updated_at'].includes(field.name)
    );
  }, []);

  return {
    detectFieldsFromQueryResults,
    getEntityFields
  };
};

export default useFieldDetection;