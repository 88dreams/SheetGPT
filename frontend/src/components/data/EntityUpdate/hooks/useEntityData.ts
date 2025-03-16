import { useState, useEffect } from 'react';
import { useApiClient } from '../../../../hooks/useApiClient';
import { DivisionConference, League, Stadium } from '../../../../types/sports';

/**
 * Custom hook to fetch related entity data
 */
export function useEntityData(entityType: string) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [divisionConferences, setDivisionConferences] = useState<DivisionConference[]>([]);
  const [broadcastCompanies, setBroadcastCompanies] = useState<any[]>([]);
  const [productionCompanies, setProductionCompanies] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const apiClient = useApiClient();
  
  useEffect(() => {
    const loadRelatedData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Common data fetches based on entity type
        if (['team', 'division_conference', 'broadcast', 'production', 'brand'].includes(entityType)) {
          const leaguesResponse = await apiClient.get('/api/v1/leagues');
          setLeagues(leaguesResponse.data.items || []);
        }
        
        if (['team'].includes(entityType)) {
          const stadiumsResponse = await apiClient.get('/api/v1/stadiums');
          setStadiums(stadiumsResponse.data.items || []);
        }
        
        if (['team', 'broadcast', 'production', 'brand'].includes(entityType)) {
          const divisionConferencesResponse = await apiClient.get('/api/v1/divisions-conferences');
          setDivisionConferences(divisionConferencesResponse.data.items || []);
        }
        
        // Entity-specific data fetches
        if (entityType === 'broadcast') {
          const broadcastCompaniesResponse = await apiClient.get('/api/v1/broadcast-companies');
          setBroadcastCompanies(broadcastCompaniesResponse.data.items || []);
        }
        
        if (entityType === 'production') {
          const productionCompaniesResponse = await apiClient.get('/api/v1/production-companies');
          setProductionCompanies(productionCompaniesResponse.data.items || []);
        }
        
        if (entityType === 'brand') {
          const brandsResponse = await apiClient.get('/api/v1/brands');
          setBrands(brandsResponse.data.items || []);
        }
      } catch (err) {
        console.error('Error loading related data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRelatedData();
  }, [entityType, apiClient]);
  
  return {
    leagues,
    stadiums,
    divisionConferences,
    broadcastCompanies,
    productionCompanies,
    brands,
    isLoading,
    error
  };
}

/**
 * Hook to fetch relationships and history for an entity
 */
export function useEntityRelationships(entityType: string, entityId: string) {
  const [relatedEntities, setRelatedEntities] = useState<any[]>([]);
  const [changeHistory, setChangeHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const apiClient = useApiClient();
  
  useEffect(() => {
    if (!entityId) return;
    
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load related entities
        if (entityType === 'stadium') {
          const response = await apiClient.get(`/api/v1/teams`, {
            params: {
              filters: JSON.stringify([{
                field: 'stadium_id',
                operator: 'eq',
                value: entityId
              }])
            }
          });
          setRelatedEntities(response.data.items.map((team: any) => ({
            id: team.id,
            name: team.name,
            type: 'team',
            relationship: 'Home Stadium'
          })));
        } else if (entityType === 'division_conference') {
          // Get teams in this division/conference
          const teamsResponse = await apiClient.get(`/api/v1/teams`, {
            params: {
              filters: JSON.stringify([{
                field: 'division_conference_id',
                operator: 'eq',
                value: entityId
              }])
            }
          });
          
          // Get broadcast rights for this division/conference
          const broadcastResponse = await apiClient.get(`/api/v1/broadcast-rights`, {
            params: {
              filters: JSON.stringify([{
                field: 'entity_type',
                operator: 'eq',
                value: 'division_conference'
              }, {
                field: 'entity_id',
                operator: 'eq',
                value: entityId
              }])
            }
          });
          
          // Combine related entities
          const relatedTeams = teamsResponse.data.items.map((team: any) => ({
            id: team.id,
            name: team.name,
            type: 'team',
            relationship: 'Member Team'
          }));
          
          const relatedBroadcasts = broadcastResponse.data.items.map((broadcast: any) => ({
            id: broadcast.id,
            name: broadcast.name || `Broadcast rights (${broadcast.territory})`,
            type: 'broadcast',
            relationship: 'Broadcast Rights'
          }));
          
          setRelatedEntities([...relatedTeams, ...relatedBroadcasts]);
        }
        
        // Load change history
        try {
          const historyResponse = await apiClient.get(`/api/v1/${entityType}s/${entityId}/history`);
          if (historyResponse.data && Array.isArray(historyResponse.data)) {
            setChangeHistory(historyResponse.data);
          } else {
            setChangeHistory([]);
          }
        } catch (historyError) {
          console.error('Error loading change history:', historyError);
          setChangeHistory([]);
        }
      } catch (err) {
        console.error('Error loading relationships:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [entityType, entityId, apiClient]);
  
  return {
    relatedEntities,
    changeHistory,
    isLoading,
    error
  };
}