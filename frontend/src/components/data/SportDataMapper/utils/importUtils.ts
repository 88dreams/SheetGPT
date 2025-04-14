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
  
  // Detect broadcast rights entity type for special handling
  const isBroadcastEntity = Object.keys(mappings).some(k => 
    ['broadcast_company_id', 'entity_type', 'entity_id', 'territory'].includes(k)
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
      'Track Name', 'City', 'State', 'Capacity', 'Owner', 'Host Broadcaster',
      // Add Broadcast-specific field names
      'Name of company', 'Broadcast Client', 'Client Type', 'Broadcast Territory', 
      'Start date of Rights', 'End date of Rights'
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
    
    // Get estimated field positions using intelligent detection rather than hard-coding
    // This allows us to work with different data formats without relying on specific positions
    const fieldPositions: Record<string, number> = {};
    
    // Common field patterns to detect in array data
    const fieldPatterns = {
      'Name': ['name', 'title'],
      'Company Name': ['company', 'organization', 'business', 'firm', 'name of company', 'broadcaster'],
      'Service Type': ['service', 'type'],
      'Entity Name': ['entity', 'subject', 'client', 'league', 'team', 'event'],
      'Entity Type': ['type', 'category', 'classification', 'client type'],
      'League Name': ['league', 'conference', 'division'],
      'Sport': ['sport', 'game', 'activity'],
      'Start Date': ['start', 'begin', 'from'],
      'End Date': ['end', 'finish', 'to', 'until'],
      'Track Name': ['track', 'stadium', 'arena', 'venue', 'field', 'park', 'speedway'],
      'City': ['city', 'town', 'municipality', 'locale'],
      'State': ['state', 'province', 'region'],
      'Country': ['country', 'nation', 'land'],
      'Capacity': ['capacity', 'seats', 'size', 'attendance'],
      'Owner': ['owner', 'ownership', 'proprietor'],
      'Host Broadcaster': ['broadcaster', 'network', 'channel', 'station'],
      'Territory': ['territory', 'region', 'area', 'market', 'broadcast territory'],
      // Add exact broadcast field mappings
      'Name of company': ['company', 'broadcaster', 'network', 'name of company'],
      'Broadcast Client': ['client', 'entity', 'league', 'team', 'broadcast client'],
      'Client Type': ['type', 'category', 'client type', 'entity type'],
      'Broadcast Territory': ['territory', 'region', 'area', 'market', 'broadcast territory'],
      'Start date of Rights': ['start', 'begin', 'from', 'start date', 'start date of rights'],
      'End date of Rights': ['end', 'finish', 'to', 'until', 'end date', 'end date of rights']
    };
    
    // Try to determine positions by analyzing the array data
    if (Array.isArray(sourceRecord) && sourceRecord.length > 0) {
      // First, check if we have header information that might help
      const headers = sourceRecord['__headers__'] || [];
      
      // Log what we're working with
      console.log('Smart field position detection:', {
        hasHeaders: Array.isArray(headers) && headers.length > 0,
        headerSample: Array.isArray(headers) ? headers.slice(0, 5) : [],
        recordLength: sourceRecord.length,
        recordSample: sourceRecord.slice(0, 5)
      });
      
      // If we have headers, use them to map field positions
      if (Array.isArray(headers) && headers.length > 0) {
        // Map each field name to its position in the headers
        Object.entries(fieldPatterns).forEach(([fieldName, patterns]) => {
          // Try to find a match in the headers
          const matchIndex = headers.findIndex(header => 
            header && 
            patterns.some(pattern => header.toLowerCase().includes(pattern))
          );
          
          if (matchIndex >= 0) {
            fieldPositions[fieldName] = matchIndex;
            console.log(`Found position for ${fieldName} at index ${matchIndex} in headers`);
          }
        });
      }
      
      // If we couldn't find positions from headers, try to infer from the data values
      if (Object.keys(fieldPositions).length === 0) {
        console.log('No header-based positions found, trying to infer from values');
        
        // Analyze the values to guess field types
        sourceRecord.forEach((value, index) => {
          const stringValue = String(value || '').trim().toLowerCase();
          if (!stringValue) return; // Skip empty values
          
          // Look for patterns in the values
          if (index === 0 && stringValue) {
            // First position is typically a name
            fieldPositions['Name'] = 0;
            fieldPositions['Company Name'] = 0;
            fieldPositions['Track Name'] = 0;
            fieldPositions['League Full Name'] = 0;
            console.log('Assuming first position is a name field');
          }
          
          // Look for obvious stadium/track names
          if (stringValue.includes('stadium') || 
              stringValue.includes('arena') || 
              stringValue.includes('field') || 
              stringValue.includes('park') ||
              stringValue.includes('speedway') ||
              stringValue.includes('track')) {
            fieldPositions['Track Name'] = index;
            console.log(`Detected stadium/track name at position ${index}: ${stringValue}`);
          }
          
          // Look for city names
          const commonCities = ['new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 
                               'san antonio', 'san diego', 'dallas', 'san jose', 'indianapolis', 'jacksonville', 
                               'san francisco', 'austin', 'columbus', 'charlotte', 'denver'];
          if (commonCities.includes(stringValue)) {
            fieldPositions['City'] = index;
            console.log(`Detected city at position ${index}: ${stringValue}`);
          }
          
          // Look for state names or abbreviations
          const usStateAbbrs = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 
                               'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 
                               'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 
                               'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
          if (usStateAbbrs.includes(value) || usStateAbbrs.includes(stringValue.toUpperCase())) {
            fieldPositions['State'] = index;
            console.log(`Detected state abbreviation at position ${index}: ${value}`);
          }
          
          // Look for country names
          const commonCountries = ['usa', 'united states', 'us', 'canada', 'mexico', 'uk', 'united kingdom', 'germany', 'france'];
          if (commonCountries.includes(stringValue)) {
            fieldPositions['Country'] = index;
            console.log(`Detected country at position ${index}: ${stringValue}`);
          }
          
          // Look for capacity values (numeric values over 1000)
          const numericValue = parseInt(stringValue.replace(/[^\d]/g, ''), 10);
          if (!isNaN(numericValue) && numericValue > 1000) {
            fieldPositions['Capacity'] = index;
            console.log(`Detected possible capacity at position ${index}: ${numericValue}`);
          }
          
          // Look for sport names
          const commonSports = ['baseball', 'basketball', 'football', 'soccer', 'hockey', 'tennis', 
                              'golf', 'racing', 'nascar', 'formula 1', 'f1', 'indycar'];
          if (commonSports.includes(stringValue)) {
            fieldPositions['Sport'] = index;
            console.log(`Detected sport at position ${index}: ${stringValue}`);
          }
        });
      }
      
      // Indianapolis Motor Speedway format fallbacks - as a last resort only
      // These are only used if we couldn't detect fields using smarter methods
      if (!fieldPositions['Track Name'] && isStadiumEntity) fieldPositions['Track Name'] = 0;
      if (!fieldPositions['City'] && isStadiumEntity) fieldPositions['City'] = 2;
      if (!fieldPositions['State'] && isStadiumEntity) fieldPositions['State'] = 3;
      if (!fieldPositions['Country'] && isStadiumEntity) fieldPositions['Country'] = 4;
      if (!fieldPositions['Capacity'] && isStadiumEntity) fieldPositions['Capacity'] = 5;
      
      // Production entity format fallbacks - as a last resort only
      if (!fieldPositions['Company Name'] && isProductionEntity) fieldPositions['Company Name'] = 0;
      if (!fieldPositions['Service Type'] && isProductionEntity) fieldPositions['Service Type'] = 1;
      if (!fieldPositions['Entity Name'] && isProductionEntity) fieldPositions['Entity Name'] = 2;
      if (!fieldPositions['Entity Type'] && isProductionEntity) fieldPositions['Entity Type'] = 3;
      
      // Broadcast rights entity format fallbacks - as a last resort only
      if (!fieldPositions['Company Name'] && isBroadcastEntity) fieldPositions['Company Name'] = 0;
      if (!fieldPositions['Entity Name'] && isBroadcastEntity) fieldPositions['Entity Name'] = 1;
      if (!fieldPositions['Entity Type'] && isBroadcastEntity) fieldPositions['Entity Type'] = 2;
      if (!fieldPositions['Territory'] && isBroadcastEntity) fieldPositions['Territory'] = 3;
      if (!fieldPositions['Start Date'] && isBroadcastEntity) fieldPositions['Start Date'] = 4;
      if (!fieldPositions['End Date'] && isBroadcastEntity) fieldPositions['End Date'] = 5;
      
      // Add exact broadcast field name mappings for the UI field names
      if (!fieldPositions['Name of company'] && isBroadcastEntity) fieldPositions['Name of company'] = 0;
      if (!fieldPositions['Broadcast Client'] && isBroadcastEntity) fieldPositions['Broadcast Client'] = 1;
      if (!fieldPositions['Client Type'] && isBroadcastEntity) fieldPositions['Client Type'] = 2;
      if (!fieldPositions['Broadcast Territory'] && isBroadcastEntity) fieldPositions['Broadcast Territory'] = 3;
      if (!fieldPositions['Start date of Rights'] && isBroadcastEntity) fieldPositions['Start date of Rights'] = 4;
      if (!fieldPositions['End date of Rights'] && isBroadcastEntity) fieldPositions['End date of Rights'] = 5;
      
      console.log('Final field positions detected:', fieldPositions);
    }
    
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
    
    // Special handling for broadcast rights entity using intelligent field detection
    if (isBroadcastEntity && isArrayData && Array.isArray(sourceRecord) && sourceRecord.length >= 3) {
      console.log('Smart broadcast rights entity mapping for array data with length:', sourceRecord.length);
      console.log('Array data:', sourceRecord);
      
      // For broadcast rights, make sure the critical fields are set correctly
      if (!transformedData.broadcast_company_id && (mappings.broadcast_company_id || Object.keys(mappings).includes('broadcast_company_id'))) {
        transformedData.broadcast_company_id = sourceRecord[0]; // First element is typically the company name
        console.log('Set broadcast company ID from first array element:', transformedData.broadcast_company_id);
      }
      
      if (!transformedData.entity_id && (mappings.entity_id || Object.keys(mappings).includes('entity_id'))) {
        transformedData.entity_id = sourceRecord[1]; // Second element is typically the entity name (league, team, etc.)
        console.log('Set entity ID from second array element:', transformedData.entity_id);
      }
      
      if (!transformedData.entity_type && (mappings.entity_type || Object.keys(mappings).includes('entity_type'))) {
        let entityType = sourceRecord[2]; // Third element is typically the entity type
        
        // Normalize entity type to match expected values
        if (entityType) {
          // Remove "Series" suffix if present
          if (typeof entityType === 'string' && entityType.includes('Series')) {
            entityType = 'league';
          } else if (typeof entityType === 'string') {
            entityType = entityType.toLowerCase();
            if (entityType.includes('league')) entityType = 'league';
            else if (entityType.includes('team')) entityType = 'team';
            else if (entityType.includes('game')) entityType = 'game';
            else if (entityType.includes('stadium')) entityType = 'stadium';
            else if (entityType.includes('conference') || entityType.includes('division')) entityType = 'division_conference';
            else entityType = 'league'; // Default to league if we can't determine
          } else {
            entityType = 'league'; // Default to league if not a string
          }
        } else {
          entityType = 'league'; // Default to league if not provided
        }
        
        transformedData.entity_type = entityType;
        console.log('Set entity type from third array element with normalization:', transformedData.entity_type);
      }
      
      if (!transformedData.territory && (mappings.territory || Object.keys(mappings).includes('territory'))) {
        transformedData.territory = sourceRecord[3]; // Fourth element is typically the territory
        console.log('Set territory from fourth array element:', transformedData.territory);
      }
      
      if (!transformedData.start_date && (mappings.start_date || Object.keys(mappings).includes('start_date'))) {
        let startDate = sourceRecord[4]; // Fifth element is typically the start date
        
        // Handle year-only dates
        if (startDate && typeof startDate === 'string' && /^\d{4}$/.test(startDate)) {
          startDate = `${startDate}-01-01`;
        }
        
        transformedData.start_date = startDate;
        console.log('Set start date from fifth array element:', transformedData.start_date);
      }
      
      if (!transformedData.end_date && (mappings.end_date || Object.keys(mappings).includes('end_date'))) {
        let endDate = sourceRecord[5]; // Sixth element is typically the end date
        
        // Handle year-only dates
        if (endDate && typeof endDate === 'string' && /^\d{4}$/.test(endDate)) {
          endDate = `${endDate}-12-31`;
        }
        
        transformedData.end_date = endDate;
        console.log('Set end date from sixth array element:', transformedData.end_date);
      }
    }
    
    // Special handling for stadium entity data using intelligent field detection
    if (isStadiumEntity && isArrayData && Array.isArray(sourceRecord) && sourceRecord.length >= 3) {
      console.log('Smart stadium entity mapping for array data with length:', sourceRecord.length);
      console.log('Array data:', sourceRecord);
      
      // Define patterns to search for in the array elements
      const namePatterns = ['stadium', 'arena', 'track', 'field', 'park', 'complex', 'speedway', 'center'];
      const cityPatterns = ['city', 'town', 'village', 'municipality'];
      const statePatterns = ['state', 'province', 'region', 'territory'];
      const countryPatterns = ['country', 'nation', 'land'];
      const capacityPatterns = ['capacity', 'seats', 'attendance', 'size'];
      
      // Try to find data by evaluating each element in the array
      for (let i = 0; i < sourceRecord.length; i++) {
        const value = String(sourceRecord[i] || '').trim();
        if (!value) continue; // Skip empty values
        
        // Fix name if missing - look for stadium-like terms or just use the first element if name is still missing
        if (!transformedData.name && (mappings.name || Object.keys(mappings).includes('name'))) {
          const isStadiumName = namePatterns.some(pattern => 
            value.toLowerCase().includes(pattern)
          );
          
          if (isStadiumName || i === 0) {
            transformedData.name = value;
            console.log(`Smart detected stadium name at position ${i}:`, value);
          }
        }
        
        // Try to find city
        if (!transformedData.city && (mappings.city || Object.keys(mappings).includes('city'))) {
          // Check if this looks like a city (common cities, or has "city" in the field name)
          const looksLikeCity = cityPatterns.some(pattern => String(sourceRecord[i-1] || '').toLowerCase().includes(pattern)) ||
                               ['indianapolis', 'chicago', 'new york', 'los angeles', 'miami', 'boston'].includes(value.toLowerCase());
          
          if (looksLikeCity) {
            transformedData.city = value;
            console.log(`Smart detected city at position ${i}:`, value);
          }
        }
        
        // Try to find state
        if (!transformedData.state && (mappings.state || Object.keys(mappings).includes('state'))) {
          // Check if this looks like a state
          const usStates = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 
                          'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 
                          'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 
                          'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 
                          'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 
                          'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 
                          'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 
                          'wisconsin', 'wyoming'];
          
          const usStateAbbrs = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 
                               'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 
                               'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 
                               'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
          
          const looksLikeState = statePatterns.some(pattern => String(sourceRecord[i-1] || '').toLowerCase().includes(pattern)) ||
                                usStates.includes(value.toLowerCase()) ||
                                usStateAbbrs.includes(value.toUpperCase());
          
          if (looksLikeState) {
            transformedData.state = value;
            console.log(`Smart detected state at position ${i}:`, value);
          }
        }
        
        // Try to find country
        if (!transformedData.country && (mappings.country || Object.keys(mappings).includes('country'))) {
          // Check if this looks like a country
          const commonCountries = ['usa', 'united states', 'us', 'canada', 'mexico', 'uk', 'united kingdom', 
                                 'australia', 'germany', 'france', 'spain', 'italy', 'brazil', 'china', 'japan'];
          
          const looksLikeCountry = countryPatterns.some(pattern => String(sourceRecord[i-1] || '').toLowerCase().includes(pattern)) ||
                                  commonCountries.includes(value.toLowerCase());
          
          if (looksLikeCountry) {
            transformedData.country = value;
            console.log(`Smart detected country at position ${i}:`, value);
          }
        }
        
        // Try to find capacity
        if (!transformedData.capacity && (mappings.capacity || Object.keys(mappings).includes('capacity'))) {
          // Check if this looks like a capacity number
          const isNumeric = /^[\d,]+$/.test(value.replace(/[^\d,]/g, ''));
          const looksLikeCapacity = capacityPatterns.some(pattern => String(sourceRecord[i-1] || '').toLowerCase().includes(pattern)) ||
                                   (isNumeric && parseInt(value.replace(/[^\d]/g, ''), 10) > 1000);
          
          if (looksLikeCapacity) {
            // Clean the capacity value to ensure it's a number
            transformedData.capacity = parseInt(value.replace(/[^\d]/g, ''), 10);
            console.log(`Smart detected capacity at position ${i}:`, transformedData.capacity);
          }
        }
      }
      
      // Apply additional inference for missing required fields
      
      // For stadium name - use first element if still missing
      if (!transformedData.name && (mappings.name || Object.keys(mappings).includes('name')) && sourceRecord[0]) {
        transformedData.name = sourceRecord[0];
        console.log('Falling back to first element for stadium name:', transformedData.name);
      }
      
      // For city - look for city-like string (not a state or country) if not found by other means
      if (!transformedData.city && (mappings.city || Object.keys(mappings).includes('city'))) {
        for (let i = 0; i < sourceRecord.length; i++) {
          const value = String(sourceRecord[i] || '').trim();
          if (!value) continue;
          
          // Skip if this is already identified as another field
          if (value === transformedData.name || 
              value === transformedData.state || 
              value === transformedData.country) {
            continue;
          }
          
          // Skip if it looks like a number or has "capacity" related patterns
          if (/^\d+$/.test(value) || capacityPatterns.some(p => value.toLowerCase().includes(p))) {
            continue;
          }
          
          // If we get here, this might be a city - try it
          transformedData.city = value;
          console.log('Inferred city by elimination process:', transformedData.city);
          break;
        }
      }
      
      // For country - use USA as default if we have a US state and no country
      if (!transformedData.country && transformedData.state && (mappings.country || Object.keys(mappings).includes('country'))) {
        const usStateAbbrs = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 
                            'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 
                            'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 
                            'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
        
        const usStates = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 
                        'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 
                        'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 
                        'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 
                        'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 
                        'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 
                        'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 
                        'wisconsin', 'wyoming'];
        
        const isUSState = usStateAbbrs.includes(transformedData.state.toUpperCase()) || 
                         usStates.includes(transformedData.state.toLowerCase());
                         
        if (isUSState) {
          transformedData.country = 'USA';
          console.log('Inferred USA as country from US state:', transformedData.state);
        }
      }
      
      // Final fallback for missing required fields - check raw array positions if we can't find anything else
      if (!transformedData.city && sourceRecord[2] && (mappings.city || Object.keys(mappings).includes('city'))) {
        transformedData.city = sourceRecord[2];
        console.log('Last resort: Using position 2 for city:', transformedData.city);
      }
      
      if (!transformedData.country && sourceRecord[4] && (mappings.country || Object.keys(mappings).includes('country'))) {
        transformedData.country = sourceRecord[4];
        console.log('Last resort: Using position 4 for country:', transformedData.country);
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