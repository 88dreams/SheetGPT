import { useState } from 'react';
import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames } from '../../../../utils/sportDataMapper';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../../services/SportsDatabaseService';
import { api } from '../../../../utils/api';

export interface ImportResults {
  success: number;
  failed: number;
  total: number;
}

interface NotificationType {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string;
}

/**
 * Custom hook for handling the import process in the SportDataMapper component
 */
export default function useImportProcess() {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isBatchImporting, setIsBatchImporting] = useState<boolean>(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);

  /**
   * Show a notification message
   */
  const showNotification = (type: 'success' | 'error' | 'info', message: string, details?: string) => {
    setNotification({ type, message, details });
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  /**
   * Save a single record to the database
   */
  const saveToDatabase = async (
    entityType: EntityType,
    mappedData: Record<string, any>,
    currentRecord: Record<string, any>
  ): Promise<boolean> => {
    if (!entityType || Object.keys(mappedData).length === 0) {
      showNotification('error', 'Please select an entity type and map at least one field');
      return false;
    }
    
    setIsSaving(true);
    
    try {
      // Transform the mappings into actual data
      const transformedData: Record<string, any> = {};
      
      console.log('Starting data transformation:');
      console.log('Mapped Data:', mappedData);
      console.log('Current Record:', currentRecord);
      
      // mappedData contains { databaseField: sourceField } mappings
      // e.g., { "name": "League Name" }
      Object.entries(mappedData).forEach(([databaseField, sourceField]) => {
        console.log(`Mapping database field "${databaseField}" using source field "${sourceField}"`);
        console.log(`Value from source:`, currentRecord[sourceField]);
        transformedData[databaseField] = currentRecord[sourceField];
      });
      
      console.log('Transformed Data:', transformedData);

      // Map UI field names back to database field names
      const databaseMappedData = await enhancedMapToDatabaseFieldNames(
        entityType, 
        transformedData,
        api,
        currentRecord
      );
      
      console.log('Saving to database:', { entityType, data: databaseMappedData });
      
      // Validate the data before sending to the database
      const validation = validateEntityData(entityType, databaseMappedData);
      if (!validation.isValid) {
        const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
        showNotification('error', errorMessage);
        console.error('Validation errors:', validation.errors);
        return false;
      }
      
      // Save the entity to the database using the service
      let success = false;
      
      // Special handling for brand_relationship type
      if (entityType === 'brand_relationship') {
        const response = await api.sports.createBrandRelationship(databaseMappedData);
        success = !!response;
      } else {
        const response = await sportsDatabaseService.createEntity(entityType as DbEntityType, databaseMappedData);
        success = !!response;
      }
      
      showNotification('success', `Successfully saved ${entityType} to database`);
      return success;
    } catch (error) {
      console.error('Error saving to database:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract a meaningful error message from the error object
        errorMessage = JSON.stringify(error);
      }
      
      showNotification('error', `Error saving to database: ${errorMessage}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Batch import multiple records to the database
   */
  const batchImport = async (
    entityType: EntityType,
    mappings: Record<string, string>,
    recordsToImport: any[]
  ) => {
    if (!entityType || Object.keys(mappings).length === 0) {
      showNotification('error', 'Please select an entity type and map at least one field');
      return;
    }
    
    if (recordsToImport.length === 0) {
      showNotification('error', 'No records to import', 'All records have been excluded or there are no records available.');
      return;
    }
    
    setIsBatchImporting(true);
    
    try {
      const results: ImportResults = {
        success: 0,
        failed: 0,
        total: recordsToImport.length
      };
      
      // Process records in batches to avoid overwhelming the server
      const batchSize = 10;
      const batches = Math.ceil(recordsToImport.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, recordsToImport.length);
        const batch = recordsToImport.slice(start, end);
        
        // Show progress notification
        const progressPercent = Math.round((i / batches) * 100);
        showNotification(
          'info', 
          `Importing batch ${i + 1} of ${batches}...`, 
          `Processing records ${start + 1} to ${end} (${progressPercent}% complete)`
        );
        
        // Process each record in the batch with retries
        const batchPromises = batch.map(async (record) => {
          let retries = 3;
          while (retries > 0) {
            try {
              // Create mapped data using the provided mappings
              const mappedData: Record<string, any> = {};
              
              // Apply mappings: mappings is { databaseField: sourceField }
              for (const [dbField, sourceField] of Object.entries(mappings)) {
                mappedData[dbField] = record[sourceField];
              }
              
              // Validate the data
              const validationResult = validateEntityData(entityType, mappedData);
              
              if (!validationResult.isValid) {
                console.error(`Validation failed for record:`, validationResult.errors);
                results.failed++;
                return;
              }
              
              // Map UI field names back to database field names
              const databaseMappedData = await enhancedMapToDatabaseFieldNames(
                entityType, 
                mappedData,
                api,
                record
              );
              
              // Save to database
              const dbEntityType = entityType.toLowerCase() as DbEntityType;
              await sportsDatabaseService.createEntity(dbEntityType, databaseMappedData);
              
              results.success++;
              break; // Success, exit retry loop
            } catch (error) {
              console.error(`Error importing record (attempt ${4 - retries}/3):`, error);
              retries--;
              
              if (retries === 0) {
                results.failed++;
                // If it's an authentication error, show a specific message
                if (error instanceof Error && error.message.includes('401')) {
                  showNotification(
                    'error',
                    'Authentication error',
                    'Please ensure you are logged in and try again.'
                  );
                  return;
                }
              } else {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
              }
            }
          }
        });
        
        // Wait for all records in the batch to be processed
        await Promise.all(batchPromises);
      }
      
      setImportResults(results);
      
      // Show final results notification
      if (results.failed === 0) {
        showNotification(
          'success', 
          `Successfully imported ${results.success} records`, 
          `All records were imported successfully.`
        );
      } else {
        showNotification(
          'info', 
          `Imported ${results.success} of ${results.total} records`, 
          `${results.failed} records failed to import. Check the console for details.`
        );
      }
    } catch (error) {
      console.error('Batch import error:', error);
      showNotification(
        'error', 
        'Error during batch import', 
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    } finally {
      setIsBatchImporting(false);
    }
  };

  return {
    isSaving,
    isBatchImporting,
    importResults,
    notification,
    showNotification,
    saveToDatabase,
    batchImport
  };
} 