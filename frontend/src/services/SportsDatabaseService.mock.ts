import { FilterConfig } from '../components/sports/EntityFilter';
import { EntityType } from './SportsDatabaseService';

// Create mock data
const mockLeagues = [
  { id: 'league-1', name: 'NFL', sport: 'Football', country: 'USA', founded_year: 1920 },
  { id: 'league-2', name: 'NBA', sport: 'Basketball', country: 'USA', founded_year: 1946 },
  { id: 'league-3', name: 'MLB', sport: 'Baseball', country: 'USA', founded_year: 1903 },
  { id: 'league-4', name: 'NHL', sport: 'Hockey', country: 'USA', founded_year: 1917 },
  { id: 'league-5', name: 'Premier League', sport: 'Soccer', country: 'England', founded_year: 1992 }
];

const mockDivisions = [
  { id: 'div-1', name: 'AFC East', league_id: 'league-1', type: 'Division', region: 'East' },
  { id: 'div-2', name: 'NFC East', league_id: 'league-1', type: 'Division', region: 'East' },
  { id: 'div-3', name: 'Eastern Conference', league_id: 'league-2', type: 'Conference', region: 'East' },
  { id: 'div-4', name: 'Western Conference', league_id: 'league-2', type: 'Conference', region: 'West' }
];

const mockTeams = [
  { id: 'team-1', name: 'New England Patriots', league_id: 'league-1', division_conference_id: 'div-1', city: 'Foxborough', state: 'MA', country: 'USA', founded_year: 1959, stadium_id: 'stadium-1' },
  { id: 'team-2', name: 'Dallas Cowboys', league_id: 'league-1', division_conference_id: 'div-2', city: 'Arlington', state: 'TX', country: 'USA', founded_year: 1960, stadium_id: 'stadium-2' },
  { id: 'team-3', name: 'Boston Celtics', league_id: 'league-2', division_conference_id: 'div-3', city: 'Boston', state: 'MA', country: 'USA', founded_year: 1946, stadium_id: 'stadium-3' },
  { id: 'team-4', name: 'Los Angeles Lakers', league_id: 'league-2', division_conference_id: 'div-4', city: 'Los Angeles', state: 'CA', country: 'USA', founded_year: 1947, stadium_id: 'stadium-4' }
];

const mockStadiums = [
  { id: 'stadium-1', name: 'Gillette Stadium', city: 'Foxborough', state: 'MA', country: 'USA', capacity: 65878 },
  { id: 'stadium-2', name: 'AT&T Stadium', city: 'Arlington', state: 'TX', country: 'USA', capacity: 80000 },
  { id: 'stadium-3', name: 'TD Garden', city: 'Boston', state: 'MA', country: 'USA', capacity: 19156 },
  { id: 'stadium-4', name: 'Crypto.com Arena', city: 'Los Angeles', state: 'CA', country: 'USA', capacity: 19997 }
];

const mockBrands = [
  { id: 'brand-1', name: 'ESPN', industry: 'Media', company_type: 'Broadcaster', country: 'USA' },
  { id: 'brand-2', name: 'NBC Sports', industry: 'Media', company_type: 'Broadcaster', country: 'USA' },
  { id: 'brand-3', name: 'FOX Sports', industry: 'Media', company_type: 'Broadcaster', country: 'USA' },
  { id: 'brand-4', name: 'CBS Sports', industry: 'Media', company_type: 'Broadcaster', country: 'USA' },
  { id: 'brand-5', name: 'TNT', industry: 'Media', company_type: 'Broadcaster', country: 'USA' },
  { id: 'brand-6', name: 'HBS', industry: 'Media', company_type: 'Production Company', country: 'USA' },
  { id: 'brand-7', name: 'NEP', industry: 'Media', company_type: 'Production Company', country: 'USA' }
];

