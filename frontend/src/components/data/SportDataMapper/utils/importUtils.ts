import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames, isValidUUID } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { sportsService } from '../../../../services/sportsService';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../../services/SportsDatabaseService';

// NEW HELPER FUNCTION
const extractInitialMappedFields = (
  mappings: Record<string, string>,
  sourceRecord: Record<string, any> | any[],
  headerRow?: string[] // Optional: the actual header row for array data
  // entityTypeHint?: EntityType // Optional: might be used for smarter extraction if needed later
): Record<string, any> => {
  const initialMappedFields: Record<string, any> = {};
  const isArrayData = Array.isArray(sourceRecord);

  console.log('extractInitialMappedFields: PROCESSING RECORD:', JSON.stringify(sourceRecord));
  console.log('extractInitialMappedFields: USING headerRow:', JSON.stringify(headerRow));
  console.log('extractInitialMappedFields: USING mappings:', JSON.stringify(mappings));

  console.log('Extracting initial mapped fields:', {
    numMappings: Object.keys(mappings).length,
    isArrayData,
    hasHeaderRow: !!headerRow,
  });

  if (isArrayData && Array.isArray(sourceRecord)) {
    Object.entries(mappings).forEach(([dbField, sourceFieldIdentifier]) => {
      let valueFound = false;
      let extractedValue: any = 'NOT FOUND'; // For logging
      // Priority 1: If headerRow is provided and sourceFieldIdentifier is a string, use headerRow to find index
      if (headerRow && typeof sourceFieldIdentifier === 'string' && isNaN(Number(sourceFieldIdentifier))) {
        const index = headerRow.indexOf(sourceFieldIdentifier);
        if (index !== -1 && index < sourceRecord.length) {
          initialMappedFields[dbField] = sourceRecord[index];
          extractedValue = initialMappedFields[dbField]; // For logging
          // console.log(`Mapped ${dbField} = ${initialMappedFields[dbField]} from array index ${index} (via header: "${sourceFieldIdentifier}")`);
          valueFound = true;
        } else if (index === -1) {
          console.warn(`Header "${sourceFieldIdentifier}" for ${dbField} not found in provided headerRow.`);
        } else {
          console.warn(`Index ${index} (from header "${sourceFieldIdentifier}") for ${dbField} out of bounds for sourceRecord of length ${sourceRecord.length}`);
        }
      }

      // Priority 2: If sourceFieldIdentifier is a numeric string (explicit index)
      if (!valueFound && !isNaN(Number(sourceFieldIdentifier))) {
        const index = Number(sourceFieldIdentifier);
        if (index >= 0 && index < sourceRecord.length) {
          initialMappedFields[dbField] = sourceRecord[index];
          extractedValue = initialMappedFields[dbField]; // For logging
          // console.log(`Mapped ${dbField} = ${initialMappedFields[dbField]} from explicit array index ${index}`);
          valueFound = true;
        } else {
          console.warn(`Explicit index ${index} for ${dbField} out of bounds for sourceRecord of length ${sourceRecord.length}`);
        }
      }

      // Fallback to original key-value pair search in array (if no headerRow or header-based lookup failed)
      // This handles cases like ["Header1", "Value1", "Header2", "Value2"]
      if (!valueFound && typeof sourceFieldIdentifier === 'string') { // Ensure it's a string for this fallback
        for (let i = 0; i < sourceRecord.length - 1; i += 2) { // Iterate by 2 for key-value pairs
          if (String(sourceRecord[i]).trim().toLowerCase() === sourceFieldIdentifier.trim().toLowerCase()) {
            initialMappedFields[dbField] = sourceRecord[i + 1];
            extractedValue = initialMappedFields[dbField]; // For logging
            // console.log(`Mapped ${dbField} = ${initialMappedFields[dbField]} from array key-value pair (key: ${sourceFieldIdentifier})`);
            valueFound = true;
            break;
          }
        }
      }
      
      // Fallback to original hardcoded fallbacks (if still not found)
      if (!valueFound && typeof sourceFieldIdentifier === 'string') {
         // This is a simplified version of the original complex fallbacks.
         // Consider if these specific fallbacks are still desired or if robust mapping is preferred.
        if ((sourceFieldIdentifier === 'Name of company' || sourceFieldIdentifier === 'Company Name') && sourceRecord[0] !== undefined) {
            initialMappedFields[dbField] = sourceRecord[0];
            extractedValue = initialMappedFields[dbField]; // For logging
            // console.log(`Fallback mapped ${dbField} = ${initialMappedFields[dbField]} from sourceRecord[0] for key ${sourceFieldIdentifier}`);
            valueFound = true;
        } else if ((sourceFieldIdentifier === 'Broadcast Client' || sourceFieldIdentifier === 'League Name') && sourceRecord[1] !== undefined) {
            initialMappedFields[dbField] = sourceRecord[1];
            extractedValue = initialMappedFields[dbField]; // For logging
            // console.log(`Fallback mapped ${dbField} = ${initialMappedFields[dbField]} from sourceRecord[1] for key ${sourceFieldIdentifier}`);
            valueFound = true;
        }
        // Add other specific fallbacks if necessary, or remove if direct mapping is enforced.
      }

      console.log(`extractInitialMappedFields: Attempting to map dbField: '${dbField}' from sourceIdentifier: '${sourceFieldIdentifier}', value: ${valueFound ? JSON.stringify(extractedValue) : 'NOT FOUND'}`);

      if (!valueFound) {
        console.warn(`Could not map ${dbField} from array source using identifier: ${sourceFieldIdentifier}`);
      }
    });
  } else if (!isArrayData && typeof sourceRecord === 'object' && sourceRecord !== null) {
    // Logic from transformMappedData for object sources
    Object.entries(mappings).forEach(([dbField, sourceFieldKey]) => {
      if (sourceFieldKey in sourceRecord) {
        initialMappedFields[dbField] = sourceRecord[sourceFieldKey];
        console.log(`extractInitialMappedFields: Mapped dbField: '${dbField}' from object property '${sourceFieldKey}', value: ${JSON.stringify(initialMappedFields[dbField])}`);
        // console.log(`Mapped ${dbField} = ${initialMappedFields[dbField]} from object property ${sourceFieldKey}`);
      } else {
        console.warn(`extractInitialMappedFields: Source field key "${sourceFieldKey}" for dbField '${dbField}' not found in object sourceRecord`);
      }
    });
  }
  console.log('Initial Mapped Fields Result:', initialMappedFields);
  return initialMappedFields;
};

