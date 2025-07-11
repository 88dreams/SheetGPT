export interface BaseEntity {
  id: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  [key: string]: any;
}

export interface Stadium extends BaseEntity {
  city: string;
  state?: string;
  country: string;
  capacity?: number;
  owner?: string;
  naming_rights_holder?: string;
  host_broadcaster?: string;
  host_broadcaster_id?: string;
  sport?: string;
}

export interface League extends BaseEntity {
  sport: string;
  country: string;
  broadcast_start_date?: string;
  broadcast_end_date?: string;
}

export interface DivisionConference extends BaseEntity {
  league_id: string;
  type: string;
  region?: string;
  description?: string;
  league_name?: string; // For display purposes
  nickname?: string; // Short name or abbreviation
}

export interface Team extends BaseEntity {
  league_id: string;
  division_conference_id: string;
  stadium_id?: string;
  city?: string;
  state?: string;
  country: string;
  founded_year?: number;
  league_name?: string; // For display purposes
  division_conference_name?: string; // For display purposes
}

export interface Player extends BaseEntity {
  team_id?: string;
  position: string;
  jersey_number?: number;
  college?: string;
  sport?: string;
  sponsor_id?: string;
  sponsor_name?: string;
}

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

export interface BroadcastRights extends BaseEntity {
  broadcast_company_id: string;
  entity_type: string;
  entity_id: string;
  territory: string;
  start_date: string;
  end_date: string;
  is_exclusive?: boolean;
}

export interface ProductionService extends BaseEntity {
  production_company_id: string;
  entity_type: string;
  entity_id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  secondary_brand_id?: string; // Optional field for the brand that hired the production company
  production_company_name?: string; // For display purposes
  secondary_brand_name?: string; // For display purposes
}

export interface Brand extends BaseEntity {
  industry: string;
  company_type?: string;
  country?: string;
  partner?: string;
  partner_relationship?: string;
  representative_entity_type?: string;
  media_department?: string;
}

export interface GameBroadcast extends BaseEntity {
  game_id: string;
  broadcast_company_id: string;
  production_company_id?: string;
  broadcast_type: string;
  territory: string;
  start_time?: string;
  end_time?: string;
}

export interface LeagueExecutive extends BaseEntity {
  league_id: string;
  position: string;
  start_date: string;
  end_date?: string;
}

export interface ContactBrandAssociation {
  id: string;
  contact_id: string;
  brand_id: string;
  brand?: Brand;
  confidence_score: number;
  association_type: string;
  is_current: boolean;
  is_primary: boolean;
  start_date?: string;
  end_date?: string;
}

export interface Contact extends BaseEntity {
  first_name: string;
  last_name: string;
  email?: string;
  linkedin_url?: string;
  company?: string;
  position?: string;
  connected_on?: string;
  notes?: string;
  import_source_tag?: string;
  brand_associations: ContactBrandAssociation[];
}

export interface Creator extends BaseEntity {
  first_name: string;
  last_name: string;
  genre: string;
  platform: string;
  url?: string;
  followers?: number;
  management_id?: string;
  notes?: string;
  tags?: string[];
}

export interface Management extends BaseEntity {
  name?: string;
  first_name?: string;
  last_name?: string;
  industry: string;
  url?: string;
  founded_year?: number;
  notes?: string;
  tags?: string[];
}

export type Entity = Stadium | League | DivisionConference | Team | Player | Game | BroadcastRights | ProductionService | Brand | GameBroadcast | LeagueExecutive | Contact | Creator | Management;

export interface EntityChange {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  timestamp: string;
  user?: string;
}

export type EntityType = 
  'league' | 'division_conference' | 'team' | 'player' | 'game' | 'stadium' | 
  'broadcast' | 'production_service' | 'brand' | 'game_broadcast' | 
  'league_executive' | 'contact' | 'creator' | 'management' | 'person' | 
  'production_company' | 'broadcast_rights';

export interface EntityTypeInfo {
  id: EntityType;
  name: string;
  description: string;
  requiredFields: string[];
}

export const ENTITY_TYPES: readonly EntityTypeInfo[] = [
  { id: 'league', name: 'League', description: 'Sports leagues (e.g., NFL, NBA, MLB)', requiredFields: ['name', 'sport', 'country', 'tags'] },
  { id: 'division_conference', name: 'Division/Conference', description: 'Divisions or conferences within leagues', requiredFields: ['name', 'league_id', 'type', 'tags'] },
  { id: 'team', name: 'Team', description: 'Sports teams within leagues', requiredFields: ['name', 'league_id', 'division_conference_id', 'stadium_id', 'city', 'country', 'tags'] },
  { id: 'player', name: 'Player', description: 'Athletes who play for teams', requiredFields: ['name', 'team_id', 'position', 'tags'] },
  { id: 'game', name: 'Game', description: 'Individual games between teams', requiredFields: ['name', 'league_id', 'home_team_id', 'away_team_id', 'stadium_id', 'date', 'season_year', 'season_type', 'tags'] },
  { id: 'stadium', name: 'Stadium', description: 'Venues where games are played', requiredFields: ['name', 'city', 'country', 'tags'] },
  { id: 'broadcast', name: 'Broadcast Rights', description: 'Media rights for leagues, teams, or games', requiredFields: ['broadcast_company_id', 'entity_type', 'entity_id', 'territory', 'tags'] },
  { id: 'broadcast_rights', name: 'Broadcast Rights', description: 'Media rights for leagues, teams, or games', requiredFields: ['broadcast_company_id', 'entity_type', 'entity_id', 'territory', 'tags'] },
  { id: 'production_service', name: 'Production Service', description: 'Production services for broadcasts', requiredFields: ['production_company_id', 'entity_type', 'entity_id', 'service_type', 'start_date', 'tags'] },
  { id: 'brand', name: 'Brand', description: 'Brand information', requiredFields: ['name', 'industry', 'tags'] },
  { id: 'game_broadcast', name: 'Game Broadcast', description: 'Broadcast information for specific games', requiredFields: ['name', 'game_id', 'broadcast_company_id', 'broadcast_type', 'territory', 'tags'] },
  { id: 'league_executive', name: 'League Executive', description: 'Executive personnel for leagues', requiredFields: ['name', 'league_id', 'position', 'start_date', 'tags'] },
  { id: 'contact', name: 'Contact', description: 'Contact information', requiredFields: ['name', 'email', 'phone', 'tags'] },
  { id: 'creator', name: 'Creator', description: 'Content creators', requiredFields: ['first_name', 'last_name', 'genre', 'platform', 'tags'] },
  { id: 'management', name: 'Management', description: 'Management entities', requiredFields: ['name', 'industry', 'tags'] },
  { id: 'person', name: 'Person', description: 'General person entities', requiredFields: ['name', 'role', 'tags'] },
  { id: 'production_company', name: 'Production Company', description: 'Production companies', requiredFields: ['name', 'tags'] }
] as const;

export const getRequiredFields = (entityType: EntityType): string[] => {
  const entityTypeInfo = ENTITY_TYPES.find(et => et.id === entityType);
  return entityTypeInfo?.requiredFields || ['name'];
}; 