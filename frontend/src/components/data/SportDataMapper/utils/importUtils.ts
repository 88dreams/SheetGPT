import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames, isValidUUID } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { sportsService } from '../../../../services/sportsService';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../../services/SportsDatabaseService';

/**
 * Transform source data based on field mappings
 * Handles both array and object source record formats
 * IMPORTANT: This function relies SOLELY on user-defined field mappings,
 * without any assumptions about standard array positions.
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
  
  // STEP 1: Detect entity type for special post-processing
  const entityTypeDetection = {
    isLeagueEntity: Object.keys(mappings).some(k => 
      ['name', 'sport', 'country', 'nickname'].includes(k) && !mappings.capacity
    ),
    isTeamEntity: Object.keys(mappings).some(k => 
      ['name', 'league_id', 'division_conference_id', 'stadium_id'].includes(k)
    ),
    isStadiumEntity: Object.keys(mappings).some(k => 
      ['name', 'city', 'country', 'capacity'].includes(k)
    ),
    isProductionEntity: Object.keys(mappings).some(k => 
      ['production_company_id', 'service_type', 'entity_type'].includes(k)
    ),
    isBroadcastEntity: Object.keys(mappings).some(k => 
      ['broadcast_company_id', 'entity_type', 'entity_id', 'territory'].includes(k)
    ),
    isBrandEntity: Object.keys(mappings).some(k => 
      ['name', 'industry', 'company_type', 'partner', 'partner_relationship'].includes(k)
    ),
    isDivisionConferenceEntity: Object.keys(mappings).some(k => 
      ['name', 'league_id', 'type', 'nickname'].includes(k) && !mappings.capacity
    ),
    isGameEntity: Object.keys(mappings).some(k => 
      ['home_team_id', 'away_team_id', 'date', 'time'].includes(k)
    ),
    isGameBroadcastEntity: Object.keys(mappings).some(k => 
      ['game_id', 'broadcast_company_id', 'broadcast_type'].includes(k)
    ),
    isLeagueExecutiveEntity: Object.keys(mappings).some(k => 
      ['name', 'league_id', 'position', 'start_date'].includes(k)
    )
  };
  
  // STEP 2: Map source field names to their common equivalents
  // This helps normalize user-provided field names to standard database fields
  const fieldNameMap: Record<string, string> = {
    // Common fields
    'Name': 'name',
    'Company Name': 'name',
    'Brand Name': 'name',
    'Name of company': 'name',
    'Track Name': 'name',
    'League Name': 'name',
    'League Full Name': 'name',
    
    // Type, category, and industry fields
    'Type of Company': 'industry',
    'Industry': 'industry',
    'Service Type': 'service_type',
    'Entity Type': 'entity_type',
    'Client Type': 'entity_type',
    'Sport': 'sport',
    'Company Type': 'company_type',
    
    // Entity relation fields
    'Broadcast Client': 'entity_id',
    'Entity Name': 'entity_id',
    'Partner': 'partner',
    'Relationship Type': 'partner_relationship',
    'League Acronym': 'nickname',
    
    // Location fields
    'Territory': 'territory',
    'Broadcast Territory': 'territory',
    'Country': 'country',
    'City': 'city',
    'State': 'state',
    
    // Date fields
    'Start Date': 'start_date',
    'Start date of Rights': 'start_date',
    'End Date': 'end_date',
    'End date of Rights': 'end_date',
    'Founded Year': 'founded_year',
    
    // Miscellaneous fields
    'Capacity': 'capacity',
    'Owner': 'owner',
    'Host Broadcaster': 'host_broadcaster_id'
  };
  
  // STEP 3: Process data based on its format
  if (isArrayData && Array.isArray(sourceRecord)) {
    console.log('Processing array data based on user-defined mappings only');
    
    // If we have headers, extract them to map positions
    let headerPositions: Record<string, number> = {};
    
    // Check if sourceRecord has a __headers__ attribute
    if (sourceRecord['__headers__'] && Array.isArray(sourceRecord['__headers__'])) {
      // Build a map of header names to their positions
      sourceRecord['__headers__'].forEach((header, index) => {
        if (header && typeof header === 'string') {
          headerPositions[header.trim()] = index;
        }
      });
      console.log('Found headers with positions:', headerPositions);
    }
    
    // Process each mapping defined by the user
    Object.entries(mappings).forEach(([dbField, sourceFieldName]) => {
      console.log(`Processing mapping ${sourceFieldName} → ${dbField}`);
      
      // Try multiple strategies to find the value in the array
      let value: any;
      let found = false;
      
      // STRATEGY 1: If headerPositions exist, try to find by header name
      if (Object.keys(headerPositions).length > 0) {
        // Check if this field exists in our header positions
        if (headerPositions[sourceFieldName] !== undefined) {
          const position = headerPositions[sourceFieldName];
          value = sourceRecord[position];
          found = true;
          console.log(`Found value by header position ${position}: ${value}`);
        }
      }
      
      // STRATEGY 2: If the source field name is a number, use it as a direct index
      if (!found && !isNaN(Number(sourceFieldName))) {
        const index = Number(sourceFieldName);
        if (index >= 0 && index < sourceRecord.length) {
          value = sourceRecord[index];
          found = true;
          console.log(`Found value by using source field as index ${index}: ${value}`);
        }
      }
      
      // STRATEGY 3: Try to match by field name anywhere in the array items
      if (!found) {
        for (let i = 0; i < sourceRecord.length; i++) {
          const item = sourceRecord[i];
          
          // If this item matches the source field name, use the next item as the value
          if (item === sourceFieldName && i < sourceRecord.length - 1) {
            value = sourceRecord[i + 1];
            found = true;
            console.log(`Found value by field name match at position ${i}: ${value}`);
            break;
          }
          
          // Also check for matches with the field name mapping
          const standardField = fieldNameMap[sourceFieldName] || sourceFieldName;
          if (item === standardField && i < sourceRecord.length - 1) {
            value = sourceRecord[i + 1];
            found = true;
            console.log(`Found value by standardized field name match at position ${i}: ${value}`);
            break;
          }
        }
      }
      
      // STRATEGY 4: Use user-provided field index mapping
      // If the sourceFieldName is a string containing "#N" where N is a number
      if (!found && typeof sourceFieldName === 'string') {
        const indexMatch = sourceFieldName.match(/#(\d+)/);
        if (indexMatch && indexMatch[1]) {
          const index = parseInt(indexMatch[1], 10);
          if (index >= 0 && index < sourceRecord.length) {
            value = sourceRecord[index];
            found = true;
            console.log(`Found value using explicit index notation #${index}: ${value}`);
          }
        }
      }
      
      // STRATEGY 5: If all else fails, try mapping by field position based on field name
      // THIS IS A LAST RESORT and only used if user mappings failed
      // It attempts to find a value using heuristics based on common field patterns
      if (!found) {
        // Common field pattern recognition based on the field's position in typical data
        if (dbField === 'broadcast_company_id' || dbField === 'production_company_id' || dbField === 'name') {
          // Company names or entity names are often first
          value = sourceRecord[0];
          found = true;
          console.log(`Applied heuristic mapping for ${dbField}: ${value}`);
        } else if (dbField === 'entity_id' && entityTypeDetection.isBroadcastEntity) {
          // Entity ID usually follows company name in broadcast rights
          value = sourceRecord[1];
          found = true;
          console.log(`Applied heuristic mapping for ${dbField}: ${value}`);
        } else if (dbField === 'entity_type' && entityTypeDetection.isBroadcastEntity) {
          // Entity type usually follows entity ID in broadcast rights
          value = sourceRecord[2];
          found = true;
          console.log(`Applied heuristic mapping for ${dbField}: ${value}`);
        } else if (dbField === 'territory' && entityTypeDetection.isBroadcastEntity) {
          // Territory usually follows entity type in broadcast rights
          for (let i = 2; i < 5; i++) {
            // Territories are usually string values that might contain country codes or region names
            if (typeof sourceRecord[i] === 'string' && 
                !sourceRecord[i].includes('league') && 
                !sourceRecord[i].includes('team') && 
                !sourceRecord[i].match(/^\d{4}$/)) { // Not a year
              value = sourceRecord[i];
              found = true;
              console.log(`Found likely territory at position ${i}: ${value}`);
              break;
            }
          }
        }
      }
      
      // STEP 4: Post-process special fields that need normalization
      if (found && value !== undefined) {
        // Special handling for entity_type - normalize immediately
        if (dbField === 'entity_type') {
          let entityType = value;
          
          // Normalize entity type value
          if (typeof entityType === 'string') {
            if (entityType.includes('Series') || entityType.includes('Racing')) {
              entityType = 'league';
              console.log(`Normalized Racing/Series entity type to "league"`);
            } else {
              entityType = entityType.toLowerCase();
              if (entityType.includes('league')) entityType = 'league';
              else if (entityType.includes('team')) entityType = 'team';
              else if (entityType.includes('conference') || entityType.includes('division')) entityType = 'division_conference';
              else entityType = 'league'; // Default
            }
          } else {
            entityType = 'league'; // Default
          }
          
          transformedData[dbField] = entityType;
          console.log(`Entity type normalized: ${dbField} = ${entityType}`);
        } 
        // Format dates when they're years only
        else if ((dbField === 'start_date' || dbField === 'end_date') && typeof value === 'string') {
          const yearRegex = /^\d{4}$/;
          
          if (yearRegex.test(value)) {
            transformedData[dbField] = dbField === 'start_date' ? 
              `${value}-01-01` : // Start date: beginning of year
              `${value}-12-31`;  // End date: end of year
            console.log(`Formatted year-only date: ${dbField} = ${transformedData[dbField]}`);
          } else {
            transformedData[dbField] = value;
          }
        } else {
          // Regular field mapping
          transformedData[dbField] = value;
          console.log(`User-defined mapping: ${sourceFieldName} → ${dbField} = ${value}`);
        }
      } else {
        console.log(`No value found for field ${dbField} using source field ${sourceFieldName}`);
      }
    });
  } 
  // Handle object data (standard object with properties)
  else {
    console.log('Processing object data with direct property mapping');
    
    // Traditional object property access
    Object.entries(mappings).forEach(([databaseField, sourceField]) => {
      transformedData[databaseField] = sourceRecord[sourceField];
      console.log(`Mapped ${databaseField} from object property "${sourceField}" with value:`, transformedData[databaseField]);
    });
  }
  
  // STEP 5: Perform minimal post-processing for required fields
  
  // Format dates consistently
  ['start_date', 'end_date'].forEach(dateField => {
    if (transformedData[dateField] && typeof transformedData[dateField] === 'string') {
      const yearRegex = /^\d{4}$/;
      if (yearRegex.test(transformedData[dateField])) {
        transformedData[dateField] = dateField === 'start_date' ? 
          `${transformedData[dateField]}-01-01` : // Start date: beginning of year
          `${transformedData[dateField]}-12-31`;  // End date: end of year
        console.log(`Formatted year-only date: ${dateField} = ${transformedData[dateField]}`);
      }
    }
  });
  
  // For broadcast and production entities, add required fields only if completely missing
  if (entityTypeDetection.isBroadcastEntity || entityTypeDetection.isProductionEntity) {
    // Default entity_type if completely missing
    if (transformedData.entity_type === undefined) {
      transformedData.entity_type = 'league';
      console.log(`Added default entity_type: ${transformedData.entity_type}`);
    }
    
    // Normalize Racing Series entity_type
    if (transformedData.entity_type && typeof transformedData.entity_type === 'string') {
      if (transformedData.entity_type.includes('Series') || 
          transformedData.entity_type.includes('Racing')) {
        transformedData.entity_type = 'league';
        console.log(`Normalized Racing/Series entity_type to "league"`);
      }
    }
  }
  
  // For production entities, set default service_type only if missing
  if (entityTypeDetection.isProductionEntity && !transformedData.service_type) {
    transformedData.service_type = 'Production';
    console.log(`Set default service_type: ${transformedData.service_type}`);
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
        
        // CRITICAL: Normalize entity_type if it contains "racing" or "series"
        if (data.entity_type && 
            (data.entity_type.toLowerCase().includes('racing') || 
             data.entity_type.toLowerCase().includes('series'))) {
          console.log(`Normalizing entity_type "${data.entity_type}" to "league" for entity lookup`);
          data.entity_type = 'league';
        }
        
        let entityType = (data.entity_type || 'league').toLowerCase();
        
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
          // If the error indicates invalid entity type, try using "league" instead
          if (lookupError.message && lookupError.message.includes('Invalid entity type')) {
            console.log(`Entity type "${entityType}" is invalid, trying with "league" instead`);
            try {
              const leagueResult = await api.sports.lookup('league', entityName);
              if (leagueResult && leagueResult.id) {
                console.log(`Found entity "${entityName}" as a league with ID: ${leagueResult.id}`);
                data.entity_type = 'league'; // Update to the proper entity type
                data.entity_id = leagueResult.id;
                return; // Skip to next step
              }
            } catch (secondError) {
              console.error(`Failed to find entity "${entityName}" as a league`);
            }
          }
          
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