// NEW HELPER: Detect Entity Type
const detectEntityType = (
  mappedFields: Record<string, any>,
  mappings: Record<string, string>,
  sourceRecordIsArray: boolean
): EntityType | null => {
  if (sourceRecordIsArray) {
    const hasField = (fieldName: string) => Object.keys(mappedFields).includes(fieldName) || Object.keys(mappings).includes(fieldName);
    const isBroadcastData = hasField('broadcast_company_id') || hasField('territory');
    if (isBroadcastData) return 'broadcast';
    const isLeagueData = hasField('sport') || hasField('founded_year') || hasField('nickname') ||
                         Object.entries(mappings).some(([field, sourcePos]) => field === 'sport' && sourcePos === '2');
    if (isLeagueData) return 'league';
    const isDivisionConferenceData = hasField('league_id') || 
                                   (hasField('name') && hasField('type') && (mappedFields.type === 'Division' || mappedFields.type === 'Conference')) ||
                                   (hasField('name') && Object.keys(mappings).some(f => f === 'league_id'));
    if (isDivisionConferenceData) return 'division_conference';
    const isPotentialBrand = hasField('name') && !isBroadcastData && !isLeagueData && !isDivisionConferenceData;
    if (isPotentialBrand) return 'brand';
  } else {
    if (mappedFields.entity_type && typeof mappedFields.entity_type === 'string') {
        return mappedFields.entity_type.toLowerCase() as EntityType;
    }
    if (mappedFields.name) return 'brand'; // Fallback for object type
  }
  console.warn('Could not reliably detect entity type.');
  return null;
};

