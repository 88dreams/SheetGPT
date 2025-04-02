import { useCallback } from 'react';
import { EntityType } from '../../../../services/SportsDatabaseService';
import { EntityField } from '../SportsDatabaseContext';

export function useEntitySchema() {
  // Get field information for an entity type
  const getEntityFields = useCallback((entityType: EntityType): EntityField[] => {
    // Define a type for the field data
    interface FieldData {
      name: string;
      type: string;
      required: boolean;
      description: string;
    }

    // Get the fields for the selected entity type
    const getEntityFieldsData = (entityType: EntityType): FieldData[] => {
      const fields: FieldData[] = [];
      
      // Common fields for all entities
      fields.push(
        { name: 'id', required: false, type: 'string', description: 'Unique identifier (auto-generated)' },
        { name: 'name', required: true, type: 'string', description: 'Name of the entity' },
        { name: 'created_at', required: false, type: 'datetime', description: 'Creation timestamp (auto-generated)' },
        { name: 'updated_at', required: false, type: 'datetime', description: 'Last update timestamp (auto-generated)' }
      );
      
      // Entity-specific fields
      switch (entityType) {
        case 'league':
          fields.push(
            { name: 'nickname', required: false, type: 'string', description: 'Short name or acronym for the league (e.g., NFL, NBA)' },
            { name: 'sport', required: true, type: 'string', description: 'Sport type (e.g., Football, Basketball)' },
            { name: 'country', required: true, type: 'string', description: 'Country where the league operates' },
            { name: 'broadcast_start_date', required: false, type: 'date', description: 'Start date of broadcast rights' },
            { name: 'broadcast_end_date', required: false, type: 'date', description: 'End date of broadcast rights' }
          );
          break;
          
        case 'division_conference':
          fields.push(
            { name: 'league_id', required: true, type: 'string', description: 'ID of the league this division/conference belongs to' },
            { name: 'nickname', required: false, type: 'string', description: 'Short name or abbreviation for the division/conference (e.g., AFC, NFC)' },
            { name: 'type', required: true, type: 'string', description: 'Type of grouping (Division, Conference, etc)' },
            { name: 'region', required: false, type: 'string', description: 'Geographic region (East, West, North, South, etc)' },
            { name: 'description', required: false, type: 'string', description: 'Additional details about this division/conference' }
          );
          break;
          
        case 'team':
          fields.push(
            { name: 'league_id', required: true, type: 'string', description: 'ID of the league this team belongs to' },
            { name: 'division_conference_id', required: true, type: 'string', description: 'ID of the division/conference this team belongs to' },
            { name: 'stadium_id', required: true, type: 'string', description: 'ID of the home stadium' },
            { name: 'city', required: true, type: 'string', description: 'City where the team is based' },
            { name: 'state', required: false, type: 'string', description: 'State/Province where the team is based' },
            { name: 'country', required: true, type: 'string', description: 'Country where the team is based' },
            { name: 'founded_year', required: false, type: 'number', description: 'Year the team was founded' }
          );
          break;

        case 'player':
          fields.push(
            { name: 'team_id', required: true, type: 'string', description: 'ID of the team this player belongs to' },
            { name: 'position', required: true, type: 'string', description: 'Player position' },
            { name: 'jersey_number', required: false, type: 'number', description: 'Player jersey number' },
            { name: 'college', required: false, type: 'string', description: 'College/University attended' }
          );
          break;

        case 'game':
          fields.push(
            { name: 'league_id', required: true, type: 'string', description: 'ID of the league this game belongs to' },
            { name: 'home_team_id', required: true, type: 'string', description: 'ID of the home team' },
            { name: 'away_team_id', required: true, type: 'string', description: 'ID of the away team' },
            { name: 'stadium_id', required: true, type: 'string', description: 'ID of the stadium where the game is played' },
            { name: 'date', required: true, type: 'date', description: 'Game date' },
            { name: 'time', required: false, type: 'time', description: 'Game time' },
            { name: 'home_score', required: false, type: 'number', description: 'Home team score' },
            { name: 'away_score', required: false, type: 'number', description: 'Away team score' },
            { name: 'status', required: true, type: 'string', description: 'Game status (scheduled, in_progress, completed, etc.)' },
            { name: 'season_year', required: true, type: 'number', description: 'Season year' },
            { name: 'season_type', required: true, type: 'string', description: 'Season type (regular, playoff, etc.)' }
          );
          break;

        case 'stadium':
          fields.push(
            { name: 'city', required: true, type: 'string', description: 'City where the stadium is located' },
            { name: 'state', required: false, type: 'string', description: 'State/Province where the stadium is located' },
            { name: 'country', required: true, type: 'string', description: 'Country where the stadium is located' },
            { name: 'capacity', required: false, type: 'number', description: 'Stadium seating capacity' },
            { name: 'owner', required: false, type: 'string', description: 'Stadium owner' },
            { name: 'naming_rights_holder', required: false, type: 'string', description: 'Entity holding naming rights' },
            { name: 'host_broadcaster', required: false, type: 'string', description: 'Name of the host broadcaster' },
            { name: 'host_broadcaster_id', required: false, type: 'string', description: 'ID of the host broadcaster' }
          );
          break;

        case 'broadcast':
          fields.push(
            // Note: 'name' field is removed as it's redundant with broadcast_company_name
            { name: 'broadcast_company_id', required: true, type: 'string', description: 'ID of the broadcasting company' },
            { name: 'broadcast_company_name', required: true, type: 'string', description: 'Name of the broadcasting company' },
            { name: 'entity_type', required: true, type: 'string', description: 'Type of entity being broadcast (league, team, game)' },
            { name: 'entity_id', required: true, type: 'string', description: 'ID of the entity being broadcast' },
            { name: 'entity_name', required: false, type: 'string', description: 'Name of the entity being broadcast' },
            { name: 'division_conference_id', required: false, type: 'string', description: 'ID of the division/conference associated with this broadcast right' },
            { name: 'division_conference_name', required: false, type: 'string', description: 'Name of the division/conference associated with this broadcast right' },
            { name: 'territory', required: true, type: 'string', description: 'Broadcast territory' },
            { name: 'start_date', required: true, type: 'date', description: 'Start date of broadcast rights' },
            { name: 'end_date', required: true, type: 'date', description: 'End date of broadcast rights' },
            { name: 'is_exclusive', required: false, type: 'boolean', description: 'Whether the broadcast rights are exclusive' }
          );
          break;

        case 'production':
          fields.push(
            { name: 'production_company_id', required: true, type: 'string', description: 'ID of the production company' },
            { name: 'production_company_name', required: false, type: 'string', description: 'Name of the production company' },
            { name: 'secondary_brand_id', required: false, type: 'string', description: 'ID of the brand hiring the production company (optional)' },
            { name: 'secondary_brand_name', required: false, type: 'string', description: 'Name of the brand hiring the production company' },
            { name: 'entity_type', required: true, type: 'string', description: 'Type of entity being produced' },
            { name: 'entity_id', required: true, type: 'string', description: 'ID of the entity being produced' },
            { name: 'entity_name', required: false, type: 'string', description: 'Name of the entity being produced' },
            { name: 'service_type', required: true, type: 'string', description: 'Type of production service' },
            { name: 'start_date', required: true, type: 'date', description: 'Start date of production service' },
            { name: 'end_date', required: true, type: 'date', description: 'End date of production service' }
          );
          break;

        case 'brand':
          fields.push(
            { name: 'industry', required: true, type: 'string', description: 'Industry sector of the brand' },
            { name: 'company_type', required: false, type: 'string', description: 'Type of company (Broadcaster, Production Company, etc.)' },
            { name: 'country', required: false, type: 'string', description: 'Country where the brand is based' },
            { name: 'partner', required: false, type: 'string', description: 'Partner entity name (e.g., league, team, stadium)' },
            { name: 'partner_relationship', required: false, type: 'string', description: 'Type of relationship with partner (Sponsor, Partner, etc.)' }
          );
          break;

        case 'game_broadcast':
          fields.push(
            { name: 'game_id', required: true, type: 'string', description: 'ID of the game being broadcast' },
            { name: 'broadcast_company_id', required: true, type: 'string', description: 'ID of the broadcasting company' },
            { name: 'production_company_id', required: false, type: 'string', description: 'ID of the production company' },
            { name: 'broadcast_type', required: true, type: 'string', description: 'Type of broadcast' },
            { name: 'territory', required: true, type: 'string', description: 'Broadcast territory' },
            { name: 'start_time', required: false, type: 'time', description: 'Broadcast start time' },
            { name: 'end_time', required: false, type: 'time', description: 'Broadcast end time' }
          );
          break;

        case 'league_executive':
          fields.push(
            { name: 'league_id', required: true, type: 'string', description: 'ID of the league' },
            { name: 'position', required: true, type: 'string', description: 'Executive position' },
            { name: 'start_date', required: true, type: 'date', description: 'Start date of position' },
            { name: 'end_date', required: false, type: 'date', description: 'End date of position' }
          );
          break;
      }
      
      return fields;
    };
    
    // Get the fields data
    const fieldsData = getEntityFieldsData(entityType);
    
    // Define the valid fields for each entity type based on database models
    const validFieldsByEntityType: Record<string, string[]> = {
      // League fields
      league: ['id', 'name', 'created_at', 'updated_at', 'nickname', 'sport', 'country', 'broadcast_start_date', 'broadcast_end_date'],
      
      // Division/Conference fields
      division_conference: ['id', 'name', 'created_at', 'updated_at', 'league_id', 'nickname', 'type', 'region', 'description'],
      
      // Team fields
      team: ['id', 'name', 'created_at', 'updated_at', 'league_id', 'division_conference_id', 'stadium_id', 
             'city', 'state', 'country', 'founded_year'],
      
      // Player fields
      player: ['id', 'name', 'created_at', 'updated_at', 'team_id', 'position', 'jersey_number', 'college'],
      
      // Stadium fields
      stadium: ['id', 'name', 'created_at', 'updated_at', 'city', 'state', 'country', 'capacity', 
                'owner', 'naming_rights_holder', 'host_broadcaster', 'host_broadcaster_id'],
      
      // Game fields
      game: ['id', 'name', 'created_at', 'updated_at', 'league_id', 'home_team_id', 'away_team_id', 
             'stadium_id', 'date', 'time', 'home_score', 'away_score', 'status', 'season_year', 'season_type'],
      
      // Broadcast Rights fields
      broadcast: ['id', 'created_at', 'updated_at', 'broadcast_company_id', 'broadcast_company_name', 'entity_type', 'entity_id',
                  'entity_name', 'division_conference_id', 'division_conference_name', 'territory', 'start_date', 'end_date', 'is_exclusive'],
      
      // Production fields
      production: ['id', 'name', 'created_at', 'updated_at', 'production_company_id', 'production_company_name', 
                   'secondary_brand_id', 'secondary_brand_name', 'entity_type', 'entity_id', 'entity_name',
                   'service_type', 'start_date', 'end_date'],
      
      // Brand fields
      brand: ['id', 'name', 'created_at', 'updated_at', 'industry', 'company_type', 'country', 'partner', 'partner_relationship'],
      
      // Game Broadcast fields
      game_broadcast: ['id', 'name', 'created_at', 'updated_at', 'game_id', 'broadcast_company_id', 
                       'production_company_id', 'broadcast_type', 'territory', 'start_time', 'end_time'],
      
      // League Executive fields
      league_executive: ['id', 'name', 'created_at', 'updated_at', 'league_id', 'position', 'start_date', 'end_date'],
      
      // Additional models for completeness
      broadcast_company: ['id', 'name', 'created_at', 'updated_at', 'type', 'country'],
      production_company: ['id', 'name', 'created_at', 'updated_at'],
      team_record: ['id', 'name', 'created_at', 'updated_at', 'team_id', 'season_year', 'wins', 'losses', 
                   'ties', 'playoff_result'],
      team_ownership: ['id', 'name', 'created_at', 'updated_at', 'team_id', 'owner_name', 
                      'ownership_percentage', 'acquisition_date']
    };
    
    // Filter fields to only include those valid for this entity type
    const filteredFieldsData = fieldsData.filter(field => {
      const validFieldsForType = validFieldsByEntityType[entityType] || [];
      return validFieldsForType.includes(field.name);
    });
    
    // Convert the fields to the EntityField format
    return filteredFieldsData.map((field: FieldData) => ({
      fieldName: field.name,
      fieldType: field.type,
      required: field.required,
      description: field.description,
      name: field.name,
      type: field.type
    }));
  }, []);

  return { getEntityFields };
}