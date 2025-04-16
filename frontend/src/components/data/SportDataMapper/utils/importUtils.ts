import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames, isValidUUID } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { sportsService } from '../../../../services/sportsService';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../../services/SportsDatabaseService';

/**
 * Simplified function to transform source data based on user-defined field mappings
 * 
 * This implementation focuses on simplicity and directness, with minimal special handling:
 * 1. Maps directly from user-defined field mappings to database fields
 * 2. Uses direct mapping with two simple strategies (index or field name)
 * 3. Only applies minimal formatting for dates
 * 4. No special case handling or data format detection
 */
export const transformMappedData = (
  mappings: Record<string, string>,
  sourceRecord: Record<string, any> | any[]
): Record<string, any> => {
  const transformedData: Record<string, any> = {};
  const isArrayData = Array.isArray(sourceRecord);
  
  // Basic logging for debugging
  console.log('Transforming mapped data:', {
    mappings: Object.keys(mappings).length,
    isArrayData,
    sourceRecordSample: JSON.stringify(sourceRecord).substring(0, 100) + '...'
  });
  
  // Process array data
  if (isArrayData && Array.isArray(sourceRecord)) {
    console.log('Processing array data');
    
    // Print the array data for easier debugging
    console.log('Source array:', sourceRecord);
    
    // Map each field directly using two simple strategies
    Object.entries(mappings).forEach(([dbField, sourceField]) => {
      // Strategy 1: Direct numeric index mapping
      if (!isNaN(Number(sourceField))) {
        // If the source field is a number, use it as an array index
        const index = Number(sourceField);
        if (index >= 0 && index < sourceRecord.length) {
          transformedData[dbField] = sourceRecord[index];
          console.log(`Mapped ${dbField} = ${transformedData[dbField]} (from index ${index})`);
        } else {
          console.log(`Index ${index} out of bounds for field ${dbField}`);
        }
      }
      // Strategy 2: Field name matching
      else {
        // If source field is not a number, try to find it in the array
        // This could be a header or key value in one of the positions
        for (let i = 0; i < sourceRecord.length - 1; i++) {
          // Check if this item matches our source field name
          if (sourceRecord[i] === sourceField) {
            // Use the next value as the field value
            transformedData[dbField] = sourceRecord[i + 1];
            console.log(`Mapped ${dbField} = ${transformedData[dbField]} (via field name match at position ${i})`);
            break;
          }
        }
        
        // If no match was found after scanning the array
        if (transformedData[dbField] === undefined) {
          // If the source field name matches a known field at a specific position,
          // we can use that position as a last resort
          
          // Common field position patterns - these are just sensible defaults
          if (sourceField === 'Name of company' || sourceField === 'Company Name') {
            // Often in first position
            transformedData[dbField] = sourceRecord[0];
            console.log(`Mapped ${dbField} = ${transformedData[dbField]} (from common position 0)`);
          }
          else if ((sourceField === 'Broadcast Client' || sourceField === 'League Name') && sourceRecord[1]) {
            // Often in second position
            transformedData[dbField] = sourceRecord[1];
            console.log(`Mapped ${dbField} = ${transformedData[dbField]} (from common position 1)`);
          }
          else if (sourceField === 'Sport' && sourceRecord.find(x => typeof x === 'string' && 
                  (x === 'Motorsport' || x === 'Racing' || x.includes('Sport')))) {
            // Find sport in array
            const sport = sourceRecord.find(x => typeof x === 'string' && 
                          (x === 'Motorsport' || x === 'Racing' || x.includes('Sport')));
            transformedData[dbField] = sport;
            console.log(`Mapped ${dbField} = ${transformedData[dbField]} (from sport pattern match)`);
          }
          else if (sourceField === 'Broadcast Territory' && sourceRecord.find(x => x === 'USA')) {
            // Find territory in array
            transformedData[dbField] = 'USA';
            console.log(`Mapped ${dbField} = USA (from territory match)`);
          }
        }
      }
    });
  } 
  // Process object data (simple property access)
  else if (!isArrayData && typeof sourceRecord === 'object' && sourceRecord !== null) {
    console.log('Processing object data');
    Object.entries(mappings).forEach(([dbField, sourceField]) => {
      if (sourceField in sourceRecord) {
        transformedData[dbField] = sourceRecord[sourceField];
        console.log(`Mapped ${dbField} = ${transformedData[dbField]} (from object property)`);
      } else {
        console.log(`Source field "${sourceField}" not found in object`);
      }
    });
  }
  
  // Minimal post-processing: format dates only
  
  // Format year-only dates (e.g., 2019 -> 2019-01-01)
  ['start_date', 'end_date'].forEach(dateField => {
    if (transformedData[dateField] && typeof transformedData[dateField] === 'string') {
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(transformedData[dateField])) {
        transformedData[dateField] = dateField === 'start_date' ? 
          `${transformedData[dateField]}-01-01` : // Start date: beginning of year
          `${transformedData[dateField]}-12-31`;  // End date: end of year
        console.log(`Formatted date: ${dateField} = ${transformedData[dateField]}`);
      }
    }
  });
  
  console.log('Final transformed data:', transformedData);
  return transformedData;
};

