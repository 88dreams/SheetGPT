import { isValidUUID } from "./validationUtils";
import { EntityType } from "../../types/sports";

/**
 * Maps front-end friendly field names to database field names.
 * @param {EntityType} entityType - The type of the entity.
 * @param {object} data - The data object to map.
 * @returns {object} The mapped data object.
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
 * Enhanced mapping function that handles complex cases.
 * @param {EntityType} entityType - The type of the entity.
 * @param {object} data - The data object to map.
 * @returns {object} The mapped data object.
 */
export const enhancedMapToDatabaseFieldNames = (entityType: EntityType, data: Record<string, any>) => {
    // For now, just call the basic mapping function
    // This can be expanded later with more complex logic
    return mapToDatabaseFieldNames(entityType, data);
};