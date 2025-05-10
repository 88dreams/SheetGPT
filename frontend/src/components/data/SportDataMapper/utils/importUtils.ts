import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames, isValidUUID } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { sportsService } from '../../../../services/sportsService';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../../services/SportsDatabaseService';

// --- Helper function for League Data --- 
function _processLeagueData(mappedFields: Record<string, any>, sourceRecord: any[]): void {
  console.log('Processing League data enhancements...');
  // Check if name is mapped/present (required field)
  if (mappedFields.name === undefined && sourceRecord[0]) {
    mappedFields.name = sourceRecord[0];
    console.log(`Setting missing league name = "${mappedFields.name}" from position 0`);
  }
  
  // Check if sport is mapped/present (required field)
  if (mappedFields.sport === undefined) {
    if (sourceRecord[2] && typeof sourceRecord[2] === 'string') {
      const sportValue = sourceRecord[2];
      const validSports = ['Basketball', 'Football', 'Soccer', 'Baseball', 'Hockey', 'Golf', 'Tennis', 'Motorsport'];
      if (validSports.includes(sportValue) || validSports.some(sport => sportValue.toLowerCase().includes(sport.toLowerCase()))) {
        mappedFields.sport = sportValue;
        console.log(`Setting sport to "${sportValue}" from position 2`);
      }
    }
    if (mappedFields.sport === undefined) {
      let detectedSport = 'Basketball';
      if (sourceRecord[0] && typeof sourceRecord[0] === 'string') {
        const leagueName = sourceRecord[0].toLowerCase();
        if (leagueName.includes('golf') || leagueName.includes('pga')) detectedSport = 'Golf';
        else if (leagueName.includes('soccer') || leagueName.includes('football') && !leagueName.includes('american')) detectedSport = 'Soccer';
        else if (leagueName.includes('football') || leagueName.includes('nfl')) detectedSport = 'Football';
        else if (leagueName.includes('basketball') || leagueName.includes('nba')) detectedSport = 'Basketball';
        else if (leagueName.includes('baseball') || leagueName.includes('mlb')) detectedSport = 'Baseball';
        else if (leagueName.includes('hockey') || leagueName.includes('nhl')) detectedSport = 'Hockey';
        else if (leagueName.includes('tennis')) detectedSport = 'Tennis';
        else if (leagueName.includes('racing') || leagueName.includes('nascar') || leagueName.includes('formula')) detectedSport = 'Motorsport';
      }
      mappedFields.sport = detectedSport;
      console.log(`Setting sport to "${detectedSport}" based on league name analysis`);
    }
  }
  
  if (mappedFields.country === undefined) {
    if (sourceRecord[3] && typeof sourceRecord[3] === 'string' && 
        (sourceRecord[3] === 'USA' || sourceRecord[3] === 'United States' || 
         sourceRecord[3] === 'UK' || sourceRecord[3] === 'United Kingdom' ||
         sourceRecord[3] === 'Canada' || sourceRecord[3] === 'Australia')) {
      mappedFields.country = sourceRecord[3];
      console.log(`Setting country to "${mappedFields.country}" from position 3`);
    } else {
      mappedFields.country = 'USA';
      console.log(`Setting default country to "USA"`);
    }
  }
  console.log('Enhanced league data:', mappedFields);
}

// --- Helper function for Division/Conference Data ---
function _processDivisionConferenceData(mappedFields: Record<string, any>, sourceRecord: any[]): void {
  console.log('Processing Division/Conference data enhancements...');
  if (mappedFields.name === undefined && sourceRecord[0]) {
    mappedFields.name = sourceRecord[0];
    console.log(`Setting missing division/conference name = "${mappedFields.name}" from position 0`);
  }
  if (mappedFields.type === undefined) {
    let detectedType = 'Division';
    if (mappedFields.name && typeof mappedFields.name === 'string') {
      const nameLower = mappedFields.name.toLowerCase();
      if (nameLower.includes('conference')) detectedType = 'Conference';
      else if (nameLower.includes('division')) detectedType = 'Division';
    }
    if (detectedType === 'Division') {
      for (let i = 0; i < sourceRecord.length; i++) {
        const value = sourceRecord[i];
        if (typeof value === 'string') {
          const valueLower = value.toLowerCase();
          if (valueLower.includes('conference')) { detectedType = 'Conference'; break; }
          else if (valueLower.includes('division')) { detectedType = 'Division'; break; }
        }
      }
    }
    mappedFields.type = detectedType;
    console.log(`Setting division/conference type to "${detectedType}" based on data analysis`);
  }
  console.log('Enhanced division/conference data:', mappedFields);
}

