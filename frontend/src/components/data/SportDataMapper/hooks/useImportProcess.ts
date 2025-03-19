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
        // Check if a new broadcast company was created during the process
        if (processedData._newBroadcastCompanyCreated) {
          const { name, id } = processedData._newBroadcastCompanyCreated;
          // Show a success notification about both the entity save and the broadcast company creation
          showNotification(
            'success', 
            `Successfully saved ${entityType} to database`, 
            `Also created new broadcast company "${name}" with ID ${id.substring(0, 8)}...`
          );
        } else {
          // Just show regular success notification
          showNotification('success', `Successfully saved ${entityType} to database`);
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error saving to database:', error);
      const errorMessage = formatErrorMessage(error);
      
      // Set autoDismiss to false for errors to give user time to read them
      showNotification(
        'error', 
        `Error saving to database`, 
        errorMessage,
        false // Don't auto-dismiss error messages
      );
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
        // Check if any new broadcast companies were created
        if (results.newBroadcastCompanies && results.newBroadcastCompanies.length > 0) {
          const newCompaniesCount = results.newBroadcastCompanies.length;
          const companiesList = results.newBroadcastCompanies
            .slice(0, 3) // Show max 3 examples
            .map(company => `"${company.name}"`)
            .join(', ');
          
          const additionalText = newCompaniesCount > 3 
            ? ` and ${newCompaniesCount - 3} more` 
            : '';
            
          showNotification(
            'success', 
            `Successfully imported ${results.success} records`, 
            `All records were imported successfully. Also created ${newCompaniesCount} new broadcast ${newCompaniesCount === 1 ? 'company' : 'companies'}: ${companiesList}${additionalText}.`
          );
        } else {
          showNotification(
            'success', 
            `Successfully imported ${results.success} records`, 
            `All records were imported successfully.`
          );
        }
      } else {
        // Check if any new broadcast companies were created despite some failures
        if (results.newBroadcastCompanies && results.newBroadcastCompanies.length > 0) {
          const newCompaniesCount = results.newBroadcastCompanies.length;
          
          showNotification(
            'info', 
            `Imported ${results.success} of ${results.total} records`, 
            `${results.failed} records failed to import. Also created ${newCompaniesCount} new broadcast ${newCompaniesCount === 1 ? 'company' : 'companies'} during the process. Check the console for details.`
          );
        } else {
          showNotification(
            'info', 
            `Imported ${results.success} of ${results.total} records`, 
            `${results.failed} records failed to import. Check the console for details.`
          );
        }
      }
    } catch (error) {
      console.error('Batch import error:', error);
      const errorMessage = formatErrorMessage(error);
      
      showNotification(
        'error', 
        'Error during batch import', 
        errorMessage,
        false // Don't auto-dismiss error messages
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