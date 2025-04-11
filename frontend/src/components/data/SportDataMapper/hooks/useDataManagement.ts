import { useState, useCallback, useMemo } from 'react';
import { EntityType } from '../../../../utils/sportDataMapper';
import { areEqual, fingerprint } from '../../../../utils/fingerprint';

/**
 * Custom hook for managing data in the SportDataMapper component
 * Optimized with fingerprinting for performance
 */
export default function useDataManagement() {
  // State for data
  const [dataToImport, setDataToImport] = useState<any[]>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [sourceFieldValues, setSourceFieldValues] = useState<Record<string, any>>({});
  const [mappedData, setMappedData] = useState<Record<string, any>>({});
  const [lastFingerprints, setLastFingerprints] = useState<{
    data: string | null,
    fields: string | null,
    values: string | null
  }>({
    data: null,
    fields: null,
    values: null
  });
  
  /**
   * Extract source fields from structured data
   * Optimized with fingerprinting to prevent unnecessary updates
   */
  const extractSourceFields = useCallback((data: any, setDataValidity: (isValid: boolean) => void) => {
    console.log('useDataManagement: Extracting source fields from data', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    console.log('useDataManagement: Data type:', typeof data, Array.isArray(data) ? 'is array' : 'not array');
    console.log('useDataManagement: Data structure:', {
      hasHeaders: data?.headers ? 'yes' : 'no',
      hasRows: data?.rows ? 'yes' : 'no',
      headersCount: data?.headers?.length,
      rowsCount: data?.rows?.length,
      topLevelKeys: data ? Object.keys(data) : []
    });
    
    // Skip processing if data is null or undefined
    if (!data) {
      console.error('useDataManagement: Data is null or undefined');
      setDataValidity(false);
      return;
    }
    
    // Generate a fingerprint for the incoming data
    const dataFingerprint = fingerprint(data);
    
    // Log fingerprint information to help debug
    console.log('useDataManagement: Data fingerprint:', {
      currentFingerprint: dataFingerprint,
      lastFingerprint: lastFingerprints.data,
      match: dataFingerprint === lastFingerprints.data
    });
    
    // Handle array data
    let processedData = data;
    let headers: string[] = [];
    
    // If data has headers, store them
    if (data.headers && Array.isArray(data.headers)) {
      headers = data.headers;
    }
    
    // If data is not an array but has a 'rows' property that is an array, use that
    if (!Array.isArray(data) && data.rows && Array.isArray(data.rows)) {
      processedData = data.rows;
    } 
    // If data is not an array and doesn't have rows, try to convert it to an array
    else if (!Array.isArray(data)) {
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
      console.error('useDataManagement: Processed data is not a valid array or is empty');
      setDataValidity(false);
      return;
    }
    
    // Get the first record to extract fields
    const firstRecord = processedData[0];
    
    console.log('useDataManagement: First record:', firstRecord);
    
    // Ensure the first record is an object
    if (typeof firstRecord !== 'object' || firstRecord === null) {
      console.error('useDataManagement: First record is not an object');
      setDataValidity(false);
      return;
    }
    
    setDataValidity(true);
    
    // Get all unique field names from the first record
    const fields = Object.keys(firstRecord);
    console.log('useDataManagement: Fields from first record:', fields);
    
    // Determine the fields to use (headers or keys from first record)
    const fieldsToUse = headers.length > 0 && headers.length === fields.length ? headers : fields;
    console.log('useDataManagement: Fields to use:', fieldsToUse);
    
    // Generate fingerprints to check for changes
    const processedDataFingerprint = fingerprint(processedData);
    const fieldsFingerprint = fingerprint(fieldsToUse);
    const valuesFingerprint = fingerprint(firstRecord);
    
    console.log('useDataManagement: Setting data with:', {
      dataToImportLength: processedData.length,
      fieldsToUseLength: fieldsToUse.length,
      firstRecordKeys: Object.keys(firstRecord).length
    });
    
    // Always update the data for debugging
    console.log('useDataManagement: Forcing update of data, fields, and values');
    
    // Update dataToImport
    setDataToImport(processedData);
    
    // Update sourceFields - this is critical for display!
    setSourceFields(fieldsToUse);
    
    // Update sourceFieldValues
    setSourceFieldValues(firstRecord);
    
    // Update fingerprints to match what we just set
    setLastFingerprints({
      data: processedDataFingerprint,
      fields: fieldsFingerprint,
      values: valuesFingerprint
    });
    
    console.log('useDataManagement: Extracted source fields:', fieldsToUse.length);
  }, [lastFingerprints]);
  
  /**
   * Update mapped data when entity type or current record changes
   * Optimized with fingerprinting to prevent unnecessary updates
   * Enhanced to handle both array and object data formats correctly
   */
  const updateMappedDataForEntityType = useCallback((
    entityType: EntityType,
    mappingsByEntityType: Record<string, Record<string, string>>,
    currentRecordIndex: number | null
  ) => {
    // Skip if we don't have necessary data
    if (currentRecordIndex === null || !dataToImport[currentRecordIndex]) {
      return;
    }
    
    // Get the mappings for this entity type
    const mappings = mappingsByEntityType[entityType] || {};
    const mappingsFingerprint = fingerprint(mappings);
    
    // Get the current record
    const currentRecord = dataToImport[currentRecordIndex];
    
    console.log(`updateMappedDataForEntityType for ${entityType}:`, {
      recordType: Array.isArray(currentRecord) ? 'array' : 'object',
      mappingsCount: Object.keys(mappings).length,
      isArrayData: Array.isArray(currentRecord),
      currentRecordSample: JSON.stringify(currentRecord).slice(0, 100) + '...'
    });
    
    // Create a new mapped data object based on the current record
    const newMappedData: Record<string, any> = {};
    
    // Apply the mappings to the current record, handling array data properly
    Object.entries(mappings).forEach(([targetField, sourceField]) => {
      let value;
      
      if (Array.isArray(currentRecord)) {
        // For array data, find the index of the source field in the sourceFields array
        const sourceIndex = sourceFields.indexOf(sourceField);
        if (sourceIndex >= 0 && sourceIndex < currentRecord.length) {
          value = currentRecord[sourceIndex];
          console.log(`Found array value for ${targetField} at index ${sourceIndex}:`, value);
        } else {
          // Try direct property access as fallback
          value = currentRecord[sourceField];
          console.log(`Using direct property access for array as fallback:`, value);
        }
      } else {
        // Traditional object property access
        value = currentRecord[sourceField];
        console.log(`Found object value for ${targetField}:`, value);
      }
      
      // Only add defined values
      if (value !== undefined) {
        newMappedData[targetField] = value;
      }
    });
    
    console.log('Generated mapped data for entity type:', newMappedData);
    
    // Only update if the mapped data has changed
    setMappedData(prevMappedData => {
      if (areEqual(prevMappedData, newMappedData)) {
        console.log('Mapped data unchanged, skipping update');
        return prevMappedData;
      }
      console.log('Mapped data changed, updating state');
      return newMappedData;
    });
  }, [dataToImport, sourceFields]);
  
  /**
   * Update source field values when current record changes
   * Optimized with fingerprinting and RAF for better performance
   */
  const updateSourceFieldValues = useCallback((recordIndex: number) => {
    if (recordIndex < 0 || recordIndex >= dataToImport.length) {
      console.warn('Invalid record index:', recordIndex);
      return;
    }
    
    console.log(`updateSourceFieldValues called with index ${recordIndex}`, {
      dataLength: dataToImport.length,
      currentRecord: dataToImport[recordIndex],
      currentSourceFields: sourceFields
    });
    
    const record = dataToImport[recordIndex];
    
    // Create a fingerprint of the record to check for changes
    const recordFingerprint = fingerprint(record);
    const currentValuesFingerprint = fingerprint(sourceFieldValues);
    
    console.log('Source field value check:', {
      recordFingerprint,
      currentValuesFingerprint,
      mismatch: recordFingerprint !== currentValuesFingerprint,
      record,
      currentValues: sourceFieldValues
    });
    
    // IMPORTANT: Always update regardless of fingerprint comparison
    // This fixes a bug where the source fields don't update when navigating
    console.log('Updating source field values for navigation');
    
    // Use requestAnimationFrame to ensure UI updates properly
    requestAnimationFrame(() => {
      setSourceFieldValues(record);
    });
  }, [dataToImport, sourceFieldValues]);
  
  /**
   * Update mapped data when a field is mapped
   * Optimized with fingerprinting to prevent unnecessary updates
   * Enhanced to handle both array and object data formats correctly
   */
  const updateMappedDataForField = useCallback((
    sourceField: string, 
    targetField: string, 
    currentRecordIndex: number | null
  ) => {
    if (currentRecordIndex === null || !dataToImport[currentRecordIndex]) {
      return;
    }
    
    // Handle both array and object data formats
    let value;
    const currentRecord = dataToImport[currentRecordIndex];
    
    console.log(`updateMappedDataForField: mapping ${sourceField} to ${targetField}`, {
      recordType: Array.isArray(currentRecord) ? 'array' : 'object',
      sourceFields: sourceFields.slice(0, 5), // Show sample of source fields
      currentRecordKeys: Object.keys(currentRecord).slice(0, 5), // Show sample of record keys
      sourceField
    });
    
    if (Array.isArray(currentRecord)) {
      // If the current record is an array, we need to find the index of the field
      // This requires looking it up in the sourceFields array
      const sourceFieldIndex = sourceFields.indexOf(sourceField);
      if (sourceFieldIndex >= 0 && sourceFieldIndex < currentRecord.length) {
        value = currentRecord[sourceFieldIndex];
        console.log(`Found value at index ${sourceFieldIndex}:`, value);
      } else {
        // Try direct index access by converting sourceField to index
        const index = parseInt(sourceField, 10);
        if (!isNaN(index) && index >= 0 && index < currentRecord.length) {
          value = currentRecord[index];
          console.log(`Using direct index ${index} access:`, value);
        } else {
          // Try to find the field by direct property access as fallback
          value = currentRecord[sourceField];
          console.log(`Using direct property access as fallback:`, value);
        }
      }
    } else {
      // Traditional object access
      value = currentRecord[sourceField];
      console.log(`Object property access:`, value);
    }
    
    // Log the mapping for debugging
    console.log(`Mapping ${sourceField} → ${targetField} =`, value);
    
    setMappedData(prev => {
      // Skip update if the value hasn't changed
      if (prev[targetField] === value) {
        return prev;
      }
      
      return {
        ...prev,
        [targetField]: value
      };
    });
  }, [dataToImport, sourceFields]);
  
  /**
   * Clear all mapped data
   */
  const clearMappedData = useCallback(() => {
    setMappedData({});
  }, []);
  
  // Memoize sourceFields array to prevent unnecessary re-renders
  const memoizedSourceFields = useMemo(() => sourceFields, [fingerprint(sourceFields)]);
  
  // Memoize dataToImport for stable reference
  const memoizedDataToImport = useMemo(() => dataToImport, [fingerprint(dataToImport)]);
  
  return {
    // Provide memoized state
    dataToImport: memoizedDataToImport,
    sourceFields: memoizedSourceFields,
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