/**
 * Process additional data before saving to handle special fields
 */
export const processDivisionConferenceReference = async (
  entityType: EntityType,
  data: Record<string, any>
): Promise<Record<string, any>> => {
  // Clone the data to avoid mutating the original
  const processedData = { ...data };
  
  // Only process for team entities with division_conference_id that looks like a name
  if (
    entityType === 'team' && 
    Object.keys(processedData).includes('division_conference_id') &&
    processedData.division_conference_id && 
    typeof processedData.division_conference_id === 'string' &&
    !processedData.division_conference_id.includes('-')
  ) {
    try {
      console.log('division_conference_id appears to be a name:', processedData.division_conference_id);
      const divConfLookup = await sportsService.lookup('division_conference', processedData.division_conference_id);
      
      if (divConfLookup && divConfLookup.id) {
        console.log(`Found division/conference ID: ${divConfLookup.id} for name: ${processedData.division_conference_id}`);
        // Replace the name with the actual ID
        processedData.division_conference_id = divConfLookup.id;
      }
    } catch (error) {
      console.error('Error looking up division/conference by name:', error);
    }
  }
  
  return processedData;
};

/**
 * Save an entity to the database
 * 
 * Simplified version that focuses on direct saving via the API
 * with minimal preprocessing
 */
export const saveEntityToDatabase = async (
  entityType: EntityType,
  data: Record<string, any>,
  isUpdateMode: boolean
): Promise<boolean> => {
  console.log(`Saving ${entityType} to database:`, data);
  
  try {
    // Format dates for all entity types
    ['start_date', 'end_date'].forEach(dateField => {
      if (data[dateField] && typeof data[dateField] === 'string') {
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(data[dateField])) {
          data[dateField] = dateField === 'start_date' ? 
            `${data[dateField]}-01-01` : // Start date: beginning of year
            `${data[dateField]}-12-31`;  // End date: end of year
          console.log(`Formatted ${dateField}: ${data[dateField]}`);
        }
      }
    });
    
    // Handle update mode for entities with a name field
    if (isUpdateMode && data.name) {
      console.log(`Update mode: Attempting to update ${entityType} with name "${data.name}"`);
      
      try {
        const response = await sportsService.updateEntityByName(
          entityType,
          data.name,
          data
        );
        
        console.log(`Successfully updated ${entityType}:`, response);
        return true;
      } catch (updateError) {
        // If entity not found, fall through to create
        if (updateError.message && updateError.message.includes('not found')) {
          console.log(`${entityType} with name "${data.name}" not found, will create instead`);
        } else {
          // For other errors, throw
          throw updateError;
        }
      }
    }
    
    // For broadcast entities, handle via specialized service
    if (entityType === 'broadcast') {
      console.log('Using broadcast service to save broadcast rights');
      const result = await sportsService.createBroadcastRightsWithErrorHandling(data);
      console.log('Successfully created broadcast rights:', result);
      return true;
    }
    
    // Default path: create entity using standard service
    console.log(`Creating new ${entityType}`);
    const response = await sportsDatabaseService.createEntity(
      entityType as DbEntityType, 
      data,
      isUpdateMode
    );
    
    console.log(`Successfully created ${entityType}:`, response);
    return !!response;
  } catch (error) {
    console.error(`Error saving ${entityType}:`, error);
    throw error;
  }
};

/**
 * Check if a production service with the same key fields already exists
 * @param data The production service data to check for duplicates
 * @returns The existing service if a duplicate is found, null otherwise
 */
export const checkDuplicateProductionService = async (data: Record<string, any>): Promise<any | null> => {
  try {
    // We only need to check for duplicates if we have the key fields
    if (!data.entity_type || !data.entity_id || !data.production_company_id) {
      return null;
    }
    
    console.log('Checking for duplicate production service with data:', {
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      production_company_id: data.production_company_id
    });
    
    // Query existing production services with the same entity and company
    const services = await sportsService.getProductionServices({
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      company_id: data.production_company_id
    });
    
    // If any services were found with the same key fields, it's a duplicate
    if (services && services.length > 0) {
      console.log('Found duplicate production service:', services[0]);
      return services[0]; // Return the first matching service
    }
    
    console.log('No duplicate production service found');
    return null; // No duplicate found
  } catch (error) {
    console.error('Error checking for duplicate production service:', error);
    return null; // Error occurred, continue with save operation
  }
};

/**
 * Check if a broadcast right with the same key fields already exists
 * @param data The broadcast right data to check for duplicates
 * @returns The existing broadcast right if a duplicate is found, null otherwise
 */
