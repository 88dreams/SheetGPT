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
  console.log(`Creating entity of type ${entityType} with name "${name}" if it doesn't exist`);
  
  try {
    // First, try to look up the entity by name
    let entityId = await lookupEntityIdByName(entityType, name, apiClient);
    
    // If the entity wasn't found, create it
    if (!entityId) {
      console.log(`Entity ${entityType} with name "${name}" not found, creating a new one`);
      
      // Create the new entity with the provided name and additional data
      const entityData = {
        name,
        ...additionalData
      };
      
      // Use the appropriate API endpoint based on entity type
      let createResponse;
      switch (entityType) {
        case 'league':
          createResponse = await apiClient.sports.createLeague(entityData);
          break;
        case 'stadium':
          createResponse = await apiClient.sports.createStadium(entityData);
          break;
        case 'team':
          createResponse = await apiClient.sports.createTeam(entityData);
          break;
        case 'brand':
          createResponse = await apiClient.sports.createBrand(entityData);
          break;
        default:
          console.error(`Unsupported entity type for creation: ${entityType}`);
          return null;
      }
      
      // Extract the new entity ID from the response
      if (createResponse && createResponse.id) {
        entityId = createResponse.id;
        console.log(`Created new ${entityType} with ID: ${entityId}`);
      } else {
        console.error(`Failed to create new ${entityType} with name "${name}"`);
        return null;
      }
    }
    
    return entityId;
  } catch (error) {
    console.error(`Error creating ${entityType} with name "${name}":`, error);
    return null;
  }
};

/**
 * Enhanced processing of mapped data with advanced field resolution
 */