const mockGames = [
  { id: 'game-1', name: 'Patriots vs Jets', league_id: 'league-1', home_team_id: 'team-1', away_team_id: 'team-2', stadium_id: 'stadium-1', date: '2025-09-01', time: '13:00', status: 'scheduled', season_year: 2025, season_type: 'Regular' },
  { id: 'game-2', name: 'Cowboys vs Eagles', league_id: 'league-1', home_team_id: 'team-2', away_team_id: 'team-1', stadium_id: 'stadium-2', date: '2025-09-08', time: '16:30', status: 'scheduled', season_year: 2025, season_type: 'Regular' },
  { id: 'game-3', name: 'Celtics vs Knicks', league_id: 'league-2', home_team_id: 'team-3', away_team_id: 'team-4', stadium_id: 'stadium-3', date: '2025-10-20', time: '19:30', status: 'scheduled', season_year: 2025, season_type: 'Regular' }
];

const mockBroadcasts = [
  { id: 'broadcast-1', name: 'NFL on ESPN', broadcast_company_id: 'brand-1', entity_type: 'league', entity_id: 'league-1', territory: 'USA', start_date: '2024-01-01', end_date: '2026-12-31', is_exclusive: true },
  { id: 'broadcast-2', name: 'NBA on TNT', broadcast_company_id: 'brand-5', entity_type: 'league', entity_id: 'league-2', territory: 'USA', start_date: '2024-01-01', end_date: '2026-12-31', is_exclusive: false }
];

const mockGameBroadcasts = [
  { id: 'game-broadcast-1', game_id: 'game-1', broadcast_company_id: 'brand-1', production_company_id: 'brand-6', broadcast_type: 'TV', territory: 'USA' },
  { id: 'game-broadcast-2', game_id: 'game-2', broadcast_company_id: 'brand-3', production_company_id: 'brand-7', broadcast_type: 'TV', territory: 'USA' },
  { id: 'game-broadcast-3', game_id: 'game-3', broadcast_company_id: 'brand-5', production_company_id: 'brand-6', broadcast_type: 'TV', territory: 'USA' }
];

// Combine all mock data for easier access
const mockData = {
  league: mockLeagues,
  division_conference: mockDivisions,
  team: mockTeams,
  stadium: mockStadiums,
  brand: mockBrands,
  game: mockGames,
  broadcast: mockBroadcasts,
  game_broadcast: mockGameBroadcasts,
  production: [],
  player: [],
  league_executive: []
};

// Helper to paginate results
function paginateResults(items: any[], page: number, limit: number) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return items.slice(startIndex, endIndex);
}

// Helper to apply filters
function applyFilters(items: any[], filters: FilterConfig[] = []) {
  if (!filters.length) return items;
  
  return items.filter(item => {
    return filters.every(filter => {
      const fieldValue = item[filter.field];
      
      if (fieldValue === undefined) return false;
      
      switch (filter.operator) {
        case 'eq':
          return fieldValue === filter.value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'gt':
          return fieldValue > filter.value;
        case 'lt':
          return fieldValue < filter.value;
        default:
          return true;
      }
    });
  });
}

// Helper to sort results
function sortResults(items: any[], sortBy: string = 'id', sortDirection: 'asc' | 'desc' = 'asc') {
  if (!sortBy) return items;
  
  return [...items].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];
    
    if (valueA === undefined && valueB === undefined) return 0;
    if (valueA === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (valueB === undefined) return sortDirection === 'asc' ? -1 : 1;
    
    // Handle string values
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection === 'asc' 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA);
    }
    
    // Handle numeric values
    return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
  });
}

