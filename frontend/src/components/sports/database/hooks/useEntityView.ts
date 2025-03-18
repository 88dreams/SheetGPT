import { useState, useCallback } from 'react';
import SportsDatabaseService, { EntityType } from '../../../../services/SportsDatabaseService';

export function useEntityView(entityType: EntityType) {
  // Persist view mode in localStorage
  const storedViewMode = localStorage.getItem('sportsDbViewMode');
  const [viewMode, setViewMode] = useState<'entity' | 'global' | 'fields'>(
    (storedViewMode as 'entity' | 'global' | 'fields') || 'entity'
  );
  
  // Update localStorage when view mode changes
  const updateViewMode = useCallback((newMode: 'entity' | 'global' | 'fields') => {
    localStorage.setItem('sportsDbViewMode', newMode);
    setViewMode(newMode);
  }, []);
  const [entityCounts, setEntityCounts] = useState<Record<EntityType, number>>({
    league: 0,
    division_conference: 0,
    team: 0,
    player: 0,
    game: 0,
    stadium: 0,
    broadcast: 0,
    production: 0,
    brand: 0,
    game_broadcast: 0,
    league_executive: 0
  });

  // Function to fetch counts for all entity types
  const fetchEntityCounts = useCallback(async () => {
    try {
      const counts: Record<EntityType, number> = {
        league: 0,
        division_conference: 0,
        team: 0,
        player: 0,
        game: 0,
        stadium: 0,
        broadcast: 0,
        production: 0,
        brand: 0,
        game_broadcast: 0,
        league_executive: 0
      };

      // Fetch counts for each entity type
      for (const entityType of Object.keys(counts) as EntityType[]) {
        const result = await SportsDatabaseService.getEntities({
          entityType,
          page: 1,
          limit: 1
        });
        counts[entityType] = result.total || 0;
      }

      setEntityCounts(counts);
    } catch (error) {
      console.error('Error fetching entity counts:', error);
    }
  }, []);

  return {
    viewMode,
    setViewMode: updateViewMode,
    entityCounts,
    setEntityCounts,
    fetchEntityCounts
  };
}