import { useState, useEffect, useMemo, useCallback } from 'react';
import { FieldDefinition, RelatedEntitiesMap } from '../types';
import { apiClient } from '../../../../utils/apiClient';
import { EntityType } from '../../../../types/sports';
import SportsDatabaseService from '../../../../services/SportsDatabaseService';
import { useCommonEntityData } from '../../../../hooks/useRelationshipData';
import { fingerprint } from '../../../../utils/fingerprint';

interface UseRelationshipsProps {
  isMounted: React.MutableRefObject<boolean>;
  isVisible: boolean;
}

/**
 * Hook for managing relationship data loading using the optimized relationship utilities
 */
const useRelationships = ({ isMounted, isVisible }: UseRelationshipsProps) => {
  // State for related entities (for dropdowns)
  const [relatedEntities, setRelatedEntities] = useState<RelatedEntitiesMap>({});
  const [divisionDataFetched, setDivisionDataFetched] = useState(false);
  
  // Use the optimized useCommonEntityData hook to preload frequently needed entities
  const { 
    leagues, 
    teams, 
    stadiums, 
    division_conferences, 
    brands,
    isLoading,
    error 
  } = useCommonEntityData('FORM_BASICS');
  
  // Map entity type to data array for easier access
  const entityDataMap = useMemo(() => ({
    'league': leagues || [],
    'team': teams || [],
    'stadium': stadiums || [],
    'division_conference': division_conferences || [],
    'brand': brands || [],
    'broadcast_company': brands?.filter(brand => brand.company_type === 'Broadcaster') || [],
    'production_company': brands?.filter(brand => brand.company_type === 'Production Company') || []
  }), [
    fingerprint(leagues),
    fingerprint(teams),
    fingerprint(stadiums), 
    fingerprint(division_conferences),
    fingerprint(brands)
  ]);
  
  // Transform preloaded data into the expected format when component becomes visible
  useEffect(() => {
    if (!isVisible || !isMounted.current) return;
    
    // Convert the preloaded data to the format expected by the modal
    const preloadedRelatedEntities: RelatedEntitiesMap = {};
    
    // Add division conferences (special handling)
    if (division_conferences && division_conferences.length > 0) {
      // Add league name mapping if not included
      const items = division_conferences.map(item => {
        if (!item.league_name && item.league_id) {
          const league = leagues?.find(l => l.id === item.league_id);
          return { 
            ...item, 
            league_name: league?.name || "League" 
          };
        }
        return item;
      });
      
      preloadedRelatedEntities['division_conference_id'] = items;
      setDivisionDataFetched(true);
    }
    
    // Add leagues
    if (leagues && leagues.length > 0) {
      preloadedRelatedEntities['league_id'] = leagues;
    }
    
    // Add stadiums
    if (stadiums && stadiums.length > 0) {
      preloadedRelatedEntities['stadium_id'] = stadiums;
    }
    
    // Add brands for broadcast and production companies
    if (brands && brands.length > 0) {
      const broadcastCompanies = brands.filter(brand => brand.company_type === 'Broadcaster');
      const productionCompanies = brands.filter(brand => brand.company_type === 'Production Company');
      
      preloadedRelatedEntities['broadcast_company_id'] = broadcastCompanies;
      preloadedRelatedEntities['production_company_id'] = productionCompanies;
      preloadedRelatedEntities['brand_id'] = brands;
    }
    
    // Update state with preloaded entities
    if (Object.keys(preloadedRelatedEntities).length > 0) {
      setRelatedEntities(prev => ({
        ...prev,
        ...preloadedRelatedEntities
      }));
    }
  }, [isVisible, isMounted, fingerprint(leagues), fingerprint(division_conferences), fingerprint(stadiums), fingerprint(brands)]);

  // Load division conference data (fallback if preloaded data is unavailable)
  const loadDivisionData = useCallback(async () => {
    // Don't attempt to load if component is no longer mounted or modal is hidden
    if (!isMounted.current || !isVisible) return;
    
    // Skip if already loaded or available in preloaded data
    if (relatedEntities['division_conference_id'] || (division_conferences && division_conferences.length > 0)) {
      setDivisionDataFetched(true);
      return;
    }
    
    try {
      const response = await apiClient.get('/sports/divisions-conferences');
      
      // Safety check - only update state if component is still mounted and modal is visible
      if (!isMounted.current || !isVisible) return;
      
      if (response?.data) {
        // Add league name mapping if not included
        const items = response.data.map((item: any) => {
          if (!item.league_name && item.league_id) {
            const league = leagues?.find(l => l.id === item.league_id);
            return { 
              ...item, 
              league_name: league?.name || "League" 
            };
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
  }, [isMounted, isVisible, relatedEntities, division_conferences, leagues]);

  // Load related entities for foreign key fields in entity mode
  const loadEntityRelationships = useCallback(async (fields: FieldDefinition[]) => {
    if (!isMounted.current || !isVisible) return;
    
    const foreignKeyFields = fields.filter(field => 
      field.name.endsWith('_id') && field.name !== 'id'
    );
    
    const relatedData: Record<string, any[]> = {};
    
    // Check preloaded data first before making API calls
    for (const field of foreignKeyFields) {
      // Extract entity type from field name (e.g., "league_id" -> "league")
      let relatedEntityType = field.name.replace('_id', '') as any;
      
      // First check if we already have this data from useCommonEntityData
      if (entityDataMap[relatedEntityType] && entityDataMap[relatedEntityType].length > 0) {
        // Use preloaded data
        relatedData[field.name] = entityDataMap[relatedEntityType];
        continue; // Skip API call for this field
      }
      
      // Only make API calls for fields not already loaded
      try {
        // Skip if component unmounted during async operations
        if (!isMounted.current || !isVisible) return;
        
        // Special handling for division_conference - use direct endpoint if not already loaded
        if (relatedEntityType === 'division_conference' && !relatedData[field.name]) {
          try {
            const response = await apiClient.get('/sports/divisions-conferences');
            
            // Add league name mapping if not included
            const items = response.data.map((item: any) => {
              if (!item.league_name && item.league_id) {
                const league = leagues?.find(l => l.id === item.league_id);
                return { 
                  ...item, 
                  league_name: league?.name || "League" 
                };
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
        if (!['league', 'team', 'player', 'game', 'stadium', 'broadcast', 'broadcast_company', 'production_company', 'brand'].includes(relatedEntityType)) {
          console.log(`Skipping unsupported entity type: ${relatedEntityType}`);
          continue;
        }
        
        // Skip API call if we already have data from preloaded entities
        if (relatedData[field.name] && relatedData[field.name].length > 0) {
          continue;
        }
        
        // Otherwise make API call
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
    
    if (isMounted.current && isVisible && Object.keys(relatedData).length > 0) {
      setRelatedEntities(prev => ({
        ...prev,
        ...relatedData
      }));
    }
  }, [isMounted, isVisible, entityDataMap, leagues]);

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
      'player_id': 'player',
      'brand_id': 'brand'
    };
    
    // Identify relationship fields that need to be loaded
    const relationshipFields = fields
      .filter(field => field.name.endsWith('_id') && field.name !== 'id' && relationshipMap[field.name])
      .map(field => ({
        field: field.name,
        entityType: relationshipMap[field.name]
      }));
    
    // First check preloaded data and use that when available
    const relatedData: Record<string, any[]> = {};
    
    for (const relationship of relationshipFields) {
      // Skip if we already have this field in related entities
      if (relatedEntities[relationship.field]) continue;
      
      // Check if we have this data from preloaded entities
      const entityType = relationship.entityType as keyof typeof entityDataMap;
      if (entityDataMap[entityType] && entityDataMap[entityType].length > 0) {
        relatedData[relationship.field] = entityDataMap[entityType];
        continue; // Skip API call
      }
      
      // Skip division_conference_id as we handle it separately with loadDivisionData
      if (relationship.field === 'division_conference_id') continue;
      
      // Only make API calls for fields not in preloaded data
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
          relatedData[relationship.field] = response.data.items;
        }
      } catch (error) {
        console.error(`Error fetching ${relationship.entityType} for ${relationship.field}:`, error);
      }
    }
    
    // Update state with all collected data
    if (Object.keys(relatedData).length > 0) {
      setRelatedEntities(prev => ({
        ...prev,
        ...relatedData
      }));
    }
  }, [isMounted, isVisible, divisionDataFetched, relatedEntities, entityDataMap]);

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
    resetRelationships,
    // Add preloaded data access for components that need direct access
    preloadedData: entityDataMap,
    isLoading
  };
};

export default useRelationships;