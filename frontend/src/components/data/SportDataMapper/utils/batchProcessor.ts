import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { saveEntityToDatabase, processDivisionConferenceReference, transformMappedData } from './importUtils';

export interface ImportResults {
  success: number;
  failed: number;
  skipped: number;  // Count of duplicates that were skipped
  total: number;
  newBroadcastCompanies?: Array<{ name: string; id: string }>;  // Track newly created broadcast companies
  errorTypes?: {
    duplicates: number;
    notFound: number;
    validation: number;
    other: number;
  };  // Track error types for better reporting
}

/**
 * Process data in batches with progress updates
 */
export const processBatchedData = async (
  records: any[],
  batchSize: number,
  onProgressUpdate: (currentBatch: number, totalBatches: number, progressPercent: number) => void,
  processRecord: (record: any) => Promise<{ 
    success: boolean; 
    newBroadcastCompany?: { name: string; id: string };
    error?: string;
    isDuplicate?: boolean;
  }>
): Promise<ImportResults> => {
  const results: ImportResults = {
    success: 0,
    failed: 0,
    skipped: 0, // Count of duplicates that were skipped
    total: records.length,
    newBroadcastCompanies: [],
    errorTypes: {
      duplicates: 0,
      notFound: 0,
      validation: 0,
      other: 0
    }
  };
  
  // Calculate batches
  const batches = Math.ceil(records.length / batchSize);
  
  // Process each batch
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, records.length);
    const currentBatch = records.slice(start, end);
    
    // Update progress
    const progressPercent = Math.round((i / batches) * 100);
    onProgressUpdate(i + 1, batches, progressPercent);
    
    // Process all records in the current batch concurrently
    const batchResults = await Promise.all(
      currentBatch.map(async (record) => {
        try {
          const result = await processRecord(record);
          
          // Categorize errors if the operation failed
          if (!result.success && result.error) {
            const errorMsg = result.error.toLowerCase();
            
            if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
              results.errorTypes.duplicates++;
            } else if (errorMsg.includes('not found')) {
              results.errorTypes.notFound++;
            } else if (errorMsg.includes('validation') || errorMsg.includes('valid')) {
              results.errorTypes.validation++;
            } else {
              results.errorTypes.other++;
            }
          }
          
          return result;
        } catch (error) {
          console.error('Error processing record:', error);
          // Count as "other" error
          results.errorTypes.other++;
          return { success: false, error: error.message || 'Unknown error occurred' };
        }
      })
    );
    
    // Count successes, failures, and skipped duplicates
    results.success += batchResults.filter(r => {
      if (!r.success) return false;
      return !('isDuplicate' in r && r.isDuplicate === true);
    }).length;
    results.failed += batchResults.filter(r => !r.success).length;
    results.skipped += batchResults.filter(r => {
      if (!r.success) return false;
      return ('isDuplicate' in r && r.isDuplicate === true);
    }).length;
    
    // Collect any new broadcast companies
    batchResults.forEach(r => {
      // Ensure the result object actually has newBroadcastCompany and it's not undefined
      if (r.success && 'newBroadcastCompany' in r && r.newBroadcastCompany) {
        // The type of r.newBroadcastCompany should be { name: string; id: string; }
        // results.newBroadcastCompanies is Array<{ name: string; id: string }>
        results.newBroadcastCompanies!.push(r.newBroadcastCompany as { name: string; id: string });
      }
    });
  }
  
  return results;
};

/**
 * Process a single entity record with retries
 */