export const enhancedMapToDatabaseFieldNames = async (
  entityType: EntityType,
  data: Record<string, any>,
  apiClient: any
): Promise<Record<string, any>> => {
  // First, do the basic mapping
  const basicMapped = mapToDatabaseFieldNames(entityType, data);
  
  console.log(`Enhanced mapping for ${entityType}:`, basicMapped);
  
  // Handle entity-specific field enhancements
  if (entityType === 'team' && basicMapped.stadium_id && !isValidUUID(basicMapped.stadium_id)) {
    console.log(`Looking up stadium ID for name: ${basicMapped.stadium_id}`);
    const stadiumId = await lookupEntityIdByName('stadium', basicMapped.stadium_id, apiClient);
    if (stadiumId) {
      basicMapped.stadium_id = stadiumId;
      console.log(`Found stadium ID: ${stadiumId} for name: ${data.stadium_id}`);
    } else {
      console.warn(`Could not find stadium ID for name: ${basicMapped.stadium_id}`);
    }
  }
  
  // Partner field handling for brand entity
  if (entityType === 'brand' && basicMapped.partner) {
    // If partner is specified but not a UUID, look up the partner entity
    if (!isValidUUID(basicMapped.partner)) {
      console.log(`Looking up partner entity by name: ${basicMapped.partner}`);
      
      // First, determine likely entity type for the partner
      // Common patterns like "FC", "United", "Athletics" suggest teams
      // "League", "Association" suggest leagues
      // "Stadium", "Arena", "Field" suggest stadiums
      let entityTypes = ['league', 'team', 'stadium', 'division_conference'];
      
      // Try to find the partner entity
      for (const type of entityTypes) {
        try {
          const response = await apiClient.sports.lookup(type, basicMapped.partner);
          if (response && response.id) {
            console.log(`Found partner entity of type ${type} with ID: ${response.id} for name: ${basicMapped.partner}`);
            // Store the partner name as is, the backend will handle resolution
            break;
          }
        } catch (error) {
          console.log(`No match found for ${basicMapped.partner} as ${type}`);
        }
      }
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
    
    // Handle special cases for entity types
    if (['division', 'conference', 'divisions', 'conferences'].includes(lookupType)) {
      lookupType = 'division_conference';
    }
    
    try {
      const response = await apiClient.sports.lookup(lookupType, entityName);
      if (response && response.id) {
        basicMapped.entity_id = response.id;
        console.log(`Found ${entityType} ID: ${response.id} for name: ${entityName}`);
      } else {
        console.warn(`Could not find ${entityType} ID for name: ${entityName}`);
      }
    } catch (error) {
      console.error(`Error looking up ${entityType} ID for name: ${entityName}:`, error);
    }
  }
  
  // Format dates if they are provided as plain years
  ['start_date', 'end_date'].forEach(dateField => {
    if (basicMapped[dateField] && typeof basicMapped[dateField] === 'string') {
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(basicMapped[dateField])) {
        // If it's a start date, use January 1st; if it's an end date, use December 31st
        basicMapped[dateField] = dateField === 'start_date'
          ? `${basicMapped[dateField]}-01-01`
          : `${basicMapped[dateField]}-12-31`;
        
        console.log(`Formatted ${dateField}: ${basicMapped[dateField]}`);
      }
    }
  });
  
  // Handle relationship fields by entity type
  if (entityType === 'broadcast') {
    // Special handling for broadcast entity dates
    // Format start_date and end_date if they are just years or missing
    const DEFAULT_DATE = '1976-04-01';
    
    if (!basicMapped.start_date) {
      basicMapped.start_date = DEFAULT_DATE;
      console.log(`Missing start_date for broadcast, setting default: ${DEFAULT_DATE}`);
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
      // Use a far future date for end_date if missing
      const future = new Date().getFullYear() + 10;
      basicMapped.end_date = `${future}-12-31`;
      console.log(`Missing end_date for broadcast, setting future date: ${basicMapped.end_date}`);
    } else {
      // Check if it's just a year (4 digits)
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(basicMapped.end_date)) {
        const year = basicMapped.end_date;
        basicMapped.end_date = `${year}-12-31`;
        console.log(`Converted end_date from year to full date: ${year} -> ${basicMapped.end_date}`);
      }
    }
  } else if (entityType === 'brand') {
    // Handle partner_relationship date formatting for Brand entities
    // The partner_relationship field has been moved to the Brand entity
    
    // If brand has partner fields, ensure they are properly formatted
    if (basicMapped.partner && basicMapped.partner_relationship) {
      console.log(`Brand entity has partner: ${basicMapped.partner} with relationship: ${basicMapped.partner_relationship}`);
    }
  } else {
    // For other entities, just handle year formatting without defaults
    // Format start_date and end_date if they are just years
    if (basicMapped.start_date) {
      // Check if it's just a year (4 digits)
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(basicMapped.start_date)) {
        basicMapped.start_date = `${basicMapped.start_date}-01-01`;
        console.log(`Formatted start_date: ${basicMapped.start_date}`);
      }
    }
    
    if (basicMapped.end_date) {
      // Check if it's just a year (4 digits)
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(basicMapped.end_date)) {
        basicMapped.end_date = `${basicMapped.end_date}-12-31`;
        console.log(`Formatted end_date: ${basicMapped.end_date}`);
      }
    }
  }
  
  // Handle broadcast_company_id and production_company_id for broadcast and production entities
  if ((entityType === 'broadcast' || entityType === 'game_broadcast') && 
      basicMapped.broadcast_company_id && 
      !isValidUUID(basicMapped.broadcast_company_id)) {
    
    // Try to look up the broadcast company by name
    const companyName = basicMapped.broadcast_company_id;
    console.log(`Looking up broadcast company ID for name: ${companyName}`);
    
    try {
      // First look up as a broadcast company
      const response = await apiClient.sports.lookup('broadcast_company', companyName);
      if (response && response.id) {
        basicMapped.broadcast_company_id = response.id;
        console.log(`Found broadcast company ID: ${response.id} for name: ${companyName}`);
      } else {
        // If not found, check if it's a brand (with company_type="Broadcaster")
        console.log(`Broadcast company "${companyName}" not found, checking brands with broadcasting role...`);
        try {
          const brandResponse = await apiClient.sports.lookup('brand', companyName);
          if (brandResponse && brandResponse.id) {
            // Check if this brand has company_type indicating it's a broadcaster
            if (brandResponse.company_type === 'Broadcaster') {
              basicMapped.broadcast_company_id = brandResponse.id;
              console.log(`Found brand with broadcasting role ID: ${brandResponse.id} for name: ${companyName}`);
              basicMapped._usingBrandAsBroadcastCompany = true;
              basicMapped._brandName = brandResponse.name;
            } else {
              console.warn(`Brand "${companyName}" found but is not a broadcaster (company_type=${brandResponse.company_type})`);
            }
          } else {
            console.warn(`Could not find broadcast company or brand with name: ${companyName}`);
            basicMapped._newBroadcastCompanyName = companyName;
          }
        } catch (brandError) {
          console.error(`Error looking up brand for broadcast company: ${companyName}`, brandError);
          basicMapped._newBroadcastCompanyName = companyName;
        }
      }
    } catch (error) {
      console.error(`Error looking up broadcast company: ${companyName}`, error);
      basicMapped._newBroadcastCompanyName = companyName;
    }
  } else if (entityType === 'production' && 
            basicMapped.production_company_id && 
            !isValidUUID(basicMapped.production_company_id)) {
    
    // Try to look up the production company by name
    const companyName = basicMapped.production_company_id;
    console.log(`Looking up production company ID for name: ${companyName}`);
    
    try {
      // First look up as a production company
      const response = await apiClient.sports.lookup('production_company', companyName);
      if (response && response.id) {
        basicMapped.production_company_id = response.id;
        console.log(`Found production company ID: ${response.id} for name: ${companyName}`);
      } else {
        // If not found, check if it's a brand (with company_type="Production Company")
        console.log(`Production company "${companyName}" not found, checking brands with production role...`);
        try {
          const brandResponse = await apiClient.sports.lookup('brand', companyName);
          if (brandResponse && brandResponse.id) {
            // Check if this brand has company_type indicating it's a production company
            if (brandResponse.company_type === 'Production Company') {
              basicMapped.production_company_id = brandResponse.id;
              console.log(`Found brand with production role ID: ${brandResponse.id} for name: ${companyName}`);
              basicMapped._usingBrandAsProductionCompany = true;
              basicMapped._brandName = brandResponse.name;
            } else {
              console.warn(`Brand "${companyName}" found but is not a production company (company_type=${brandResponse.company_type})`);
            }
          } else {
            console.warn(`Could not find production company or brand with name: ${companyName}`);
            basicMapped._newProductionCompanyName = companyName;
          }
        } catch (brandError) {
          console.error(`Error looking up brand for production company: ${companyName}`, brandError);
          basicMapped._newProductionCompanyName = companyName;
        }
      }
    } catch (error) {
      console.error(`Error looking up production company: ${companyName}`, error);
      basicMapped._newProductionCompanyName = companyName;
    }
  }
  
  // Lookup league_id if provided as string
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
  
  return basicMapped;
};