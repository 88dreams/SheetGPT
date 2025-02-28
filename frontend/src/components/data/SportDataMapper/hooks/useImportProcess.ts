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
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    
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
    currentRecord?: Record<string, any>
  ) => {
    if (!entityType || Object.keys(mappedData).length === 0) {
      showNotification('error', 'Please select an entity type and map at least one field');
      return false;
    }
    
    setIsSaving(true);
    
    try {
      // Map UI field names back to database field names
      const databaseMappedData = await enhancedMapToDatabaseFieldNames(
        entityType, 
        mappedData,
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
    
    setIsBatchImporting(true);
    
    try {
      console.log(`Batch importing ${recordsToImport.length} records as ${entityType}`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < recordsToImport.length; i++) {
        const record = recordsToImport[i];
        
        // Apply mappings to the record
        const mappedRecord: Record<string, any> = {};
        Object.entries(mappings).forEach(([sourceField, targetField]) => {
          mappedRecord[targetField] = record[sourceField];
        });
        
        try {
          // Map UI field names back to database field names and handle lookups
          const databaseMappedData = await enhancedMapToDatabaseFieldNames(
            entityType, 
            mappedRecord,
            api,
            record
          );
          
          // Validate the data
          const validation = validateEntityData(entityType, databaseMappedData);
          if (!validation.isValid) {
            console.error(`Validation failed for record ${i}:`, validation.errors);
            errorCount++;
            continue;
          }
          
          // Save to database
          if (entityType === 'brand_relationship') {
            await api.sports.createBrandRelationship(databaseMappedData);
          } else {
            await sportsDatabaseService.createEntity(entityType as DbEntityType, databaseMappedData);
          }
          
          successCount++;
        } catch (error) {
          console.error(`Error importing record ${i}:`, error);
          errorCount++;
        }
      }
      
      const results = {
        success: successCount,
        failed: errorCount,
        total: recordsToImport.length
      };
      
      setImportResults(results);
      
      showNotification(
        errorCount > 0 ? 'info' : 'success',
        `Batch import completed: ${successCount} records imported successfully, ${errorCount} errors`
      );
      
      return results;
    } catch (error) {
      console.error('Error during batch import:', error);
      showNotification('error', `Error during batch import: ${error instanceof Error ? error.message : String(error)}`);
      return null;
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