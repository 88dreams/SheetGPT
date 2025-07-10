import { EntityType, isValidUUID } from './entityTypes';

/**
 * Validate entity data before sending to the database
 * @param entityType The type of entity to validate
 * @param data The entity data to validate
 * @param isUpdateMode If true, only validates the fields that are provided (for partial updates)
 */
export const validateEntityData = (
  entityType: EntityType, 
  data: Record<string, any>,
  isUpdateMode: boolean = false
): { isValid: boolean; errors: string[] } => {
  console.log(`Validating ${entityType} data (updateMode=${isUpdateMode}):`, JSON.stringify(data, null, 2));
  
  // In update mode, we skip validation for required fields that aren't present
  // This allows for partial updates to existing records
  if (isUpdateMode) {
    return { isValid: true, errors: [] };
  }
  
  const errors: string[] = [];
  
  // Common validation for all entities except those that don't require name field
  if (entityType !== 'broadcast_rights' && entityType !== 'production_service' && !data.name) {
    errors.push('Name is required');
    console.warn(`${entityType} validation error: Name is required`);
  }
  
  // Entity-specific validation
  switch (entityType) {
    case 'league':
      if (!data.sport) {
        errors.push('Sport is required');
        console.warn(`League validation error: Sport is required`);
      }
      if (!data.country) {
        errors.push('Country is required');
        console.warn(`League validation error: Country is required`);
      }
      break;
      
    case 'division_conference':
      // Check if either league_id or league_name is provided
      if (!data.league_id && !data.league_name) {
        errors.push('Either League ID or League Name is required');
        console.warn(`Division/Conference validation error: Either League ID or League Name is required`);
      } else if (data.league_id && isValidUUID(data.league_id)) {
        // Only validate UUID format if it's meant to be a UUID
        console.log('Using provided league_id as UUID');
      } else {
        // Treat non-UUID league_id as league_name
        console.log('Treating league_id as league_name:', data.league_id);
        data.league_name = data.league_id;
        delete data.league_id;
      }
      
      if (!data.type) {
        errors.push('Type is required');
        console.warn(`Division/Conference validation error: Type is required`);
      }
      break;
      
    case 'team':
      // Check if either league_id or league_name is provided
      if (!data.league_id && !data.league_name) {
        errors.push('Either League ID or League Name is required');
        console.warn(`Team validation error: Either League ID or League Name is required`);
      } else if (data.league_id && isValidUUID(data.league_id)) {
        // Only validate UUID format if it's meant to be a UUID
        console.log('Using provided league_id as UUID');
      } else {
        // Treat non-UUID league_id as league_name
        console.log('Treating league_id as league_name:', data.league_id);
        data.league_name = data.league_id;
        delete data.league_id;
      }
      
      // Handle stadium - it's optional but if provided should be valid
      if (data.stadium_id) {
        if (isValidUUID(data.stadium_id)) {
          console.log('Using provided stadium_id as UUID');
        } else {
          // Treat non-UUID stadium_id as stadium_name
          console.log('Treating stadium_id as stadium_name:', data.stadium_id);
          data.stadium_name = data.stadium_id;
          delete data.stadium_id;
        }
      }
      
      // if (!data.city) {
      //   errors.push('City is required');
      //   console.warn(`Team validation error: City is required`);
      // }
      if (!data.country) {
        errors.push('Country is required');
        console.warn(`Team validation error: Country is required`);
      }
      break;
      
    case 'stadium':
      if (!data.city) {
        errors.push('City is required');
        console.warn(`Stadium validation error: City is required`);
      }
      if (!data.country) {
        errors.push('Country is required');
        console.warn(`Stadium validation error: Country is required`);
      }
      // Log all stadium fields for debugging
      console.log('Stadium validation fields check:', {
        name: data.name ? 'Present' : 'Missing',
        city: data.city ? 'Present' : 'Missing',
        country: data.country ? 'Present' : 'Missing',
        state: data.state ? 'Present' : 'N/A',
        capacity: data.capacity ? 'Present' : 'N/A',
        owner: data.owner ? 'Present' : 'N/A',
        naming_rights_holder: data.naming_rights_holder ? 'Present' : 'N/A',
        host_broadcaster: data.host_broadcaster ? 'Present' : 'N/A',
        host_broadcaster_id: data.host_broadcaster_id ? 'Present' : 'N/A'
      });
      
      // Clean and validate capacity if present
      if (data.capacity !== undefined && data.capacity !== null) {
        // Remove non-numeric characters before validation
        const cleanedCapacity = String(data.capacity).replace(/[^\d]/g, '');
        const capacityNum = parseInt(cleanedCapacity);
        if (isNaN(capacityNum)) {
          errors.push('Capacity must be a number');
          console.warn(`Stadium validation error: Capacity must be a number, got: ${data.capacity}`);
        } else {
          // Update the data with the cleaned capacity
          data.capacity = capacityNum;
        }
      }
      
      // Clean entity names that might have special characters
      if (data.name) {
        data.name = data.name.trim();
        console.log(`Stadium name normalized: "${data.name}"`);
      }
      
      // Check if host_broadcaster_id is a valid UUID if present
      if (data.host_broadcaster_id && !isValidUUID(data.host_broadcaster_id)) {
        errors.push('Host broadcaster ID must be a valid UUID');
        console.warn(`Stadium validation error: Host broadcaster ID must be a valid UUID, got: ${data.host_broadcaster_id}`);
      }
      break;
      
    case 'player':
      // Only validate team_id if it's present and not a valid UUID
      if (data.team_id && !isValidUUID(data.team_id)) {
        errors.push('Team ID must be a valid UUID if provided');
      }
      
      if (!data.position) {
        errors.push('Position is required');
      }
      break;
      
    case 'game':
      if (!data.league_id) {
        errors.push('League ID is required');
      } else if (!isValidUUID(data.league_id)) {
        errors.push('League ID must be a valid UUID');
      }
      
      if (!data.home_team_id) {
        errors.push('Home Team ID is required');
      } else if (!isValidUUID(data.home_team_id)) {
        errors.push('Home Team ID must be a valid UUID');
      }
      
      if (!data.away_team_id) {
        errors.push('Away Team ID is required');
      } else if (!isValidUUID(data.away_team_id)) {
        errors.push('Away Team ID must be a valid UUID');
      }
      
      if (!data.stadium_id) {
        errors.push('Stadium ID is required');
      } else if (!isValidUUID(data.stadium_id)) {
        errors.push('Stadium ID must be a valid UUID');
      }
      
      if (!data.date) {
        errors.push('Date is required');
      }
      
      if (!data.season_year) {
        errors.push('Season Year is required');
      }
      
      if (!data.season_type) {
        errors.push('Season Type is required');
      }
      break;
      
    case 'broadcast_rights':
      // Check required fields
      if (!data.broadcast_company_id) {
        errors.push('Broadcast Company ID or Name is required');
      } 
      // Check if we're using our special placeholder UUID for a new company
      else if (data.broadcast_company_id === "00000000-NEW-COMP-ANY0-000000000000" && !data._usingBrandAsBroadcastCompany) {
        // Only show error if we're not using a brand as a broadcast company
        if (data._newBroadcastCompanyName) {
          errors.push(`Broadcast company "${data._newBroadcastCompanyName}" not found in the database. Please create it first using the Entity menu, then try again.`);
        } else {
          errors.push('Broadcast company not found. Please create it first using the Entity menu, then try again.');
        }
      }
      // If we're using a brand as a broadcast company, make sure it's valid
      else if (data._usingBrandAsBroadcastCompany) {
        // Make sure we have a valid UUID
        if (!isValidUUID(data.broadcast_company_id)) {
          errors.push('Invalid brand ID used for broadcast company');
        } else {
          console.log(`Using brand "${data._brandName}" as broadcast company with ID: ${data.broadcast_company_id}`);
        }
      }
      // Handle special characters in broadcast_company_id if it's a string (name)
      else if (typeof data.broadcast_company_id === 'string' && !isValidUUID(data.broadcast_company_id)) {
        // Trim whitespace and normalize string
        data.broadcast_company_id = data.broadcast_company_id.trim();
        console.log(`Normalized broadcast_company_id: "${data.broadcast_company_id}"`);
        
        // Handle parentheses in company names
        if (data.broadcast_company_id.includes('(')) {
          const baseName = data.broadcast_company_id.split('(')[0].trim();
          console.log(`Found parentheses in broadcast company name, extracting base name: "${baseName}"`);
          // Store original name for reference
          data._original_company_name = data.broadcast_company_id;
          // Use base name for lookup if needed
          data._base_company_name = baseName;
        }
      }
      // We don't validate UUID format for broadcast_company_id since it can be a name
      // that will be resolved to an existing company or create a new one
      
      if (!data.entity_type) {
        errors.push('Entity Type is required');
      }
      
      // For all entity types, we'll validate differently based on what's provided
      // If division_conference_id is provided, that takes precedence
      if (data.division_conference_id) {
        console.log(`Division/conference ID provided: ${data.division_conference_id}`);
        
        // If it's a string name and not a UUID, that's fine - we'll resolve it during mapping
        if (typeof data.division_conference_id === 'string' && !isValidUUID(data.division_conference_id)) {
          console.log(`Division/conference ID appears to be a name: "${data.division_conference_id}", will resolve during mapping`);
          // No validation errors here
        }
        // If it's already a UUID, it's good to go
        else if (isValidUUID(data.division_conference_id)) {
          console.log(`Division/conference ID is a valid UUID: ${data.division_conference_id}`);
          
          // If entity_type is division/conference, we'll use this as entity_id too
          if (data.entity_type === 'division_conference' || 
              data.entity_type === 'conference' || 
              data.entity_type === 'division') {
            // Set the entity_id if missing
            if (!data.entity_id) {
              console.log(`Setting entity_id to match division_conference_id: ${data.division_conference_id}`);
              data.entity_id = data.division_conference_id;
            }
          }
        }
        // Otherwise it's an invalid UUID format
        else {
          console.warn(`Division/conference ID is not a valid UUID: ${data.division_conference_id}`);
          errors.push('Division Conference ID must be a valid UUID or a name that can be resolved');
        }
      }
      
      // Check entity_id and validate based on content
      if (data.entity_id) {
        // If it's already a UUID, it's good to go
        if (isValidUUID(data.entity_id)) {
          console.log(`Entity ID is a valid UUID: ${data.entity_id}`);
        }
        // If it's a string name and not a UUID, that's fine - we'll resolve it during mapping
        else if (typeof data.entity_id === 'string') {
          console.log(`Entity ID appears to be a name: "${data.entity_id}", will resolve during mapping`);
          // No validation errors here - we'll try to resolve during mapping
        }
        // Otherwise it's an invalid format
        else {
          console.warn(`Entity ID is not a valid UUID or string: ${data.entity_id}`);
          errors.push('Entity ID must be a valid UUID or a name that can be resolved');
        }
      }
      // If entity_id is missing, check if required based on entity_type
      else {
        if (data.entity_type === 'division_conference' || 
            data.entity_type === 'conference' || 
            data.entity_type === 'division') {
          // For division/conference entity types, we can derive entity_id from division_conference_id
          if (!data.division_conference_id) {
            errors.push('Either Entity ID or Division Conference ID is required for division/conference entities');
          }
        } 
        // For other entity types
        else {
          errors.push('Entity ID is required');
        }
      }
      
      if (!data.territory) {
        errors.push('Territory is required');
      }
      
      // Start and end dates are optional for broadcast rights
      // They will be set to a default value (April 1, 1976) if missing
      // in the mappingUtils.ts file
      break;
      
    case 'game_broadcast':
      if (!data.game_id) {
        errors.push('Game ID is required');
      } else if (!isValidUUID(data.game_id)) {
        errors.push('Game ID must be a valid UUID');
      }
      
      if (!data.broadcast_company_id) {
        errors.push('Broadcast Company ID is required');
      } else if (!isValidUUID(data.broadcast_company_id)) {
        errors.push('Broadcast Company ID must be a valid UUID');
      }
      
      if (!data.broadcast_type) {
        errors.push('Broadcast Type is required');
      }
      
      if (!data.territory) {
        errors.push('Territory is required');
      }
      break;
      
    case 'brand':
      if (!data.industry) {
        errors.push('Industry is required');
      }
      
      // Optional validation for partner fields
      // Check that if partner_relationship is provided, partner is also provided
      if (data.partner_relationship && !data.partner) {
        errors.push('Partner is required when Partner Relationship is specified');
        console.warn('Brand validation error: Partner is required when Partner Relationship is specified');
      }
      break;
      
    // Brand relationship validation has been removed
    // Partner and partner_relationship fields are now part of the Brand entity
      
    case 'league_executive':
      if (!data.league_id) {
        errors.push('League ID is required');
      } else if (!isValidUUID(data.league_id)) {
        errors.push('League ID must be a valid UUID');
      }
      
      if (!data.position) {
        errors.push('Position is required');
      }
      
      if (!data.start_date) {
        errors.push('Start Date is required');
      }
      break;
      
    case 'production_service':
      console.log('Validating production service data:', data);
      
      if (!data.production_company_id) {
        errors.push('Production Company ID is required');
        console.warn('Production Company ID is missing');
      }
      // Don't validate UUID format for production_company_id since it can be a name
      // that will be resolved to an existing company or create a new one
      
      if (!data.entity_type) {
        errors.push('Entity Type is required');
        console.warn('Entity Type is missing');
      }
      
      if (!data.entity_id) {
        errors.push('Entity ID is required');
        console.warn('Entity ID is missing');
      }
      // Don't validate UUID format for entity_id since it can be a name
      // that will be resolved to an existing entity or create a new one
      
      // Enhanced service_type validation with more detailed logging
      if (!data.service_type) {
        errors.push('Service Type is required');
        console.warn('Service Type is missing - Ensure field is properly mapped and non-empty');
        
        // Log all data fields for debugging
        console.log('Production service data keys:', Object.keys(data));
        console.log('Production service data values:', Object.values(data));
      } else {
        console.log(`Service Type is present: "${data.service_type}"`);
      }
      
      // Use default start_date if missing
      if (!data.start_date) {
        console.log('Setting default start_date for production service');
        data.start_date = '2000-01-01';
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 