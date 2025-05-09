import { useState, useCallback } from 'react';
import { EntityType, validateEntityData, enhancedMapToDatabaseFieldNames } from '../../../../../utils/sportDataMapper';
import { api } from '../../../../../utils/api';

// Import utility types (without introducing circular dependencies)
import type { Notification } from './useNotifications';

/**
 * Import results interface
 */
export interface ImportResults {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errorMessages: string[];
  errorTypes?: {
    duplicates: number;
    notFound: number;
    validation: number;
    other: number;
  };
  newBroadcastCompanies?: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Import notification handler interface
 */
export interface ImportNotificationHandler {
  showNotification: (type: Notification['type'], message: string, details?: string, autoDismiss?: boolean) => void;
}

/**
 * Format error message from various error types
 */
function formatErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  
  // Handle error objects with message property
  if (error.message) {
    return error.message;
  }
  
  // Handle API response errors
  if (error.response && error.response.data) {
    if (error.response.data.message) {
      return error.response.data.message;
    }
    if (error.response.data.detail) {
      return error.response.data.detail;
    }
    return JSON.stringify(error.response.data);
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback for other error types
  return JSON.stringify(error);
}

/**
 * Custom hook for handling the import process in the SportDataMapper component
 */
export function useImportProcess(notificationHandler: ImportNotificationHandler) {
  // Loading states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isBatchImporting, setIsBatchImporting] = useState<boolean>(false);
  
  // Results tracking
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  
  // Destructure notification functionality from the handler
  const { showNotification } = notificationHandler;
  
  /**
   * Transform mapped data for saving to database
   * Relies solely on user-defined field mappings
   */
  const transformMappedData = useCallback((
    mappings: Record<string, string>,
    record: Record<string, any>
  ): Record<string, any> => {
    const result: Record<string, any> = {};
    
    // Handle different types of source records
    if (Array.isArray(record)) {
      // For array data, we need more sophisticated handling
      console.log('Processing array data based on user-defined mappings only');
      
      // Process each mapping defined by the user
      Object.entries(mappings).forEach(([dbField, sourceFieldName]) => {
        console.log(`Processing mapping ${sourceFieldName} → ${dbField}`);
        
        // Try multiple strategies to find the value in the array
        let value;
        let found = false;
        
        // STRATEGY 1: If the source field name is a number, use it as a direct index
        if (!isNaN(Number(sourceFieldName))) {
          const index = Number(sourceFieldName);
          if (index >= 0 && index < record.length) {
            value = record[index];
            found = true;
            console.log(`Found value by using source field as index ${index}: ${value}`);
          }
        }
        
        // STRATEGY 2: Use user-provided field index mapping
        // If the sourceFieldName is a string containing "#N" where N is a number
        if (!found && typeof sourceFieldName === 'string') {
          const indexMatch = sourceFieldName.match(/#(\d+)/);
          if (indexMatch && indexMatch[1]) {
            const index = parseInt(indexMatch[1], 10);
            if (index >= 0 && index < record.length) {
              value = record[index];
              found = true;
              console.log(`Found value using explicit index notation #${index}: ${value}`);
            }
          }
        }
        
        // If a value was found, process special cases
        if (found && value !== undefined) {
          // Special handling for entity_type
          if (dbField === 'entity_type' && typeof value === 'string') {
            if (value.includes('Series') || value.includes('Racing')) {
              value = 'league';
              console.log(`Normalized Racing/Series entity type to "league"`);
            }
          }
          
          // Format dates when they're years only
          if ((dbField === 'start_date' || dbField === 'end_date') && typeof value === 'string') {
            const yearRegex = /^\d{4}$/;
            if (yearRegex.test(value)) {
              value = dbField === 'start_date' ? 
                `${value}-01-01` : // Start date: beginning of year
                `${value}-12-31`;  // End date: end of year
              console.log(`Formatted year-only date: ${dbField} = ${value}`);
            }
          }
          
          result[dbField] = value;
        } else {
          // Direct mapping
          result[dbField] = record[sourceFieldName];
        }
      });
    } else {
      // For object records, use direct property access
      console.log('Processing object data with direct property mapping');
      Object.entries(mappings).forEach(([targetField, sourceField]) => {
        result[targetField] = record[sourceField];
      });
    }
    
    return result;
  }, []);
  
  /**
   * Process special fields like division_conference reference
   */
  const processDivisionConferenceReference = useCallback(async (
    entityType: EntityType,
    data: Record<string, any>
  ): Promise<Record<string, any>> => {
    const result = { ...data };
    
    // Special handling for teams to auto-resolve division_conference from league
    if (entityType === 'team' && result.league_id && !result.division_conference_id) {
      try {
        // Fetch league details to get division_conference information
        const response = await api.sports.getLeague(result.league_id);
        
        if (response && response.division_conference_id) {
          result.division_conference_id = response.division_conference_id;
          console.log(`Auto-resolved division_conference_id for team: ${result.division_conference_id}`);
        }
      } catch (error) {
        console.error('Failed to auto-resolve division_conference from league:', error);
        // Continue without the division_conference - validation will catch if required
      }
    }
    
    return result;
  }, []);
  
  /**
   * Check for duplicate production service
   */
  const checkDuplicateProductionService = useCallback(async (
    data: Record<string, any>
  ): Promise<Record<string, any> | null> => {
    try {
      // Minimum fields needed to check for duplicates
      if (!data.company_id || !data.entity_id || !data.entity_type) {
        return null;
      }
      
      const response = await api.sports.getProductionServices({
        company_id: data.company_id,
        entity_id: data.entity_id,
        entity_type: data.entity_type
      });
      
      if (response && (response as any).items && (response as any).items.length > 0) {
        return (response as any).items[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error checking for duplicate production service:', error);
      return null;
    }
  }, []);
  
  /**
   * Check for duplicate broadcast right
   */
  const checkDuplicateBroadcastRight = useCallback(async (
    data: Record<string, any>
  ): Promise<Record<string, any> | null> => {
    try {
      // Minimum fields needed to check for duplicates
      if (!data.company_id || !data.entity_id || !data.entity_type) {
        return null;
      }
      
      const response = await api.sports.getBroadcastRights({
        company_id: data.company_id,
        entity_id: data.entity_id,
        entity_type: data.entity_type
      });
      
      if (response && (response as any).items && (response as any).items.length > 0) {
        return (response as any).items[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error checking for duplicate broadcast right:', error);
      return null;
    }
  }, []);
  
  /**
   * Save entity to database
   */
  const saveEntityToDatabase = useCallback(async (
    entityType: EntityType,
    data: Record<string, any>,
    isUpdateMode: boolean
  ): Promise<boolean> => {
    try {
      let response: any; // Use 'any' for now, ideally map to specific entity types
      const entityData = data; // data is already processedData from the caller

      // Use a switch statement to call the correct service function based on entityType
      if (isUpdateMode && entityData.id) {
        console.log(`Updating ${entityType} with ID ${entityData.id}`);
        switch (entityType) {
          case 'league':
            response = await api.sports.updateLeague(entityData.id, entityData);
            break;
          case 'team':
            response = await api.sports.updateTeam(entityData.id, entityData);
            break;
          case 'player':
            response = await api.sports.updatePlayer(entityData.id, entityData);
            break;
          case 'game':
            response = await api.sports.updateGame(entityData.id, entityData);
            break;
          case 'stadium':
            response = await api.sports.updateStadium(entityData.id, entityData);
            break;
          case 'broadcast':
            response = await api.sports.updateBroadcastRights(entityData.id, entityData);
            break;
          case 'production':
            response = await api.sports.updateProductionService(entityData.id, entityData);
            break;
          case 'brand':
            response = await api.sports.updateBrand(entityData.id, entityData);
            break;
          case 'game_broadcast':
            response = await api.sports.updateGameBroadcast(entityData.id, entityData);
            break;
          case 'league_executive':
            response = await api.sports.updateLeagueExecutive(entityData.id, entityData);
            break;
          case 'division_conference':
            response = await api.sports.updateDivisionConference(entityData.id, entityData);
            break;
          default:
            throw new Error(`Unsupported entity type for update: ${entityType}`);
        }
      } else {
        console.log(`Creating new ${entityType}`);
        switch (entityType) {
          case 'league':
            response = await api.sports.createLeague(entityData);
            break;
          case 'team':
            response = await api.sports.createTeam(entityData);
            break;
          case 'player':
            response = await api.sports.createPlayer(entityData);
            break;
          case 'game':
            response = await api.sports.createGame(entityData);
            break;
          case 'stadium':
            response = await api.sports.createStadium(entityData);
            break;
          case 'broadcast':
            response = await api.sports.createBroadcastRightsWithErrorHandling(entityData);
            break;
          case 'production':
            response = await api.sports.createProductionService(entityData);
            break;
          case 'brand':
            response = await api.sports.createBrand(entityData);
            break;
          case 'game_broadcast':
            response = await api.sports.createGameBroadcast(entityData);
            break;
          case 'league_executive':
            response = await api.sports.createLeagueExecutive(entityData);
            break;
          case 'division_conference':
            response = await api.sports.createDivisionConference(entityData);
            break;
          default:
            throw new Error(`Unsupported entity type for create: ${entityType}`);
        }
      }
      
      return !!response; 
    } catch (error) {
      console.error(`Error saving ${entityType} to database:`, error);
      throw error;
    }
  }, []);
  
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
      const effectiveUpdateMode = isUpdateMode || ('id' in transformedData);
      
      // Map UI field names to database field names and resolve references
      const databaseMappedData = await enhancedMapToDatabaseFieldNames(
        entityType, 
        transformedData,
        api
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
      if (entityType === 'production') {
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
      }
      
      // If this is a broadcast entity, check for duplicates before saving
      if (entityType === 'broadcast') {
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
  }, [
    showNotification, 
    transformMappedData, 
    processDivisionConferenceReference, 
    checkDuplicateProductionService, 
    checkDuplicateBroadcastRight, 
    saveEntityToDatabase
  ]);
  
  /**
   * Process a single entity record
   */
  const processEntityRecord = useCallback(async (
    record: any,
    entityType: EntityType,
    mappings: Record<string, string>,
    isUpdateMode: boolean
  ): Promise<any> => {
    // Transform the mappings to data
    const transformedData = transformMappedData(mappings, record);
    
    // Map UI field names to database field names and resolve references
    const databaseMappedData = await enhancedMapToDatabaseFieldNames(
      entityType, 
      transformedData,
      api
    );
    
    // Process special fields
    const processedData = await processDivisionConferenceReference(entityType, databaseMappedData);
    
    // Validate the data
    const validation = validateEntityData(entityType, processedData, isUpdateMode);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Check for duplicates if needed based on entity type
    if (entityType === 'production') {
      const existingService = await checkDuplicateProductionService(processedData);
      if (existingService) {
        // Return existing service to indicate it was skipped
        return { skipped: true, existing: existingService };
      }
    }
    
    if (entityType === 'broadcast') {
      const existingRight = await checkDuplicateBroadcastRight(processedData);
      if (existingRight) {
        // Return existing right to indicate it was skipped
        return { skipped: true, existing: existingRight };
      }
    }
    
    // Save to database
    const success = await saveEntityToDatabase(entityType, processedData, isUpdateMode);
    
    if (success) {
      // Return the processed data with success flag
      return { success: true, data: processedData };
    } else {
      throw new Error(`Failed to save ${entityType} to database`);
    }
  }, [
    transformMappedData, 
    processDivisionConferenceReference, 
    checkDuplicateProductionService, 
    checkDuplicateBroadcastRight, 
    saveEntityToDatabase
  ]);
  
  /**
   * Process data in batches
   */
  const processBatchedData = useCallback(async (
    records: any[],
    batchSize: number,
    onProgressUpdate: (currentBatch: number, totalBatches: number, progressPercent: number) => void,
    processRecord: (record: any) => Promise<any>
  ): Promise<ImportResults> => {
    const results: ImportResults = {
      total: records.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errorMessages: [],
      newBroadcastCompanies: []
    };
    
    // Calculate number of batches
    const totalBatches = Math.ceil(records.length / batchSize);
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Get the current batch of records
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, records.length);
      const batch = records.slice(startIndex, endIndex);
      
      // Update progress
      const progressPercent = Math.round((batchIndex / totalBatches) * 100);
      onProgressUpdate(batchIndex + 1, totalBatches, progressPercent);
      
      // Process each record in the batch with controlled concurrency
      const batchPromises = batch.map(record => {
        return processRecord(record)
          .then(result => {
            if (result.skipped) {
              results.skipped++;
              return { success: true, skipped: true };
            }
            
            results.success++;
            
            // Track any new broadcast companies created
            if (result.data && result.data._newBroadcastCompanyCreated) {
              results.newBroadcastCompanies.push(result.data._newBroadcastCompanyCreated);
            }
            
            return { success: true };
          })
          .catch(error => {
            results.failed++;
            const errorMessage = formatErrorMessage(error);
            results.errorMessages.push(errorMessage);
            return { success: false, error: errorMessage };
          });
      });
      
      // Wait for all records in this batch to be processed
      await Promise.all(batchPromises);
    }
    
    return results;
  }, []);
  
  /**
   * Batch import multiple records to the database
   */
  const batchImport = useCallback(async (
    entityType: EntityType,
    mappings: Record<string, string>,
    recordsToImport: any[],
    isUpdateMode: boolean = false
  ): Promise<ImportResults | undefined> => {
    // Validate input
    if (!entityType || Object.keys(mappings).length === 0) {
      showNotification('error', 'Please select an entity type and map at least one field');
      return; // Return undefined on validation failure
    }
    
    if (recordsToImport.length === 0) {
      showNotification('error', 'No records to import', 'All records have been excluded or there are no records available.');
      return; // Return undefined on validation failure
    }
    
    setIsBatchImporting(true);
    let operationResults: ImportResults | undefined = undefined; // Variable to store results

    try {
      // Collect the errors by type for summary reporting
      const errorTypes = {
        duplicates: 0,
        notFound: 0,
        validation: 0,
        other: 0
      };
      
      // Enhanced record processor that tracks error types
      const processRecordWithErrorTracking = async (record: any) => {
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
      
      // Process all records in batches
      const results = await processBatchedData(
        recordsToImport,
        10,  // batch size
        onProgressUpdate,
        processRecordWithErrorTracking
      );
      
      // Add the error categories to the results
      results.errorTypes = errorTypes;
      
      setImportResults(results);
      operationResults = results; // Store results
      
      // Show final results notification with better error reporting
      if (results.failed === 0) {
        // Create summary message including skipped duplicates
        let summaryMessage = `Successfully imported ${results.success} records`;
        let detailMessage = '';
        
        // Add information about skipped duplicates if any
        if (results.skipped > 0) {
          summaryMessage += `, skipped ${results.skipped} duplicate${results.skipped === 1 ? '' : 's'}`;
          detailMessage += `${results.skipped} duplicate${results.skipped === 1 ? ' was' : 's were'} detected and skipped. `;
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
    return operationResults; // Return the stored results
  }, [
    showNotification, 
    processEntityRecord, 
    processBatchedData
  ]);
  
  return {
    isSaving,
    isBatchImporting,
    importResults,
    saveToDatabase,
    batchImport
  };
}

export default useImportProcess;