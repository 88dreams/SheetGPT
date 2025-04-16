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
    
    // Detect entity type based on mapped fields
    const isBroadcastData = Object.keys(mappings).some(field => 
      field === 'broadcast_company_id' || field === 'territory');
      
    const isBrandData = Object.keys(mappings).some(field =>
      field === 'name') && !isBroadcastData;
      
    // If this is broadcast data, set critical fields if they're not already in mappings
    if (isBroadcastData) {
      console.log('This appears to be broadcast data - ensuring critical fields are set');
      
      // Check if entity_type and entity_id are not in mappings
      const hasEntityType = Object.keys(mappings).includes('entity_type');
      const hasEntityId = Object.keys(mappings).includes('entity_id');
      
      // Set default values for entity_type and entity_id if they are missing from mappings
      if (!hasEntityType || !hasEntityId) {
        console.log('Critical fields missing from mappings - adding defaults based on data pattern');
        
        // For common IndyCar/NASCAR/F1 patterns, entity_type should be "league"
        // Position 1 typically has the entity name (IndyCar)
        // Positions 3-4 often contain entity type hints (Motorsport, League, etc.)
        
        // 1. First look for entity type hints in positions 3-5
        let entityType = 'league'; // Default to league for racing series
        
        for (let i = 3; i <= 5 && i < sourceRecord.length; i++) {
          const value = String(sourceRecord[i]).toLowerCase();
          if (value.includes('league')) {
            entityType = 'league';
            break;
          } else if (value.includes('team')) {
            entityType = 'team';
            break;
          } else if (value.includes('motorsport') || value.includes('racing') || value.includes('series')) {
            entityType = 'league'; // Normalize racing series to league
            break;
          } else if (value.includes('division') || value.includes('conference')) {
            entityType = 'division_conference';
            break;
          }
        }
        
        // 2. Set entity_type if it's not in mappings
        if (!hasEntityType) {
          transformedData['entity_type'] = entityType;
          console.log(`Set missing entity_type = ${entityType} based on broadcast data pattern`);
        }
        
        // 3. Set entity_id if it's not in mappings (from position 1, which is typically the entity name)
        if (!hasEntityId && sourceRecord[1]) {
          transformedData['entity_id'] = sourceRecord[1];
          console.log(`Set missing entity_id = ${sourceRecord[1]} from position 1`);
        }
      }
    }
    
    // Map each field directly using two simple strategies
    Object.entries(mappings).forEach(([dbField, sourceField]) => {
      // Skip if we already set this field with defaults above
      if (transformedData[dbField] !== undefined) {
        console.log(`Field ${dbField} already set - skipping standard mapping`);
        return;
      }
      
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
    
    // Special handling for brand data
    if (isBrandData) {
      console.log('This appears to be brand data - ensuring required fields are set');
      
      // Check if industry is mapped/present
      if (!transformedData.industry) {
        // Look for industry in position 8 or based on data patterns
        let detectedIndustry = 'Media'; // Default
        
        // Check specifically for "Broadcaster" in position 8
        if (sourceRecord[8] === 'Broadcaster') {
          detectedIndustry = 'Broadcasting';
          console.log(`Setting brand industry to "Broadcasting" based on broadcaster type in position 8`);
        }
        // Check for "Production Company" in position 8
        else if (sourceRecord[8] === 'Production Company') {
          detectedIndustry = 'Media';
          console.log(`Setting brand industry to "Media" based on production company type in position 8`);
        }
        // Try to detect sports-related from other data
        else if (sourceRecord.some(item => 
          typeof item === 'string' && 
          (item.includes('Sport') || item.includes('League') || item.includes('Racing') || item.includes('Motorsport'))
        )) {
          detectedIndustry = 'Sports';
          console.log(`Setting brand industry to "Sports" based on sports keywords in data`);
        }
        
        transformedData.industry = detectedIndustry;
      }
      
      // Also set company_type if not set
      if (!transformedData.company_type) {
        let companyType = 'Broadcaster'; // Default
        
        // Check position 8 for typical company type values
        if (sourceRecord[8] === 'Production Company') {
          companyType = 'Production Company';
        } else if (sourceRecord[8] === 'Broadcaster' || sourceRecord[8] === 'Network') {
          companyType = 'Broadcaster';
        }
        
        transformedData.company_type = companyType;
        console.log(`Setting company_type to "${companyType}" based on data analysis`);
      }
      
      // Set country if not set
      if (!transformedData.country) {
        // Try to find country in positions 5-6
        for (let i = 5; i <= 6 && i < sourceRecord.length; i++) {
          const value = sourceRecord[i];
          if (typeof value === 'string' && 
              (value === 'USA' || value === 'United States' || 
               value === 'UK' || value === 'United Kingdom' || 
               value === 'Canada' || value === 'Australia')) {
            transformedData.country = value;
            console.log(`Setting country to "${value}" from position ${i}`);
            break;
          }
        }
        
        // Default to USA if not found
        if (!transformedData.country) {
          transformedData.country = 'USA';
          console.log(`Setting default country to "USA"`);
        }
      }
    }
    
    // Special handling for broadcast data - make sure we have entity_type and entity_id
    if (isBroadcastData) {
      // Additional validations/defaults for broadcast data
      
      // If we have a broadcast_company_id but no entity_id, set entity_id to position 1
      if (transformedData.broadcast_company_id && !transformedData.entity_id && sourceRecord[1]) {
        transformedData.entity_id = sourceRecord[1];
        console.log(`Set entity_id = ${transformedData.entity_id} for broadcast from position 1`);
      }
      
      // If we have an entity_id but no entity_type, default to league for racing series
      if (transformedData.entity_id && !transformedData.entity_type) {
        const entityType = 'league'; // Default to league for racing series
        transformedData.entity_type = entityType;
        console.log(`Set default entity_type = ${entityType} for broadcast`);
      }
      
      // Set territory if missing
      if (!transformedData.territory) {
        // Try to find any territory in positions 5-6
        for (let i = 5; i <= 6 && i < sourceRecord.length; i++) {
          if (typeof sourceRecord[i] === 'string' && sourceRecord[i].trim() !== '') {
            transformedData.territory = sourceRecord[i];
            console.log(`Set territory = ${sourceRecord[i]} from position ${i}`);
            break;
          }
        }
        
        // If still not set, default to USA
        if (!transformedData.territory) {
          transformedData.territory = 'USA';
          console.log(`Set default territory = USA`);
        }
      }
      
      // Set start_date and end_date if missing but years are in the data
      if (!transformedData.start_date) {
        // Look for year (4 digits) in positions 6-7
        for (let i = 6; i <= 7 && i < sourceRecord.length; i++) {
          if (/^\d{4}$/.test(String(sourceRecord[i]))) {
            transformedData.start_date = sourceRecord[i];
            console.log(`Set start_date = ${transformedData.start_date} from position ${i}`);
            break;
          }
        }
      }
      
      if (!transformedData.end_date) {
        // Look for year (4 digits) in positions 7-8
        for (let i = 7; i <= 8 && i < sourceRecord.length; i++) {
          if (/^\d{4}$/.test(String(sourceRecord[i]))) {
            transformedData.end_date = sourceRecord[i];
            console.log(`Set end_date = ${transformedData.end_date} from position ${i}`);
            break;
          }
        }
      }
    }
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
 * This implementation handles entity resolution for IDs before saving,
 * while maintaining a clean approach without special case handling
 */
export const saveEntityToDatabase = async (
  entityType: EntityType,
  data: Record<string, any>,
  isUpdateMode: boolean
): Promise<boolean> => {
  console.log(`Saving ${entityType} to database:`, data);
  
  try {
    // Create a copy of the data for modifications
    const processedData = { ...data };
    
    // Format dates for all entity types
    ['start_date', 'end_date'].forEach(dateField => {
      if (processedData[dateField] && typeof processedData[dateField] === 'string') {
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(processedData[dateField])) {
          processedData[dateField] = dateField === 'start_date' ? 
            `${processedData[dateField]}-01-01` : // Start date: beginning of year
            `${processedData[dateField]}-12-31`;  // End date: end of year
          console.log(`Formatted ${dateField}: ${processedData[dateField]}`);
        }
      }
    });
    
    // CRITICAL: Resolve entity ID references
    
    // 1. For broadcast entities, handle entity_id resolution
    if (entityType === 'broadcast') {
      console.log('Processing broadcast entity for saving');
      
      // 1.1 Resolve entity_id if it's a string name and not a UUID
      if (processedData.entity_id && typeof processedData.entity_id === 'string' && !isValidUUID(processedData.entity_id)) {
        const entityName = processedData.entity_id;
        let lookupEntityType = (processedData.entity_type || 'league').toLowerCase();
        
        // 1.2 Normalize entity_type values like 'racing series' to 'league'
        if (lookupEntityType.includes('series') || 
            lookupEntityType.includes('racing') ||
            lookupEntityType.includes('motorsport')) {
          lookupEntityType = 'league';
          // Also update the actual entity_type field
          processedData.entity_type = 'league';
          console.log(`Normalized entity_type to "league" for lookup`);
        }
        
        // 1.3 Look up the entity by name to get its ID
        console.log(`Looking up ${lookupEntityType} with name "${entityName}"`);
        try {
          // Try a few different entity types for better chance of matching
          const typesToTry = [lookupEntityType, 'league', 'division_conference'];
          let foundEntity = false;
          
          for (const typeToTry of typesToTry) {
            if (foundEntity) break;
            
            try {
              console.log(`Trying to lookup ${entityName} as ${typeToTry}`);
              const entityLookup = await api.sports.lookup(typeToTry, entityName);
              
              if (entityLookup && entityLookup.id) {
                console.log(`Found ${typeToTry} "${entityName}" with ID: ${entityLookup.id}`);
                // Use the type we found it with
                processedData.entity_type = typeToTry;
                processedData.entity_id = entityLookup.id;
                foundEntity = true;
              }
            } catch (lookupErr) {
              console.log(`Lookup failed for ${typeToTry}: ${lookupErr.message}`);
            }
          }
          
          if (!foundEntity) {
            throw new Error(`Entity "${entityName}" not found under any type. Please create it first.`);
          }
        } catch (lookupError) {
          // Try one more time for racing series, specifically with "division_conference"
          if (entityName.includes('Racing') || entityName.includes('Series') || 
              entityName.includes('NASCAR') || entityName.includes('IndyCar') || 
              entityName.includes('Formula') || entityName.includes('Prix')) {
            console.log(`Trying special racing series lookup for ${entityName}`);
            
            // Try a few entity types commonly misused for racing series
            const racingEntityTypes = ['division_conference', 'league', 'championship', 'tournament'];
            let foundRacingEntity = false;
            
            for (const raceType of racingEntityTypes) {
              if (foundRacingEntity) break;
              
              try {
                console.log(`Trying racing series as ${raceType}: ${entityName}`);
                const raceEntityLookup = await api.sports.lookup(raceType, entityName);
                
                if (raceEntityLookup && raceEntityLookup.id) {
                  console.log(`Found ${entityName} as ${raceType} with ID: ${raceEntityLookup.id}`);
                  processedData.entity_type = raceType; 
                  processedData.entity_id = raceEntityLookup.id;
                  foundRacingEntity = true;
                  break;
                }
              } catch (raceError) {
                console.log(`Racing lookup as ${raceType} failed: ${raceError.message}`);
              }
            }
            
            if (!foundRacingEntity) {
              throw new Error(`Racing series "${entityName}" not found. Please create it as a league first.`);
            }
          } 
          // If entity type is invalid, try as league
          else if (lookupError.message && lookupError.message.includes('Invalid entity type')) {
            console.log(`Entity type "${lookupEntityType}" is invalid, trying as "league" instead`);
            try {
              const leagueLookup = await api.sports.lookup('league', entityName);
              if (leagueLookup && leagueLookup.id) {
                console.log(`Found "${entityName}" as a league with ID: ${leagueLookup.id}`);
                processedData.entity_type = 'league';
                processedData.entity_id = leagueLookup.id;
              } else {
                throw new Error(`Entity "${entityName}" not found as league`);
              }
            } catch (secondError) {
              throw new Error(`Entity "${entityName}" not found. Please create it first.`);
            }
          } else {
            throw lookupError;
          }
        }
      }
      
      // 1.4 Resolve broadcast_company_id if it's a string name and not a UUID
      if (processedData.broadcast_company_id && typeof processedData.broadcast_company_id === 'string' && 
          !isValidUUID(processedData.broadcast_company_id)) {
        
        const companyName = processedData.broadcast_company_id;
        console.log(`Looking up broadcast company "${companyName}"`);
        
        try {
          // Try broadcast_company lookup
          const companyLookup = await api.sports.lookup('broadcast_company', companyName);
          if (companyLookup && companyLookup.id) {
            console.log(`Found broadcast company "${companyName}" with ID: ${companyLookup.id}`);
            processedData.broadcast_company_id = companyLookup.id;
          } else {
            // If not found, try brand lookup
            console.log(`Broadcast company not found, checking for brand: ${companyName}`);
            const brandLookup = await api.sports.lookup('brand', companyName);
            if (brandLookup && brandLookup.id) {
              console.log(`Found brand "${companyName}" with ID: ${brandLookup.id}`);
              processedData.broadcast_company_id = brandLookup.id;
            } else {
              throw new Error(`Broadcast company "${companyName}" not found. Please create it first.`);
            }
          }
        } catch (lookupError) {
          throw lookupError;
        }
      }
      
      // 1.5 Save broadcast entity with resolved IDs
      console.log('Saving broadcast rights with resolved IDs:', processedData);
      const result = await sportsService.createBroadcastRightsWithErrorHandling(processedData);
      console.log('Successfully created broadcast rights:', result);
      return true;
    }
    
    // 2. For other entity types, handle common ID resolutions
    
    // 2.1 For teams, resolve stadium_id, league_id, etc.
    if (entityType === 'team') {
      // Resolve stadium_id if it's a name
      if (processedData.stadium_id && typeof processedData.stadium_id === 'string' && !isValidUUID(processedData.stadium_id)) {
        console.log(`Looking up stadium "${processedData.stadium_id}"`);
        try {
          const stadiumLookup = await api.sports.lookup('stadium', processedData.stadium_id);
          if (stadiumLookup && stadiumLookup.id) {
            console.log(`Found stadium "${processedData.stadium_id}" with ID: ${stadiumLookup.id}`);
            processedData.stadium_id = stadiumLookup.id;
          }
        } catch (error) {
          console.log(`Stadium lookup failed: ${error.message}`);
        }
      }
      
      // Resolve league_id if it's a name
      if (processedData.league_id && typeof processedData.league_id === 'string' && !isValidUUID(processedData.league_id)) {
        console.log(`Looking up league "${processedData.league_id}"`);
        try {
          const leagueLookup = await api.sports.lookup('league', processedData.league_id);
          if (leagueLookup && leagueLookup.id) {
            console.log(`Found league "${processedData.league_id}" with ID: ${leagueLookup.id}`);
            processedData.league_id = leagueLookup.id;
          }
        } catch (error) {
          console.log(`League lookup failed: ${error.message}`);
        }
      }
    }
    
    // 3. Handle update mode for entities with a name field
    if (isUpdateMode && processedData.name) {
      console.log(`Update mode: Attempting to update ${entityType} with name "${processedData.name}"`);
      
      try {
        const response = await sportsService.updateEntityByName(
          entityType,
          processedData.name,
          processedData
        );
        
        console.log(`Successfully updated ${entityType}:`, response);
        return true;
      } catch (updateError) {
        // If entity not found, fall through to create
        if (updateError.message && updateError.message.includes('not found')) {
          console.log(`${entityType} with name "${processedData.name}" not found, will create instead`);
        } else {
          // For other errors, throw
          throw updateError;
        }
      }
    }
    
    // 4. Default path: create entity using standard service
    console.log(`Creating new ${entityType}:`, processedData);
    const response = await sportsDatabaseService.createEntity(
      entityType as DbEntityType, 
      processedData,
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