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
    
    // First, try exact match (case-insensitive)
    let entity = entities.find(e => 
      e.name && e.name.toLowerCase() === name.toLowerCase()
    );
    
    // If no exact match found and name is long enough, try partial matching
    if (!entity && name.length > 3) {
      console.log(`No exact match found for "${name}", trying partial matching`);
      // Try to find partial matches
      entity = entities.find(e => 
        (e.name && e.name.toLowerCase().includes(name.toLowerCase())) ||
        (e.name && name.toLowerCase().includes(e.name.toLowerCase()))
      );
      
      // Handle special case for names with parentheses
      if (!entity && name.includes('(')) {
        const baseName = name.split('(')[0].trim();
        console.log(`Trying match with base name: "${baseName}"`);
        entity = entities.find(e => 
          e.name && e.name.toLowerCase() === baseName.toLowerCase()
        );
        
        if (!entity) {
          entity = entities.find(e => 
            e.name && e.name.toLowerCase().includes(baseName.toLowerCase())
          );
        }
      }
    }
    
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
/**
 * Helper function to process remaining fields for broadcast rights after 
 * identifying a brand to use as broadcast company
 */
const processRemainingFields = async (
  basicMapped: Record<string, any>,
  entityType: string,
  apiClient: any
): Promise<Record<string, any>> => {
  // Process division_conference_id by name
  if (basicMapped.division_conference_id && !isValidUUID(basicMapped.division_conference_id)) {
    const divisionName = basicMapped.division_conference_id;
    
    console.log(`Looking up division/conference ID for name: ${divisionName}`);
    try {
      // Use the correct method name from sportsService
      const divisions = await apiClient.sports.getDivisionConferences();
      
      // First try exact match
      let division = divisions.find(e => e.name?.toLowerCase() === divisionName.toLowerCase());
      
      // If no exact match, try partial match for longer names
      if (!division && divisionName.length > 4) {
        console.log('No exact match found, trying partial match');
        division = divisions.find(e => 
          e.name?.toLowerCase().includes(divisionName.toLowerCase()) ||
          divisionName.toLowerCase().includes(e.name?.toLowerCase())
        );
      }
      
      if (division) {
        basicMapped.division_conference_id = division.id;
        console.log(`Found division/conference ID: ${division.id} for name: ${divisionName}`);
      } else {
        console.log(`Could not find division/conference with name: ${divisionName}`);
      }
    } catch (error) {
      console.error(`Error looking up division/conference with name ${divisionName}:`, error);
    }
  }
  
  // Format dates for broadcast rights
  if (entityType === 'broadcast') {
    // Handle start_date
    if (basicMapped.start_date && typeof basicMapped.start_date === 'string') {
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(basicMapped.start_date)) {
        basicMapped.start_date = `${basicMapped.start_date}-01-01`;
        console.log(`Converted start_date from year to full date: ${basicMapped.start_date}`);
      }
    }
    
    // Handle end_date
    if (basicMapped.end_date && typeof basicMapped.end_date === 'string') {
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(basicMapped.end_date)) {
        basicMapped.end_date = `${basicMapped.end_date}-12-31`;
        console.log(`Converted end_date from year to full date: ${basicMapped.end_date}`);
      }
    } else if (!basicMapped.end_date) {
      // Set a default end date if missing
      const now = new Date();
      basicMapped.end_date = `${now.getFullYear() + 10}-12-31`;
      console.log(`Missing end_date for broadcast rights, setting default: ${basicMapped.end_date}`);
    }
  }
  
  return basicMapped;
};

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
    
    // Ensure capacity is a number if present
    if (basicMapped.capacity !== undefined && basicMapped.capacity !== null) {
      // Remove non-numeric characters before parsing
      const cleanedCapacity = String(basicMapped.capacity).replace(/[^\d]/g, '');
      const capacityNum = parseInt(cleanedCapacity);
      if (!isNaN(capacityNum)) {
        basicMapped.capacity = capacityNum;
        console.log(`Cleaned stadium capacity from ${basicMapped.capacity} to ${capacityNum}`);
      } else {
        // If capacity can't be parsed as a number, set it to null
        console.warn(`Invalid stadium capacity value: ${basicMapped.capacity}, setting to null`);
        basicMapped.capacity = null;
      }
    }

    // Remove any unexpected fields that might cause validation errors
    const validStadiumFields = [
      'name', 
      'city', 
      'state', 
      'country', 
      'capacity', 
      'owner', 
      'naming_rights_holder', 
      'host_broadcaster_id',
      'host_broadcaster'
    ];
    Object.keys(basicMapped).forEach(key => {
      if (!validStadiumFields.includes(key)) {
        console.warn(`Removing unexpected stadium field: ${key}`);
        delete basicMapped[key];
      }
    });

    // Check if stadium already exists
    try {
      console.log(`Checking if stadium "${basicMapped.name}" already exists`);
      const existingStadiums = await apiClient.sports.getStadiums();
      const existingStadium = existingStadiums.find((s: { name: string; id: string }) => s.name === basicMapped.name);
      
      if (existingStadium) {
        console.log(`Found existing stadium with name "${basicMapped.name}", updating instead of creating`);
        // Create update payload with only changed fields
        const updatePayload = {
          city: basicMapped.city,
          state: basicMapped.state,
          country: basicMapped.country,
          capacity: basicMapped.capacity,
          owner: basicMapped.owner,
          naming_rights_holder: basicMapped.naming_rights_holder,
          host_broadcaster: basicMapped.host_broadcaster,
          host_broadcaster_id: basicMapped.host_broadcaster_id
        };
        // Update the existing stadium with new data
        const updatedStadium = await apiClient.sports.updateStadium(existingStadium.id, updatePayload);
        return updatedStadium;
      }
    } catch (error) {
      console.error('Error checking for existing stadium:', error);
    }
    
    // Ensure required fields are present with default values if needed
    if (!basicMapped.name) basicMapped.name = 'Unnamed Stadium';
    if (!basicMapped.city) basicMapped.city = 'Unknown City';
    if (!basicMapped.country) basicMapped.country = 'Unknown Country';
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
  
  // Handle league lookup for team, division_conference, and other entities
  if (entityType === 'team' || entityType === 'division_conference' || entityType === 'broadcast' || entityType === 'game') {
    // Handle league lookup by name if provided
    if (data.league_name) {
      console.log(`Looking up league ID for name: ${data.league_name}`);
      const leagueId = await lookupEntityIdByName('league', data.league_name, apiClient);
      if (leagueId) {
        basicMapped.league_id = leagueId;
        console.log(`Found league ID: ${leagueId} for name: ${data.league_name}`);
        
        // For broadcast entity with 'league' entity_type, also set the entity_id
        if (entityType === 'broadcast' && basicMapped.entity_type === 'league') {
          basicMapped.entity_id = leagueId;
          console.log(`Setting entity_id to league ID: ${leagueId} for broadcast`);
        }
      } else {
        // Try to create a new league if it doesn't exist
        const newLeagueId = await createEntityIfNotExists('league', data.league_name, {
          sport: data.sport || 'Unknown Sport',
          country: data.country || 'Unknown Country'
        }, apiClient);
        
        if (newLeagueId) {
          basicMapped.league_id = newLeagueId;
          console.log(`Created new league with ID: ${newLeagueId} for name: ${data.league_name}`);
          
          // For broadcast entity with 'league' entity_type, also set the entity_id
          if (entityType === 'broadcast' && basicMapped.entity_type === 'league') {
            basicMapped.entity_id = newLeagueId;
            console.log(`Setting entity_id to new league ID: ${newLeagueId} for broadcast`);
          }
        } else {
          console.warn(`Could not find or create league ID for name: ${data.league_name}`);
        }
      }
    }
    // If league_id is provided but not a UUID, treat it as a name
    else if (basicMapped.league_id && !isValidUUID(basicMapped.league_id)) {
      console.log(`Looking up league ID for name: ${basicMapped.league_id}`);
      const leagueId = await lookupEntityIdByName('league', basicMapped.league_id, apiClient);
      if (leagueId) {
        basicMapped.league_id = leagueId;
        console.log(`Found league ID: ${leagueId} for name: ${data.league_id}`);
      } else {
        // Try to create a new league if it doesn't exist
        const newLeagueId = await createEntityIfNotExists('league', basicMapped.league_id, {
          sport: data.sport || 'Unknown Sport',
          country: data.country || 'Unknown Country'
        }, apiClient);
        
        if (newLeagueId) {
          basicMapped.league_id = newLeagueId;
          console.log(`Created new league with ID: ${newLeagueId} for name: ${data.league_id}`);
        } else {
          console.warn(`Could not find or create league ID for name: ${basicMapped.league_id}`);
        }
      }
    }
    
    // Handle stadium lookup by name if provided
    if (data.stadium_name) {
      console.log(`Looking up stadium ID for name: ${data.stadium_name}`);
      const stadiumId = await lookupEntityIdByName('stadium', data.stadium_name, apiClient);
      if (stadiumId) {
        basicMapped.stadium_id = stadiumId;
        console.log(`Found stadium ID: ${stadiumId} for name: ${data.stadium_name}`);
      } else {
        // Try to create a new stadium if it doesn't exist
        const city = data.city || contextData?.city || 'Unknown City';
        const country = data.country || contextData?.country || 'Unknown Country';
        
        const newStadiumId = await createEntityIfNotExists('stadium', data.stadium_name, {
          city,
          country
        }, apiClient);
        
        if (newStadiumId) {
          basicMapped.stadium_id = newStadiumId;
          console.log(`Created new stadium with ID: ${newStadiumId} for name: ${data.stadium_name}`);
        } else {
          console.warn(`Could not find or create stadium ID for name: ${data.stadium_name}`);
        }
      }
    }
    // If stadium_id is provided but not a UUID, treat it as a name
    else if (basicMapped.stadium_id && !isValidUUID(basicMapped.stadium_id)) {
      console.log(`Looking up stadium ID for name: ${basicMapped.stadium_id}`);
      const stadiumId = await lookupEntityIdByName('stadium', basicMapped.stadium_id, apiClient);
      if (stadiumId) {
        basicMapped.stadium_id = stadiumId;
        console.log(`Found stadium ID: ${stadiumId} for name: ${data.stadium_id}`);
      } else {
        // Try to create a new stadium if it doesn't exist
        const city = data.city || contextData?.city || 'Unknown City';
        const country = data.country || contextData?.country || 'Unknown Country';
        
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
    
    // Remove name fields after processing
    delete basicMapped.league_name;
    delete basicMapped.stadium_name;
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

  // For brand_relationship, handle brand_id and entity_id lookups
  if (entityType === 'brand_relationship') {
    // Handle brand_id lookup by name if provided as a string instead of UUID
    if (basicMapped.brand_id && !isValidUUID(basicMapped.brand_id)) {
      console.log(`Looking up brand ID for name: ${basicMapped.brand_id}`);
      try {
        // Use the lookup API directly which is more reliable
        const response = await apiClient.sports.lookup('brand', basicMapped.brand_id);
        if (response && response.id) {
          basicMapped.brand_id = response.id;
          console.log(`Found brand ID: ${response.id} for name: ${basicMapped.brand_id}`);
        } else {
          // Try to create a new brand if it doesn't exist
          try {
            console.log(`Creating new brand: ${basicMapped.brand_id}`);
            const industry = data.industry || 'Unknown';
            
            // Use generic entity creation instead of specific brand creation
            const brandData = {
              name: basicMapped.brand_id,
              industry: industry
            };
            
            const newBrand = await apiClient.sports.createBrand(brandData);
            
            if (newBrand?.id) {
              basicMapped.brand_id = newBrand.id;
              console.log(`Created new brand with ID: ${newBrand.id} for name: ${basicMapped.brand_id}`);
            } else {
              console.warn(`Could not create brand for name: ${basicMapped.brand_id}`);
            }
          } catch (createError) {
            console.error(`Error creating new brand: ${basicMapped.brand_id}`, createError);
          }
        }
      } catch (error) {
        console.error(`Error looking up brand with name "${basicMapped.brand_id}":`, error);
        // If there's an error with the lookup, just continue with the original value
        // The backend will generate the appropriate error message if needed
      }
    }
    
    // Handle entity_id lookup based on entity_type if provided as a string instead of UUID
    if (basicMapped.entity_id && basicMapped.entity_type && !isValidUUID(basicMapped.entity_id)) {
      const entityName = basicMapped.entity_id;
      const entityType = basicMapped.entity_type;
      
      console.log(`Looking up ${entityType} ID for name: ${entityName}`);
      
      // Map entity_type to the correct lookup type (singular form)
      let lookupType = entityType.toLowerCase();
      
      // Remove trailing 's' if present to get singular form
      if (lookupType.endsWith('s')) {
        lookupType = lookupType.slice(0, -1);
      }
      
      // Handle special cases and normalize lookupType
      if (['division', 'conference', 'divisions', 'conferences'].includes(lookupType)) {
        lookupType = 'division_conference';
      }
      
      console.log(`Normalized lookup type: ${lookupType}`);
      
      // Get entity ID by name using the lookup API
      try {
        // Use the lookup API directly which is more reliable
        const response = await apiClient.sports.lookup(lookupType, entityName);
        if (response && response.id) {
          basicMapped.entity_id = response.id;
          console.log(`Found ${entityType} ID: ${response.id} for name: ${entityName}`);
        } else {
          console.warn(`Could not find ${entityType} ID for name: ${entityName}`);
          
          // Try to create a new entity if appropriate based on entity type
          if (lookupType === 'league') {
            try {
              console.log(`Creating new league: ${entityName}`);
              const leagueData = {
                name: entityName,
                sport: 'Unknown',
                country: 'Unknown'
              };
              
              const newLeague = await apiClient.sports.createLeague(leagueData);
              
              if (newLeague?.id) {
                basicMapped.entity_id = newLeague.id;
                console.log(`Created new league with ID: ${newLeague.id} for name: ${entityName}`);
              }
            } catch (createError) {
              console.error(`Error creating new league: ${entityName}`, createError);
            }
          } 
          else if (lookupType === 'division_conference' && basicMapped.league_id) {
            try {
              console.log(`Creating new division/conference: ${entityName}`);
              const divisionData = {
                name: entityName,
                league_id: basicMapped.league_id,
                type: 'Conference'
              };
              
              const newDivision = await apiClient.sports.createDivisionConference(divisionData);
              
              if (newDivision?.id) {
                basicMapped.entity_id = newDivision.id;
                console.log(`Created new division/conference with ID: ${newDivision.id} for name: ${entityName}`);
              }
            } catch (createError) {
              console.error(`Error creating new division/conference: ${entityName}`, createError);
            }
          }
          else if (lookupType === 'brand') {
            try {
              console.log(`Creating new brand: ${entityName}`);
              const brandData = {
                name: entityName,
                industry: 'Unknown'
              };
              
              const newBrand = await apiClient.sports.createBrand(brandData);
              
              if (newBrand?.id) {
                basicMapped.entity_id = newBrand.id;
                console.log(`Created new brand with ID: ${newBrand.id} for name: ${entityName}`);
              }
            } catch (createError) {
              console.error(`Error creating new brand: ${entityName}`, createError);
            }
          }
        }
      } catch (error) {
        console.error(`Error looking up ${entityType} ID for name ${entityName}:`, error);
        // Continue with the original value, the backend will handle missing entities
      }
    }
  }
  
  // For broadcast rights, handle entity_id based on entity_type 
  if (entityType === 'broadcast') {
    // For broadcast rights, the name field is usually referring to the ENTITY being broadcast
    // (like "Big 12 Conference"), not the broadcast company itself
    if (basicMapped.name) {
      const entityName = basicMapped.name;
      console.log(`For broadcast rights, treating name "${entityName}" as the entity being broadcast, not broadcast company`);
            
      // First, check if we have an entity_type set
      if (!basicMapped.entity_type) {
        // Try to guess entity type from the name
        if (entityName.toLowerCase().includes('conference') || 
            entityName.toLowerCase().includes('division')) {
          basicMapped.entity_type = 'division_conference';
          console.log(`Setting entity_type to 'division_conference' based on name: ${entityName}`);
        } else if (entityName.toLowerCase().includes('league')) {
          basicMapped.entity_type = 'league';
          console.log(`Setting entity_type to 'league' based on name: ${entityName}`);
        } else {
          // Default to division_conference as a guess
          basicMapped.entity_type = 'division_conference';
          console.log(`No entity type specified, defaulting to 'division_conference' for name: ${entityName}`);
        }
      }
            
      // Now handle entity ID lookup based on detected entity type
      console.log(`Looking up ${basicMapped.entity_type} with name: "${entityName}"`);
      
      // Map entity_type to the correct lookup type (normalize singular form)
      let lookupType = basicMapped.entity_type.toLowerCase();
      // Remove trailing 's' if present to get singular form
      if (lookupType.endsWith('s')) {
        lookupType = lookupType.slice(0, -1);
      }
      
      // Handle special cases and normalize lookupType
      if (['division', 'conference', 'divisions', 'conferences'].includes(lookupType)) {
        lookupType = 'division_conference';
      }
      
      console.log(`Looking up entity ID using type: ${lookupType} and name: ${entityName}`);
      
      try {
        let entities = [];
        
        // Fetch entities based on entity type
        switch (lookupType) {
          case 'league':
            entities = await apiClient.sports.getLeagues();
            break;
          case 'team':
            entities = await apiClient.sports.getTeams();
            break;
          case 'division_conference':
            entities = await apiClient.sports.getDivisionConferences();
            break;
          case 'game':
            entities = await apiClient.sports.getGames();
            break;
          default:
            console.warn(`Lookup not implemented for entity type: ${lookupType}`);
            break;
        }
        
        if (entities && entities.length > 0) {
          // First try exact match
          let entity = entities.find(e => 
            e.name?.toLowerCase() === entityName.toLowerCase()
          );
          
          // If no match and the name is long enough, try partial matching
          if (!entity && entityName.length > 3) {
            entity = entities.find(e => 
              (e.name?.toLowerCase().includes(entityName.toLowerCase()) || 
              entityName.toLowerCase().includes(e.name?.toLowerCase()))
            );
          }
          
          if (entity) {
            basicMapped.entity_id = entity.id;
            console.log(`Found ${lookupType} ID: ${entity.id} for name: ${entityName}`);
            
            // For division_conference, also set division_conference_id
            if (lookupType === 'division_conference') {
              basicMapped.division_conference_id = entity.id;
              console.log(`Also setting division_conference_id to: ${entity.id}`);
              
              // Try to get the league_id from the division
              if (!basicMapped.league_id && entity.league_id) {
                basicMapped.league_id = entity.league_id;
                console.log(`Setting league_id to: ${entity.league_id} from division`);
              }
            }
          } else {
            console.warn(`Could not find ${lookupType} with name: ${entityName}`);
            
            // Try to create the entity if appropriate
            if (lookupType === 'division_conference' && basicMapped.league_id) {
              try {
                console.log(`Creating new division/conference: ${entityName}`);
                const newDivision = await apiClient.sports.createDivisionConference({
                  name: entityName,
                  league_id: basicMapped.league_id,
                  type: 'Conference'
                });
                
                if (newDivision?.id) {
                  basicMapped.entity_id = newDivision.id;
                  basicMapped.division_conference_id = newDivision.id;
                  console.log(`Created new division/conference with ID: ${newDivision.id}`);
                }
              } catch (createError) {
                console.error(`Error creating new division/conference: ${entityName}`, createError);
              }
            } else if (lookupType === 'league') {
              try {
                console.log(`Creating new league: ${entityName}`);
                const newLeague = await apiClient.sports.createLeague({
                  name: entityName,
                  sport: 'Unknown',
                  country: 'Unknown'
                });
                
                if (newLeague?.id) {
                  basicMapped.entity_id = newLeague.id;
                  console.log(`Created new league with ID: ${newLeague.id}`);
                }
              } catch (createError) {
                console.error(`Error creating new league: ${entityName}`, createError);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error looking up ${lookupType} with name "${entityName}":`, error);
      }
    }

    // Handle broadcast_company_id - only use name fallback if broadcast_company_id is not already set
    if (!basicMapped.broadcast_company_id && basicMapped.name) {
      console.log(`WARNING: No broadcast_company_id provided, but this should not use the name field`);
      console.log(`For broadcast rights, you should provide a separate broadcast_company_id field`);
    }
    
    // Handle entity_id lookup based on entity_type
    if (basicMapped.entity_id && basicMapped.entity_type && !isValidUUID(basicMapped.entity_id)) {
      const entityName = basicMapped.entity_id;
      const entityType = basicMapped.entity_type;
      
      console.log(`Looking up ${entityType} ID for name: ${entityName}`);
      
      // Map entity_type to the correct lookup type (singular form)
      let lookupType = entityType.toLowerCase();
      
      // Remove trailing 's' if present to get singular form
      if (lookupType.endsWith('s')) {
        lookupType = lookupType.slice(0, -1);
      }
      
      // Handle special cases and normalize lookupType
      if (['division', 'conference', 'divisions', 'conferences'].includes(lookupType)) {
        lookupType = 'division_conference';
      }
      
      console.log(`Normalized lookup type: ${lookupType}`);
      
      // Get entity ID by name
      try {
        let entityId = null;
        let entities = [];
        
        // Fetch entities based on entity type
        switch (lookupType) {
          case 'league':
            entities = await apiClient.sports.getLeagues();
            break;
          case 'team':
            entities = await apiClient.sports.getTeams();
            break;
          case 'stadium':
            entities = await apiClient.sports.getStadiums();
            break;
          case 'division_conference':
            entities = await apiClient.sports.getDivisionConferences();
            break;
          case 'player':
            entities = await apiClient.sports.getPlayers();
            break;
          case 'game':
            entities = await apiClient.sports.getGames();
            break;
          case 'broadcast':
            entities = await apiClient.sports.getBroadcastRights();
            break;
          case 'brand':
            entities = await apiClient.sports.getBrands();
            break;
          default:
            console.warn(`Lookup not implemented for entity type: ${lookupType}`);
            break;
        }
        
        if (entities && entities.length > 0) {
          // First try exact match
          let entity = entities.find(e => 
            e.name?.toLowerCase() === entityName.toLowerCase()
          );
          
          // If no match and the name is long enough, try partial matching
          if (!entity && entityName.length > 3) {
            entity = entities.find(e => 
              (e.name?.toLowerCase().includes(entityName.toLowerCase()) || 
              entityName.toLowerCase().includes(e.name?.toLowerCase()))
            );
          }
          
          if (entity) {
            entityId = entity.id;
          }
        }
        
        if (entityId) {
          basicMapped.entity_id = entityId;
          console.log(`Found ${entityType} ID: ${entityId} for name: ${entityName}`);
        } else {
          console.warn(`Could not find ${entityType} ID for name: ${entityName}`);
          
          // Try to create a new entity if it's a league or division_conference
          if (lookupType === 'league') {
            try {
              console.log(`Attempting to create new league: ${entityName}`);
              const newLeague = await apiClient.sports.createLeague({
                name: entityName,
                sport: 'Unknown',  // Required field
                country: 'Unknown' // Required field
              });
              
              if (newLeague?.id) {
                basicMapped.entity_id = newLeague.id;
                console.log(`Created new league with ID: ${newLeague.id} for name: ${entityName}`);
              }
            } catch (createError) {
              console.error(`Error creating new league: ${entityName}`, createError);
            }
          } 
          else if (lookupType === 'division_conference') {
            // Find a default league if we don't have one
            if (!basicMapped.league_id) {
              try {
                console.log('No league_id found, attempting to find a default league');
                const leagues = await apiClient.sports.getLeagues();
                if (leagues && leagues.length > 0) {
                  basicMapped.league_id = leagues[0].id;
                  console.log(`Using default league ID: ${basicMapped.league_id}`);
                }
              } catch (leagueError) {
                console.error('Error finding default league:', leagueError);
              }
            }
            
            if (basicMapped.league_id) {
              try {
                console.log(`Attempting to create new division/conference: ${entityName}`);
                const newDivision = await apiClient.sports.createDivisionConference({
                  name: entityName,
                  league_id: basicMapped.league_id,
                  type: 'Conference'
                });
                
                if (newDivision?.id) {
                  basicMapped.entity_id = newDivision.id;
                  console.log(`Created new division/conference with ID: ${newDivision.id} for name: ${entityName}`);
                  
                  // Also update division_conference_id if we're using that field
                  if (basicMapped.division_conference_id) {
                    basicMapped.division_conference_id = newDivision.id;
                  }
                }
              } catch (createError) {
                console.error(`Error creating new division/conference: ${entityName}`, createError);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error looking up ${entityType} ID for name ${entityName}:`, error);
      }
    }
    
    // Handle broadcast_company_id by name if directly provided
    if (basicMapped.broadcast_company_id && !isValidUUID(basicMapped.broadcast_company_id)) {
      const companyName = basicMapped.broadcast_company_id;
      
      console.log(`Looking up broadcast company ID for name: ${companyName}`);
      try {
        // Check for special case with parentheses
        let nameToLookup = companyName;
        let baseNameToLookup = null;
        
        if (companyName.includes('(')) {
          baseNameToLookup = companyName.split('(')[0].trim();
          console.log(`Broadcast company name contains parentheses, will try base name "${baseNameToLookup}" if full name fails`);
        }
        
        // First try looking it up as a broadcast company
        let response = null;
        try {
          // First try the full name
          response = await apiClient.sports.lookup('broadcast_company', nameToLookup);
          
          // If full name doesn't match and we have a base name, try that
          if ((!response || !response.id) && baseNameToLookup) {
            console.log(`Trying lookup with base name: "${baseNameToLookup}"`);
            response = await apiClient.sports.lookup('broadcast_company', baseNameToLookup);
          }
        } catch (lookupError) {
          console.log(`Broadcast company "${nameToLookup}" not found, will try brand lookup next`);
        }
        
        // If not found as a broadcast company, try looking it up as a brand
        if (!response || !response.id) {
          console.log(`No broadcast company found for "${companyName}", checking if it exists as a brand`);
          try {
            // Try to look up as a brand first
            const brandResponse = await apiClient.sports.lookup('brand', nameToLookup);
            
            // If found as a brand
            if (brandResponse && brandResponse.id) {
              console.log(`Found "${companyName}" as a brand with ID ${brandResponse.id}`);
              console.log(`Will use brand ID as broadcast company ID`);
              
              // Use the brand ID as the broadcast company ID
              basicMapped.broadcast_company_id = brandResponse.id;
              
              // Add a special field to indicate we're using a brand ID
              basicMapped._usingBrandAsBroadcastCompany = true;
              basicMapped._brandName = companyName;
              
              // Process the rest of the fields and return
              return await processRemainingFields(basicMapped, entityType, apiClient);
            } else if (baseNameToLookup) {
              // Try base name for brand
              console.log(`Trying brand lookup with base name: "${baseNameToLookup}"`);
              try {
                const baseBrandResponse = await apiClient.sports.lookup('brand', baseNameToLookup);
                
                if (baseBrandResponse && baseBrandResponse.id) {
                  console.log(`Found "${baseNameToLookup}" as a brand with ID ${baseBrandResponse.id}`);
                  console.log(`Will use brand ID as broadcast company ID`);
                  
                  // Use the brand ID as the broadcast company ID
                  basicMapped.broadcast_company_id = baseBrandResponse.id;
                  
                  // Add a special field to indicate we're using a brand ID
                  basicMapped._usingBrandAsBroadcastCompany = true;
                  basicMapped._brandName = baseNameToLookup;
                  
                  // Process the rest of the fields and return
                  return await processRemainingFields(basicMapped, entityType, apiClient);
                }
              } catch (error) {
                console.log(`Brand lookup with base name failed: ${error.message}`);
              }
            }
          } catch (brandLookupError) {
            console.log(`Brand lookup also failed for "${companyName}"`);
          }
        }
        
        // If found as a broadcast company
        if (response && response.id) {
          basicMapped.broadcast_company_id = response.id;
          console.log(`Found broadcast company ID ${response.id} for name: ${companyName}`);
        } else {
          // Neither broadcast company nor brand was found
          console.log(`"${companyName}" not found as broadcast company or brand, will use a placeholder UUID`);
          
          // Store the company name in special fields for later use
          basicMapped._pendingBroadcastCompanyName = companyName;
          basicMapped._newBroadcastCompanyName = companyName;
          
          // For now, use a known UUID placeholder that will cause a specific error we can catch
          // Using v4 UUID format with "NEW-COMPANY" embedded in it
          basicMapped.broadcast_company_id = "00000000-NEW-COMP-ANY0-000000000000";
        }
      } catch (error) {
        console.error(`Error during broadcast company/brand lookup for "${companyName}":`, error);
        
        // Store the company name as a property for later use 
        basicMapped._newBroadcastCompanyName = companyName;
            
        // Use a placeholder UUID that will trigger validation with a specific value we can detect
        basicMapped.broadcast_company_id = "00000000-NEW-COMP-ANY0-000000000000";
        
        console.log(`Using placeholder UUID for new broadcast company "${companyName}"`);
      }
    }
    
    // Handle division_conference_id by name
    if (basicMapped.division_conference_id && !isValidUUID(basicMapped.division_conference_id)) {
      const divisionName = basicMapped.division_conference_id;
      
      console.log(`Looking up division/conference ID for name: ${divisionName}`);
      try {
        // Use the correct method name from sportsService
        const divisions = await apiClient.sports.getDivisionConferences();
        
        // First try exact match
        let division = divisions.find(e => e.name?.toLowerCase() === divisionName.toLowerCase());
        
        // If no exact match, try partial match for longer names
        if (!division && divisionName.length > 4) {
          console.log('No exact match found, trying partial match');
          division = divisions.find(e => 
            e.name?.toLowerCase().includes(divisionName.toLowerCase()) || 
            divisionName.toLowerCase().includes(e.name?.toLowerCase())
          );
        }
        
        if (division?.id) {
          basicMapped.division_conference_id = division.id;
          
          // If entity_type is 'division_conference', also set the entity_id
          if (basicMapped.entity_type === 'division_conference' || 
              basicMapped.entity_type === 'conference' || 
              basicMapped.entity_type === 'division') {
            basicMapped.entity_id = division.id;
            console.log(`Setting entity_id to division_conference_id: ${division.id}`);
          }
          console.log(`Found division/conference ID: ${division.id} for name: ${divisionName}`);
        } else {
          console.warn(`Could not find division/conference ID for name: ${divisionName}`);
          
          // Find a default league if we don't have one
          if (!basicMapped.league_id) {
            try {
              console.log('No league_id found, attempting to find a default league');
              const leagues = await apiClient.sports.getLeagues();
              if (leagues && leagues.length > 0) {
                // Try to find by matching league name in division name
                let matchedLeague = null;
                for (const league of leagues) {
                  if (divisionName.toLowerCase().includes(league.name.toLowerCase())) {
                    matchedLeague = league;
                    break;
                  }
                }
                
                // If no match found, use the first league
                if (!matchedLeague && leagues.length > 0) {
                  matchedLeague = leagues[0];
                }
                
                if (matchedLeague) {
                  basicMapped.league_id = matchedLeague.id;
                  console.log(`Using league ${matchedLeague.name} (${matchedLeague.id}) for new division/conference`);
                }
              }
            } catch (leagueError) {
              console.error('Error finding default league:', leagueError);
            }
          }
          
          // Try to create a new division/conference
          try {
            const league_id = basicMapped.league_id;
            if (league_id) {
              console.log(`Attempting to create new division/conference: ${divisionName}`);
              const newDivision = await apiClient.sports.createDivisionConference({
                name: divisionName,
                league_id: league_id,
                type: 'Conference' // Default type
              });
              
              if (newDivision?.id) {
                basicMapped.division_conference_id = newDivision.id;
                
                // If entity_type is 'division_conference', also set the entity_id
                if (basicMapped.entity_type === 'division_conference' || 
                    basicMapped.entity_type === 'conference' || 
                    basicMapped.entity_type === 'division') {
                  basicMapped.entity_id = newDivision.id;
                  console.log(`Setting entity_id to new division_conference_id: ${newDivision.id}`);
                }
                console.log(`Created new division/conference with ID: ${newDivision.id} for name: ${divisionName}`);
              }
            } else if (entityType === 'broadcast') {
              // For broadcast entities, we'll skip division creation if league_id is missing
              // since league_id is optional for broadcast rights
              console.log('League ID is optional for broadcast rights, skipping division/conference creation');
            } else {
              console.warn('Cannot create division/conference without a league_id');
            }
          } catch (createError) {
            console.error(`Error creating new division/conference: ${divisionName}`, createError);
          }
        }
      } catch (error) {
        console.error(`Error looking up division/conference ID for name ${divisionName}:`, error);
      }
    }
    
    // Handle start_date and end_date for broadcast rights
    if (entityType === 'broadcast') {
      // Set default dates for missing start_date and end_date to April 1, 1976
      const DEFAULT_DATE = '1976-04-01';
      
      if (!basicMapped.start_date) {
        basicMapped.start_date = DEFAULT_DATE;
        console.log(`Missing start_date for broadcast rights, setting default: ${DEFAULT_DATE}`);
      } else {
        // Check if it's just a year (4 digits)
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(basicMapped.start_date)) {
          const year = basicMapped.start_date;
          basicMapped.start_date = `${year}-01-01`;
          console.log(`Converted start_date from year to full date: ${year} -> ${basicMapped.start_date}`);
        }
      }
      
      if (!basicMapped.end_date) {
        basicMapped.end_date = DEFAULT_DATE;
        console.log(`Missing end_date for broadcast rights, setting default: ${DEFAULT_DATE}`);
      } else {
        // Check if it's just a year (4 digits)
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(basicMapped.end_date)) {
          const year = basicMapped.end_date;
          basicMapped.end_date = `${year}-12-31`;
          console.log(`Converted end_date from year to full date: ${year} -> ${basicMapped.end_date}`);
        }
      }
    } else if (entityType === 'brand_relationship') {
      // For brand relationships, handle date formatting similarly to broadcast rights
      // with default values when missing
      const DEFAULT_DATE = '1976-04-01';
      
      if (!basicMapped.start_date) {
        basicMapped.start_date = DEFAULT_DATE;
        console.log(`Missing start_date for brand relationship, setting default: ${DEFAULT_DATE}`);
      } else {
        // Check if it's just a year (4 digits)
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(basicMapped.start_date)) {
          const year = basicMapped.start_date;
          basicMapped.start_date = `${year}-01-01`;
          console.log(`Converted start_date from year to full date: ${year} -> ${basicMapped.start_date}`);
        }
      }
      
      if (basicMapped.end_date) {
        // Check if it's just a year (4 digits)
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(basicMapped.end_date)) {
          const year = basicMapped.end_date;
          basicMapped.end_date = `${year}-12-31`;
          console.log(`Converted end_date from year to full date: ${year} -> ${basicMapped.end_date}`);
        }
      }
    } else {
      // For other entities, just handle year formatting without defaults
      // Format start_date and end_date if they are just years
      if (basicMapped.start_date) {
        // Check if it's just a year (4 digits)
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(basicMapped.start_date)) {
          const year = basicMapped.start_date;
          basicMapped.start_date = `${year}-01-01`;
          console.log(`Converted start_date from year to full date: ${year} -> ${basicMapped.start_date}`);
        }
      }
      
      if (basicMapped.end_date) {
        // Check if it's just a year (4 digits)
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(basicMapped.end_date)) {
          const year = basicMapped.end_date;
          basicMapped.end_date = `${year}-12-31`;
          console.log(`Converted end_date from year to full date: ${year} -> ${basicMapped.end_date}`);
        }
      }
    }
    
    // Handle case where entity_type is specified but entity_id is not
    if (basicMapped.entity_type && !basicMapped.entity_id) {
      console.log(`Entity type '${basicMapped.entity_type}' specified but missing entity_id, attempting to find appropriate entity`);
      
      // Map entity_type values to correct lookup types
      const lookupType = basicMapped.entity_type.toLowerCase().replace(/s$/, '');
      
      try {
        // Handle different entity types
        switch (lookupType) {
          case 'league':
            // Handle league lookup
            try {
              // Use division_conference_id or entity_id as search terms
              const leagues = await apiClient.sports.getLeagues();
              
              // Collect potential search terms
              const searchTerms = [];
              if (basicMapped.division_conference_id && typeof basicMapped.division_conference_id === 'string' && !isValidUUID(basicMapped.division_conference_id)) {
                searchTerms.push(basicMapped.division_conference_id.toLowerCase());
              }
              if (basicMapped.entity_id && typeof basicMapped.entity_id === 'string' && !isValidUUID(basicMapped.entity_id)) {
                searchTerms.push(basicMapped.entity_id.toLowerCase());
              }
              
              // Only proceed if we have search terms
              let league = null;
              if (searchTerms.length > 0) {
                console.log('Searching for league using terms:', searchTerms);
                
                // Try each search term
                for (const term of searchTerms) {
                  // First try exact match
                  league = leagues.find(e => e.name?.toLowerCase() === term);
                  
                  // Then try partial matches if term is long enough
                  if (!league && term.length > 4) {
                    league = leagues.find(e => 
                      e.name?.toLowerCase().includes(term) || 
                      term.includes(e.name?.toLowerCase())
                    );
                  }
                  
                  if (league) {
                    console.log(`Found league match for "${term}": ${league.name}`);
                    break;
                  }
                }
              }
              if (league) {
                basicMapped.entity_id = league.id;
                console.log(`Found league ID for entity_id: ${league.id}`);
              }
            } catch (error) {
              console.error('Error looking up league ID:', error);
            }
            break;
          case 'conference':
          case 'division':
          case 'division_conference':
            // For divisions/conferences, use the division_conference_id if available
            if (basicMapped.division_conference_id) {
              if (isValidUUID(basicMapped.division_conference_id)) {
                // If it's already a UUID, use it directly
                basicMapped.entity_id = basicMapped.division_conference_id;
                console.log(`Using division_conference_id as entity_id: ${basicMapped.entity_id}`);
              } else {
                // If not a UUID, try to look it up
                console.log(`Looking up division/conference '${basicMapped.division_conference_id}' for entity_id`);
                try {
                  const divisions = await apiClient.sports.getDivisionConferences();
                  const searchTerm = basicMapped.division_conference_id.toLowerCase();
                  
                  // First try exact match
                  let division = divisions.find(d => d.name?.toLowerCase() === searchTerm);
                  
                  // Then try partial matches if search term is long enough
                  if (!division && searchTerm.length > 4) {
                    division = divisions.find(d => 
                      d.name?.toLowerCase().includes(searchTerm) || 
                      searchTerm.includes(d.name?.toLowerCase())
                    );
                  }
                  
                  if (division) {
                    console.log(`Found division/conference ID: ${division.id} for '${basicMapped.division_conference_id}'`);
                    basicMapped.entity_id = division.id;
                    // Also update the division_conference_id with the UUID
                    basicMapped.division_conference_id = division.id;
                  } else {
                    console.warn(`Could not find division/conference ID for '${basicMapped.division_conference_id}'`);
                    
                    // Try to create a new division_conference
                    if (basicMapped.league_id) {
                      try {
                        console.log(`Attempting to create new division/conference: ${basicMapped.division_conference_id}`);
                        const newDivision = await apiClient.sports.createDivisionConference({
                          name: basicMapped.division_conference_id,
                          league_id: basicMapped.league_id,
                          type: 'Conference' // Default type
                        });
                        
                        if (newDivision?.id) {
                          // Update both division_conference_id and entity_id
                          basicMapped.division_conference_id = newDivision.id;
                          basicMapped.entity_id = newDivision.id;
                          console.log(`Created new division/conference with ID: ${newDivision.id}`);
                        }
                      } catch (createError) {
                        console.error(`Error creating new division/conference: ${createError}`);
                      }
                    } else if (entityType === 'broadcast') {
                      // For broadcast entities, we'll skip division creation if league_id is missing
                      // since league_id is optional for broadcast rights
                      console.log('League ID is optional for broadcast rights, skipping division/conference creation');
                    } else {
                      console.warn('Cannot create division/conference without a league_id');
                    }
                  }
                } catch (lookupError) {
                  console.error(`Error looking up division/conference: ${lookupError}`);
                }
              }
            }
            break;
        }
      } catch (error) {
        console.error(`Error deriving entity_id from entity_type: ${error}`);
      }
    }
    
    // Remove the 'name' property as it's not an actual field in the database schema for broadcast
    // We've already used it to create/lookup a broadcast company
    delete basicMapped.name;
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