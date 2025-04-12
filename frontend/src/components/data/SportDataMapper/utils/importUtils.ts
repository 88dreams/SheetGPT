import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames, isValidUUID } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { sportsService } from '../../../../services/sportsService';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../../services/SportsDatabaseService';

/**
 * Transform source data based on field mappings
 * Handles both array and object source record formats
 */
export const transformMappedData = (
  mappings: Record<string, string>,
  sourceRecord: Record<string, any> | any[]
): Record<string, any> => {
  const transformedData: Record<string, any> = {};
  
  // Check if sourceRecord is an array
  const isArrayData = Array.isArray(sourceRecord);
  
  console.log('transformMappedData:', {
    mappings,
    isArrayData,
    sourceRecordSample: JSON.stringify(sourceRecord).substring(0, 100) + '...',
    hasHeaders: sourceRecord['__headers__'] ? 'yes' : 'no',
    hasParent: sourceRecord['__parent__'] ? 'yes' : 'no'
  });
  
  // CRITICAL FIX: Detect entity types that need special handling
  const isProductionEntity = Object.keys(mappings).some(k => 
    ['production_company_id', 'service_type', 'entity_type'].includes(k)
  );
  
  // Detect stadium entity type for special handling
  const isStadiumEntity = Object.keys(mappings).some(k => 
    ['name', 'city', 'country', 'capacity'].includes(k)
  );
  
  // If mappings contains sourceFields like "Name", "Company Name", we are using display names
  // and the sourceRecord seems to be a flat array of values. In this case, we need
  // to directly map based on position, using the source field headers.
  const usingDisplayNames = Object.values(mappings).some(v => 
    [
      'Name', 'Company Name', 'Service Type', 'Entity Name', 'League Name', 'Start Date',
      // Add League-specific field names
      'League Full Name', 'League Acronym', 'Sport', 'Country', 'Founded Year',
      // Add Stadium-specific field names
      'Track Name', 'City', 'State', 'Capacity', 'Owner', 'Host Broadcaster'
    ].includes(v)
  );
  
  // Special handling for common production service mappings
  // This is a direct mapping based on actual headers to their indices
  if (isArrayData && usingDisplayNames) {
    console.log("USING DISPLAY NAMES WITH DIRECT INDEX MAPPING", {
      mappingsList: Object.entries(mappings).map(([db, src]) => `${src} → ${db}`),
      sourceRecord: Array.isArray(sourceRecord) ? sourceRecord : [],
      detectedFields: Object.values(mappings).filter(v => 
        ['League Full Name', 'League Acronym', 'Sport', 'Country', 'Founded Year'].includes(v)
      )
    });
    
    // Hard-coded maps for production services based on column positions in typical CSV data
    const fieldPositions = {
      // Production service fields
      'Name': 0,          // Name is typically first column
      'Company Name': 0,  // Production company name is typically first column
      'Service Type': 1,  // Service type is typically second column
      'Entity Name': 2,   // Entity being produced is typically third column
      'Entity Type': 3,   // Entity type is typically fourth column  
      'League Name': 4,   // League is typically fifth column
      'Sport': 5,         // Sport is typically sixth column
      'Start Date': 6,    // Start date is typically seventh column
      'End Date': 7,      // End date is typically eighth column
      
      // League-specific fields
      'League Full Name': 0,  // League name is first column
      'League Acronym': 1,    // League acronym is second column
      'Sport': 2,             // Sport is third column
      'Country': 3,           // Country is fourth column
      'Founded Year': 4,      // Founded year is fifth column
      
      // Stadium-specific fields - based on Indianapolis Motor Speedway example
      'Track Name': 0,        // Stadium/Track name is first column
      'City': 2,              // City is third column (Indianapolis)
      'State': 3,             // State is fourth column (Indiana)
      'Country': 4,           // Country is fifth column (USA)
      'Capacity': 5,          // Capacity is sixth column
      'Owner': 8,             // Owner is ninth column
      'Host Broadcaster': 7   // Host broadcaster is eighth column
    };
    
    // Do direct mapping using the field positions
    Object.entries(mappings).forEach(([databaseField, sourceFieldName]) => {
      // Find the position for this source field
      const position = fieldPositions[sourceFieldName];
      
      console.log(`Attempting position mapping for ${sourceFieldName} → ${databaseField}`, {
        mappedPosition: position,
        hasValue: position !== undefined && sourceRecord[position] !== undefined,
        valueAtPosition: position !== undefined ? sourceRecord[position] : 'no position',
        rawSourceRecord: sourceRecord
      });
      
      if (position !== undefined && sourceRecord[position] !== undefined) {
        transformedData[databaseField] = sourceRecord[position];
        console.log(`SUCCESSFUL Direct position mapping: ${sourceFieldName} (position ${position}) → ${databaseField} =`, sourceRecord[position]);
      } else {
        console.warn(`No direct position mapping for ${sourceFieldName} → ${databaseField}`);
        
        // Special fallback for array data with header mismatch
        if (Array.isArray(sourceRecord) && sourceRecord.length > 0) {
          // If the field has a typical structure (like "League Full Name"), try matching by parts
          if (sourceFieldName.includes('Name') && databaseField === 'name') {
            transformedData[databaseField] = sourceRecord[0]; // First element is often the name
            console.log(`Fallback mapping for ${databaseField}: Using first element as name:`, sourceRecord[0]);
          } else if (sourceFieldName.includes('Acronym') && databaseField === 'nickname') {
            transformedData[databaseField] = sourceRecord[1]; // Second element is often the acronym/nickname
            console.log(`Fallback mapping for ${databaseField}: Using second element as nickname:`, sourceRecord[1]);
          } else if (sourceFieldName.includes('Sport') && databaseField === 'sport') {
            transformedData[databaseField] = sourceRecord[2]; // Third element is often the sport
            console.log(`Fallback mapping for ${databaseField}: Using third element as sport:`, sourceRecord[2]);
          } 
          // Special stadium field fallbacks for Indianapolis Motor Speedway data
          else if (sourceFieldName === 'Track Name' && databaseField === 'name') {
            transformedData[databaseField] = sourceRecord[0]; // First element is the track/stadium name
            console.log(`Fallback mapping for stadium name: Using first element:`, sourceRecord[0]);
          } else if (sourceFieldName === 'City' && databaseField === 'city') {
            transformedData[databaseField] = sourceRecord[2]; // Third element is the city
            console.log(`Fallback mapping for stadium city: Using third element:`, sourceRecord[2]);
          } else if (sourceFieldName === 'State' && databaseField === 'state') {
            transformedData[databaseField] = sourceRecord[3]; // Fourth element is the state
            console.log(`Fallback mapping for stadium state: Using fourth element:`, sourceRecord[3]);
          } else if (sourceFieldName === 'Country' && databaseField === 'country') {
            transformedData[databaseField] = sourceRecord[4]; // Fifth element is the country
            console.log(`Fallback mapping for stadium country: Using fifth element:`, sourceRecord[4]);
          }
        }
      }
    });
    
    // Set default values for required fields if missing
    if (isProductionEntity) {
      if (!transformedData.service_type && mappings.service_type) {
        transformedData.service_type = 'Production';
        console.log('Set default service_type to "Production"');
      }
      
      if (!transformedData.start_date && mappings.start_date) {
        transformedData.start_date = '2000-01-01';
        console.log('Set default start_date to "2000-01-01"');
      }
      
      if (!transformedData.end_date && mappings.end_date) {
        transformedData.end_date = '2100-01-01';
        console.log('Set default end_date to "2100-01-01"');
      }
      
      if (!transformedData.entity_type && mappings.entity_type) {
        transformedData.entity_type = 'league';
        console.log('Set default entity_type to "league"');
      }
    }
    
    // Special handling for stadium entity data using array indices
    if (isStadiumEntity && isArrayData && Array.isArray(sourceRecord) && sourceRecord.length >= 5) {
      console.log('Special stadium entity handling for array data with length:', sourceRecord.length);
      
      // Check if we're specifically missing any critical fields (city, country)
      if (!transformedData.name && (mappings.name || Object.keys(mappings).includes('name'))) {
        transformedData.name = sourceRecord[0];
        console.log('Set stadium name from first element:', transformedData.name);
      }
      
      if (!transformedData.city && (mappings.city || Object.keys(mappings).includes('city'))) {
        transformedData.city = sourceRecord[2];
        console.log('Set stadium city from third element:', transformedData.city);
      }
      
      if (!transformedData.state && (mappings.state || Object.keys(mappings).includes('state'))) {
        transformedData.state = sourceRecord[3];
        console.log('Set stadium state from fourth element:', transformedData.state);
      }
      
      if (!transformedData.country && (mappings.country || Object.keys(mappings).includes('country'))) {
        // USA is in 5th position (index 4) for Indianapolis Motor Speedway
        transformedData.country = sourceRecord[4];
        console.log('Set stadium country from fifth element:', transformedData.country);
      }
      
      if (!transformedData.capacity && (mappings.capacity || Object.keys(mappings).includes('capacity'))) {
        transformedData.capacity = sourceRecord[5];
        console.log('Set stadium capacity from sixth element:', transformedData.capacity);
      }
      
      // Final validation check for required fields - make sure city and country are set
      // These are required fields according to validationUtils.ts
      if (Object.keys(mappings).includes('city') && !transformedData.city && sourceRecord[2]) {
        transformedData.city = sourceRecord[2]; // Force map from index 2
        console.log('CRITICAL: Forced city mapping for stadium from index 2:', sourceRecord[2]);
      }
      
      if (Object.keys(mappings).includes('country') && !transformedData.country && sourceRecord[4]) {
        transformedData.country = sourceRecord[4]; // Force map from index 4
        console.log('CRITICAL: Forced country mapping for stadium from index 4:', sourceRecord[4]);
      }
    }
    
    // Special handling for brand entities
    const isBrandEntity = Object.keys(mappings).some(k => 
      ['industry', 'partner', 'partner_relationship'].includes(k)
    );
    
    if (isBrandEntity) {
      // If we're mapping a brand and first column exists, use it for name if not already mapped
      if (!transformedData.name && sourceRecord[0]) {
        transformedData.name = sourceRecord[0];
        console.log(`Set brand name from first column: ${transformedData.name}`);
      }
      
      // If partner and partner_relationship exist but name is still missing, generate a name
      if (!transformedData.name && transformedData.partner && transformedData.partner_relationship) {
        if (transformedData.industry) {
          transformedData.name = `${transformedData.industry} (${transformedData.partner})`;
        } else {
          transformedData.name = `${transformedData.partner} Partner`;
        }
        console.log(`Generated brand name from partner info: ${transformedData.name}`);
      }
    }
  } else {
    // Regular object mapping or numeric array mapping
    Object.entries(mappings).forEach(([databaseField, sourceField]) => {
      if (isArrayData) {
        // Enhanced array data handling - multiple ways to find the right value
        
        // First, try to parse as numeric index
        const index = parseInt(sourceField, 10);
        if (!isNaN(index) && index >= 0 && index < sourceRecord.length) {
          // Direct numeric index
          transformedData[databaseField] = sourceRecord[index];
          console.log(`Mapped ${databaseField} from array index ${index} with value:`, transformedData[databaseField]);
        } else if (Array.isArray(sourceRecord) && sourceRecord.hasOwnProperty(sourceField)) {
          // Direct property access (unusual for arrays but possible)
          transformedData[databaseField] = sourceRecord[sourceField];
          console.log(`Mapped ${databaseField} from array property ${sourceField} with value:`, transformedData[databaseField]);
        } else {
          // Try all possible header lookup strategies
          
          // Strategy 1: Use __headers__ property on the record itself
          let foundValue = false;
          
          if (sourceRecord['__headers__'] && Array.isArray(sourceRecord['__headers__'])) {
            const headerIndex = sourceRecord['__headers__'].indexOf(sourceField);
            if (headerIndex >= 0 && headerIndex < sourceRecord.length) {
              transformedData[databaseField] = sourceRecord[headerIndex];
              console.log(`Strategy 1: Mapped ${databaseField} from __headers__ index ${headerIndex} (${sourceField}) with value:`, 
                transformedData[databaseField]);
              foundValue = true;
            }
          }
          
          // Strategy 2: Use headers from the parent object
          if (!foundValue && sourceRecord['__parent__']) {
            const parentObject = sourceRecord['__parent__'];
            if (parentObject.headers && Array.isArray(parentObject.headers)) {
              const headerIndex = parentObject.headers.indexOf(sourceField);
              if (headerIndex >= 0 && headerIndex < sourceRecord.length) {
                transformedData[databaseField] = sourceRecord[headerIndex];
                console.log(`Strategy 2: Mapped ${databaseField} from parent header index ${headerIndex} (${sourceField}) with value:`, 
                  transformedData[databaseField]);
                foundValue = true;
              }
            }
          }
          
          // Strategy 3: Try to match sourceField directly as a property name
          if (!foundValue && sourceRecord[sourceField] !== undefined) {
            transformedData[databaseField] = sourceRecord[sourceField];
            console.log(`Strategy 3: Mapped ${databaseField} from direct property ${sourceField} with value:`, 
              transformedData[databaseField]);
            foundValue = true;
          }
          
          // Strategy 4: Look through all string properties for an exact match to sourceField
          if (!foundValue) {
            // Check for any property that exactly matches the source field name
            for (const key of Object.keys(sourceRecord)) {
              if (key === sourceField) {
                transformedData[databaseField] = sourceRecord[key];
                console.log(`Strategy 4: Mapped ${databaseField} from exact match property ${key} with value:`, 
                  transformedData[databaseField]);
                foundValue = true;
                break;
              }
            }
          }
          
          // Strategy 5: For array data with string values, try case-insensitive matching by field name
          if (!foundValue && typeof sourceField === 'string') {
            const sourceFieldLower = sourceField.toLowerCase();
            // Check if any array index has a matching property that's being used as a header
            for (let i = 0; i < sourceRecord.length; i++) {
              // Skip non-object elements
              if (typeof sourceRecord[i] !== 'object' || sourceRecord[i] === null) continue;
              
              for (const key of Object.keys(sourceRecord[i])) {
                if (key.toLowerCase() === sourceFieldLower) {
                  transformedData[databaseField] = sourceRecord[i][key];
                  console.log(`Strategy 5: Mapped ${databaseField} from case-insensitive match ${key} with value:`, 
                    transformedData[databaseField]);
                  foundValue = true;
                  break;
                }
              }
              if (foundValue) break;
            }
          }
          
          // If still no value found, this is genuinely missing
          if (!foundValue) {
            console.warn(`Source field "${sourceField}" not found in array-based source record`);
          }
        }
      } else {
        // Traditional object property access
        transformedData[databaseField] = sourceRecord[sourceField];
        console.log(`Mapped ${databaseField} from object property "${sourceField}" with value:`, transformedData[databaseField]);
      }
    });
  }
  
  console.log('Final transformed data result:', transformedData);
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
 */
export const saveEntityToDatabase = async (
  entityType: EntityType,
  data: Record<string, any>,
  isUpdateMode: boolean
): Promise<boolean> => {
  console.log(`saveEntityToDatabase called for entity type: ${entityType}`);
  let success = false;
  
  // Handle update mode for entities with a name field
  if (
    Object.keys(data).includes('name') && 
    (isUpdateMode || Object.keys(data).length <= 3)
  ) {
    const entityName = data.name;
    const updateData = { ...data };
    
    console.log(`Using generic updateEntityByName for ${entityType}:`, { name: entityName, updateData });
    
    try {
      const response = await sportsService.updateEntityByName(
        entityType,
        entityName,
        updateData
      );
      
      console.log(`${entityType} update response:`, response);
      success = !!response;
      return success;
    } catch (error) {
      // If entity not found, continue to create path
      if (error.message && error.message.includes('not found')) {
        console.log(`${entityType} not found, will try to create instead`);
      } else {
        console.error(`Error updating ${entityType}:`, error);
        throw error;
      }
    }
  }
  
  // Special handling for certain entity types
  console.log(`Checking special handling for entity type: ${entityType}`);
  
  // Handle brand entity with partner fields
  if (entityType === 'brand') {
    console.log('Using special handling for brand with partner fields');
    
    // Handle partner field resolution
    if (data.partner && typeof data.partner === 'string' && data.partner_relationship) {
      console.log(`Brand has partner "${data.partner}" with relationship "${data.partner_relationship}"`);
      
      // Ensure the brand has a name set (required field)
      if (!data.name) {
        // Use the company type from the partner relationship
        const relationshipType = data.partner_relationship.toLowerCase();
        
        // Set a default name based on partner and relationship
        if (data.industry) {
          data.name = `${data.industry} (${data.partner})`;
          console.log(`Using industry and partner for name: ${data.name}`);
        } else {
          data.name = `${data.partner} ${relationshipType}`;
          console.log(`Using partner and relationship for name: ${data.name}`);
        }
      }
      
      // We store the partner name as a string, the backend will handle resolution
      // Format dates correctly for this entity
      if (data.start_date && typeof data.start_date === 'string') {
        // Check if it's just a year (4 digits)
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(data.start_date)) {
          data.start_date = `${data.start_date}-01-01`;
          console.log(`Formatted start_date: ${data.start_date}`);
        }
      }
      
      if (data.end_date && typeof data.end_date === 'string') {
        // Check if it's just a year (4 digits)
        const yearRegex = /^\d{4}$/;
        if (yearRegex.test(data.end_date)) {
          data.end_date = `${data.end_date}-12-31`;
          console.log(`Formatted end_date: ${data.end_date}`);
        }
      }
    }
  }
  
  // Special handling for broadcast entity
  if (entityType === 'broadcast') {
    console.log('Using special handling for broadcast entity');
    try {
      // Step 1: Ensure broadcast company exists
      if (data.broadcast_company_id && typeof data.broadcast_company_id === 'string' && 
          (!isValidUUID(data.broadcast_company_id) || data.broadcast_company_id.includes('NEW-COMP'))) {
        
        // It's a company name, not an ID - we need to look it up or create it
        const companyName = data.broadcast_company_id;
        console.log(`Handling broadcast company by name: "${companyName}"`);
        
        // First, check if we're using a brand as broadcast company (flag set by mappingUtils.ts)
        if (data._usingBrandAsBroadcastCompany) {
          console.log(`Using brand as broadcast company: ${data._brandName}`);
          // Just make sure we have a valid ID and continue
          if (isValidUUID(data.broadcast_company_id)) {
            console.log(`Using brand ID ${data.broadcast_company_id} for broadcast company`);
            // Set a flag to indicate in success messages
            data._usedBrandAsBroadcastCompany = {
              name: data._brandName,
              id: data.broadcast_company_id
            };
          } else {
            // This shouldn't happen since mappingUtils should have set a valid UUID
            console.error('Brand being used as broadcast company has invalid UUID:', data.broadcast_company_id);
            throw new Error(`Invalid UUID for brand being used as broadcast company: ${data._brandName}`);
          }
        } else {
          // Normal broadcast company handling
          try {
            // Try to look up the company first
            const companyLookup = await api.sports.lookup('broadcast_company', companyName);
            if (companyLookup && companyLookup.id) {
              console.log(`Found broadcast company: ${companyLookup.name} with ID: ${companyLookup.id}`);
              data.broadcast_company_id = companyLookup.id;
            } else {
              throw new Error('Company not found, need to create it');
            }
          } catch (lookupError) {
            // Now also check if it exists as a brand
            try {
              console.log('Checking if it exists as a brand:', companyName);
              const brandLookup = await api.sports.lookup('brand', companyName);
              if (brandLookup && brandLookup.id) {
                console.log(`Found brand: ${brandLookup.name} with ID: ${brandLookup.id}`);
                console.log(`Using brand ID for broadcast company`);
                data.broadcast_company_id = brandLookup.id;
                // Set a flag to indicate in success messages
                data._usedBrandAsBroadcastCompany = {
                  name: brandLookup.name,
                  id: brandLookup.id
                };
                return true; // Continue with the import
              }
            } catch (brandLookupError) {
              console.log('Not found as a brand either, will create new broadcast company');
            }
            
            // If not found as brand either, create a new broadcast company
            console.log('Broadcast company not found, creating a new one:', companyName);
            
            // Create a new broadcast company
            try {
              const newCompany = await sportsService.createBroadcastCompanyWithLogging({
                name: companyName,
                type: 'Network',  // Default type
                country: 'USA'    // Default country
              });
              
              console.log('Created new broadcast company:', newCompany);
              data.broadcast_company_id = newCompany.id;
              
              // Add metadata about the newly created company
              data._newBroadcastCompanyCreated = {
                name: companyName,
                id: newCompany.id
              };
            } catch (createError) {
              console.error('Failed to create broadcast company:', createError);
              throw new Error(`Failed to create broadcast company "${companyName}": ${createError.message}`);
            }
          }
        }
      }
      
      // Step 2: Handle entity_id resolution if needed
      if (data.entity_id && typeof data.entity_id === 'string' && !isValidUUID(data.entity_id)) {
        // It's an entity name, not a UUID - try to resolve it
        const entityName = data.entity_id;
        let entityType = data.entity_type.toLowerCase();
        
        // Normalize entity type
        if (['division', 'conference', 'divisions', 'conferences'].includes(entityType)) {
          entityType = 'division_conference';
        }
        
        try {
          console.log(`Looking up ${entityType} by name: "${entityName}"`);
          const entityLookup = await api.sports.lookup(entityType, entityName);
          if (entityLookup && entityLookup.id) {
            console.log(`Found ${entityType}: ${entityName} with ID: ${entityLookup.id}`);
            data.entity_id = entityLookup.id;
          } else {
            throw new Error(`${entityType} not found: ${entityName}`);
          }
        } catch (lookupError) {
          console.error(`Failed to find entity ${entityType}: ${entityName}`);
          throw new Error(`Entity "${entityName}" not found. Please create it first in the database.`);
        }
      }
      
      // Step 3: Ensure dates are properly formatted
      ['start_date', 'end_date'].forEach(dateField => {
        if (data[dateField]) {
          // If just a year provided, format it properly
          const yearRegex = /^\d{4}$/;
          if (typeof data[dateField] === 'string' && yearRegex.test(data[dateField])) {
            data[dateField] = dateField === 'start_date' 
              ? `${data[dateField]}-01-01`  // Start date: beginning of year
              : `${data[dateField]}-12-31`; // End date: end of year
            console.log(`Formatted ${dateField}: ${data[dateField]}`);
          }
        }
      });
      
      // Step 4: Set default dates if missing
      if (!data.start_date) {
        const currentYear = new Date().getFullYear();
        data.start_date = `${currentYear}-01-01`;
        console.log(`Set default start_date: ${data.start_date}`);
      }
      
      if (!data.end_date) {
        const currentYear = new Date().getFullYear() + 5; // 5-year default rights period
        data.end_date = `${currentYear}-12-31`;
        console.log(`Set default end_date: ${data.end_date}`);
      }
      
      // Step 5: Handle broadcast rights (create or update)
      if (isUpdateMode) {
        // First, find the existing broadcast rights record
        console.log('Update mode enabled, searching for existing broadcast rights with data:', {
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          broadcast_company_id: data.broadcast_company_id
        });
        
        try {
          // Look up existing broadcast rights
          const existingRights = await sportsService.getBroadcastRights({
            entity_type: data.entity_type,
            entity_id: data.entity_id,
            company_id: data.broadcast_company_id
          });
          
          if (existingRights && existingRights.length > 0) {
            // Found existing record, update it instead of creating a new one
            const existingRight = existingRights[0];
            console.log('Found existing broadcast rights to update:', existingRight);
            
            // Only update the fields that have changed
            const updateData = {};
            Object.keys(data).forEach(key => {
              // Skip metadata fields and id fields that can't/shouldn't be changed
              if (key.startsWith('_') || key === 'id' || 
                  key === 'entity_type' || key === 'entity_id' || 
                  key === 'broadcast_company_id') {
                return;
              }
              
              // Only include fields that are different from existing data
              if (data[key] !== existingRight[key]) {
                updateData[key] = data[key];
                console.log(`Field '${key}' will be updated: ${existingRight[key]} -> ${data[key]}`);
              }
            });
            
            if (Object.keys(updateData).length > 0) {
              // If there are fields to update, perform the update
              console.log('Updating broadcast rights with ID:', existingRight.id, 'with data:', updateData);
              const result = await sportsService.updateBroadcastRights(existingRight.id, updateData);
              console.log('Successfully updated broadcast rights:', result);
              return true;
            } else {
              console.log('No fields to update for broadcast rights ID:', existingRight.id);
              return true; // Still count as success since no update was needed
            }
          } else {
            console.log('No existing broadcast rights found, will create a new one despite update mode');
            // Fall through to creation logic if no existing record was found
          }
        } catch (lookupError) {
          console.error('Error looking up existing broadcast rights:', lookupError);
          // Fall through to creation if lookup fails
        }
      }
      
      // Create new broadcast rights if we're not in update mode or no existing record was found
      console.log('Creating broadcast rights with prepared data:', data);
      try {
        const result = await sportsService.createBroadcastRightsWithErrorHandling(data);
        console.log('Successfully created broadcast rights:', result);
        return true;
      } catch (error) {
        // Check for duplicate constraint violation
        if (error.message && error.message.includes('duplicate key value') || 
            error.message && error.message.includes('already exists')) {
          console.error('Duplicate broadcast rights detected:', error);
          error.message = 'This broadcast right already exists in the database. Try different parameters or edit the existing record.';
        }
        
        // Check for "not found" errors
        if (error.message && error.message.includes('not found')) {
          console.error('Entity reference not found:', error);
          // The error message is already clear, just rethrow
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error in broadcast rights creation process:', error);
      throw error;
    }
  }
  
  // Default path: create entity
  const response = await sportsDatabaseService.createEntity(
    entityType as DbEntityType, 
    data,
    isUpdateMode
  );
  
  return !!response;
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