export const checkDuplicateBroadcastRight = async (data: Record<string, any>): Promise<any | null> => {
  try {
    // We only need to check for duplicates if we have the key fields
    if (!data.entity_type || !data.entity_id || !data.broadcast_company_id) {
      return null;
    }
    
    console.log('Checking for duplicate broadcast right with data:', {
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      broadcast_company_id: data.broadcast_company_id
    });
    
    // Query existing broadcast rights with the same entity and company
    const rights = await sportsService.getBroadcastRights({
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      company_id: data.broadcast_company_id
    });
    
    // If any rights were found with the same key fields, it's a duplicate
    if (rights && rights.length > 0) {
      console.log('Found duplicate broadcast right:', rights[0]);
      return rights[0]; // Return the first matching right
    }
    
    console.log('No duplicate broadcast right found');
    return null; // No duplicate found
  } catch (error) {
    console.error('Error checking for duplicate broadcast right:', error);
    return null; // Error occurred, continue with save operation
  }
};

/**
 * Format error message from various error types, with special handling for common database errors
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const errorMessage = error.message;
    
    // Special handling for invalid/placeholder broadcast company UUID
    if (errorMessage.includes('broadcast_company_id') && 
        (errorMessage.includes('should be a valid UUID') || 
         errorMessage.includes('NEW-COMP-ANY0'))) {
      
      return `The broadcast company name you entered does not exist in the database and cannot be automatically created. Please create the broadcast company first using the Entities menu in the main navigation, then try again.`;
    }
    
    // Special handling for broadcast company not found 
    if (errorMessage.includes('Broadcast_company with name') && errorMessage.includes('not found')) {
      // Extract the company name from the error message
      const match = errorMessage.match(/Broadcast_company with name '([^']+)' not found/);
      if (match && match[1]) {
        const companyName = match[1];
        return `Broadcast company "${companyName}" not found. Please create it first using the Entities menu in the main navigation, then try again.`;
      }
      
      // If we can't extract the name, use a generic message
      return `Broadcast company not found. Please create it first using the Entities menu in the main navigation, then try again.`;
    }
    
    // Special handling for brand not found errors
    if (errorMessage.includes('Brand with name') && errorMessage.includes('not found')) {
      // Extract the brand name from the error message
      const match = errorMessage.match(/Brand with name '([^']+)' not found/);
      if (match && match[1]) {
        const brandName = match[1];
        return `Brand "${brandName}" not found. Please create it first using the Entities menu in the main navigation, then try again.`;
      }
      
      // If we can't extract the name, use a generic message
      return `Brand not found. Please create it first using the Entities menu in the main navigation, then try again.`;
    }
    
    // Special handling for entity not found errors
    if (errorMessage.includes('with name') && errorMessage.includes('not found')) {
      // Try to extract the entity type and name
      const match = errorMessage.match(/([A-Za-z_]+) with name '([^']+)' not found/);
      if (match && match.length >= 3) {
        const entityType = match[1].replace('_', ' ');
        const entityName = match[2];
        return `${entityType} "${entityName}" not found. Please create it first using the Entities menu in the main navigation, then try again.`;
      }
      
      // Generic handling if we can't parse the specific entity
      return `Entity not found. Please create it first using the Entities menu in the main navigation, then try again.`;
    }
    
    // Special handling for broadcast rights unique constraint violation
    if (errorMessage.includes('duplicate key value violates unique constraint') && 
        errorMessage.includes('broadcast_rights')) {
      // Parse the error to extract the entity information
      try {
        // Extract the entity details from the error message
        const entityTypeMatch = errorMessage.match(/Key \(entity_type, entity_id, broadcast_company_id.*?\)=\(([^,]+), ([^,]+), ([^,]+)/);
        
        if (entityTypeMatch && entityTypeMatch.length >= 4) {
          const entityType = entityTypeMatch[1];
          const entityId = entityTypeMatch[2].substring(0, 8); // Just show first part of UUID
          const broadcastCompanyId = entityTypeMatch[3].substring(0, 8);
          
          return `A broadcast right already exists for this combination of ${entityType}, entity, and broadcast company. Try using different parameters or edit the existing record instead.`;
        }
      } catch (parseError) {
        // If parsing fails, fall back to a generic but still helpful message
        return `A broadcast right already exists with these exact parameters. Modify some values to make it unique or use the edit interface instead.`;
      }
    }
    
    // Special handling for brand unique constraint violation
    if (errorMessage.includes('duplicate key value violates unique constraint') && 
        errorMessage.includes('brand')) {
      return `A brand already exists with these exact parameters. Modify some values to make it unique or use the edit interface instead.`;
    }
    
    return errorMessage;
  } else if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error occurred';
    }
  }
  
  return 'Unknown error occurred';
};