// EntityPrompt templates (copied from the real service)
const entityPromptTemplates: Record<EntityType, string> = {
  league: `I'll help you create a new sports league. Please provide the following information:
1. League name
2. Sport (e.g., Football, Basketball, Soccer)
3. Country
4. Founded year
5. Description (optional)`,

  division_conference: `I'll help you create a new division or conference within a league. Please provide the following information:
1. Division/Conference name
2. League (if you know the league ID, please provide it)
3. Type (e.g., Division, Conference)
4. Region (e.g., East, West, North, South, optional)
5. Description (optional)`,

  team: `I'll help you create a new sports team. Please provide the following information:
1. Team name
2. City
3. State/Province
4. Country
5. Founded year
6. League (if you know the league ID, please provide it)
7. Stadium (if you know the stadium ID, please provide it, otherwise we can create a new stadium)`,

  player: `I'll help you create a new player profile. Please provide the following information:
1. First name
2. Last name
3. Position
4. Jersey number (optional)
5. Birth date (YYYY-MM-DD format, optional)
6. Nationality
7. Team (if you know the team ID, please provide it)`,

  game: `I'll help you create a new game. Please provide the following information:
1. Game name/title
2. Date (YYYY-MM-DD format)
3. Time (HH:MM format)
4. Home team (if you know the team ID, please provide it)
5. Away team (if you know the team ID, please provide it)
6. Stadium (if you know the stadium ID, please provide it, optional)
7. Season (e.g., "2023-2024")
8. Status (scheduled, in_progress, completed, postponed, or cancelled)`,

  stadium: `I'll help you create a new stadium. Please provide the following information:
1. Stadium name
2. City
3. State/Province
4. Country
5. Capacity (number of seats)
6. Opened year
7. Description (optional)`,

  broadcast: `I'll help you create a new broadcast rights record. Please provide the following information:
1. Name/title for this broadcast rights agreement
2. Broadcasting company (if you know the company ID, please provide it)
3. Entity type (league, division_conference, team, or game)
4. Entity ID (the ID of the league, division/conference, team, or game)
5. Start date (YYYY-MM-DD format)
6. End date (YYYY-MM-DD format)
7. Territory (e.g., "United States", "Global", "Europe")
8. Value in dollars (optional)
9. Description (optional)`,

  production: `I'll help you create a new production service record. Please provide the following information:
1. Name/title for this production service
2. Production company (if you know the company ID, please provide it)
3. Entity type (league, division_conference, team, or game)
4. Entity ID (the ID of the league, division/conference, team, or game)
5. Service type (e.g., "Live Production", "Post-Production", "Graphics")
6. Start date (YYYY-MM-DD format)
7. End date (YYYY-MM-DD format, optional)
8. Description (optional)`,

  brand: `I'll help you create a new brand record. Please provide the following information:
1. Brand name
2. Industry (e.g., Technology, Media, Sports Equipment, Apparel)
3. Company type (e.g., Broadcaster, Production Company, Sponsor, optional)
4. Country (optional)
5. Partner (name of a partner entity like League, Team, Stadium, optional)
6. Partner relationship (sponsor, partner, supplier, or other, optional)`,

  game_broadcast: `I'll help you create a new game broadcast record. Please provide the following information:
1. Game ID
2. Broadcast company ID
3. Production company ID (optional)
4. Broadcast type
5. Territory
6. Start time (HH:MM format, optional)
7. End time (HH:MM format, optional)`,

  league_executive: `I'll help you create a new league executive record. Please provide the following information:
1. League ID
2. Position
3. Start date (YYYY-MM-DD format)
4. End date (YYYY-MM-DD format, optional)`
};

// Create mock service that implements the same interface as the real service
class MockSportsDatabaseService {
  private entities: Record<string, any[]> = { ...mockData };
  
  /**
   * Log with a consistent format for debugging
   */
  private log(...args: any[]) {
    console.log('[MockSportsDatabaseService]', ...args);
  }
  
  /**
   * Get the prompt template for a specific entity type
   */
  getPromptTemplate(entityType: EntityType): string {
    return entityPromptTemplates[entityType] || 'Please provide details for the entity.';
  }
  
