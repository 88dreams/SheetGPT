// Define entity types
export type EntityType =
| 'league'
| 'division_conference'
| 'team'
| 'player'
| 'game'
| 'stadium'
| 'broadcast_rights'
| 'production_service'
| 'brand'
| 'game_broadcast'
| 'league_executive'
| 'person'
| 'production_company'
| 'contact'
| 'creator'
| 'management';

export interface EntityTypeInfo {
  id: EntityType;
  name: string;
  description: string;
  requiredFields: string[];
}

// Define the entity types available for mapping
export const ENTITY_TYPES: readonly EntityTypeInfo[] = [
  { id: 'league', name: 'League', description: 'Sports leagues (e.g., NFL, NBA, MLB)', requiredFields: ['name', 'sport', 'country', 'tags'] },
  { id: 'division_conference', name: 'Division/Conference', description: 'Divisions or conferences within leagues', requiredFields: ['name', 'league_id', 'type', 'tags'] },
  { id: 'team', name: 'Team', description: 'Sports teams within leagues', requiredFields: ['name', 'league_id', 'division_conference_id', 'stadium_id', 'city', 'country', 'tags'] },
  { id: 'player', name: 'Player', description: 'Athletes who play for teams', requiredFields: ['name', 'team_id', 'position', 'tags'] },
  { id: 'game', name: 'Game', description: 'Individual games between teams', requiredFields: ['name', 'league_id', 'home_team_id', 'away_team_id', 'stadium_id', 'date', 'season_year', 'season_type', 'tags'] },
  { id: 'stadium', name: 'Stadium', description: 'Venues where games are played', requiredFields: ['name', 'city', 'country', 'tags'] },
  { id: 'broadcast_rights', name: 'Broadcast Rights', description: 'Media rights for leagues, teams, or games', requiredFields: ['broadcast_company_id', 'entity_type', 'entity_id', 'territory', 'tags'] }, // Note: league_id is optional for broadcast rights
  { id: 'production_service', name: 'Production Service', description: 'Production services for broadcasts', requiredFields: ['production_company_id', 'entity_type', 'entity_id', 'service_type', 'start_date', 'tags'] },
  { id: 'brand', name: 'Brand', description: 'Brand information', requiredFields: ['name', 'industry', 'tags'] },
  { id: 'game_broadcast', name: 'Game Broadcast', description: 'Broadcast information for specific games', requiredFields: ['name', 'game_id', 'broadcast_company_id', 'broadcast_type', 'territory', 'tags'] },
  { id: 'league_executive', name: 'League Executive', description: 'Executive personnel for leagues', requiredFields: ['name', 'league_id', 'position', 'start_date', 'tags'] }
] as const;

/**
 * Get required fields for a specific entity type
 */
export const getRequiredFields = (entityType: EntityType): string[] => {
  const entityTypeInfo = ENTITY_TYPES.find(et => et.id === entityType);
  return entityTypeInfo?.requiredFields || ['name'];
};

/**
 * Check if a UUID string is valid
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Generate a sample UUID for display purposes
 */
export const generateSampleUUID = (): string => {
  return '00000000-0000-0000-0000-000000000000';
}; 