// REFACTORED from _processLeagueData
function _enhanceLeagueData(
  currentMappedFields: Record<string, any>
): Record<string, any> {
  const enhancedFields = { ...currentMappedFields };
  console.log('Enhancing League data based on already mapped fields...');
  if (enhancedFields.name === undefined) {
    console.warn('League name is missing after initial mapping. Enhancement cannot add it.');
  }
  if (enhancedFields.sport === undefined) {
    let detectedSport = 'Basketball'; 
    if (enhancedFields.name && typeof enhancedFields.name === 'string') {
      const leagueName = enhancedFields.name.toLowerCase();
      if (leagueName.includes('golf') || leagueName.includes('pga')) detectedSport = 'Golf';
      else if (leagueName.includes('soccer') || leagueName.includes('football') && !leagueName.includes('american')) detectedSport = 'Soccer';
      else if (leagueName.includes('football') || leagueName.includes('nfl')) detectedSport = 'Football';
      else if (leagueName.includes('basketball') || leagueName.includes('nba')) detectedSport = 'Basketball';
      else if (leagueName.includes('baseball') || leagueName.includes('mlb')) detectedSport = 'Baseball';
      else if (leagueName.includes('hockey') || leagueName.includes('nhl')) detectedSport = 'Hockey';
      else if (leagueName.includes('tennis')) detectedSport = 'Tennis';
      else if (leagueName.includes('racing') || leagueName.includes('nascar') || leagueName.includes('formula')) detectedSport = 'Motorsport';
    }
    enhancedFields.sport = detectedSport;
    console.log(`Enhancement: Set sport to "${detectedSport}" based on league name analysis or default.`);
  }
  if (enhancedFields.country === undefined) {
    enhancedFields.country = 'USA';
    console.log('Enhancement: Set default country to "USA" as it was not mapped.');
  }
  console.log('Enhanced league data after internal logic:', enhancedFields);
  return enhancedFields;
}

// REFACTORED from _processDivisionConferenceData
function _enhanceDivisionConferenceData(
  currentMappedFields: Record<string, any>
): Record<string, any> {
  const enhancedFields = { ...currentMappedFields };
  console.log('Enhancing Division/Conference data based on already mapped fields...');

  // Name: Assumed to be already mapped by extractInitialMappedFields.
  if (enhancedFields.name === undefined) {
    console.warn('Division/Conference name is missing after initial mapping. Enhancement cannot add it.');
  }

  // Type: Infer from name if type is missing and name is present.
  if (enhancedFields.type === undefined) {
    let detectedType = 'Division'; // Default
    if (enhancedFields.name && typeof enhancedFields.name === 'string') {
      const nameLower = enhancedFields.name.toLowerCase();
      if (nameLower.includes('conference')) {
        detectedType = 'Conference';
      } else if (nameLower.includes('division')) {
        // Default is already Division, so no change needed unless other keywords imply something else
      } 
      // Add more heuristics based on name if necessary
    }
    enhancedFields.type = detectedType;
    console.log(`Enhancement: Set Division/Conference type to "${detectedType}" based on name analysis or default.`);
  }
  // League ID: Assumed to be mapped by extractInitialMappedFields if it's a primary mapping.
  // Enhancement logic doesn't typically add complex relational IDs without further info.
  if (enhancedFields.league_id === undefined) {
      console.log('Enhancement: league_id for Division/Conference is not present. It must be mapped or resolved later.');
  }

  console.log('Enhanced Division/Conference data after internal logic:', enhancedFields);
  return enhancedFields;
}

