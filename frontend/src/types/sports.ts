export type EntityType = 'league' | 'division_conference' | 'team' | 'player' | 'game' | 'stadium' | 'broadcast' | 'production' | 'brand' | 'game_broadcast' | 'league_executive';

export interface BaseEntity {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
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

export type Entity = Stadium | League | DivisionConference | Team | Player | Game | BroadcastRights | ProductionService | Brand | GameBroadcast | LeagueExecutive;

export interface EntityChange {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  timestamp: string;
  user?: string;
} 