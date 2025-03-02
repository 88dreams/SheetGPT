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
    console.log('useDataManagement: Extracting source fields from data:', data);
    
    // Check if data exists
    if (!data) {
      console.error('useDataManagement: Data is null or undefined');
      setDataValidity(false);
      return;
    }
    
    // Handle array data
    let processedData = data;
    let headers: string[] = [];
    
    // If data has headers, store them
    if (data.headers && Array.isArray(data.headers)) {
      console.log('useDataManagement: Using headers from data:', data.headers);
      headers = data.headers;
    }
    
    // If data is not an array but has a 'rows' property that is an array, use that
    if (!Array.isArray(data) && data.rows && Array.isArray(data.rows)) {
      console.log('useDataManagement: Using data.rows as the data source');
      processedData = data.rows;
    } 
    // If data is not an array and doesn't have rows, try to convert it to an array
    else if (!Array.isArray(data)) {
      console.log('useDataManagement: Converting non-array data to array');
      try {
        // If it's an object, convert it to an array with one item
        if (typeof data === 'object' && data !== null) {
          processedData = [data];
        } else {
          // If it's something else, wrap it in an array
          processedData = [{ value: data }];
        }
      } catch (error) {
        console.error('useDataManagement: Error converting data to array:', error);
        setDataValidity(false);
        return;
      }
    }
    
    // Final validation check
    if (!Array.isArray(processedData) || processedData.length === 0) {
      console.error('useDataManagement: Processed data is not a valid array or is empty:', processedData);
      setDataValidity(false);
      return;
    }
    
    // Get the first record to extract fields
    const firstRecord = processedData[0];
    
    // Ensure the first record is an object
    if (typeof firstRecord !== 'object' || firstRecord === null) {
      console.error('useDataManagement: First record is not an object:', firstRecord);
      setDataValidity(false);
      return;
    }
    
    setDataValidity(true);
    setDataToImport(processedData);
    
    // Get all unique field names from the first record
    const fields = Object.keys(firstRecord);
    
    // If we have headers and they match the number of fields, use them instead
    if (headers.length > 0 && headers.length === fields.length) {
      console.log('useDataManagement: Using headers as field names:', headers);
      setSourceFields(headers);
    } else {
      setSourceFields(fields);
    }
    
    // Set the source field values from the first record
    setSourceFieldValues(firstRecord);
    
    console.log('useDataManagement: Extracted source fields:', fields);
    console.log('useDataManagement: First record:', firstRecord);
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
      const record = dataToImport[recordIndex];
      console.log('Setting source field values from record:', record);
      setSourceFieldValues(record);
    } else {
      console.warn('Invalid record index:', recordIndex);
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