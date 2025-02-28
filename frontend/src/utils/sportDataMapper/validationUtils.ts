import { EntityType, isValidUUID } from './entityTypes';

/**
 * Validate entity data before sending to the database
 */
export const validateEntityData = (entityType: EntityType, data: Record<string, any>): { isValid: boolean; errors: string[] } => {
  console.log(`Validating ${entityType} data:`, JSON.stringify(data, null, 2));
  
  const errors: string[] = [];
  
  // Common validation for all entities
  if (!data.name) {
    errors.push('Name is required');
    console.warn(`${entityType} validation error: Name is required`);
  }
  
  // Entity-specific validation
  switch (entityType) {
    case 'league':
      if (!data.sport) {
        errors.push('Sport is required');
        console.warn(`League validation error: Sport is required`);
      }
      if (!data.country) {
        errors.push('Country is required');
        console.warn(`League validation error: Country is required`);
      }
      break;
      
    case 'team':
      if (!data.league_id) {
        errors.push('League ID is required');
        console.warn(`Team validation error: League ID is required`);
      } else if (!isValidUUID(data.league_id)) {
        errors.push('League ID must be a valid UUID');
        console.warn(`Team validation error: League ID must be a valid UUID, got: ${data.league_id}`);
      }
      
      if (!data.stadium_id) {
        errors.push('Stadium ID is required');
        console.warn(`Team validation error: Stadium ID is required`);
      } else if (!isValidUUID(data.stadium_id)) {
        errors.push('Stadium ID must be a valid UUID');
        console.warn(`Team validation error: Stadium ID must be a valid UUID, got: ${data.stadium_id}`);
      }
      
      if (!data.city) {
        errors.push('City is required');
        console.warn(`Team validation error: City is required`);
      }
      if (!data.country) {
        errors.push('Country is required');
        console.warn(`Team validation error: Country is required`);
      }
      break;
      
    case 'stadium':
      if (!data.city) {
        errors.push('City is required');
        console.warn(`Stadium validation error: City is required`);
      }
      if (!data.country) {
        errors.push('Country is required');
        console.warn(`Stadium validation error: Country is required`);
      }
      // Log all stadium fields for debugging
      console.log('Stadium validation fields check:', {
        name: data.name ? 'Present' : 'Missing',
        city: data.city ? 'Present' : 'Missing',
        country: data.country ? 'Present' : 'Missing',
        state: data.state ? 'Present' : 'N/A',
        capacity: data.capacity ? 'Present' : 'N/A',
        owner: data.owner ? 'Present' : 'N/A',
        naming_rights_holder: data.naming_rights_holder ? 'Present' : 'N/A',
        host_broadcaster_id: data.host_broadcaster_id ? 'Present' : 'N/A'
      });
      
      // Check if capacity is a valid number if present
      if (data.capacity !== undefined && data.capacity !== null) {
        if (isNaN(Number(data.capacity))) {
          errors.push('Capacity must be a number');
          console.warn(`Stadium validation error: Capacity must be a number, got: ${data.capacity}`);
        }
      }
      
      // Check if host_broadcaster_id is a valid UUID if present
      if (data.host_broadcaster_id && !isValidUUID(data.host_broadcaster_id)) {
        errors.push('Host broadcaster ID must be a valid UUID');
        console.warn(`Stadium validation error: Host broadcaster ID must be a valid UUID, got: ${data.host_broadcaster_id}`);
      }
      break;
      
    case 'player':
      if (!data.team_id) {
        errors.push('Team ID is required');
      } else if (!isValidUUID(data.team_id)) {
        errors.push('Team ID must be a valid UUID');
      }
      
      if (!data.position) {
        errors.push('Position is required');
      }
      break;
      
    case 'game':
      if (!data.league_id) {
        errors.push('League ID is required');
      } else if (!isValidUUID(data.league_id)) {
        errors.push('League ID must be a valid UUID');
      }
      
      if (!data.home_team_id) {
        errors.push('Home Team ID is required');
      } else if (!isValidUUID(data.home_team_id)) {
        errors.push('Home Team ID must be a valid UUID');
      }
      
      if (!data.away_team_id) {
        errors.push('Away Team ID is required');
      } else if (!isValidUUID(data.away_team_id)) {
        errors.push('Away Team ID must be a valid UUID');
      }
      
      if (!data.stadium_id) {
        errors.push('Stadium ID is required');
      } else if (!isValidUUID(data.stadium_id)) {
        errors.push('Stadium ID must be a valid UUID');
      }
      
      if (!data.date) {
        errors.push('Date is required');
      }
      
      if (!data.season_year) {
        errors.push('Season Year is required');
      }
      
      if (!data.season_type) {
        errors.push('Season Type is required');
      }
      break;
      
    case 'broadcast':
      if (!data.broadcast_company_id) {
        errors.push('Broadcast Company ID is required');
      } else if (!isValidUUID(data.broadcast_company_id)) {
        errors.push('Broadcast Company ID must be a valid UUID');
      }
      
      if (!data.entity_type) {
        errors.push('Entity Type is required');
      }
      
      if (!data.entity_id) {
        errors.push('Entity ID is required');
      } else if (!isValidUUID(data.entity_id)) {
        errors.push('Entity ID must be a valid UUID');
      }
      
      if (!data.territory) {
        errors.push('Territory is required');
      }
      
      if (!data.start_date) {
        errors.push('Start Date is required');
      }
      
      if (!data.end_date) {
        errors.push('End Date is required');
      }
      break;
      
    case 'game_broadcast':
      if (!data.game_id) {
        errors.push('Game ID is required');
      } else if (!isValidUUID(data.game_id)) {
        errors.push('Game ID must be a valid UUID');
      }
      
      if (!data.broadcast_company_id) {
        errors.push('Broadcast Company ID is required');
      } else if (!isValidUUID(data.broadcast_company_id)) {
        errors.push('Broadcast Company ID must be a valid UUID');
      }
      
      if (!data.broadcast_type) {
        errors.push('Broadcast Type is required');
      }
      
      if (!data.territory) {
        errors.push('Territory is required');
      }
      break;
      
    case 'brand':
      if (!data.industry) {
        errors.push('Industry is required');
      }
      break;
      
    case 'brand_relationship':
      if (!data.brand_id) {
        errors.push('Brand ID is required');
      } else if (!isValidUUID(data.brand_id)) {
        errors.push('Brand ID must be a valid UUID');
      }
      
      if (!data.entity_type) {
        errors.push('Entity Type is required');
      }
      
      if (!data.entity_id) {
        errors.push('Entity ID is required');
      } else if (!isValidUUID(data.entity_id)) {
        errors.push('Entity ID must be a valid UUID');
      }
      
      if (!data.relationship_type) {
        errors.push('Relationship Type is required');
      }
      
      if (!data.start_date) {
        errors.push('Start Date is required');
      }
      break;
      
    case 'league_executive':
      if (!data.league_id) {
        errors.push('League ID is required');
      } else if (!isValidUUID(data.league_id)) {
        errors.push('League ID must be a valid UUID');
      }
      
      if (!data.position) {
        errors.push('Position is required');
      }
      
      if (!data.start_date) {
        errors.push('Start Date is required');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 