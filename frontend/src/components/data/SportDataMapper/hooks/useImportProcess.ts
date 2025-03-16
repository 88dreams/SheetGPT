import { useState, useCallback } from 'react';
import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';

// Import utility functions and types
import { formatErrorMessage, transformMappedData, processDivisionConferenceReference, saveEntityToDatabase } from '../utils/importUtils';
import { processBatchedData, processEntityRecord, ImportResults } from '../utils/batchProcessor';
import { useNotificationManager, NotificationType } from '../utils/notificationManager';

/**
 * Custom hook for handling the import process in the SportDataMapper component
 */
export default function useImportProcess() {
  // Loading states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isBatchImporting, setIsBatchImporting] = useState<boolean>(false);
  
  // Results tracking
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  
  // Notification management
  const { notification, showNotification } = useNotificationManager();
  
  /**
   * Save a single record to the database
   */
  const saveToDatabase = useCallback(async (
    entityType: EntityType,
    mappedData: Record<string, string>,
    currentRecord: Record<string, any>,
    isUpdateMode: boolean = false
  ): Promise<boolean> => {
    // Validate input
    if (!entityType || Object.keys(mappedData).length === 0) {
      showNotification('error', 'Please select an entity type and map at least one field');
      return false;
    }
    
    if (!currentRecord) {
      showNotification('error', 'No record selected to save');
      return false;
    }
    
    setIsSaving(true);
    
    try {
      // Transform the mappings to data
      const transformedData = transformMappedData(mappedData, currentRecord);
      console.log('Transformed Data:', transformedData);
      
      // Determine if we're updating or creating
      const effectiveUpdateMode = isUpdateMode || Object.keys(mappedData).length === 1;
      
      // Map UI field names to database field names and resolve references
      const databaseMappedData = await enhancedMapToDatabaseFieldNames(
        entityType, 
        transformedData,
        api,
        currentRecord
      );
      
      // Process special fields
      const processedData = await processDivisionConferenceReference(entityType, databaseMappedData);
      
      // Validate the data
      const validation = validateEntityData(entityType, processedData, effectiveUpdateMode);
      if (!validation.isValid) {
        const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
        showNotification('error', errorMessage);
        console.error('Validation errors:', validation.errors);
        return false;
      }
      
      // Save to database
      const success = await saveEntityToDatabase(entityType, processedData, effectiveUpdateMode);
      
      if (success) {
        showNotification('success', `Successfully saved ${entityType} to database`);
      }
      
      return success;
    } catch (error) {
      console.error('Error saving to database:', error);
      const errorMessage = formatErrorMessage(error);
      showNotification('error', `Error saving to database: ${errorMessage}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [showNotification]);
  
  /**
   * Batch import multiple records to the database
   */
  const batchImport = useCallback(async (
    entityType: EntityType,
    mappings: Record<string, string>,
    recordsToImport: any[],
    isUpdateMode: boolean = false
  ) => {
    // Validate input
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
      // Setup progress reporting
      const onProgressUpdate = (currentBatch: number, totalBatches: number, progressPercent: number) => {
        const start = (currentBatch - 1) * 10 + 1;
        const end = Math.min(start + 9, recordsToImport.length);
        
        showNotification(
          'info', 
          `Importing batch ${currentBatch} of ${totalBatches}...`, 
          `Processing records ${start} to ${end} (${progressPercent}% complete)`
        );
      };
      
      // Configure record processor
      const processRecord = async (record: any) => {
        return processEntityRecord(record, entityType, mappings, isUpdateMode);
      };
      
      // Process all records in batches
      const results = await processBatchedData(
        recordsToImport,
        10,  // batch size
        onProgressUpdate,
        processRecord
      );
      
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
  }, [showNotification]);

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