// REFACTORED from _processBrandDataArray
function _enhanceBrandData(
  currentMappedFields: Record<string, any>
): Record<string, any> {
  const enhancedFields = { ...currentMappedFields };
  console.log('Enhancing Brand data based on already mapped fields...');

  // Name: Assumed to be already mapped by extractInitialMappedFields.
  if (enhancedFields.name === undefined) {
    console.warn('Brand name is missing after initial mapping. Enhancement cannot add it.');
  }

  // Industry: Infer from company_type if possible, otherwise default.
  // The original logic relying on sourceRecord[8] or scanning sourceRecord for keywords is not applicable here.
  if (enhancedFields.industry === undefined) {
    let detectedIndustry = 'Media'; // Default industry
    if (enhancedFields.company_type === 'Broadcaster') {
      detectedIndustry = 'Broadcasting';
      console.log('Enhancement: Set brand industry to "Broadcasting" based on company_type.');
    } else if (enhancedFields.company_type === 'Production Company') {
      detectedIndustry = 'Media'; // Or perhaps 'Entertainment', adjust as needed
      console.log('Enhancement: Set brand industry to "Media" based on company_type.');
    } else if (enhancedFields.name && typeof enhancedFields.name === 'string') {
      // Very basic heuristic based on name, if company_type didn't help
      const nameLower = enhancedFields.name.toLowerCase();
      if (nameLower.includes('sport') || nameLower.includes('league')) {
        detectedIndustry = 'Sports';
        console.log('Enhancement: Set brand industry to "Sports" based on name keywords.');
      }
    }
    enhancedFields.industry = detectedIndustry;
    if (detectedIndustry === 'Media') {
        console.log('Enhancement: Set brand industry to default "Media" as company_type was not informative for industry.');
    }
  }

  // Company Type: Assumed to be mapped by extractInitialMappedFields if critical.
  // Original logic relied on sourceRecord[8]. Without it, we can only default or leave as is.
  if (enhancedFields.company_type === undefined) {
    // enhancedFields.company_type = 'Unknown'; // Or some other default
    console.warn('Enhancement: Brand company_type is missing. It should be mapped or it will be a default/empty.');
    // Defaulting for now if really needed, but ideally this is mapped.
    // enhancedFields.company_type = 'Other'; 
  }

  // Country: Default if missing. Original logic used sourceRecord[5] or sourceRecord[6].
  if (enhancedFields.country === undefined) {
    enhancedFields.country = 'USA'; // Default
    console.log('Enhancement: Set default brand country to "USA" as it was not mapped.');
  }
  
  console.log('Enhanced brand data after internal logic:', enhancedFields);
  return enhancedFields;
}

// REFACTORED from _processBroadcastDataArray
function _enhanceBroadcastData(
  currentMappedFields: Record<string, any>
): Record<string, any> {
  const enhancedFields = { ...currentMappedFields };
  console.log('Enhancing Broadcast data based on already mapped fields...');

  // Entity Type: Default if entity_id is present but entity_type is missing.
  if (enhancedFields.entity_id !== undefined && enhancedFields.entity_type === undefined) {
    enhancedFields.entity_type = 'league'; // Default entity type for broadcasts
    console.log('Enhancement: Set default broadcast entity_type to "league".');
  }

  // Territory: Default if missing. Original logic used sourceRecord[5] or sourceRecord[6].
  if (enhancedFields.territory === undefined) {
    enhancedFields.territory = 'USA'; // Default territory
    console.log('Enhancement: Set default broadcast territory to "USA" as it was not mapped.');
  }

  // Start Date & End Date: Assumed to be mapped by extractInitialMappedFields if available.
  // The original array index-based inference for dates is removed.
  // Date formatting (YYYY -> YYYY-MM-DD) is handled in the main transformMappedData orchestrator.
  if (enhancedFields.start_date === undefined) {
    console.log('Enhancement: Broadcast start_date is not present. It should be mapped or will be handled by later validation/defaults if necessary.');
  }
  if (enhancedFields.end_date === undefined) {
    console.log('Enhancement: Broadcast end_date is not present. It should be mapped or will be handled by later validation/defaults if necessary.');
  }
  
  console.log('Enhanced broadcast data after internal logic:', enhancedFields);
  return enhancedFields;
}

// Updated Dispatcher for data enhancement
const enhanceDataForEntityType = (
  entityType: EntityType | null,
  currentMappedFields: Record<string, any>,
  // sourceRecordIfArray?: any[] // No longer needed by any _enhance function so far
): Record<string, any> => {
  if (!entityType) {
    console.warn("No entity type provided for enhancement, returning data as is.");
    return currentMappedFields;
  }

  let finalEnhancedData = { ...currentMappedFields };

  switch (entityType) {
    case 'league':
      finalEnhancedData = _enhanceLeagueData(finalEnhancedData);
      break;
    case 'division_conference':
      finalEnhancedData = _enhanceDivisionConferenceData(finalEnhancedData);
      break;
    case 'brand':
      finalEnhancedData = _enhanceBrandData(finalEnhancedData);
      break;
    case 'broadcast':
      finalEnhancedData = _enhanceBroadcastData(finalEnhancedData); // Use new refactored version
      break;
    default:
      console.log(`No specific enhancement logic for entity type: ${entityType}`);
  }
  return finalEnhancedData;
};

