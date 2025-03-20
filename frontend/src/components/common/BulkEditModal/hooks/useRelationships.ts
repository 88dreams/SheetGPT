import { useCallback, useState } from 'react';
import { FieldDefinition, RelatedEntitiesMap } from '../types';
import { apiClient } from '../../../../utils/apiClient';
import SportsDatabaseService from '../../../../services/SportsDatabaseService';

interface UseRelationshipsProps {
  isMounted: React.MutableRefObject<boolean>;
  isVisible: boolean;
}

/**
 * Hook for managing relationship data loading
 */
const useRelationships = ({ isMounted, isVisible }: UseRelationshipsProps) => {
  // State for related entities (for dropdowns)
  const [relatedEntities, setRelatedEntities] = useState<RelatedEntitiesMap>({});
  const [divisionDataFetched, setDivisionDataFetched] = useState(false);

  // Load division conference data
  const loadDivisionData = useCallback(async () => {
    // Don't attempt to load if component is no longer mounted or modal is hidden
    if (!isMounted.current || !isVisible) return;
    
    // Skip if already loaded
    if (relatedEntities && relatedEntities['division_conference_id']) return;
    
    try {
      const response = await apiClient.get('/sports/divisions-conferences');
      
      // Safety check - only update state if component is still mounted and modal is visible
      if (!isMounted.current || !isVisible) return;
      
      if (response?.data) {
        // Add league name mapping if not included
        const items = response.data.map((item: any) => {
          if (!item.league_name && item.league_id) {
            return { ...item, league_name: "League" };
          }
          return item;
        });
        
        // Update related entities with the division data
        setRelatedEntities(prev => ({
          ...prev,
          'division_conference_id': items
        }));
        
        setDivisionDataFetched(true);
      }
    } catch (error) {
      console.error('Error fetching division conferences:', error);
    }
  }, [isMounted, isVisible, relatedEntities]);

  // Load related entities for foreign key fields in entity mode
  const loadEntityRelationships = useCallback(async (fields: FieldDefinition[]) => {
    if (!isMounted.current || !isVisible) return;
    
    const foreignKeyFields = fields.filter(field => 
      field.name.endsWith('_id') && field.name !== 'id'
    );
    
    const relatedData: Record<string, any[]> = {};
    
    // Load data for each foreign key field
    for (const field of foreignKeyFields) {
      try {
        // Skip if component unmounted during async operations
        if (!isMounted.current || !isVisible) return;
        
        // Extract entity type from field name (e.g., "league_id" -> "league")
        let relatedEntityType = field.name.replace('_id', '') as any;
        
        // Special handling for division_conference - use direct endpoint
        if (relatedEntityType === 'division_conference') {
          try {
            const response = await apiClient.get('/sports/divisions-conferences');
            
            // Add league name mapping if not included
            const items = response.data.map((item: any) => {
              if (!item.league_name && item.league_id) {
                return { ...item, league_name: "League" };
              }
              return item;
            });
            
            relatedData[field.name] = items;
            continue; // Skip the generic entity approach
          } catch (error) {
            console.error('Error fetching division/conferences:', error);
            continue;
          }
        }
        
        // Skip if this isn't a valid entity type
        if (!['league', 'team', 'player', 'game', 'stadium', 'broadcast', 'broadcast_company', 'production_company'].includes(relatedEntityType)) {
          console.log(`Skipping unsupported entity type: ${relatedEntityType}`);
          continue;
        }
        
        const response = await SportsDatabaseService.getEntities({
          entityType: relatedEntityType,
          page: 1,
          limit: 100
        });
        
        relatedData[field.name] = response.items || [];
      } catch (error) {
        console.error(`Error loading options for ${field.name}:`, error);
      }
    }
    
    if (isMounted.current && isVisible) {
      setRelatedEntities(prev => ({
        ...prev,
        ...relatedData
      }));
    }
  }, [isMounted, isVisible]);

  // Load related entities for query-based mode
  const loadQueryRelationships = useCallback(async (fields: FieldDefinition[]) => {
    // Safety checks - always verify component is still mounted before updating state
    if (!isMounted.current || !isVisible) return;
    
    // Skip if division data is already loaded or being fetched
    if (divisionDataFetched) return;
    
    // Standard entity type mapping for relationship fields
    const relationshipMap: Record<string, string> = {
      'league_id': 'league',
      'team_id': 'team',
      'stadium_id': 'stadium',
      'broadcast_company_id': 'broadcast_company',
      'production_company_id': 'production_company',
      'game_id': 'game',
      'player_id': 'player'
    };
    
    // Identify relationship fields that need to be loaded
    const relationshipFields = fields
      .filter(field => field.name.endsWith('_id') && field.name !== 'id' && relationshipMap[field.name])
      .map(field => ({
        field: field.name,
        entityType: relationshipMap[field.name]
      }));
    
    // Process each relationship field one by one with safety checks
    for (const relationship of relationshipFields) {
      // Skip division_conference_id as we handle it separately with loadDivisionData
      if (relationship.field === 'division_conference_id') continue;
      
      // Safety check before each field fetch - component might have unmounted during async operations
      if (!isMounted.current || !isVisible) return;
      
      try {
        const response = await apiClient.get('/sports/entities', {
          params: {
            entityType: relationship.entityType,
            page: 1,
            limit: 100
          }
        });
        
        // Final safety check before updating state
        if (!isMounted.current || !isVisible) return;
        
        if (response.data && response.data.items) {
          // Safe state update with proper functional form
          setRelatedEntities(prev => {
            // Only update if the field doesn't already exist
            if (prev[relationship.field]) return prev;
            
            // Otherwise add the new field data
            return {
              ...prev,
              [relationship.field]: response.data.items
            };
          });
        }
      } catch (error) {
        console.error(`Error fetching ${relationship.entityType} for ${relationship.field}:`, error);
      }
    }
  }, [isMounted, isVisible, divisionDataFetched]);

  // Reset all relationship data
  const resetRelationships = useCallback(() => {
    setRelatedEntities({});
    setDivisionDataFetched(false);
  }, []);

  return {
    relatedEntities,
    divisionDataFetched,
    loadDivisionData,
    loadEntityRelationships,
    loadQueryRelationships,
    resetRelationships
  };
};

export default useRelationships;