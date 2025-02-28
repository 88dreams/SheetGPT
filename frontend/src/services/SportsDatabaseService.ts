import { api } from '../utils/api';

// Entity types
export type EntityType = 'league' | 'team' | 'player' | 'game' | 'stadium' | 'broadcast' | 'production' | 'brand' | 'game_broadcast' | 'league_executive';

// Base entity interface
export interface BaseEntity {
  id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

// League entity
export interface League extends BaseEntity {
  sport: string;
  country: string;
  founded_year?: number;
  broadcast_start_date?: string;
  broadcast_end_date?: string;
}

// Team entity
export interface Team extends BaseEntity {
  league_id: string;
  stadium_id: string;
  city: string;
  state?: string;
  country: string;
  founded_year?: number;
}

// Player entity
export interface Player extends BaseEntity {
  team_id: string;
  position: string;
  jersey_number?: number;
  college?: string;
}

// Game entity
export interface Game extends BaseEntity {
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  stadium_id: string;
  date: string;
  time?: string;
  home_score?: number;
  away_score?: number;
  status: string;
  season_year: number;
  season_type: string;
}

// Stadium entity
export interface Stadium extends BaseEntity {
  city: string;
  state?: string;
  country: string;
  capacity?: number;
  owner?: string;
  naming_rights_holder?: string;
  host_broadcaster_id?: string;
}

// BroadcastRights entity
export interface BroadcastRights extends BaseEntity {
  broadcast_company_id: string;
  entity_type: string;
  entity_id: string;
  territory: string;
  start_date: string;
  end_date: string;
  is_exclusive?: boolean;
}

// GameBroadcast entity
export interface GameBroadcast extends BaseEntity {
  game_id: string;
  broadcast_company_id: string;
  production_company_id?: string;
  broadcast_type: string;
  territory: string;
  start_time?: string;
  end_time?: string;
}

// ProductionService entity
export interface ProductionService extends BaseEntity {
  production_company_id: string;
  entity_type: string;
  entity_id: string;
  service_type: string;
  start_date: string;
  end_date: string;
}

// Brand entity
export interface Brand extends BaseEntity {
  industry: string;
}

// BrandRelationship entity
export interface BrandRelationship extends BaseEntity {
  brand_id: string;
  entity_type: string;
  entity_id: string;
  relationship_type: string;
  start_date: string;
  end_date: string;
}

// LeagueExecutive entity
export interface LeagueExecutive extends BaseEntity {
  league_id: string;
  position: string;
  start_date: string;
  end_date?: string;
}

// Entity validation errors
export interface ValidationErrors {
  [key: string]: string[];
}

// Entity prompt templates
const entityPromptTemplates: Record<EntityType, string> = {
  league: `I'll help you create a new sports league. Please provide the following information:
1. League name
2. Sport (e.g., Football, Basketball, Soccer)
3. Country
4. Founded year
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
3. Entity type (league, team, or game)
4. Entity ID (the ID of the league, team, or game)
5. Start date (YYYY-MM-DD format)
6. End date (YYYY-MM-DD format)
7. Territory (e.g., "United States", "Global", "Europe")
8. Value in dollars (optional)
9. Description (optional)`,

  production: `I'll help you create a new production service record. Please provide the following information:
1. Name/title for this production service
2. Production company (if you know the company ID, please provide it)
3. Entity type (league, team, or game)
4. Entity ID (the ID of the league, team, or game)
5. Service type (e.g., "Live Production", "Post-Production", "Graphics")
6. Start date (YYYY-MM-DD format)
7. End date (YYYY-MM-DD format, optional)
8. Description (optional)`,

  brand: `I'll help you create a new brand relationship record. Please provide the following information:
1. Name/title for this brand relationship
2. Brand (if you know the brand ID, please provide it)
3. Entity type (league, team, player, or stadium)
4. Entity ID (the ID of the league, team, player, or stadium)
5. Relationship type (sponsor, partner, supplier, or other)
6. Start date (YYYY-MM-DD format)
7. End date (YYYY-MM-DD format, optional)
8. Value in dollars (optional)
9. Description (optional)`,

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

class SportsDatabaseService {
  /**
   * Get the prompt template for a specific entity type
   */
  getPromptTemplate(entityType: EntityType): string {
    return entityPromptTemplates[entityType] || 'Please provide details for the entity.';
  }

  /**
   * Validate a sports entity against its schema
   */
  validateSportsEntity(entityType: EntityType, entityData: any): ValidationErrors | null {
    const errors: ValidationErrors = {};
    
    // Common validation for all entities
    if (!entityData.name || entityData.name.trim() === '') {
      errors.name = ['Name is required'];
    }
    
    // Entity-specific validation
    switch (entityType) {
      case 'league':
        if (!entityData.sport) errors.sport = ['Sport is required'];
        if (!entityData.country) errors.country = ['Country is required'];
        if (!entityData.founded_year) errors.founded_year = ['Founded year is required'];
        break;
        
      case 'team':
        if (!entityData.city) errors.city = ['City is required'];
        if (!entityData.country) errors.country = ['Country is required'];
        if (!entityData.founded_year) errors.founded_year = ['Founded year is required'];
        if (!entityData.league_id) errors.league_id = ['League ID is required'];
        break;
        
      case 'player':
        if (!entityData.first_name) errors.first_name = ['First name is required'];
        if (!entityData.last_name) errors.last_name = ['Last name is required'];
        if (!entityData.position) errors.position = ['Position is required'];
        if (!entityData.nationality) errors.nationality = ['Nationality is required'];
        if (!entityData.team_id) errors.team_id = ['Team ID is required'];
        break;
        
      case 'game':
        if (!entityData.date) errors.date = ['Date is required'];
        if (!entityData.time) errors.time = ['Time is required'];
        if (!entityData.home_team_id) errors.home_team_id = ['Home team ID is required'];
        if (!entityData.away_team_id) errors.away_team_id = ['Away team ID is required'];
        if (!entityData.season_year) errors.season_year = ['Season year is required'];
        if (!entityData.season_type) errors.season_type = ['Season type is required'];
        break;
        
      case 'stadium':
        if (!entityData.city) errors.city = ['City is required'];
        if (!entityData.country) errors.country = ['Country is required'];
        if (!entityData.capacity) errors.capacity = ['Capacity is required'];
        if (!entityData.owner) errors.owner = ['Owner is required'];
        break;
        
      case 'broadcast':
        if (!entityData.broadcast_company_id) errors.broadcast_company_id = ['Broadcast company ID is required'];
        if (!entityData.entity_type) errors.entity_type = ['Entity type is required'];
        if (!entityData.entity_id) errors.entity_id = ['Entity ID is required'];
        if (!entityData.territory) errors.territory = ['Territory is required'];
        if (!entityData.start_date) errors.start_date = ['Start date is required'];
        if (!entityData.end_date) errors.end_date = ['End date is required'];
        break;
        
      case 'production':
        if (!entityData.production_company_id) errors.production_company_id = ['Production company ID is required'];
        if (!entityData.entity_type) errors.entity_type = ['Entity type is required'];
        if (!entityData.entity_id) errors.entity_id = ['Entity ID is required'];
        if (!entityData.service_type) errors.service_type = ['Service type is required'];
        if (!entityData.start_date) errors.start_date = ['Start date is required'];
        break;
        
      case 'brand':
        if (!entityData.industry) errors.industry = ['Industry is required'];
        break;
        
      case 'game_broadcast':
        if (!entityData.game_id) errors.game_id = ['Game ID is required'];
        if (!entityData.broadcast_company_id) errors.broadcast_company_id = ['Broadcast company ID is required'];
        break;
        
      case 'league_executive':
        if (!entityData.league_id) errors.league_id = ['League ID is required'];
        if (!entityData.position) errors.position = ['Position is required'];
        if (!entityData.start_date) errors.start_date = ['Start date is required'];
        break;
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }

  /**
   * Save a sports entity to the database
   */
  async saveSportsEntity(entityType: EntityType, entityData: any): Promise<any> {
    try {
      console.log(`Saving ${entityType} entity:`, entityData);
      
      // Use the actual API endpoint
      switch(entityType) {
        case 'league':
          return await api.sports.createLeague(entityData);
        case 'team':
          return await api.sports.createTeam(entityData);
        case 'player':
          return await api.sports.createPlayer(entityData);
        case 'game':
          return await api.sports.createGame(entityData);
        case 'stadium':
          return await api.sports.createStadium(entityData);
        case 'broadcast':
          return await api.sports.createBroadcastRights(entityData);
        case 'production':
          return await api.sports.createProductionService(entityData);
        case 'brand':
          return await api.sports.createBrand(entityData);
        case 'game_broadcast':
          return await api.sports.createGameBroadcast(entityData);
        case 'league_executive':
          return await api.sports.createLeagueExecutive(entityData);
        default:
          throw new Error(`API endpoint for creating ${entityType} not implemented yet`);
      }
    } catch (error) {
      console.error(`Error saving ${entityType} entity:`, error);
      throw error;
    }
  }

  /**
   * Get entities of a specific type
   */
  async getEntities(entityType: EntityType, filters?: Record<string, any>): Promise<any[]> {
    try {
      console.log(`Getting ${entityType} entities with filters:`, filters);
      
      // Use the actual API endpoint
      switch(entityType) {
        case 'league':
          return await api.sports.getLeagues();
        case 'team':
          return await api.sports.getTeams(filters?.league_id);
        case 'player':
          return await api.sports.getPlayers(filters?.team_id);
        case 'game':
          return await api.sports.getGames(filters?.league_id);
        case 'stadium':
          return await api.sports.getStadiums(filters?.city);
        case 'broadcast':
          return await api.sports.getBroadcastRights(filters?.broadcast_company_id);
        case 'production':
          return await api.sports.getProductionServices(filters?.production_company_id);
        case 'brand':
          return await api.sports.getBrands(filters?.industry);
        case 'game_broadcast':
          return await api.sports.getGameBroadcasts(filters?.game_id);
        case 'league_executive':
          return await api.sports.getLeagueExecutives(filters?.league_id);
        default:
          // For other entity types, use the generic endpoint
          return await api.sports.getEntities(entityType, filters);
      }
    } catch (error) {
      console.error(`Error getting ${entityType} entities:`, error);
      throw error;
    }
  }

  /**
   * Get an entity by ID
   */
  async getEntityById(entityType: EntityType, id: string): Promise<any> {
    try {
      console.log(`Getting ${entityType} entity with ID:`, id);
      
      // Use the actual API endpoint
      switch(entityType) {
        case 'league':
          return await api.sports.getLeague(id);
        case 'team':
          return await api.sports.getTeam(id);
        case 'player':
          return await api.sports.getPlayer(id);
        case 'game':
          return await api.sports.getGame(id);
        case 'stadium':
          return await api.sports.getStadium(id);
        case 'broadcast':
          return await api.sports.getBroadcastRight(id);
        case 'production':
          return await api.sports.getProductionService(id);
        case 'brand':
          return await api.sports.getBrand(id);
        case 'game_broadcast':
          return await api.sports.getGameBroadcast(id);
        case 'league_executive':
          return await api.sports.getLeagueExecutive(id);
        default:
          throw new Error(`API endpoint for getting ${entityType} by ID not implemented yet`);
      }
    } catch (error) {
      console.error(`Error getting ${entityType} entity with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get entities with their relationships
   */
  async getEntitiesWithRelationships(entityType: EntityType, filters?: Record<string, any>): Promise<any[]> {
    try {
      console.log(`Getting ${entityType} entities with relationships and filters:`, filters);
      
      // First, get the entities
      const entities = await this.getEntities(entityType, filters);
      
      // For each entity, fetch related entities based on the entity type
      const entitiesWithRelationships = await Promise.all(
        entities.map(async (entity) => {
          const relationships: Record<string, any[]> = {};
          
          switch(entityType) {
            case 'league':
              // Get teams in this league
              relationships.teams = await api.sports.getTeams(entity.id);
              break;
            case 'team':
              // Get players on this team
              relationships.players = await api.sports.getPlayers(entity.id);
              // Get games for this team
              // This would require a specific endpoint for getting games by team
              break;
            case 'stadium':
              // Get teams that play at this stadium
              // This would require a specific endpoint for getting teams by stadium
              break;
            // Add other relationship types as needed
          }
          
          return {
            ...entity,
            relationships
          };
        })
      );
      
      return entitiesWithRelationships;
    } catch (error) {
      console.error(`Error getting ${entityType} entities with relationships:`, error);
      throw error;
    }
  }

  /**
   * Prepare entities for export to Google Sheets
   */
  prepareForExport(entityType: EntityType, entities: any[], includeRelationships: boolean = false): any {
    // This will format the entities for export to Google Sheets
    // For now, we'll just return a simple format
    
    const headers = ['ID', 'Name', 'Created At', 'Updated At'];
    const rows = entities.map(entity => [
      entity.id,
      entity.name,
      entity.created_at,
      entity.updated_at
    ]);
    
    return {
      headers,
      rows,
      metadata: {
        entityType,
        count: entities.length,
        includeRelationships
      }
    };
  }

  /**
   * Create a new sports entity of the specified type
   * @param entityType The type of entity to create
   * @param entityData The entity data to save
   * @returns The created entity
   */
  async createEntity(entityType: EntityType, entityData: any): Promise<any> {
    try {
      let response;
      
      switch (entityType) {
        case 'league':
          response = await api.sports.createLeague(entityData);
          break;
        case 'team':
          response = await api.sports.createTeam(entityData);
          break;
        case 'player':
          response = await api.sports.createPlayer(entityData);
          break;
        case 'game':
          response = await api.sports.createGame(entityData);
          break;
        case 'stadium':
          response = await api.sports.createStadium(entityData);
          break;
        case 'broadcast':
          response = await api.sports.createBroadcastRights(entityData);
          break;
        case 'production':
          response = await api.sports.createProductionService(entityData);
          break;
        case 'brand':
          response = await api.sports.createBrand(entityData);
          break;
        case 'game_broadcast':
          response = await api.sports.createGameBroadcast(entityData);
          break;
        case 'league_executive':
          response = await api.sports.createLeagueExecutive(entityData);
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Error creating ${entityType}:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const sportsDatabaseService = new SportsDatabaseService();
export default sportsDatabaseService; 