import { EntityType, isValidUUID } from './entityTypes';

/**
 * Maps UI field names to database field names
 */
export const mapToDatabaseFieldNames = (entityType: EntityType, data: Record<string, any>): Record<string, any> => {
  console.log(`Mapping ${entityType} data to database field names:`, JSON.stringify(data, null, 2));
  
  // Create a new object with the mapped field names
  const mappedData: Record<string, any> = {};
  
  // Copy all fields as-is (we're assuming the UI field names match the database field names)
  Object.entries(data).forEach(([key, value]) => {
    mappedData[key] = value;
  });
  
  return mappedData;
};

/**
 * Looks up an entity ID by name
 */
export const lookupEntityIdByName = async (
  entityType: string, 
  name: string,
  apiClient: any
): Promise<string | null> => {
  console.log(`Looking up ${entityType} with name: "${name}"`);
  try {
    let entities: any[] = [];
    
    switch (entityType) {
      case 'league':
        entities = await apiClient.sports.getLeagues();
        break;
      case 'stadium':
        entities = await apiClient.sports.getStadiums();
        break;
      case 'team':
        entities = await apiClient.sports.getTeams();
        break;
      case 'brand':
        entities = await apiClient.sports.getBrands();
        break;
      default:
        console.error(`Unsupported entity type for lookup: ${entityType}`);
        return null;
    }
    
    // Find the entity with the matching name (case-insensitive)
    const entity = entities.find(e => 
      e.name && e.name.toLowerCase() === name.toLowerCase()
    );
    
    if (entity) {
      console.log(`Found ${entityType} with name "${name}": ${entity.id}`);
      return entity.id;
    } else {
      console.log(`No ${entityType} found with name "${name}"`);
      return null;
    }
  } catch (error) {
    console.error(`Error looking up ${entityType} with name "${name}":`, error);
    return null;
  }
};

/**
 * Creates a new entity if it doesn't exist
 */
export const createEntityIfNotExists = async (
  entityType: string,
  name: string,
  additionalData: Record<string, any>,
  apiClient: any
): Promise<string | null> => {
  try {
    // First try to look up the entity
    const existingId = await lookupEntityIdByName(entityType, name, apiClient);
    if (existingId) return existingId;
    
    // If not found, create a new entity
    console.log(`Creating new ${entityType} "${name}" with data:`, additionalData);
    
    let newEntity;
    switch (entityType) {
      case 'stadium':
        newEntity = await apiClient.sports.createStadium({
          name,
          ...additionalData
        });
        break;
      case 'league':
        newEntity = await apiClient.sports.createLeague({
          name,
          ...additionalData
        });
        break;
      case 'team':
        newEntity = await apiClient.sports.createTeam({
          name,
          ...additionalData
        });
        break;
      default:
        console.error(`Unsupported entity type for creation: ${entityType}`);
        return null;
    }
    
    console.log(`Created new ${entityType}: ${newEntity.id}`);
    return newEntity.id;
  } catch (error) {
    console.error(`Error creating ${entityType} "${name}":`, error);
    return null;
  }
};

/**
 * Enhanced mapping function that handles name-to-ID lookups and data formatting
 */