export const transformMappedData = (
  mappings: Record<string, string>,
  sourceRecord: Record<string, any> | any[],
  headerRow?: string[], // Optional: the actual header row for array data
  explicitEntityType?: EntityType // New optional parameter
): Record<string, any> => {
  
  console.log('Transforming mapped data (Orchestrator V3):', {
    mappingsCount: Object.keys(mappings).length,
    isArrayData: Array.isArray(sourceRecord),
    sourceRecordSample: JSON.stringify(sourceRecord).substring(0, 100) + '...',
    hasHeaderRow: !!headerRow,
    explicitEntityTypeProvided: !!explicitEntityType
  });

  const initialMappedData = extractInitialMappedFields(mappings, sourceRecord, headerRow);
  const sourceRecordIsArray = Array.isArray(sourceRecord);

  // Use explicitEntityType if provided, otherwise fall back to detection
  const entityType = explicitEntityType || detectEntityType(initialMappedData, mappings, sourceRecordIsArray);
  console.log('Effective entity type for transformation:', entityType, explicitEntityType ? '(explicit)' : '(detected)');

  let dataForEnhancement = { ...initialMappedData };
  // This specific pre-fill for broadcast might need re-evaluation.
  // If entity_type and entity_id for broadcast are critical and often not directly mapped,
  // this heuristic might still be valuable, or extractInitialMappedFields should be smarter for broadcasts.
  if (entityType === 'broadcast' && sourceRecordIsArray && Array.isArray(sourceRecord)){
      const hasEntityTypeMapping = Object.keys(mappings).some(f => f === 'entity_type');
      const hasEntityIdMapping = Object.keys(mappings).some(f => f === 'entity_id');
      if (!hasEntityTypeMapping && !dataForEnhancement.entity_type) {
          let detectedEntityTypeForBroadcast = 'league'; 
          for (let i = 3; i <= 5 && i < sourceRecord.length; i++) {
              const value = String(sourceRecord[i]).toLowerCase();
              if (value.includes('league')) { detectedEntityTypeForBroadcast = 'league'; break; }
              else if (value.includes('team')) { detectedEntityTypeForBroadcast = 'team'; break; }
          }
          dataForEnhancement['entity_type'] = detectedEntityTypeForBroadcast;
          console.log(`Orchestrator TEMP pre-fill: Set broadcast entity_type = ${dataForEnhancement['entity_type']}`);
      }
      if (!hasEntityIdMapping && !dataForEnhancement.entity_id && sourceRecord[1]) {
          dataForEnhancement['entity_id'] = sourceRecord[1];
          console.log(`Orchestrator TEMP pre-fill: Set broadcast entity_id = ${dataForEnhancement['entity_id']}`);
      }
  }

  // Now call enhanceDataForEntityType without sourceRecordIfArray
  const trulyEnhancedData = enhanceDataForEntityType(
    entityType, 
    dataForEnhancement 
  );
  
  let finalOutputData = { ...trulyEnhancedData };
  ['start_date', 'end_date'].forEach(dateField => {
    if (finalOutputData[dateField] && typeof finalOutputData[dateField] === 'string') {
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(finalOutputData[dateField])) {
        finalOutputData[dateField] = dateField === 'start_date' ? 
          `${finalOutputData[dateField]}-01-01` : 
          `${finalOutputData[dateField]}-12-31`;
        // Corrected console log string interpolation
        console.log(`Orchestrator formatted date: ${dateField} = ${finalOutputData[dateField]}`);
      }
    }
  });
  
  console.log('Final transformed data from orchestrator V3:', finalOutputData);
  return finalOutputData;
};

