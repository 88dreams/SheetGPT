import { useState, useCallback } from 'react';
import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames } from '../../../../utils/sportDataMapper';
import { api } from '../../../../utils/api';
import { useQueryClient } from '@tanstack/react-query';

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
  
  // Get query client for cache invalidation
  const queryClient = useQueryClient();
  
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
      
      // Check if transformed data is empty or missing required fields
      if (Object.keys(transformedData).length === 0) {
        console.error('No data was transformed from mappings. Attempting to apply default values.');
        
        // For production entity, apply default/critical values directly
        if (entityType === 'production') {
          console.log('Applying default values for production entity');
          
          // Apply direct mapping based on position for production entities
          // This is a fallback for when the normal mapping fails
          const defaults: Record<string, any> = {
            production_company_id: Array.isArray(currentRecord) ? currentRecord[0] : 'Unknown Company',
            service_type: Array.isArray(currentRecord) ? currentRecord[1] || 'Production' : 'Production',
            entity_id: Array.isArray(currentRecord) ? currentRecord[2] || 'Unknown Entity' : 'Unknown Entity',
            entity_type: Array.isArray(currentRecord) ? currentRecord[3] || 'league' : 'league',
            start_date: '2000-01-01',
            end_date: '2100-01-01'
          };
          
          // Copy the defaults to transformedData
          Object.keys(defaults).forEach(key => {
            if (mappedData[key]) { // Only set if this field is being mapped
              transformedData[key] = defaults[key];
            }
          });
          
          console.log('Applied default production values:', transformedData);
          
          if (Object.keys(transformedData).length === 0) {
            showNotification('error', 'Field mapping error', 'No data was transformed from the field mappings. Please check console for details.');
            return false;
          }
        } 
        // For broadcast entity, apply default/critical values directly
        else if (entityType === 'broadcast') {
          console.log('Applying default values for broadcast entity');
          
          // Apply direct mapping based on position for broadcast entities
          // This is a fallback for when the normal mapping fails
          const defaults: Record<string, any> = {
            broadcast_company_id: Array.isArray(currentRecord) ? currentRecord[0] : 'Unknown Company',
            entity_id: Array.isArray(currentRecord) ? currentRecord[1] || 'Unknown Entity' : 'Unknown Entity',
            entity_type: Array.isArray(currentRecord) ? currentRecord[2] || 'league' : 'league',
            territory: Array.isArray(currentRecord) ? currentRecord[3] || 'USA' : 'USA',
            start_date: Array.isArray(currentRecord) ? currentRecord[4] || '2000-01-01' : '2000-01-01',
            end_date: Array.isArray(currentRecord) ? currentRecord[5] || '2100-01-01' : '2100-01-01'
          };
          
          // Normalize entity_type if needed
          if (typeof defaults.entity_type === 'string') {
            const entityType = defaults.entity_type.toLowerCase();
            if (entityType.includes('series')) {
              defaults.entity_type = 'league';
            } else if (entityType.includes('league')) {
              defaults.entity_type = 'league';
            } else if (entityType.includes('team')) {
              defaults.entity_type = 'team';
            } else if (entityType.includes('game')) {
              defaults.entity_type = 'game';
            } else if (entityType.includes('conference') || entityType.includes('division')) {
              defaults.entity_type = 'division_conference';
            }
          }
          
          // Format dates if needed
          if (typeof defaults.start_date === 'string' && /^\d{4}$/.test(defaults.start_date)) {
            defaults.start_date = `${defaults.start_date}-01-01`;
          }
          
          if (typeof defaults.end_date === 'string' && /^\d{4}$/.test(defaults.end_date)) {
            defaults.end_date = `${defaults.end_date}-12-31`;
          }
          
          // Copy the defaults to transformedData
          Object.keys(defaults).forEach(key => {
            if (mappedData[key]) { // Only set if this field is being mapped
              transformedData[key] = defaults[key];
            }
          });
          
          console.log('Applied default broadcast values:', transformedData);
          
          if (Object.keys(transformedData).length === 0) {
            showNotification('error', 'Field mapping error', 'No data was transformed from the field mappings. Please check console for details.');
            return false;
          }
        } else {
          showNotification('error', 'Field mapping error', 'No data was transformed from the field mappings. Please check console for details.');
          return false;
        }
      }
      
      // Log data for debugging
      console.log('Field mapping details:', {
        mappedData,
        currentRecord,
        transformedData,
        entityType,
        isArrayRecord: Array.isArray(currentRecord)
      });
      
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
      
      // If this is a production_service entity, check for duplicates before saving
      if (entityType === 'production_service') {
        try {
          // Import the checkDuplicateProductionService function
          const { checkDuplicateProductionService } = await import('../utils/importUtils');
          
          // Check for duplicate production service
          const existingService = await checkDuplicateProductionService(processedData);
          
          if (existingService) {
            // Found a duplicate - show notification and return true to move to next record
            const entityName = existingService.entity_name || existingService.entity_type;
            const companyName = existingService.production_company_name || 'Unknown company';
            
            showNotification(
              'info',
              `Duplicate production service detected - skipping to next record`,
              `A production service already exists for ${companyName} and ${entityName}`,
              false
            );
            
            console.log('Skipping duplicate production service:', existingService);
            return true; // Return true to continue to next record
          }
        } catch (error) {
          console.error('Error in duplicate check for production service:', error);
          // Continue with save operation if duplicate check fails
        }
      }
      
      // If this is a broadcast entity, check for duplicates before saving
      if (entityType === 'broadcast') {
        try {
          // Import the checkDuplicateBroadcastRight function
          const { checkDuplicateBroadcastRight } = await import('../utils/importUtils');
          
          // Check for duplicate broadcast right
          const existingRight = await checkDuplicateBroadcastRight(processedData);
          
          if (existingRight) {
            // Found a duplicate - show notification and return true to move to next record
            const entityType = existingRight.entity_type || 'Unknown entity type';
            const entityName = existingRight.entity_name || existingRight.entity_id;
            const companyName = existingRight.broadcast_company_name || 'Unknown company';
            const territory = existingRight.territory || 'Unknown territory';
            
            showNotification(
              'info',
              `Duplicate broadcast right detected - skipping to next record`,
              `A broadcast right already exists for ${companyName} and ${entityName} (${entityType}) in ${territory}`,
              false
            );
            
            console.log('Skipping duplicate broadcast right:', existingRight);
            return true; // Return true to continue to next record
          }
        } catch (error) {
          console.error('Error in duplicate check for broadcast right:', error);
          // Continue with save operation if duplicate check fails
        }
      }
      
      // Save to database
      try {
        const success = await saveEntityToDatabase(entityType, processedData, effectiveUpdateMode);
        
        if (success) {
          // Invalidate cache for the entity type to ensure fresh data after creation
          console.log(`Invalidating ${entityType} entity cache after successful creation`);
          queryClient.invalidateQueries(['sportsEntities', entityType]);
          
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
  }, [showNotification, queryClient]);
  
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
      
      // Invalidate query cache for the entity type if any were created
      if (results.success > 0) {
        console.log(`Invalidating ${entityType} entity cache after batch import of ${results.success} records`);
        queryClient.invalidateQueries(['sportsEntities', entityType]);
      }
      
      // Show final results notification with better error reporting
      if (results.failed === 0) {
        // Create summary message including skipped duplicates
        let summaryMessage = `Successfully imported ${results.success} records`;
        let detailMessage = '';
        
        // Add information about skipped duplicates if any
        if (results.skipped > 0) {
          summaryMessage += `, skipped ${results.skipped} duplicate${results.skipped === 1 ? '' : 's'}`;
          detailMessage += `${results.skipped} duplicate production service${results.skipped === 1 ? ' was' : 's were'} detected and skipped. `;
        }
        
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
            
          detailMessage += `Also created ${newCompaniesCount} new broadcast ${newCompaniesCount === 1 ? 'company' : 'companies'}: ${companiesList}${additionalText}.`;
          
          showNotification(
            'success', 
            summaryMessage, 
            detailMessage
          );
        } else {
          showNotification(
            'success', 
            summaryMessage, 
            detailMessage || `${results.success} records were imported successfully.`
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
        // Include skipped duplicates in the success count for ratio calculation
        const effectiveSuccess = results.success + results.skipped;
        const successRatio = effectiveSuccess / results.total;
        
        // Add information about skipped duplicates to the message
        const skippedText = results.skipped > 0 
          ? `${results.skipped} duplicate${results.skipped === 1 ? '' : 's'} skipped, ` 
          : '';
        
        if (successRatio >= 0.8) {  // 80% or more success
          showNotification(
            'info', 
            `Imported ${results.success} of ${results.total} records${results.skipped > 0 ? `, ${results.skipped} skipped` : ''}`, 
            `${skippedText}${results.failed} records failed to import:\n${errorSummary}\n${companiesText}See console for details.`
          );
        } else if (successRatio >= 0.5) {  // 50-80% success
          showNotification(
            'info', 
            `Partially imported ${results.success} of ${results.total} records${results.skipped > 0 ? `, ${results.skipped} skipped` : ''}`, 
            `${skippedText}${results.failed} records failed to import:\n${errorSummary}\n${companiesText}See console for details.`
          );
        } else {  // Less than 50% success
          showNotification(
            'error', 
            `Only imported ${results.success} of ${results.total} records${results.skipped > 0 ? `, ${results.skipped} skipped` : ''}`, 
            `${skippedText}${results.failed} records failed to import:\n${errorSummary}\n${companiesText}Check the console for details.`,
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
  }, [showNotification, queryClient]);

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