export const processEntityRecord = async (
  record: any,
  entityType: EntityType,
  mappings: Record<string, string>,
  isUpdateMode: boolean,
  sourceFields?: string[],
  maxRetries: number = 2
): Promise<{ success: boolean; newBroadcastCompany?: { name: string; id: string }; error?: string; isDuplicate?: boolean }> => {
  let retries = maxRetries;
  let lastError: Error | null = null;
  
  while (retries > 0) {
    try {
      // Transform and map data, passing sourceFields (headerRow) and explicit entityType
      const mappedData = transformMappedData(mappings, record, sourceFields, entityType);
      
      // Determine effective update mode
      const effectiveUpdateMode = isUpdateMode || Object.keys(mappings).length === 1;
      
      // Validate the data
      const validationResult = validateEntityData(entityType, mappedData, effectiveUpdateMode);
      if (!validationResult.isValid) {
        const errorMsg = `Validation failed: ${validationResult.errors.join(', ')}`;
        console.error(`Validation failed for record:`, validationResult.errors);
        return { success: false, error: errorMsg };
      }
      
      // Map to database field names
      const databaseMappedData = await enhancedMapToDatabaseFieldNames(
        entityType,
        mappedData,
        api
      );
      
      // If this is a production service entity, check for duplicates before saving
      if (entityType === 'production') {
        try {
          // Import checkDuplicateProductionService function
          const { checkDuplicateProductionService } = await import('./importUtils');
          
          // Check for duplicate
          const existingService = await checkDuplicateProductionService(databaseMappedData);
          
          if (existingService) {
            // Skip duplicate with informational message
            const entityName = existingService.entity_name || existingService.entity_type;
            const companyName = existingService.production_company_name || 'Unknown company';
            const errorMsg = `Duplicate: Production service already exists for ${companyName} and ${entityName}`;
            
            console.log('Skipping duplicate production service:', errorMsg);
            
            // Return success=true but flag as duplicate for reporting
            return { 
              success: true, 
              error: errorMsg,
              isDuplicate: true
            };
          }
        } catch (error) {
          console.error('Error during duplicate check:', error);
          // Continue with save operation if duplicate check fails
        }
      }
      
      // If this is a broadcast entity, check for duplicates before saving
      if (entityType === 'broadcast') {
        try {
          // Import checkDuplicateBroadcastRight function
          const { checkDuplicateBroadcastRight } = await import('./importUtils');
          
          // Check for duplicate
          const existingRight = await checkDuplicateBroadcastRight(databaseMappedData);
          
          if (existingRight) {
            // Skip duplicate with informational message
            const entityType = existingRight.entity_type || 'Unknown entity type';
            const entityName = existingRight.entity_name || existingRight.entity_id;
            const companyName = existingRight.broadcast_company_name || 'Unknown company';
            const territory = existingRight.territory || 'Unknown territory';
            const errorMsg = `Duplicate: Broadcast right already exists for ${companyName} and ${entityName} (${entityType}) in ${territory}`;
            
            console.log('Skipping duplicate broadcast right:', errorMsg);
            
            // Return success=true but flag as duplicate for reporting
            return { 
              success: true, 
              error: errorMsg,
              isDuplicate: true
            };
          }
        } catch (error) {
          console.error('Error during duplicate check:', error);
          // Continue with save operation if duplicate check fails
        }
      }
      
      // Process special fields like division_conference_id
      const processedData = await processDivisionConferenceReference(entityType, databaseMappedData);
      
      // Save entity to database
      try {
        const success = await saveEntityToDatabase(entityType, processedData, effectiveUpdateMode);
        
        // Check if a new broadcast company was created and return that info
        if (success && processedData._newBroadcastCompanyCreated) {
          return {
            success: true,
            newBroadcastCompany: processedData._newBroadcastCompanyCreated
          };
        }
        
        return { success: true }; // Success
      } catch (saveError) {
        // Handle specific errors from saveEntityToDatabase
        lastError = saveError;
        
        // Determine which errors to retry and which to fail immediately
        if (saveError instanceof Error) {
          const errorMessage = saveError.message;
          
          // For duplicate entries, don't retry - it won't help
          if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
            console.warn('Duplicate record detected, not retrying:', errorMessage);
            return { success: false, error: errorMessage };
          }
          
          // For entity name not found, don't retry unless entity type is broadcast
          if (errorMessage.includes('not found') && entityType !== 'broadcast') {
            console.warn('Entity not found, not retrying:', errorMessage);
            return { success: false, error: errorMessage };
          }
          
          // For validation errors, don't retry
          if (errorMessage.includes('validation') || errorMessage.includes('Validation')) {
            console.warn('Validation error, not retrying:', errorMessage);
            return { success: false, error: errorMessage };
          }
        }
        
        // For other errors, continue to retry
        throw saveError; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Error processing record (attempt ${maxRetries - retries + 1}/${maxRetries}):`, error);
      
      retries--;
      
      // Handle authentication errors immediately
      if (error instanceof Error && error.message.includes('401')) {
        console.error('Authentication error detected');
        return { success: false, error: 'Authentication error: Please refresh the page and try again.' };
      }
      
      // Handle network errors
      if (error instanceof Error && (
        error.message.includes('network') || 
        error.message.includes('Network') ||
        error.message.includes('Failed to fetch')
      )) {
        console.error('Network error detected');
        return { success: false, error: 'Network error: Please check your connection and try again.' };
      }
      
      // If we have more retries, wait before trying again
      if (retries > 0) {
        // Wait before retrying (exponential backoff)
        const delayMs = (maxRetries - retries + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // Failed after all retries
  const errorMessage = lastError ? lastError.message : 'Unknown error occurred after multiple retries';
  return { success: false, error: errorMessage };
};