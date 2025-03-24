import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { saveEntityToDatabase, processDivisionConferenceReference, transformMappedData } from './importUtils';

export interface ImportResults {
  success: number;
  failed: number;
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
  }>
): Promise<ImportResults> => {
  const results: ImportResults = {
    success: 0,
    failed: 0,
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
    
    // Count successes and failures
    results.success += batchResults.filter(result => result.success).length;
    results.failed += batchResults.filter(result => !result.success).length;
    
    // Collect any new broadcast companies
    batchResults.forEach(result => {
      if (result.success && result.newBroadcastCompany) {
        results.newBroadcastCompanies.push(result.newBroadcastCompany);
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
  maxRetries: number = 2  // Reduced default retries since we have better handling
): Promise<{ success: boolean; newBroadcastCompany?: { name: string; id: string }; error?: string }> => {
  let retries = maxRetries;
  let lastError: Error | null = null;
  
  while (retries > 0) {
    try {
      // Transform and map data
      const mappedData = transformMappedData(mappings, record);
      
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
        api,
        record
      );
      
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