// --- Helper function for Brand Data (Array source) ---
function _processBrandDataArray(mappedFields: Record<string, any>, sourceRecord: any[]): void {
  console.log('Processing Brand data (array source) enhancements...');
  if (mappedFields.name === undefined && sourceRecord[0]) {
    mappedFields.name = sourceRecord[0];
    console.log(`Setting missing brand name = "${mappedFields.name}" from position 0`);
  }
  if (mappedFields.industry === undefined) {
    let detectedIndustry = 'Media';
    if (sourceRecord[8] === 'Broadcaster') {
      detectedIndustry = 'Broadcasting';
      console.log(`Setting brand industry to "Broadcasting" based on broadcaster type in position 8`);
    } else if (sourceRecord[8] === 'Production Company') {
      detectedIndustry = 'Media';
      console.log(`Setting brand industry to "Media" based on production company type in position 8`);
    } else if (sourceRecord.some(item => typeof item === 'string' && (item.includes('Sport') || item.includes('League') || item.includes('Racing') || item.includes('Motorsport')))) {
      detectedIndustry = 'Sports';
      console.log(`Setting brand industry to "Sports" based on sports keywords in data`);
    }
    mappedFields.industry = detectedIndustry;
  }
  if (mappedFields.company_type === undefined) {
    let companyType = 'Broadcaster';
    if (sourceRecord[8] === 'Production Company') companyType = 'Production Company';
    else if (sourceRecord[8] === 'Broadcaster' || sourceRecord[8] === 'Network') companyType = 'Broadcaster';
    mappedFields.company_type = companyType;
    console.log(`Setting company_type to "${companyType}" based on data analysis`);
  }
  if (mappedFields.country === undefined) {
    for (let i = 5; i <= 6 && i < sourceRecord.length; i++) {
      const value = sourceRecord[i];
      if (typeof value === 'string' && (value === 'USA' || value === 'United States' || value === 'UK' || value === 'United Kingdom' || value === 'Canada' || value === 'Australia')) {
        mappedFields.country = value;
        console.log(`Setting country to "${value}" from position ${i}`);
        break;
      }
    }
    if (mappedFields.country === undefined) {
      mappedFields.country = 'USA';
      console.log(`Setting default country to "USA"`);
    }
  }
  console.log('Enhanced brand data:', mappedFields);
}