/**
 * Process additional data before saving to handle special fields
 */
export const processDivisionConferenceReference = async (
  entityType: EntityType,
  data: Record<string, any>
): Promise<Record<string, any>> => {
  // This function is being deprecated in favor of the more robust
  // reference resolution inside _resolveTeamEntityReferences.
  // It is now a no-op to prevent incorrect lookups.
  return data;
};

// NEW Dispatcher for reference resolution
async function resolveReferencesForEntity(
  entityType: EntityType,
  processedData: Record<string, any>
): Promise<void> { // Returns void as it mutates processedData directly
  console.log(`Resolving references for ${entityType}...`);
  switch (entityType) {
    case 'broadcast':
      await _resolveBroadcastEntityReferences(processedData);
      break;
    case 'team':
      await _resolveTeamEntityReferences(processedData);
      break;
    case 'player': // New case for player
      await _resolvePlayerEntityReferences(processedData);
      break;
    // Add cases for other entity types if they need specific reference resolution
    default:
      console.log(`No specific reference resolution logic for entity type: ${entityType}`);
      // For other types, we assume IDs are either UUIDs or don't need special resolution here.
      break;
  }
}

// NEW HELPER for saving broadcast records
async function _saveBroadcastRecord(data: Record<string, any>): Promise<boolean> {
  console.log('_saveBroadcastRecord: Saving broadcast rights with resolved IDs:', data);
  // Assuming createBroadcastRightsWithErrorHandling throws on actual failure or returns a clear success/failure indicator.
  // For now, let's assume it returns something truthy on success.
  const result = await sportsService.createBroadcastRightsWithErrorHandling(data);
  console.log('_saveBroadcastRecord: Successfully created broadcast rights:', result);
  return !!result; // Or true, if the service guarantees throwing on error.
}

// NEW HELPER for creating or updating standard entities
async function _createOrUpdateStandardEntity(
  entityType: DbEntityType, // Use the more specific DbEntityType here
  data: Record<string, any>,
  isUpdateMode: boolean
): Promise<boolean> {
  if (isUpdateMode && data.name) {
    console.log(`_createOrUpdateStandardEntity: Update mode for ${entityType} with name "${data.name}"`);
    try {
      const response = await sportsService.updateEntityByName(
        entityType,
        data.name,
        data
      );
      console.log(`_createOrUpdateStandardEntity: Successfully updated ${entityType}:`, response);
      return true;
    } catch (updateError: any) {
      if (updateError.message && updateError.message.includes('not found')) {
        console.log(`_createOrUpdateStandardEntity: ${entityType} with name "${data.name}" not found for update, will attempt create.`);
        // Fall through to create logic
      } else {
        console.error(`_createOrUpdateStandardEntity: Error updating ${entityType} "${data.name}":`, updateError);
        throw updateError; // Re-throw other update errors
      }
    }
  }
  
  // Create logic (either not in update mode, or update failed with "not found")
  console.log(`_createOrUpdateStandardEntity: Creating new ${entityType}:`, data);
  try {
    console.log('Frontend: Payload for /sports/teams (from _createOrUpdateStandardEntity):', JSON.stringify(data, null, 2));
    const response = await sportsDatabaseService.createEntity(
      entityType,
      data,
      isUpdateMode // Pass isUpdateMode, createEntity might internally handle create-or-update if name is present
    );
    console.log(`_createOrUpdateStandardEntity: Successfully created ${entityType}:`, response);
    return !!response; // Assuming createEntity returns something truthy on success
  } catch (createError: any) {
    console.error(`_createOrUpdateStandardEntity: Error creating ${entityType}:`, createError);
    throw createError;
  }
}

/**
 * Save an entity to the database
 * (Refactored Orchestrator)
 */
