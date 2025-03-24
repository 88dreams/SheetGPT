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
  const { notification, showNotification, clearNotification } = useNotificationManager();
  
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
      try {
        const success = await saveEntityToDatabase(entityType, processedData, effectiveUpdateMode);
        
        if (success) {
          // Check if a new broadcast company was created or a brand was used
          if (processedData._newBroadcastCompanyCreated) {
            const { name, id } = processedData._newBroadcastCompanyCreated;
            // Show a success notification about both the entity save and the broadcast company creation
            showNotification(
              'success', 
              `Successfully saved ${entityType} to database`, 
              `Also created new broadcast company "${name}" with ID ${id.substring(0, 8)}...`
            );
          } else if (processedData._usedBrandAsBroadcastCompany) {
            const { name, id } = processedData._usedBrandAsBroadcastCompany;
            // Show a success notification about using a brand as a broadcast company
            showNotification(
              'success', 
              `Successfully saved ${entityType} to database`, 
              `Used existing brand "${name}" as broadcast company (ID: ${id.substring(0, 8)}...)`
            );
          } else if (processedData._usingBrandAsBroadcastCompany) {
            // Show a success notification about using a brand as a broadcast company
            showNotification(
              'success', 
              `Successfully saved ${entityType} to database`, 
              `Used existing brand "${processedData._brandName}" as broadcast company`
            );
          } else {
            // Just show regular success notification
            showNotification('success', `Successfully saved ${entityType} to database`);
          }
        }
        
        return success;
      } catch (saveError) {
        console.error(`Error saving ${entityType} to database:`, saveError);
        
        // Process specific errors
        if (saveError.message) {
          const errorMessage = formatErrorMessage(saveError);
          
          // Check for distinct error types
          if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
            // It's a duplicate entity - this is not a critical error in many cases
            showNotification(
              'info',
              `Record already exists - moving to next record`,
              errorMessage,
              false
            );
            // Return true to allow navigation to next record even though it's a duplicate
            return true;
          }
          
          if (errorMessage.includes('not found')) {
            // Missing required entity reference
            showNotification(
              'error',
              `Missing required entity`,
              errorMessage,
              false
            );
            return false;
          }
          
          // Generic error handling
          showNotification(
            'error',
            `Error saving ${entityType}`,
            errorMessage,
            false
          );
        } else {
          // Unknown error
          showNotification(
            'error',
            `Unknown error saving to database`,
            'Check the console for more details.',
            false
          );
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error in database preparation:', error);
      const errorMessage = formatErrorMessage(error);
      
      // Set autoDismiss to false for errors to give user time to read them
      showNotification(
        'error', 
        `Error preparing data`, 
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
      // Collect the errors by type for summary reporting
      const errorTypes = {
        duplicates: 0,
        notFound: 0,
        validation: 0,
        other: 0
      };
      
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
      
      // Enhanced record processor that tracks error types
      const processRecord = async (record: any) => {
        try {
          return await processEntityRecord(record, entityType, mappings, isUpdateMode);
        } catch (error) {
          // Analyze the error type for better reporting
          const errorMessage = error.message || '';
          
          if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
            errorTypes.duplicates++;
          } else if (errorMessage.includes('not found')) {
            errorTypes.notFound++;
          } else if (errorMessage.includes('validation') || errorMessage.includes('Validation')) {
            errorTypes.validation++;
          } else {
            errorTypes.other++;
          }
          
          // Re-throw to let the batch processor handle it
          throw error;
        }
      };
      
      // Process all records in batches
      const results = await processBatchedData(
        recordsToImport,
        10,  // batch size
        onProgressUpdate,
        processRecord
      );
      
      // Add the error categories to the results
      results.errorTypes = errorTypes;
      
      setImportResults(results);
      
      // Show final results notification with better error reporting
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
        // Build a more detailed error summary
        let errorSummary = '';
        
        if (errorTypes.duplicates > 0) {
          errorSummary += `- ${errorTypes.duplicates} duplicate records\n`;
        }
        
        if (errorTypes.notFound > 0) {
          errorSummary += `- ${errorTypes.notFound} records with missing referenced entities\n`;
        }
        
        if (errorTypes.validation > 0) {
          errorSummary += `- ${errorTypes.validation} records with validation errors\n`;
        }
        
        if (errorTypes.other > 0) {
          errorSummary += `- ${errorTypes.other} records with other errors\n`;
        }
        
        // Check if any new broadcast companies were created despite some failures
        let companiesText = '';
        if (results.newBroadcastCompanies && results.newBroadcastCompanies.length > 0) {
          const newCompaniesCount = results.newBroadcastCompanies.length;
          companiesText = `Also created ${newCompaniesCount} new broadcast ${newCompaniesCount === 1 ? 'company' : 'companies'} during the process.\n\n`;
        }
        
        // Create notification with different severity based on success/failure ratio
        const successRatio = results.success / results.total;
        
        if (successRatio >= 0.8) {  // 80% or more success
          showNotification(
            'info', 
            `Imported ${results.success} of ${results.total} records`, 
            `${results.failed} records failed to import:\n${errorSummary}\n${companiesText}See console for details.`
          );
        } else if (successRatio >= 0.5) {  // 50-80% success
          showNotification(
            'info', 
            `Partially imported ${results.success} of ${results.total} records`, 
            `${results.failed} records failed to import:\n${errorSummary}\n${companiesText}See console for details.`
          );
        } else {  // Less than 50% success
          showNotification(
            'error', 
            `Only imported ${results.success} of ${results.total} records`, 
            `${results.failed} records failed to import:\n${errorSummary}\n${companiesText}Check the console for details.`,
            false  // Don't auto-dismiss serious errors
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
    clearNotification,
    saveToDatabase,
    batchImport
  };
} 