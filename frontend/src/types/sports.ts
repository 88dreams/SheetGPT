export type EntityType = 'stadium' | 'league' | 'team';

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
}

export interface League extends BaseEntity {
  sport: string;
  country: string;
  broadcast_start_date?: string;
  broadcast_end_date?: string;
}

export interface Team extends BaseEntity {
  league_id: string;
  stadium_id: string;
  city: string;
  state?: string;
  country: string;
  founded_year?: number;
  league_name?: string; // For display purposes
}

export type Entity = Stadium | League | Team;

export interface EntityChange {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  timestamp: string;
  user?: string;
} 