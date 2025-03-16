import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { saveEntityToDatabase, processDivisionConferenceReference, transformMappedData } from './importUtils';

export interface ImportResults {
  success: number;
  failed: number;
  total: number;
}

/**
 * Process data in batches with progress updates
 */
export const processBatchedData = async (
  records: any[],
  batchSize: number,
  onProgressUpdate: (currentBatch: number, totalBatches: number, progressPercent: number) => void,
  processRecord: (record: any) => Promise<boolean>
): Promise<ImportResults> => {
  const results: ImportResults = {
    success: 0,
    failed: 0,
    total: records.length
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
          const success = await processRecord(record);
          return success;
        } catch (error) {
          console.error('Error processing record:', error);
          return false;
        }
      })
    );
    
    // Count successes and failures
    results.success += batchResults.filter(success => success).length;
    results.failed += batchResults.filter(success => !success).length;
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
  maxRetries: number = 3
): Promise<boolean> => {
  let retries = maxRetries;
  
  while (retries > 0) {
    try {
      // Transform and map data
      const mappedData = transformMappedData(mappings, record);
      
      // Determine effective update mode
      const effectiveUpdateMode = isUpdateMode || Object.keys(mappings).length === 1;
      
      // Validate the data
      const validationResult = validateEntityData(entityType, mappedData, effectiveUpdateMode);
      if (!validationResult.isValid) {
        console.error(`Validation failed for record:`, validationResult.errors);
        return false;
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
      await saveEntityToDatabase(entityType, processedData, effectiveUpdateMode);
      
      return true; // Success
    } catch (error) {
      console.error(`Error processing record (attempt ${maxRetries - retries + 1}/${maxRetries}):`, error);
      retries--;
      
      // Handle authentication errors immediately
      if (error instanceof Error && error.message.includes('401')) {
        console.error('Authentication error detected');
        return false;
      }
      
      if (retries > 0) {
        // Wait before retrying (exponential backoff)
        const delayMs = (maxRetries - retries + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return false; // Failed after all retries
};