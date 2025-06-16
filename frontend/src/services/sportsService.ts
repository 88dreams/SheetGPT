import { request } from '../utils/apiClient';
import { FilterConfig } from '../components/sports/EntityFilter';

export const sportsService = {
  // Entity lookup by name
  lookup: (entityType: string, name: string, leagueId?: string): Promise<any> => {
    console.log(`sportsService.lookup: Looking up ${entityType} with name "${name}"${leagueId ? ` in league ${leagueId}` : ''}`);
    let url = `/sports/lookup/${entityType}?name=${encodeURIComponent(name)}`;
    if (entityType === 'division_conference' && leagueId) {
      url += `&league_id=${leagueId}`;
    }
    console.log(`Lookup URL: ${url}`);
    return request(url, { requiresAuth: true })
      .then(result => {
        console.log(`Lookup result for ${entityType} "${name}":`, result);
        return result;
      })
      .catch(error => {
        console.error(`Error looking up ${entityType} "${name}":`, error);
        throw error;
      });
  },
  
  // Create broadcast company with enhanced logging
  createBroadcastCompanyWithLogging: (data: any): Promise<any> => {
    console.log(`Creating broadcast company:`, data);
    return request('/sports/broadcast-companies', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    });
  },
  
  // Create broadcast rights with better error handling
  createBroadcastRightsWithErrorHandling: (data: any): Promise<any> => {
    console.log(`Creating broadcast rights:`, data);
    return request('/sports/broadcast-rights', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    })
    .catch(error => {
      console.error('Error creating broadcast rights:', error);
      // Check for unique constraint violation
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
        throw new Error('A broadcast right with these parameters already exists. Try different parameters or edit the existing record.');
      }
      throw error;
    });
  },
    
  // Generic entity endpoints
  getEntities: async (
    entityType: string,
    filters: FilterConfig[] = [],
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'id',
    sortDirection: 'asc' | 'desc' = 'asc'
  ) => {
    // Ensure limit is within the backend's allowed range
    const validatedLimit = Math.min(10000, Math.max(1, limit));
    
    // Log if we had to adjust the limit
    if (validatedLimit !== limit && limit < 10000) { // Only warn if user set a high limit that got capped by old value
      console.warn(`API: Adjusted limit from ${limit} to ${validatedLimit} to comply with backend limits`);
    }
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: validatedLimit.toString(), // Use validated limit
      sort_by: sortBy,
      sort_direction: sortDirection
    });

    // Add filters to the request
    if (filters && filters.length > 0) {
      try {
        // Reverted to simple filter mapping
        const formattedFilters = filters.map(filter => ({
          field: filter.field,
          operator: filter.operator,
          value: filter.value
        }));
        
        const filtersParam = JSON.stringify(formattedFilters);
        params.append('filters', filtersParam);
      } catch (error) {
        console.error('Error stringifying filters:', error);
      }
    }

    const url = `/sports/entities/${entityType}?${params.toString()}`;
    
    try {
      const result = await request(url, { requiresAuth: true });
      return result;
    } catch (error) {
      console.error(`API: Error fetching ${entityType} entities:`, error);
      throw error;
    }
  },
    
  // League endpoints
  getLeagues: (): Promise<any[]> =>
    request('/sports/leagues', { requiresAuth: true }),
    
  createLeague: (data: any): Promise<any> =>
    request('/sports/leagues', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getLeague: (id: string): Promise<any> =>
    request(`/sports/leagues/${id}`, { requiresAuth: true }),
    
  updateLeague: (id: string, data: any): Promise<any> =>
    request(`/sports/leagues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteLeague: (id: string): Promise<void> =>
    request(`/sports/leagues/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  getDistinctSports: (): Promise<string[]> =>
    request('/sports/distinct-sports', { 
      requiresAuth: true 
    }),
    
  // Division/Conference endpoints
  getDivisionConferences: (leagueId?: string): Promise<any[]> =>
    request('/sports/divisions-conferences', { 
      requiresAuth: true,
      ...(leagueId && { params: { league_id: leagueId } })
    }),
    
  createDivisionConference: (data: any): Promise<any> =>
    request('/sports/divisions-conferences', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getDivisionConference: (id: string): Promise<any> =>
    request(`/sports/divisions-conferences/${id}`, { requiresAuth: true }),
    
  updateDivisionConference: (id: string, data: any): Promise<any> =>
    request(`/sports/divisions-conferences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteDivisionConference: (id: string): Promise<void> =>
    request(`/sports/divisions-conferences/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // Team endpoints
  getTeams: (leagueId?: string): Promise<any[]> =>
    request('/sports/teams', { 
      requiresAuth: true,
      ...(leagueId && { params: { league_id: leagueId } })
    }),
    
  createTeam: (data: any): Promise<any> =>
    request('/sports/teams', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getTeam: (id: string): Promise<any> =>
    request(`/sports/teams/${id}`, { requiresAuth: true }),
    
  updateTeam: (id: string, data: any): Promise<any> =>
    request(`/sports/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  partialUpdateTeam: (id: string, data: any): Promise<any> =>
    request(`/sports/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  // Generic method for partial updates by name
  updateEntityByName: (entityType: string, name: string, updateData: Record<string, any>): Promise<any> => {
    const fullData = { name, ...updateData };
    console.log(`Updating ${entityType} by name:`, fullData);
    return request(`/sports/update-by-name/${entityType}`, {
      method: 'POST',
      body: JSON.stringify(fullData),
      requiresAuth: true
    });
  },
  
  // Convenience methods for common update operations
  updateTeamDivision: (teamName: string, divisionId: string): Promise<any> =>
    request(`/sports/update-by-name/team`, {
      method: 'POST',
      body: JSON.stringify({
        name: teamName,
        division_conference_id: divisionId
      }),
      requiresAuth: true
    }),
    
  deleteTeam: (id: string): Promise<void> =>
    request(`/sports/teams/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // Player endpoints
  getPlayers: (teamId?: string): Promise<any[]> =>
    request('/sports/players', { 
      requiresAuth: true,
      ...(teamId && { params: { team_id: teamId } })
    }),
    
  createPlayer: (data: any): Promise<any> =>
    request('/sports/players', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getPlayer: (id: string): Promise<any> =>
    request(`/sports/players/${id}`, { requiresAuth: true }),
    
  updatePlayer: (id: string, data: any): Promise<any> =>
    request(`/sports/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deletePlayer: (id: string): Promise<void> =>
    request(`/sports/players/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // Game endpoints
  getGames: (filters?: { league_id?: string, team_id?: string, season_year?: number }): Promise<any[]> =>
    request('/sports/games', { 
      requiresAuth: true,
      ...(filters && { params: filters })
    }),
    
  createGame: (data: any): Promise<any> =>
    request('/sports/games', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getGame: (id: string): Promise<any> =>
    request(`/sports/games/${id}`, { requiresAuth: true }),
    
  updateGame: (id: string, data: any): Promise<any> =>
    request(`/sports/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteGame: (id: string): Promise<void> =>
    request(`/sports/games/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // Stadium endpoints
  getStadiums: (): Promise<any[]> =>
    request('/sports/stadiums', { requiresAuth: true }),
    
  createStadium: (data: any): Promise<any> =>
    request('/sports/stadiums', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getStadium: (id: string): Promise<any> =>
    request(`/sports/stadiums/${id}`, { requiresAuth: true }),
    
  updateStadium: (id: string, data: any): Promise<any> =>
    request(`/sports/stadiums/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteStadium: (id: string): Promise<void> =>
    request(`/sports/stadiums/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // BroadcastCompany endpoints
  getBroadcastCompanies: (): Promise<any[]> =>
    request('/sports/broadcast-companies', { requiresAuth: true }),
    
  getBroadcastCompany: (id: string): Promise<any> =>
    request(`/sports/broadcast-companies/${id}`, { requiresAuth: true }),
    
  updateBroadcastCompany: (id: string, data: any): Promise<any> =>
    request(`/sports/broadcast-companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteBroadcastCompany: (id: string): Promise<void> =>
    request(`/sports/broadcast-companies/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // BroadcastRights endpoints
  getBroadcastRights: (filters?: { entity_type?: string, entity_id?: string, company_id?: string }): Promise<any[]> =>
    request('/sports/broadcast-rights', { 
      requiresAuth: true,
      ...(filters && { params: filters })
    }),
    
  getBroadcastRight: (id: string): Promise<any> =>
    request(`/sports/broadcast-rights/${id}`, { requiresAuth: true }),
    
  updateBroadcastRights: (id: string, data: any): Promise<any> =>
    request(`/sports/broadcast-rights/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteBroadcastRights: (id: string): Promise<void> => {
    console.log(`sportsService: Deleting broadcast rights with ID: ${id}`);
    
    // Direct deletion since entity type mapping is now fixed
    return request(`/sports/broadcast-rights/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    });
  },
    
  // ProductionCompany endpoints
  getProductionCompanies: (): Promise<any[]> =>
    request('/sports/production-companies', { requiresAuth: true }),
    
  createProductionCompany: (data: any): Promise<any> =>
    request('/sports/production-companies', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getProductionCompany: (id: string): Promise<any> =>
    request(`/sports/production-companies/${id}`, { requiresAuth: true }),
    
  updateProductionCompany: (id: string, data: any): Promise<any> =>
    request(`/sports/production-companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteProductionCompany: (id: string): Promise<void> =>
    request(`/sports/production-companies/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // ProductionService endpoints
  getProductionServices: (filters?: { entity_type?: string, entity_id?: string, company_id?: string }): Promise<any[]> =>
    request('/sports/production-services', { 
      requiresAuth: true,
      ...(filters && { params: filters })
    }),
    
  createProductionService: (data: any): Promise<any> =>
    request('/sports/production-services', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getProductionService: (id: string): Promise<any> =>
    request(`/sports/production-services/${id}`, { requiresAuth: true }),
    
  updateProductionService: (id: string, data: any): Promise<any> =>
    request(`/sports/production-services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteProductionService: (id: string): Promise<void> =>
    request(`/sports/production-services/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // Brand endpoints
  getBrands: (industry?: string): Promise<any[]> =>
    request('/sports/brands', { 
      requiresAuth: true,
      ...(industry && { params: { industry } })
    }),
    
  createBrand: (data: any): Promise<any> =>
    request('/sports/brands', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getBrand: (id: string): Promise<any> =>
    request(`/sports/brands/${id}`, { requiresAuth: true }),
    
  updateBrand: (id: string, data: any): Promise<any> =>
    request(`/sports/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteBrand: (id: string): Promise<void> =>
    request(`/sports/brands/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // BrandRelationship endpoints
  getBrandRelationships: (filters?: { brand_id?: string, entity_type?: string, entity_id?: string, relationship_type?: string }): Promise<any[]> =>
    request('/sports/brand-relationships', { 
      requiresAuth: true,
      ...(filters && { params: filters })
    }),
    
  createBrandRelationship: (data: any): Promise<any> =>
    request('/sports/brand-relationships', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getBrandRelationship: (id: string): Promise<any> =>
    request(`/sports/brand-relationships/${id}`, { requiresAuth: true }),
    
  updateBrandRelationship: (id: string, data: any): Promise<any> =>
    request(`/sports/brand-relationships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteBrandRelationship: (id: string): Promise<void> =>
    request(`/sports/brand-relationships/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // Export endpoint
  exportEntities: (data: { 
    entity_type: string, 
    entity_ids: string[], 
    include_relationships: boolean,
    visible_columns?: string[] | null,
    target_folder?: string,
    file_name?: string,
    use_drive_picker?: boolean
  }): Promise<any> => {
    console.log("sportsService.exportEntities - Request data:", data);
    
    // Clean up the data before sending
    const requestData = {
      ...data,
      // Only include visible_columns if it's not null or empty
      visible_columns: data.visible_columns && data.visible_columns.length > 0 
        ? data.visible_columns 
        : undefined,
      // Include new fields
      file_name: data.file_name || undefined,
      use_drive_picker: data.use_drive_picker || false
    };
    
    console.log("sportsService.exportEntities - Sanitized request data:", requestData);
    
    return request('/sports/export', {
      method: 'POST',
      body: JSON.stringify(requestData),
      requiresAuth: true
    });
  },

  // GameBroadcast endpoints
  getGameBroadcasts: (game_id?: string): Promise<any[]> =>
    request('/sports/game-broadcasts', { 
      requiresAuth: true,
      ...(game_id && { params: { game_id } })
    }),
    
  createGameBroadcast: (data: any): Promise<any> =>
    request('/sports/game-broadcasts', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getGameBroadcast: (id: string): Promise<any> =>
    request(`/sports/game-broadcasts/${id}`, { requiresAuth: true }),
    
  updateGameBroadcast: (id: string, data: any): Promise<any> =>
    request(`/sports/game-broadcasts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteGameBroadcast: (id: string): Promise<void> =>
    request(`/sports/game-broadcasts/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),
    
  // LeagueExecutive endpoints
  getLeagueExecutives: (league_id?: string): Promise<any[]> =>
    request('/sports/league-executives', { 
      requiresAuth: true,
      ...(league_id && { params: { league_id } })
    }),
    
  createLeagueExecutive: (data: any): Promise<any> =>
    request('/sports/league-executives', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  getLeagueExecutive: (id: string): Promise<any> =>
    request(`/sports/league-executives/${id}`, { requiresAuth: true }),
    
  updateLeagueExecutive: (id: string, data: any): Promise<any> =>
    request(`/sports/league-executives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  deleteLeagueExecutive: (id: string): Promise<void> =>
    request(`/sports/league-executives/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    }),

  getAllEntitiesForExport: async (
    entityType: string,
    filters: FilterConfig[] = [],
    sortBy: string = 'id',
    sortDirection: 'asc' | 'desc' = 'asc'
  ) => {
    const params = new URLSearchParams({
      sort_by: sortBy,
      sort_direction: sortDirection,
      limit: '10000' // Hardcode a high limit for export
    });

    if (filters && filters.length > 0) {
      params.append('filters', JSON.stringify(filters));
    }

    const url = `/sports/entities/${entityType}?${params.toString()}`;
    return request(url, { requiresAuth: true });
  },
};

export default sportsService;