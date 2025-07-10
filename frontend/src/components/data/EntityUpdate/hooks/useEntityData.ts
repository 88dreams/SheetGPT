import { useState, useEffect, useMemo } from 'react';
import { useApiClient } from '../../../../hooks/useApiClient';
import { DivisionConference, League, Stadium } from '../../../../types/sports';
import { useCommonEntityData } from '../../../../hooks/useRelationshipData';
import SportsDatabaseService from '../../../../services/SportsDatabaseService';
import { EntityType } from '../../../../types/sports';
import { fingerprint } from '../../../../utils/fingerprint';

// Map string entity types to the EntityType enum type
const mapToEntityType = (type: string): EntityType => {
  return type as EntityType;
};

// Define entity set mapping for different entity types
const ENTITY_SET_MAPPING: Record<string, string> = {
  'team': 'FORM_BASICS',
  'division_conference': 'FORM_BASICS',
  'broadcast': 'MEDIA_ENTITIES',
  'production': 'MEDIA_ENTITIES',
  'brand': 'MEDIA_ENTITIES',
  'league': 'LEAGUE_VIEW',
  'stadium': 'FORM_BASICS',
  'game': 'GAME_DAY',
  'game_broadcast': 'MEDIA_ENTITIES',
  'player': 'FORM_BASICS'
};

/**
 * Custom hook to fetch related entity data using the relationship loading utilities
 */
export function useEntityData(entityType: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Determine the appropriate entity set based on entity type
  const entitySet = useMemo(() => 
    ENTITY_SET_MAPPING[entityType] || 'FORM_BASICS', 
    [entityType]
  );
  
  // Use the optimized useCommonEntityData hook to load all related entities
  const relationshipData = useCommonEntityData(entitySet as any);
  
  // Extract the specific entity arrays needed for this entity type
  const leagues = useMemo(() => 
    relationshipData.leagues || [], 
    [fingerprint(relationshipData.leagues)]
  );
  
  const stadiums = useMemo(() => 
    relationshipData.stadiums || [], 
    [fingerprint(relationshipData.stadiums)]
  );
  
  const divisionConferences = useMemo(() => 
    relationshipData.division_conferences || [], 
    [fingerprint(relationshipData.division_conferences)]
  );
  
  const brands = useMemo(() => 
    relationshipData.brands || [], 
    [fingerprint(relationshipData.brands)]
  );
  
  // Derive broadcast and production companies from brands
  const broadcastCompanies = useMemo(() => 
    (relationshipData.brands || [])
      .filter(brand => brand.company_type === 'Broadcaster'), 
    [fingerprint(relationshipData.brands)]
  );
  
  const productionCompanies = useMemo(() => 
    (relationshipData.brands || [])
      .filter(brand => brand.company_type === 'Production Company'), 
    [fingerprint(relationshipData.brands)]
  );
  
  // Update loading and error states based on relationship data
  useEffect(() => {
    setIsLoading(relationshipData.isLoading);
    setError(relationshipData.error);
  }, [relationshipData.isLoading, relationshipData.error]);
  
  return {
    leagues,
    stadiums,
    divisionConferences,
    broadcastCompanies,
    productionCompanies,
    brands,
    isLoading,
    error,
    // Include the full relationship data for components that need more entities
    relationshipData
  };
}

/**
 * Hook to fetch relationships and history for an entity using the relationship loading utilities
 */