export const saveEntityToDatabase = async (
  entityType: EntityType,
  data: Record<string, any>,
  isUpdateMode: boolean
): Promise<boolean> => {
  console.log(`Saving ${entityType} to database (V3 Orchestrator):`, data);
  
  try {
    const processedData = { ...data }; // Work on a copy
    
    // Step 1: Common pre-processing (e.g., date formatting)
    ['start_date', 'end_date'].forEach(dateField => {
      if (processedData[dateField] && typeof processedData[dateField] === 'string') {
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(processedData[dateField])) {
          processedData[dateField] = dateField === 'start_date' ? 
            `${processedData[dateField]}-01-01` : 
            `${processedData[dateField]}-12-31`;
          console.log(`SaveV3: Formatted ${dateField}: ${processedData[dateField]}`);
        }
      }
    });
    
    // Step 2: Resolve references
    await resolveReferencesForEntity(entityType, processedData);
    console.log('Frontend: processedData AFTER resolveReferencesForEntity:', JSON.stringify(processedData, null, 2));
    
    // Step 3: Call appropriate save/update helper
    if (entityType === 'broadcast') {
      return await _saveBroadcastRecord(processedData);
    } else {
      // For all other standard entities (team, league, brand, division_conference etc.)
      // Ensure entityType is a valid DbEntityType for _createOrUpdateStandardEntity
      const validDbEntityTypes = ['league', 'team', 'brand', 'division_conference', 'stadium', 'person', 'game', 'production_company', 'production_service', 'player'] as const;
      if (validDbEntityTypes.includes(entityType as any)) {
        return await _createOrUpdateStandardEntity(entityType as DbEntityType, processedData, isUpdateMode);
      } else {
        console.error(`SaveV3: Unknown or non-standard entity type for generic save: ${entityType}`);
        throw new Error(`Cannot save entity of unknown type: ${entityType}`);
      }
    }

  } catch (error) {
    console.error(`SaveV3: Error saving ${entityType}:`, error);
    // Ensure the error is re-thrown so the caller (e.g., batchProcessor) can handle it.
    // The formatErrorMessage utility can be used by the caller if needed.
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
        } else { 
          // Ensure the error message string is properly terminated
          throw new Error(`Broadcast company or Brand "${companyName}" not found. Please create it first.`); 
        }
      }
    } catch (lookupError) { 
      // Ensure any re-thrown error is also a properly formed string if it's custom
      // Or just re-throw the original error object
      throw lookupError; 
    }
  }
}

async function _resolveTeamEntityReferences(processedData: Record<string, any>): Promise<void> {
  console.log('Processing team entity for reference resolution, initial data:', JSON.stringify(processedData));

  // --- Resolve League ID ---
  // This step is critical and must succeed before proceeding.
  if (!processedData.league_id || !isValidUUID(processedData.league_id)) {
    const leagueNameToLookup = (processedData.league_id || processedData.league_name);
    if (!leagueNameToLookup || typeof leagueNameToLookup !== 'string') {
      throw new Error('League name or ID is missing or invalid. It is required to resolve the team.');
    }
    console.log(`Attempting to resolve league_id from name: "${leagueNameToLookup}"`);
      try {
        const leagueLookup = await api.sports.lookup('league', leagueNameToLookup);
        if (leagueLookup && leagueLookup.id) {
          processedData.league_id = leagueLookup.id;
          console.log(`Resolved league_id to UUID: "${processedData.league_id}"`);
        } else {
        throw new Error(`League named "${leagueNameToLookup}" could not be found.`);
        }
      } catch (error: any) {
      console.error(`Error during league lookup for "${leagueNameToLookup}": ${error.message}`);
      throw new Error(`Failed to resolve League ID for "${leagueNameToLookup}". Please ensure it exists.`);
  }
  }

  // --- Resolve Division/Conference ID ---
  // This step now requires a valid league_id to have been resolved.
  if (!processedData.division_conference_id || !isValidUUID(processedData.division_conference_id)) {
    const divConfNameToLookup = (processedData.division_conference_id || processedData.division_conference_name);
     if (!divConfNameToLookup || typeof divConfNameToLookup !== 'string') {
      throw new Error('Division/Conference name or ID is missing or invalid. It is required to resolve the team.');
    }
    console.log(`Attempting to resolve division_conference_id from name: "${divConfNameToLookup}" using league_id: ${processedData.league_id}`);
    try {
      // The lookup is now scoped by the league_id, which is guaranteed to be a UUID here.
      const divConfLookup = await api.sports.lookup('division_conference', divConfNameToLookup, processedData.league_id);
      if (divConfLookup && divConfLookup.id) {
        processedData.division_conference_id = divConfLookup.id;
        console.log(`Resolved division_conference_id to UUID: "${processedData.division_conference_id}"`);
      } else {
        throw new Error(`Division/Conference named "${divConfNameToLookup}" was not found for the specified league.`);
      }
    } catch (error: any) {
      console.error(`Error during division/conference lookup for "${divConfNameToLookup}": ${error.message}`);
      throw new Error(`Failed to resolve Division/Conference ID for "${divConfNameToLookup}".`);
    }
  }

  // --- Resolve Stadium ID ---
  if (processedData.stadium_id && typeof processedData.stadium_id === 'string' && !isValidUUID(processedData.stadium_id)) {
      const stadiumNameToLookup = processedData.stadium_id;
      console.log(`Attempting to resolve stadium_id from name: "${stadiumNameToLookup}"`);
    try {
      const stadiumLookup = await api.sports.lookup('stadium', stadiumNameToLookup);
      if (stadiumLookup && stadiumLookup.id) {
        processedData.stadium_id = stadiumLookup.id;
      } else {
              console.warn(`Stadium "${stadiumNameToLookup}" not found. This will be set to null.`);
        processedData.stadium_id = null;
      }
      } catch (error) {
          console.error(`Stadium lookup for "${stadiumNameToLookup}" failed. This will be set to null.`);
      processedData.stadium_id = null; 
      }
  } else if (!processedData.stadium_id || !isValidUUID(processedData.stadium_id)) {
      // Ensure any non-UUID value (like an empty string) becomes null
        processedData.stadium_id = null;
    }

  // Clean up temporary name fields before sending to the backend
  delete processedData.league_name;
  delete processedData.division_conference_name;
    delete processedData.stadium_name;

  console.log('Processed data after all team reference resolutions:', JSON.stringify(processedData, null, 2));
}

