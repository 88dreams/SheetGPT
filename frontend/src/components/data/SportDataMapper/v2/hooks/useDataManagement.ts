import { useState, useCallback, useMemo } from 'react';
import { EntityType } from '../../../../../utils/sportDataMapper';

/**
 * Interface for field value updates
 */
export interface FieldValueUpdate {
  targetField: string;
  value: any;
}

/**
 * Custom hook for managing data in the SportDataMapper component
 * 
 * This hook handles data extraction, processing, and transformations
 * without creating circular dependencies with other hooks.
 */
export function useDataManagement() {
  // State for data
  const [dataToImport, setDataToImport] = useState<any[]>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [sourceFieldValues, setSourceFieldValues] = useState<Record<string, any>>({});
  const [mappedData, setMappedData] = useState<Record<string, any>>({});
  
  /**
   * Extract source fields from structured data
   */
  const extractSourceFields = useCallback((
    data: any, 
    setDataValidity: (isValid: boolean) => void
  ) => {
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
    
    // Get all unique field names from the first record
    const fields = Object.keys(firstRecord);
    
    // Determine the fields to use (headers or keys from first record)
    const fieldsToUse = headers.length > 0 && headers.length === fields.length ? headers : fields;
    
    // Use a single batch update to prevent multiple re-renders
    // Compare with current state to prevent unnecessary updates
    setDataToImport(currentData => {
      // Only update if data has changed
      if (JSON.stringify(currentData) === JSON.stringify(processedData)) {
        return currentData;
      }
      return processedData;
    });
    
    setSourceFields(currentFields => {
      // Only update if fields have changed
      if (JSON.stringify(currentFields) === JSON.stringify(fieldsToUse)) {
        return currentFields;
      }
      return fieldsToUse;
    });
    
    // Set the source field values from the first record only if it's changed
    setSourceFieldValues(currentValues => {
      if (JSON.stringify(currentValues) === JSON.stringify(firstRecord)) {
        return currentValues;
      }
      return firstRecord;
    });
    
    console.log('useDataManagement: Extracted source fields:', fieldsToUse);
    console.log('useDataManagement: First record:', firstRecord);
  }, []);
  
  /**
   * Update mapped data based on the current record and mappings
   */
  const updateMappedData = useCallback((
    entityType: EntityType | null,
    mappings: Record<string, string>,
    recordIndex: number
  ) => {
    if (!entityType || recordIndex === null || recordIndex < 0 || recordIndex >= dataToImport.length) {
      return;
    }
    
    const record = dataToImport[recordIndex];
    const newMappedData: Record<string, any> = {};
    
    // Apply the mappings to the current record
    Object.entries(mappings).forEach(([targetField, sourceField]) => {
      newMappedData[targetField] = record[sourceField];
    });
    
    setMappedData(newMappedData);
  }, [dataToImport]);
  
  /**
   * Update source field values when current record changes
   */
  const updateSourceFieldValues = useCallback((recordIndex: number) => {
    if (recordIndex >= 0 && recordIndex < dataToImport.length) {
      console.log(`updateSourceFieldValues called with index ${recordIndex} of ${dataToImport.length} records`);
      const record = dataToImport[recordIndex];
      
      // Create a deep copy of the record to force React to detect state change
      const recordCopy = {...record};
      
      // Always force the update to ensure UI refreshes
      console.log('Forcing update with source field values from record:', recordCopy);
      
      // Immediate update followed by RAF update to ensure both immediate and delayed renders catch the change
      setSourceFieldValues(recordCopy);
      
      // Use requestAnimationFrame for smoother UI updates
      setTimeout(() => {
        // Apply a second update to force re-render in case the first one didn't trigger a UI update
        requestAnimationFrame(() => {
          console.log('RAF update for source field values');
          setSourceFieldValues(prev => ({...prev}));
        });
      }, 50);
    } else {
      console.warn('Invalid record index:', recordIndex);
    }
  }, [dataToImport]);
  
  /**
   * Update a single field in the mapped data
   */
  const updateMappedField = useCallback((
    sourceField: string, 
    targetField: string, 
    recordIndex: number | null
  ) => {
    if (recordIndex === null || recordIndex < 0 || recordIndex >= dataToImport.length) {
      return;
    }
    
    setMappedData(prev => {
      const value = dataToImport[recordIndex][sourceField];
      return {
        ...prev,
        [targetField]: value
      };
    });
  }, [dataToImport]);
  
  /**
   * Clear all mapped data
   */
  const clearMappedData = useCallback(() => {
    setMappedData({});
  }, []);
  
  /**
   * Get the value of a source field for the current record
   */
  const getSourceFieldValue = useCallback((
    sourceField: string,
    recordIndex: number
  ) => {
    if (recordIndex >= 0 && recordIndex < dataToImport.length) {
      return dataToImport[recordIndex][sourceField];
    }
    return null;
  }, [dataToImport]);
  
  /**
   * Get the source data record at the specified index
   */
  const getRecordAt = useCallback((recordIndex: number) => {
    if (recordIndex >= 0 && recordIndex < dataToImport.length) {
      return dataToImport[recordIndex];
    }
    return null;
  }, [dataToImport]);
  
  /**
   * Get all records that match a field value
   */
  const getRecordsByFieldValue = useCallback((
    field: string,
    value: any
  ) => {
    return dataToImport.filter(record => record[field] === value);
  }, [dataToImport]);
  
  /**
   * Check if the data is empty
   */
  const isEmpty = useMemo(() => {
    return dataToImport.length === 0;
  }, [dataToImport]);
  
  return {
    // State
    dataToImport,
    sourceFields,
    sourceFieldValues,
    mappedData,
    
    // Data stats
    isEmpty,
    
    // Setters
    setDataToImport,
    setSourceFields,
    setSourceFieldValues,
    setMappedData,
    
    // Helper functions
    extractSourceFields,
    updateMappedData,
    updateSourceFieldValues,
    updateMappedField,
    clearMappedData,
    getSourceFieldValue,
    getRecordAt,
    getRecordsByFieldValue
  };
}

export default useDataManagement;