export function useEntityRelationships(entityType: string, entityId: string) {
  const [changeHistory, setChangeHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const apiClient = useApiClient();
  
  // Use the optimized useEntityRelationships hook from the relationship utilities
  const { 
    entity, 
    relationships,
    entitiesByType,
    isLoading: relationshipsLoading,
    error: relationshipsError
  } = useEntityRelationships(mapToEntityType(entityType), entityId);
  
  // Transform the relationships into the expected format for the UI
  const relatedEntities = useMemo(() => {
    if (!entity || !relationships) return [];
    
    const result: any[] = [];
    
    // Process relationships based on entity type
    if (entityType === 'stadium') {
      // Teams that use this stadium
      const teams = relationships.team || [];
      result.push(
        ...teams.map((team: any) => ({
          id: team.id,
          name: team.name,
          type: 'team',
          relationship: 'Home Stadium'
        }))
      );
    } else if (entityType === 'division_conference') {
      // Teams in this division/conference
      const teams = relationships.team || [];
      result.push(
        ...teams.map((team: any) => ({
          id: team.id,
          name: team.name,
          type: 'team',
          relationship: 'Member Team'
        }))
      );
      
      // Broadcast rights for this division/conference
      const broadcasts = relationships.broadcast_rights || [];
      result.push(
        ...broadcasts.map((broadcast: any) => ({
          id: broadcast.id,
          name: broadcast.name || `Broadcast rights (${broadcast.territory})`,
          type: 'broadcast',
          relationship: 'Broadcast Rights'
        }))
      );
    } else if (entityType === 'league') {
      // Teams in this league
      const teams = relationships.team || [];
      result.push(
        ...teams.map((team: any) => ({
          id: team.id,
          name: team.name,
          type: 'team',
          relationship: 'League Member'
        }))
      );
      
      // Division/conferences in this league
      const divisions = relationships.division_conference || [];
      result.push(
        ...divisions.map((division: any) => ({
          id: division.id,
          name: division.name,
          type: 'division_conference',
          relationship: 'League Division/Conference'
        }))
      );
      
      // Broadcast rights for this league
      const broadcasts = relationships.broadcast_rights || [];
      result.push(
        ...broadcasts.map((broadcast: any) => ({
          id: broadcast.id,
          name: broadcast.name || `Broadcast rights (${broadcast.territory})`,
          type: 'broadcast',
          relationship: 'Broadcast Rights'
        }))
      );
    } else if (entityType === 'team') {
      // Players on this team
      const players = relationships.player || [];
      result.push(
        ...players.map((player: any) => ({
          id: player.id,
          name: player.name,
          type: 'player',
          relationship: 'Team Player'
        }))
      );
      
      // League this team belongs to
      const league = relationships.league?.[0];
      if (league) {
        result.push({
          id: league.id,
          name: league.name,
          type: 'league',
          relationship: 'Member of League'
        });
      }
      
      // Division/Conference this team belongs to
      const division = relationships.division_conference?.[0];
      if (division) {
        result.push({
          id: division.id,
          name: division.name,
          type: 'division_conference',
          relationship: 'Member of Division/Conference'
        });
      }
      
      // Broadcast rights for this team
      const broadcasts = relationships.broadcast_rights || [];
      result.push(
        ...broadcasts.map((broadcast: any) => ({
          id: broadcast.id,
          name: broadcast.name || `Broadcast rights (${broadcast.territory})`,
          type: 'broadcast',
          relationship: 'Broadcast Rights'
        }))
      );
    }
    
    return result;
  }, [entityType, entity, relationships]);
  
  // Fetch change history separately since it's not handled by the relationship utilities
  useEffect(() => {
    if (!entityId) return;
    
    const loadHistory = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load change history
        const historyResponse = await apiClient.get(`/api/v1/${entityType}s/${entityId}/history`);
        if (historyResponse.data && Array.isArray(historyResponse.data)) {
          setChangeHistory(historyResponse.data);
        } else {
          setChangeHistory([]);
        }
      } catch (historyError) {
        console.error('Error loading change history:', historyError);
        setChangeHistory([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistory();
  }, [entityType, entityId, apiClient]);
  
  // Combine loading and error states
  const combinedLoading = isLoading || relationshipsLoading;
  const combinedError = error || relationshipsError;
  
  return {
    relatedEntities,
    changeHistory,
    isLoading: combinedLoading,
    error: combinedError,
    // Include the full relationships data for advanced usage
    entity,
    relationships,
    entitiesByType
  };
}