async function _resolvePlayerEntityReferences(processedData: Record<string, any>): Promise<void> {
  console.log('Processing player entity for reference resolution');
  
  // Resolve team_id
  if (processedData.team_id && typeof processedData.team_id === 'string' && !isValidUUID(processedData.team_id)) {
    const teamName = processedData.team_id;
    console.log(`Looking up team (brand) "${teamName}" for player`);
    try {
      const brandLookup = await api.sports.lookup('brand', teamName);
      if (brandLookup && brandLookup.id) {
        // TODO: Optionally verify brandLookup.representative_entity_type === 'Team' here
        console.log(`Found brand ID ${brandLookup.id} for team name "${teamName}". Assigning as team_id.`);
        processedData.team_id = brandLookup.id;
      } else {
        console.warn(`Team (Brand) named "${teamName}" not found. Setting team_id to null for player.`);
        processedData.team_id = null; // Set to null if not found, as team is optional
      }
    } catch (error: any) {
      console.error(`Error looking up team (brand) "${teamName}", setting team_id to null: ${error.message}`);
      processedData.team_id = null; // Also set to null on error during lookup
    }
  }

  // Resolve sponsor_id
  if (processedData.sponsor_id && typeof processedData.sponsor_id === 'string' && !isValidUUID(processedData.sponsor_id)) {
    const sponsorName = processedData.sponsor_id;
    console.log(`Looking up sponsor (brand) "${sponsorName}" for player`);
    try {
      const brandLookup = await api.sports.lookup('brand', sponsorName);
      if (brandLookup && brandLookup.id) {
        console.log(`Found brand ID ${brandLookup.id} for sponsor name "${sponsorName}". Assigning as sponsor_id.`);
        processedData.sponsor_id = brandLookup.id;
      } else {
        // Throw an error if the sponsor brand is not found
        throw new Error(`Sponsor (Brand) named "${sponsorName}" not found. Please add sponsor as brand, then continue with import`);
      }
    } catch (error: any) {
      // Re-throw the error to be caught by the calling process, whether it's our custom error or a lookup error
      console.error(`Error looking up or processing sponsor (brand) "${sponsorName}": ${error.message}`);
      throw error; 
    }
  }
}