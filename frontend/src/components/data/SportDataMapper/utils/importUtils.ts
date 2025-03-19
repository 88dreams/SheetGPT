import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { sportsService } from '../../../../services/sportsService';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../../services/SportsDatabaseService';

/**
 * Transform source data based on field mappings
 */
export const transformMappedData = (
  mappings: Record<string, string>,
  sourceRecord: Record<string, any>
): Record<string, any> => {
  const transformedData: Record<string, any> = {};
  
  // mappings contains { databaseField: sourceField } mappings
  Object.entries(mappings).forEach(([databaseField, sourceField]) => {
    transformedData[databaseField] = sourceRecord[sourceField];
  });
  
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
  
  if (entityType === 'brand_relationship') {
    console.log('Using special handling for brand_relationship');
    const response = await api.sports.createBrandRelationship(data);
    return !!response;
  }
  
  // Special handling for broadcast entity due to backend service issue
  if (entityType === 'broadcast') {
    console.log('Using special handling for broadcast entity');
    try {
      console.log('Using direct API call for broadcast entity creation:', data);
      
      // Check what API endpoint we actually need
      console.log('Analyzing available endpoints for broadcast entity:');
      
      // First, try to make a simple probe request to see if the endpoint is configured
      const baseUrl = window.location.origin;
      const token = localStorage.getItem('auth_token');
      
      // Print all data we'll be sending
      console.log('Data being sent to broadcast-rights endpoint:', JSON.stringify(data, null, 2));
      
      // Include extra context information for debugging
      console.log('Authorization token present:', !!token);
      console.log('Origin URL being used:', baseUrl);
      
      // Make the actual POST request with detailed error handling
      try {
        // Try using the sportsService directly instead of manual fetch
        console.log('Using sportsService.createBroadcastRights instead of direct fetch');
        try {
          const result = await sportsService.createBroadcastRights(data);
          console.log('Successfully created broadcast rights using sportsService:', result);
          return true;
        } catch (serviceError) {
          console.error('Error using sportsService.createBroadcastRights:', serviceError);
          console.log('Falling back to direct fetch approach');
        }
        
        // If service call fails, try manual fetch as fallback
        const response = await fetch(`${baseUrl}/api/v1/sports/broadcast-rights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        
        // Detailed response logging
        console.log('Broadcast API response status:', response.status);
        console.log('Broadcast API response status text:', response.statusText);
        
        // Try to read the response body
        let responseText;
        try {
          responseText = await response.text();
          console.log('Response text:', responseText);
        } catch (e) {
          console.log('Could not read response text:', e);
        }
        
        // If not successful, show detailed error
        if (!response.ok) {
          throw new Error(`API Error (${response.status}): ${responseText || response.statusText}`);
        }
        
        // Parse JSON only if we got a successful response
        let responseData;
        try {
          responseData = responseText ? JSON.parse(responseText) : null;
          console.log('Broadcast creation response:', responseData);
        } catch (e) {
          console.error('Error parsing response JSON:', e);
          // If we can't parse it as JSON but got a 2xx status, consider it a success
          if (response.ok) {
            return true;
          }
          throw new Error(`Invalid JSON response: ${responseText}`);
        }
        
        return !!responseData;
      } catch (fetchError) {
        console.error('Error making fetch request:', fetchError);
        // Create a log of all the request details to help diagnose the problem
        console.error('Request details:', {
          url: `${baseUrl}/api/v1/sports/broadcast-rights`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer [hidden for security]'
          },
          body: JSON.stringify(data)
        });
        throw fetchError;
      }
    } catch (error) {
      console.error('Error creating broadcast entity:', error);
      // For this entity type, we'll continue despite errors
      console.warn('Continuing despite broadcast entity creation error');
      return false;
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
 * Format error message from various error types, with special handling for common database errors
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const errorMessage = error.message;
    
    // Special handling for invalid/placeholder broadcast company UUID
    if (errorMessage.includes('broadcast_company_id') && 
        (errorMessage.includes('should be a valid UUID') || 
         errorMessage.includes('NEW-COMP-ANY0'))) {
      
      return `The broadcast company name you entered does not exist in the database and cannot be automatically created. Please create the broadcast company first using the Entity menu, then try again.`;
    }
    
    // Special handling for broadcast company not found 
    if (errorMessage.includes('Broadcast_company with name') && errorMessage.includes('not found')) {
      // Extract the company name from the error message
      const match = errorMessage.match(/Broadcast_company with name '([^']+)' not found/);
      if (match && match[1]) {
        const companyName = match[1];
        return `Broadcast company "${companyName}" not found. Please create it first using the Entity menu, then try again.`;
      }
      
      // If we can't extract the name, use a generic message
      return `Broadcast company not found. Please create it first using the Entity menu, then try again.`;
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