// --- Helper function for Broadcast Data (Array source) ---
function _processBroadcastDataArray(mappedFields: Record<string, any>, sourceRecord: any[]): void {
  console.log('Processing Broadcast data (array source) enhancements...');
  if (mappedFields.broadcast_company_id !== undefined && mappedFields.entity_id === undefined && sourceRecord[1]) {
    mappedFields.entity_id = sourceRecord[1];
    console.log(`Set entity_id = ${mappedFields.entity_id} for broadcast from position 1`);
  }
  if (mappedFields.entity_id !== undefined && mappedFields.entity_type === undefined) {
    const entityType = 'league';
    mappedFields.entity_type = entityType;
    console.log(`Set default entity_type = ${entityType} for broadcast`);
  }
  if (mappedFields.territory === undefined) {
    for (let i = 5; i <= 6 && i < sourceRecord.length; i++) {
      if (typeof sourceRecord[i] === 'string' && sourceRecord[i].trim() !== '') {
        mappedFields.territory = sourceRecord[i];
        console.log(`Set territory = ${sourceRecord[i]} from position ${i}`);
        break;
      }
    }
    if (mappedFields.territory === undefined) {
      mappedFields.territory = 'USA';
      console.log(`Set default territory = USA`);
    }
  }
  if (mappedFields.start_date === undefined) {
    for (let i = 6; i <= 7 && i < sourceRecord.length; i++) {
      if (/^\d{4}$/.test(String(sourceRecord[i]))) {
        mappedFields.start_date = sourceRecord[i];
        console.log(`Set start_date = ${mappedFields.start_date} from position ${i}`);
        break;
      }
    }
  }
  if (mappedFields.end_date === undefined) {
    for (let i = 7; i <= 8 && i < sourceRecord.length; i++) {
      if (/^\d{4}$/.test(String(sourceRecord[i]))) {
        mappedFields.end_date = sourceRecord[i];
        console.log(`Set end_date = ${mappedFields.end_date} from position ${i}`);
        break;
      }
    }
  }
  console.log('Enhanced broadcast data:', mappedFields);
}

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
      
    const hasLeagueFields = Object.keys(mappings).some(field => 
      field === 'sport' || field === 'founded_year' || field === 'nickname');
      
    const hasSportMapping = Object.entries(mappings).some(([field, sourcePos]) => 
      field === 'sport' && sourcePos === '2');
    
    const isLeagueData = hasLeagueFields || hasSportMapping;
      
    const isDivisionConferenceData = Object.keys(mappings).some(field => 
      field === 'league_id' || field === 'type' || 
      (field === 'name' && Object.keys(mappings).some(f => f === 'league_id')));
      
    const isBrandData = Object.keys(mappings).some(field =>
      field === 'name') && !isBroadcastData && !isLeagueData && !isDivisionConferenceData;
      
    console.log('Entity type detection results:', {
      isBroadcastData,
      hasLeagueFields,
      hasSportMapping,
      isLeagueData,
      isDivisionConferenceData,
      isBrandData
    });
    
    // Initial broadcast data processing (pre-mapping)
    if (isBroadcastData) {
      console.log('This appears to be broadcast data - ensuring critical fields are set (pre-mapping)');
      const hasEntityType = Object.keys(mappings).includes('entity_type');
      const hasEntityId = Object.keys(mappings).includes('entity_id');
      if (!hasEntityType || !hasEntityId) {
        console.log('Critical fields missing from mappings - adding defaults based on data pattern (pre-mapping)');
        let entityType = 'league';
        for (let i = 3; i <= 5 && i < sourceRecord.length; i++) {
          const value = String(sourceRecord[i]).toLowerCase();
          if (value.includes('league')) { entityType = 'league'; break; }
          else if (value.includes('team')) { entityType = 'team'; break; }
          else if (value.includes('motorsport') || value.includes('racing') || value.includes('series')) { entityType = 'league'; break; }
          else if (value.includes('division') || value.includes('conference')) { entityType = 'division_conference'; break; }
        }
        if (!hasEntityType) {
          transformedData['entity_type'] = entityType;
          console.log(`Set missing entity_type = ${entityType} based on broadcast data pattern (pre-mapping)`);
        }
        if (!hasEntityId && sourceRecord[1]) {
          transformedData['entity_id'] = sourceRecord[1];
          console.log(`Set missing entity_id = ${sourceRecord[1]} from position 1 (pre-mapping)`);
        }
      }
    }
    
    const mappedFields: Record<string, any> = {};
    
    Object.entries(mappings).forEach(([dbField, sourceField]) => {
      if (transformedData[dbField] !== undefined) {
        mappedFields[dbField] = transformedData[dbField];
        return;
      }
      if (!isNaN(Number(sourceField))) {
        const index = Number(sourceField);
        if (index >= 0 && index < sourceRecord.length) {
          mappedFields[dbField] = sourceRecord[index];
        } 
      } else {
        for (let i = 0; i < sourceRecord.length - 1; i++) {
          if (sourceRecord[i] === sourceField) {
            mappedFields[dbField] = sourceRecord[i + 1];
            break;
          }
        }
        if (mappedFields[dbField] === undefined) {
          if (sourceField === 'Name of company' || sourceField === 'Company Name') mappedFields[dbField] = sourceRecord[0];
          else if ((sourceField === 'Broadcast Client' || sourceField === 'League Name') && sourceRecord[1]) mappedFields[dbField] = sourceRecord[1];
          else if (sourceField === 'Sport' && sourceRecord.find(x => typeof x === 'string' && (x === 'Motorsport' || x === 'Racing' || x.includes('Sport')))) mappedFields[dbField] = sourceRecord.find(x => typeof x === 'string' && (x === 'Motorsport' || x === 'Racing' || x.includes('Sport')));
          else if (sourceField === 'Broadcast Territory' && sourceRecord.find(x => x === 'USA')) mappedFields[dbField] = 'USA';
        }
      }
    });
    
    console.log('Mapped fields before entity processing:', mappedFields);
    
    if (isLeagueData) {
      _processLeagueData(mappedFields, sourceRecord);
    } else if (isDivisionConferenceData) {
      _processDivisionConferenceData(mappedFields, sourceRecord);
    } else if (isBrandData && isArrayData) { // Ensure isArrayData check remains if _processBrandDataArray expects array
      _processBrandDataArray(mappedFields, sourceRecord);
    }
    
    // Second pass for broadcast data specific enhancements, using already populated mappedFields
    if (isBroadcastData && isArrayData) {
      _processBroadcastDataArray(mappedFields, sourceRecord);
    }
    
    Object.assign(transformedData, mappedFields);
    console.log('Final array data after merging mapped fields:', transformedData);
  } 
  else if (!isArrayData && typeof sourceRecord === 'object' && sourceRecord !== null) {
    console.log('Processing object data');
    const mappedFields: Record<string, any> = {}; // Ensure mappedFields is typed here too
    Object.entries(mappings).forEach(([dbField, sourceField]) => {
      if (sourceField in sourceRecord) {
        mappedFields[dbField] = sourceRecord[sourceField];
        console.log(`Mapped ${dbField} = ${mappedFields[dbField]} (from object property)`);
      } else {
        console.log(`Source field "${sourceField}" not found in object`);
      }
    });
    
    console.log('Object data mapped fields:', mappedFields);
    Object.assign(transformedData, mappedFields);
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
  
  // Simple final transformed data logging
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
    const processedData = { ...data };
    
    ['start_date', 'end_date'].forEach(dateField => {
      if (processedData[dateField] && typeof processedData[dateField] === 'string') {
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(processedData[dateField])) {
          processedData[dateField] = dateField === 'start_date' ? 
            `${processedData[dateField]}-01-01` : 
            `${processedData[dateField]}-12-31`;
          console.log(`Formatted ${dateField}: ${processedData[dateField]}`);
        }
      }
    });
    
    if (entityType === 'broadcast') {
      await _resolveBroadcastEntityReferences(processedData);
      // After resolution, proceed to save broadcast entity
      console.log('Saving broadcast rights with resolved IDs:', processedData);
      const result = await sportsService.createBroadcastRightsWithErrorHandling(processedData);
      console.log('Successfully created broadcast rights:', result);
      return true;
    }
    
    if (entityType === 'team') {
      await _resolveTeamEntityReferences(processedData);
      // Proceed with team saving logic (update or create)
    }
    
    // Handle update mode for entities with a name field (common for non-broadcast types)
    if (isUpdateMode && processedData.name) {
      console.log(`Update mode: Attempting to update ${entityType} with name "${processedData.name}"`);
      try {
        const response = await sportsService.updateEntityByName(
          entityType as DbEntityType, // Cast here as DbEntityType is more specific
          processedData.name,
          processedData
        );
        console.log(`Successfully updated ${entityType}:`, response);
        return true;
      } catch (updateError: any) {
        if (updateError.message && updateError.message.includes('not found')) {
          console.log(`${entityType} with name "${processedData.name}" not found, will create instead`);
        } else {
          throw updateError;
        }
      }
    }
    
    console.log(`Creating new ${entityType}:`, processedData);
    const response = await sportsDatabaseService.createEntity(
      entityType as DbEntityType, 
      processedData,
      isUpdateMode // Pass isUpdateMode, createEntity might handle create-or-update
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

// --- Helper functions for saveEntityToDatabase ---
async function _resolveBroadcastEntityReferences(processedData: Record<string, any>): Promise<void> {
  console.log('Processing broadcast entity for reference resolution');
  // 1.1 Resolve entity_id if it's a string name and not a UUID
  if (processedData.entity_id && typeof processedData.entity_id === 'string' && !isValidUUID(processedData.entity_id)) {
    const entityName = processedData.entity_id;
    let lookupEntityType = (processedData.entity_type || 'league').toLowerCase();
    
    if (lookupEntityType.includes('series') || lookupEntityType.includes('racing') || lookupEntityType.includes('motorsport')) {
      lookupEntityType = 'league';
      processedData.entity_type = 'league';
      console.log(`Normalized entity_type to "league" for lookup`);
    }
    
    console.log(`Looking up ${lookupEntityType} with name "${entityName}"`);
    try {
      const typesToTry = [lookupEntityType, 'league', 'division_conference'];
      let foundEntity = false;
      for (const typeToTry of typesToTry) {
        if (foundEntity) break;
        try {
          const entityLookup = await api.sports.lookup(typeToTry as DbEntityType, entityName);
          if (entityLookup && entityLookup.id) {
            processedData.entity_type = typeToTry;
            processedData.entity_id = entityLookup.id;
            foundEntity = true;
          }
        } catch (lookupErr: any) { console.log(`Lookup failed for ${typeToTry}: ${lookupErr.message}`); }
      }
      if (!foundEntity) throw new Error(`Entity "${entityName}" not found under any type. Please create it first.`);
    } catch (lookupError: any) {
      if (entityName.includes('Racing') || entityName.includes('Series') || entityName.includes('NASCAR') || entityName.includes('IndyCar') || entityName.includes('Formula') || entityName.includes('Prix')) {
        const racingEntityTypes = ['division_conference', 'league', 'championship', 'tournament'];
        let foundRacingEntity = false;
        for (const raceType of racingEntityTypes) {
          if (foundRacingEntity) break;
          try {
            const raceEntityLookup = await api.sports.lookup(raceType as DbEntityType, entityName);
            if (raceEntityLookup && raceEntityLookup.id) {
              processedData.entity_type = raceType;
              processedData.entity_id = raceEntityLookup.id;
              foundRacingEntity = true;
              break;
            }
          } catch (raceError: any) { console.log(`Racing lookup as ${raceType} failed: ${raceError.message}`); }
        }
        if (!foundRacingEntity) throw new Error(`Racing series "${entityName}" not found. Please create it as a league first.`);
      } else if (lookupError.message && lookupError.message.includes('Invalid entity type')) {
        try {
          const leagueLookup = await api.sports.lookup('league', entityName);
          if (leagueLookup && leagueLookup.id) {
            processedData.entity_type = 'league';
            processedData.entity_id = leagueLookup.id;
          } else { throw new Error(`Entity "${entityName}" not found as league`); }
        } catch (secondError) { throw new Error(`Entity "${entityName}" not found. Please create it first.`); }
      } else { throw lookupError; }
    }
  }
  // 1.4 Resolve broadcast_company_id if it's a string name and not a UUID
  if (processedData.broadcast_company_id && typeof processedData.broadcast_company_id === 'string' && !isValidUUID(processedData.broadcast_company_id)) {
    const companyName = processedData.broadcast_company_id;
    console.log(`Looking up broadcast company "${companyName}"`);
    try {
      const companyLookup = await api.sports.lookup('broadcast_company', companyName);
      if (companyLookup && companyLookup.id) {
        processedData.broadcast_company_id = companyLookup.id;
      } else {
        const brandLookup = await api.sports.lookup('brand', companyName);
        if (brandLookup && brandLookup.id) {
          processedData.broadcast_company_id = brandLookup.id;
        } else { throw new Error(`Broadcast company or Brand "${companyName}" not found. Please create it first.`); }
      }
    } catch (lookupError) { throw lookupError; }
  }
}

async function _resolveTeamEntityReferences(processedData: Record<string, any>): Promise<void> {
  console.log('Processing team entity for reference resolution');
  if (processedData.stadium_id && typeof processedData.stadium_id === 'string' && !isValidUUID(processedData.stadium_id)) {
    console.log(`Looking up stadium "${processedData.stadium_id}"`);
    try {
      const stadiumLookup = await api.sports.lookup('stadium', processedData.stadium_id);
      if (stadiumLookup && stadiumLookup.id) {
        processedData.stadium_id = stadiumLookup.id;
      }
    } catch (error: any) { console.log(`Stadium lookup failed: ${error.message}`); /* Allow to proceed if not found */ }
  }
  if (processedData.league_id && typeof processedData.league_id === 'string' && !isValidUUID(processedData.league_id)) {
    console.log(`Looking up league "${processedData.league_id}"`);
    try {
      const leagueLookup = await api.sports.lookup('league', processedData.league_id);
      if (leagueLookup && leagueLookup.id) {
        processedData.league_id = leagueLookup.id;
      }
    } catch (error: any) { console.log(`League lookup failed: ${error.message}`); /* Allow to proceed if not found */ }
  }
}