export const enhancedMapToDatabaseFieldNames = async (
  entityType: EntityType, 
  data: Record<string, any>,
  apiClient: any,
  contextData?: Record<string, any>
): Promise<Record<string, any>> => {
  console.log(`enhancedMapToDatabaseFieldNames called for ${entityType} with data:`, JSON.stringify(data, null, 2));
  
  // First, get the basic mapping
  const basicMapped = mapToDatabaseFieldNames(entityType, data);
  console.log(`Basic mapping result for ${entityType}:`, JSON.stringify(basicMapped, null, 2));
  
  // For stadium entity, ensure data is properly formatted
  if (entityType === 'stadium') {
    console.log(`Processing stadium entity with required fields: name=${basicMapped.name}, city=${basicMapped.city}, country=${basicMapped.country}`);
    
    // Ensure required fields are present with default values if needed
    if (!basicMapped.name) basicMapped.name = 'Unnamed Stadium';
    if (!basicMapped.city) basicMapped.city = 'Unknown City';
    if (!basicMapped.country) basicMapped.country = 'Unknown Country';
    
    // Ensure capacity is a number if present
    if (basicMapped.capacity !== undefined && basicMapped.capacity !== null) {
      // Remove non-numeric characters (except for decimal points) before parsing
      const cleanedCapacity = String(basicMapped.capacity).replace(/[^\d.]/g, '');
      const capacityNum = parseInt(cleanedCapacity);
      if (!isNaN(capacityNum)) {
        basicMapped.capacity = capacityNum;
      } else {
        // If capacity can't be parsed as a number, set it to null
        basicMapped.capacity = null;
      }
    }
    
    // Remove any unexpected fields that might cause validation errors
    const validStadiumFields = ['name', 'city', 'state', 'country', 'capacity', 'owner', 'naming_rights_holder', 'host_broadcaster_id'];
    Object.keys(basicMapped).forEach(key => {
      if (!validStadiumFields.includes(key)) {
        console.warn(`Removing unexpected stadium field: ${key}`);
        delete basicMapped[key];
      }
    });
  }
  
  // For league entity, ensure data is properly formatted
  if (entityType === 'league') {
    console.log(`Processing league entity with required fields: name=${basicMapped.name}, sport=${basicMapped.sport}, country=${basicMapped.country}`);
    
    // Ensure required fields are present with default values if needed
    if (!basicMapped.name) basicMapped.name = 'Unnamed League';
    if (!basicMapped.sport) basicMapped.sport = 'Unknown Sport';
    if (!basicMapped.country) basicMapped.country = 'Unknown Country';
    
    // Remove any unexpected fields that might cause validation errors
    const validLeagueFields = ['name', 'sport', 'country', 'founded_year', 'broadcast_start_date', 'broadcast_end_date'];
    Object.keys(basicMapped).forEach(key => {
      if (!validLeagueFields.includes(key)) {
        console.warn(`Removing unexpected league field: ${key}`);
        delete basicMapped[key];
      }
    });
  }
  
  // For team entity, handle special lookups
  if (entityType === 'team') {
    // If league_id is not a UUID but looks like a name, look it up
    if (basicMapped.league_id && !isValidUUID(basicMapped.league_id)) {
      console.log(`Looking up league ID for name: ${basicMapped.league_id}`);
      const leagueId = await lookupEntityIdByName('league', basicMapped.league_id, apiClient);
      if (leagueId) {
        basicMapped.league_id = leagueId;
        console.log(`Found league ID: ${leagueId} for name: ${data.league_id}`);
      } else {
        // Try to create a new league if it doesn't exist
        const newLeagueId = await createEntityIfNotExists('league', basicMapped.league_id, {
          sport: 'Unknown Sport',
          country: 'Unknown Country'
        }, apiClient);
        
        if (newLeagueId) {
          basicMapped.league_id = newLeagueId;
          console.log(`Created new league with ID: ${newLeagueId} for name: ${data.league_id}`);
        } else {
          console.warn(`Could not find or create league ID for name: ${basicMapped.league_id}`);
        }
      }
    }
    
    // If stadium_id is not a UUID but looks like a name, look it up
    if (basicMapped.stadium_id && !isValidUUID(basicMapped.stadium_id)) {
      console.log(`Looking up stadium ID for name: ${basicMapped.stadium_id}`);
      const stadiumId = await lookupEntityIdByName('stadium', basicMapped.stadium_id, apiClient);
      if (stadiumId) {
        basicMapped.stadium_id = stadiumId;
        console.log(`Found stadium ID: ${stadiumId} for name: ${data.stadium_id}`);
      } else {
        // Try to create a new stadium if it doesn't exist
        const city = contextData?.city || 'Unknown City';
        const country = contextData?.country || 'Unknown Country';
        
        const newStadiumId = await createEntityIfNotExists('stadium', basicMapped.stadium_id, {
          city,
          country
        }, apiClient);
        
        if (newStadiumId) {
          basicMapped.stadium_id = newStadiumId;
          console.log(`Created new stadium with ID: ${newStadiumId} for name: ${data.stadium_id}`);
        } else {
          console.warn(`Could not find or create stadium ID for name: ${basicMapped.stadium_id}`);
        }
      }
    }
  }
  
  // For player entity, handle team lookups
  if (entityType === 'player' && basicMapped.team_id && !isValidUUID(basicMapped.team_id)) {
    console.log(`Looking up team ID for name: ${basicMapped.team_id}`);
    const teamId = await lookupEntityIdByName('team', basicMapped.team_id, apiClient);
    if (teamId) {
      basicMapped.team_id = teamId;
      console.log(`Found team ID: ${teamId} for name: ${data.team_id}`);
    } else {
      console.warn(`Could not find team ID for name: ${basicMapped.team_id}`);
    }
  }
  
  // For game entity, handle team and stadium lookups
  if (entityType === 'game') {
    if (basicMapped.home_team_id && !isValidUUID(basicMapped.home_team_id)) {
      console.log(`Looking up home team ID for name: ${basicMapped.home_team_id}`);
      const teamId = await lookupEntityIdByName('team', basicMapped.home_team_id, apiClient);
      if (teamId) {
        basicMapped.home_team_id = teamId;
        console.log(`Found home team ID: ${teamId} for name: ${data.home_team_id}`);
      } else {
        console.warn(`Could not find home team ID for name: ${basicMapped.home_team_id}`);
      }
    }
    
    if (basicMapped.away_team_id && !isValidUUID(basicMapped.away_team_id)) {
      console.log(`Looking up away team ID for name: ${basicMapped.away_team_id}`);
      const teamId = await lookupEntityIdByName('team', basicMapped.away_team_id, apiClient);
      if (teamId) {
        basicMapped.away_team_id = teamId;
        console.log(`Found away team ID: ${teamId} for name: ${data.away_team_id}`);
      } else {
        console.warn(`Could not find away team ID for name: ${basicMapped.away_team_id}`);
      }
    }
    
    if (basicMapped.stadium_id && !isValidUUID(basicMapped.stadium_id)) {
      console.log(`Looking up stadium ID for name: ${basicMapped.stadium_id}`);
      const stadiumId = await lookupEntityIdByName('stadium', basicMapped.stadium_id, apiClient);
      if (stadiumId) {
        basicMapped.stadium_id = stadiumId;
        console.log(`Found stadium ID: ${stadiumId} for name: ${data.stadium_id}`);
      } else {
        console.warn(`Could not find stadium ID for name: ${basicMapped.stadium_id}`);
      }
    }
    
    if (basicMapped.league_id && !isValidUUID(basicMapped.league_id)) {
      console.log(`Looking up league ID for name: ${basicMapped.league_id}`);
      const leagueId = await lookupEntityIdByName('league', basicMapped.league_id, apiClient);
      if (leagueId) {
        basicMapped.league_id = leagueId;
        console.log(`Found league ID: ${leagueId} for name: ${data.league_id}`);
      } else {
        console.warn(`Could not find league ID for name: ${basicMapped.league_id}`);
      }
    }
  }
  
  return basicMapped;
}; 