  /**
   * Get entities of a specific type with pagination, filtering, and sorting
   */
  async getEntities({
    entityType,
    filters = [],
    page = 1,
    limit = 50,
    sortBy = 'id',
    sortDirection = 'asc'
  }: {
    entityType: EntityType;
    filters?: FilterConfig[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<any> {
    this.log(`Fetching ${entityType} entities (MOCK DATA)`, { filters, page, limit, sortBy, sortDirection });
    
    // Make sure we're using a valid entity type
    if (!this.entities[entityType]) {
      this.log(`Warning: Unknown entity type ${entityType}, returning empty results`);
      return {
        items: [],
        total: 0,
        page,
        pageSize: limit,
        totalPages: 0
      };
    }
    
    // Get all entities of this type
    let items = [...this.entities[entityType]];
    
    // Apply filters
    items = applyFilters(items, filters);
    
    // Sort
    items = sortResults(items, sortBy, sortDirection);
    
    // Calculate total and pages
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    
    // Paginate
    const paginatedItems = paginateResults(items, page, limit);
    
    this.log(`Returning ${paginatedItems.length} of ${total} ${entityType} entities`);
    
    return {
      items: paginatedItems,
      total,
      page,
      pageSize: limit,
      totalPages
    };
  }
  
  /**
   * Validate a sports entity against its schema (simplified version)
   */
  async validateSportsEntity(entityType: EntityType, data: any): Promise<any> {
    // Always return success in mock mode
    return null;
  }
  
  /**
   * Get an entity by ID
   */
  async getEntityById(entityType: EntityType, id: string): Promise<any> {
    this.log(`Getting ${entityType} with ID ${id} (MOCK DATA)`);
    
    // Make sure we're using a valid entity type
    if (!this.entities[entityType]) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    // Find the entity
    const entity = this.entities[entityType].find(e => e.id === id);
    
    if (!entity) {
      throw new Error(`Entity not found: ${entityType} with ID ${id}`);
    }
    
    return entity;
  }
  
  /**
   * Create a new entity
   */
  async createEntity(entityType: EntityType, entityData: any, isUpdateMode: boolean = false): Promise<any> {
    this.log(`Creating ${entityType} (MOCK DATA):`, entityData);
    
    // Make sure we're using a valid entity type
    if (!this.entities[entityType]) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    // Generate a new ID if not provided or if we're not in update mode
    const newEntity = {
      ...entityData,
      id: isUpdateMode && entityData.id ? entityData.id : `${entityType}-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // If we're in update mode and an ID is provided, update the existing entity
    if (isUpdateMode && entityData.id) {
      const index = this.entities[entityType].findIndex(e => e.id === entityData.id);
      
      if (index >= 0) {
        this.entities[entityType][index] = newEntity;
        return newEntity;
      }
    }
    
    // Otherwise, add a new entity
    this.entities[entityType].push(newEntity);
    
    return newEntity;
  }
  
  /**
   * Update an entity
   */
  async updateEntity(entityType: EntityType, entityId: string, updates: Record<string, any>): Promise<any> {
    this.log(`Updating ${entityType} with ID ${entityId} (MOCK DATA):`, updates);
    
    // Make sure we're using a valid entity type
    if (!this.entities[entityType]) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    // Find the entity
    const index = this.entities[entityType].findIndex(e => e.id === entityId);
    
    if (index < 0) {
      throw new Error(`Entity not found: ${entityType} with ID ${entityId}`);
    }
    
    // Update the entity
    const updatedEntity = {
      ...this.entities[entityType][index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.entities[entityType][index] = updatedEntity;
    
    return updatedEntity;
  }
  
  /**
   * Delete an entity
   */
  async deleteEntity(entityType: EntityType, id: string): Promise<void> {
    this.log(`Deleting ${entityType} with ID ${id} (MOCK DATA)`);
    
    // Make sure we're using a valid entity type
    if (!this.entities[entityType]) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    // Find and remove the entity
    const index = this.entities[entityType].findIndex(e => e.id === id);
    
    if (index < 0) {
      // In mock mode, we'll just log this instead of throwing an error
      this.log(`Entity not found: ${entityType} with ID ${id}`);
      return;
    }
    
    this.entities[entityType].splice(index, 1);
  }
  
  /**
   * Delete multiple entities
   */
  async bulkDeleteEntities(entityType: EntityType, ids: string[]): Promise<{ success: string[]; failed: string[] }> {
    this.log(`Bulk deleting ${ids.length} ${entityType} entities (MOCK DATA)`);
    
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };
    
    for (const id of ids) {
      try {
        await this.deleteEntity(entityType, id);
        results.success.push(id);
      } catch (error) {
        results.failed.push(id);
      }
    }
    
    return results;
  }
  
  /**
   * Export entities
   */
  async exportEntities(
    entityType: EntityType,
    entityIds: string[],
    includeRelationships: boolean = false,
    visibleColumns?: string[],
    targetFolder?: string,
    fileName?: string,
    useDrivePicker: boolean = false
  ): Promise<any> {
    this.log(`Exporting ${entityType} entities (MOCK DATA)`, { 
      entityIds, 
      includeRelationships, 
      visibleColumns,
      targetFolder,
      fileName,
      useDrivePicker
    });
    
    // Simulate a successful export
    return {
      success: true,
      message: "Export successful (mock data)",
      file: {
        name: fileName || `${entityType}_export.csv`,
        url: "https://example.com/mock-export",
        id: "mock-file-id"
      }
    };
  }
  
  /**
   * Save a sports entity
   */
  async saveSportsEntity(entityType: EntityType, entityData: any): Promise<any> {
    // This is just an alias for createEntity
    return this.createEntity(entityType, entityData);
  }
  
  /**
   * Get entities with relationships
   */
  async getEntitiesWithRelationships(entityType: EntityType, filters?: FilterConfig[]): Promise<any[]> {
    this.log(`Getting ${entityType} entities with relationships (MOCK DATA)`);
    
    // First get the entities
    const entitiesResponse = await this.getEntities({ entityType, filters });
    const entities = entitiesResponse.items;
    
    // Now add relationships based on the entity type
    const entitiesWithRelationships = entities.map(entity => {
      const relationships: Record<string, any> = {};
      
      switch (entityType) {
        case 'league':
          // Add divisions
          relationships.divisions_conferences = this.entities.division_conference.filter(d => d.league_id === entity.id);
          // Add teams
          relationships.teams = this.entities.team.filter(t => t.league_id === entity.id);
          break;
          
        case 'division_conference':
          // Add league
          const league = this.entities.league.find(l => l.id === entity.league_id);
          if (league) {
            relationships.league = league;
          }
          // Add teams
          relationships.teams = this.entities.team.filter(t => t.division_conference_id === entity.id);
          break;
          
        case 'team':
          // Add league
          const teamLeague = this.entities.league.find(l => l.id === entity.league_id);
          if (teamLeague) {
            relationships.league = teamLeague;
          }
          // Add division/conference
          const division = this.entities.division_conference.find(d => d.id === entity.division_conference_id);
          if (division) {
            relationships.division_conference = division;
          }
          // Add stadium
          const stadium = this.entities.stadium.find(s => s.id === entity.stadium_id);
          if (stadium) {
            relationships.stadium = stadium;
          }
          break;
          
        case 'game':
          // Add teams
          const homeTeam = this.entities.team.find(t => t.id === entity.home_team_id);
          if (homeTeam) {
            relationships.home_team = homeTeam;
          }
          const awayTeam = this.entities.team.find(t => t.id === entity.away_team_id);
          if (awayTeam) {
            relationships.away_team = awayTeam;
          }
          // Add stadium
          const gameStadium = this.entities.stadium.find(s => s.id === entity.stadium_id);
          if (gameStadium) {
            relationships.stadium = gameStadium;
          }
          // Add broadcasts
          relationships.broadcasts = this.entities.game_broadcast.filter(gb => gb.game_id === entity.id);
          break;
      }
      
      return {
        ...entity,
        relationships
      };
    });
    
    return entitiesWithRelationships;
  }
  
  /**
   * Prepare for export (simplified version)
   */
  prepareForExport(entityType: EntityType, entities: any[], includeRelationships: boolean = false): any {
    // Return a basic export format
    return {
      headers: ['ID', 'Name', 'Created At', 'Updated At'],
      rows: entities.map(entity => [
        entity.id,
        entity.name,
        entity.created_at || new Date().toISOString(),
        entity.updated_at || new Date().toISOString()
      ]),
      metadata: {
        entityType,
        count: entities.length,
        includeRelationships
      }
    };
  }
  
  /**
   * Validate and get related entities
   */
  async validateAndGetRelatedEntities(entityType: EntityType, data: any): Promise<any> {
    this.log(`Validating ${entityType} data (MOCK DATA):`, data);
    
    // In mock mode, we'll just return success
    return { 
      valid: true,
      entities: []
    };
  }
}

// Create a singleton instance
const mockSportsDatabaseService = new MockSportsDatabaseService();
export default mockSportsDatabaseService;