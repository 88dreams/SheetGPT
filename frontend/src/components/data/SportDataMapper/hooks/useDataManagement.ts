import { useState, useCallback } from 'react';
import { EntityType } from '../../../../utils/sportDataMapper';

/**
 * Custom hook for managing data in the SportDataMapper component
 */
export default function useDataManagement() {
  // State for data
  const [dataToImport, setDataToImport] = useState<any[]>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [sourceFieldValues, setSourceFieldValues] = useState<Record<string, any>>({});
  const [mappedData, setMappedData] = useState<Record<string, any>>({});
  
  /**
   * Extract source fields from structured data
   */
  const extractSourceFields = useCallback((data: any, setDataValidity: (isValid: boolean) => void) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('Invalid structured data:', data);
      setDataValidity(false);
      return;
    }
    
    setDataValidity(true);
    setDataToImport(data);
    
    // Get all unique field names from the first record
    const firstRecord = data[0];
    const fields = Object.keys(firstRecord);
    setSourceFields(fields);
    
    // Set the source field values from the first record
    setSourceFieldValues(firstRecord);
    
    console.log('Extracted source fields:', fields);
    console.log('First record:', firstRecord);
  }, []);
  
  /**
   * Update mapped data when entity type or current record changes
   */
  const updateMappedDataForEntityType = useCallback((
    entityType: EntityType,
    mappingsByEntityType: Record<string, Record<string, string>>,
    currentRecordIndex: number | null
  ) => {
    // Get the mappings for this entity type
    const mappings = mappingsByEntityType[entityType] || {};
    
    // Create a new mapped data object based on the current record
    const newMappedData: Record<string, any> = {};
    
    if (currentRecordIndex !== null && dataToImport[currentRecordIndex]) {
      const currentRecord = dataToImport[currentRecordIndex];
      
      // Apply the mappings to the current record
      Object.entries(mappings).forEach(([sourceField, targetField]) => {
        newMappedData[targetField] = currentRecord[sourceField];
      });
    }
    
    setMappedData(newMappedData);
  }, [dataToImport]);
  
  /**
   * Update source field values when current record changes
   */
  const updateSourceFieldValues = useCallback((recordIndex: number) => {
    if (recordIndex >= 0 && recordIndex < dataToImport.length) {
      setSourceFieldValues(dataToImport[recordIndex]);
    }
  }, [dataToImport]);
  
  /**
   * Update mapped data when a field is mapped
   */
  const updateMappedDataForField = useCallback((sourceField: string, targetField: string, currentRecordIndex: number | null) => {
    setMappedData(prev => {
      if (currentRecordIndex !== null && dataToImport[currentRecordIndex]) {
        const value = dataToImport[currentRecordIndex][sourceField];
        return {
          ...prev,
          [targetField]: value
        };
      }
      return prev;
    });
  }, [dataToImport]);
  
  /**
   * Clear all mapped data
   */
  const clearMappedData = useCallback(() => {
    setMappedData({});
  }, []);
  
  return {
    // State
    dataToImport,
    sourceFields,
    sourceFieldValues,
    mappedData,
    
    // Setters
    setDataToImport,
    setSourceFields,
    setSourceFieldValues,
    setMappedData,
    
    // Helper functions
    extractSourceFields,
    updateMappedDataForEntityType,
    updateSourceFieldValues,
    updateMappedDataForField,
    clearMappedData
  };
} 