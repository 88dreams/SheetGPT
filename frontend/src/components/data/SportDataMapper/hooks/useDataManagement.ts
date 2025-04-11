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
   * Enhanced with better header extraction and array data handling
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
    
    // ENHANCED: Extract headers using multiple strategies
    
    // Strategy 1: Use explicit headers property if available (most common for CSV/table data)
    if (data.headers && Array.isArray(data.headers)) {
      headers = data.headers;
      console.log('useDataManagement: Found explicit headers:', headers);
    }
    // Strategy 2: For column-based data like Excel exports
    else if (data.columns && Array.isArray(data.columns)) {
      headers = data.columns.map(col => col.name || col.title || col.label || `Column ${col.index || 0}`);
      console.log('useDataManagement: Extracted headers from columns:', headers);
    }
    // Strategy 3: For objects with field definitions
    else if (data.fields && Array.isArray(data.fields)) {
      headers = data.fields.map(field => field.name || field.key || field.id || String(field));
      console.log('useDataManagement: Extracted headers from fields:', headers);
    }
    
    // Process the data based on its structure
    
    // Case 1: Common structure with rows array and headers
    if (!Array.isArray(data) && data.rows && Array.isArray(data.rows)) {
      processedData = data.rows;
      console.log('useDataManagement: Using rows array as processedData');
      
      // Store the original data as a parent reference for context
      if (typeof processedData === 'object') {
        // Add a non-enumerable parent reference to the rows array
        Object.defineProperty(processedData, '__parent__', {
          value: data,
          enumerable: false, // Don't show in Object.keys() to avoid circular references
          configurable: true
        });
        console.log('useDataManagement: Added __parent__ reference to rows array');
      }
      
      // If headers are not set but first row looks like headers, use that
      if (headers.length === 0 && processedData.length > 1) {
        const potentialHeaders = processedData[0];
        // Check if first row contains mostly strings (typical for headers)
        if (Array.isArray(potentialHeaders) && 
            potentialHeaders.filter(h => typeof h === 'string').length > potentialHeaders.length * 0.7) {
          headers = potentialHeaders.map(h => String(h));
          processedData = processedData.slice(1); // Remove header row from data
          console.log('useDataManagement: Extracted headers from first row:', headers);
        }
      }
    } 
    // Case 2: Array of arrays (like CSV data without headers)
    else if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      processedData = data;
      console.log('useDataManagement: Using array of arrays as processedData');
      
      // If no headers but looks like first row might be headers
      if (headers.length === 0 && data.length > 1) {
        const potentialHeaders = data[0];
        // Check if first row contains mostly strings (typical for headers)
        if (potentialHeaders.filter(h => typeof h === 'string').length > potentialHeaders.length * 0.7) {
          headers = potentialHeaders.map(h => String(h));
          processedData = data.slice(1); // Remove header row from data
          console.log('useDataManagement: Extracted headers from first row of array:', headers);
        }
      }
      
      // If still no headers, generate column names
      if (headers.length === 0 && data[0] && Array.isArray(data[0])) {
        headers = Array.from({ length: data[0].length }, (_, i) => `Column ${i + 1}`);
        console.log('useDataManagement: Generated generic column headers:', headers);
      }
      
      // Store header information with the array
      Object.defineProperty(processedData, '__headers__', {
        value: headers,
        enumerable: false,
        configurable: true
      });
    }
    // Case 3: Plain object - convert to array with one item
    else if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
      processedData = [data];
      console.log('useDataManagement: Converted object to single-item array');
    }
    // Case 4: Any other type - wrap in a simple object and array
    else if (!Array.isArray(data)) {
      try {
        processedData = [{ value: data }];
        console.log('useDataManagement: Wrapped primitive value in object and array');
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
    
    // Ensure the first record is an object or array
    if (!(typeof firstRecord === 'object' || Array.isArray(firstRecord)) || firstRecord === null) {
      console.error('useDataManagement: First record is not an object or array');
      setDataValidity(false);
      return;
    }
    
    setDataValidity(true);
    
    // ENHANCED: Handle different first record types
    let fields: string[] = [];
    
    if (Array.isArray(firstRecord)) {
      // For array records, use the headers or generate indices
      if (headers.length > 0 && headers.length >= firstRecord.length) {
        fields = headers;
      } else {
        // Generate numeric indices as field names if headers aren't available or complete
        fields = Array.from({ length: firstRecord.length }, (_, i) => `${i}`);
      }
      console.log('useDataManagement: Using headers or indices as fields for array record:', fields);
    } else {
      // For object records, use keys from the object
      fields = Object.keys(firstRecord);
      console.log('useDataManagement: Using object keys as fields:', fields);
    }
    
    // Determine the fields to use based on all available information
    let fieldsToUse: string[] = fields;
    
    // Prefer explicit headers when available and they match the data structure
    if (headers.length > 0) {
      if (Array.isArray(firstRecord) && headers.length >= firstRecord.length) {
        fieldsToUse = headers;
        console.log('useDataManagement: Using explicit headers for array data');
      } else if (!Array.isArray(firstRecord)) {
        // For objects, only use headers if they're valid keys in the object
        const validHeadersForObject = headers.filter(h => fields.includes(h));
        if (validHeadersForObject.length >= fields.length * 0.7) { // Use if at least 70% match
          fieldsToUse = headers;
          console.log('useDataManagement: Using explicit headers for object data');
        }
      }
    }
    
    console.log('useDataManagement: Fields to use:', fieldsToUse);
    
    // Generate fingerprints to check for changes
    const processedDataFingerprint = fingerprint(processedData);
    const fieldsFingerprint = fingerprint(fieldsToUse);
    const valuesFingerprint = fingerprint(firstRecord);
    
    console.log('useDataManagement: Setting data with:', {
      dataToImportLength: processedData.length,
      fieldsToUseLength: fieldsToUse.length,
      hasArrayRecords: Array.isArray(firstRecord),
      headersLength: headers.length
    });
    
    // Always update the data for debugging
    console.log('useDataManagement: Forcing update of data, fields, and values');
    
    // Update dataToImport and ensure header information is preserved
    if (headers.length > 0) {
      // Store header information with the data for later use
      // This is critical for array-based records
      Object.defineProperty(processedData, '__headers__', {
        value: headers,
        enumerable: false,
        configurable: true
      });
      
      // If data had an original structure with headers, preserve that relationship
      if (!Array.isArray(data) && data.headers) {
        Object.defineProperty(processedData, '__parent__', {
          value: { headers },
          enumerable: false,
          configurable: true
        });
      }
    }
    
    // Update the state with processed data and fields
    setDataToImport(processedData);
    setSourceFields(fieldsToUse);
    
    // Prepare the source field values with all the contextual information needed
    let initialSourceFieldValues: Record<string, any> = {};
    
    if (Array.isArray(firstRecord)) {
      // For array records, create an object mapping fields to values
      fieldsToUse.forEach((field, index) => {
        if (index < firstRecord.length) {
          initialSourceFieldValues[field] = firstRecord[index];
        }
      });
      
      // Add numeric indices for direct access
      for (let i = 0; i < firstRecord.length; i++) {
        initialSourceFieldValues[i] = firstRecord[i];
      }
      
      // Add header information for field mapping
      initialSourceFieldValues['__headers__'] = fieldsToUse;
      
      // Add parent reference if available
      if (processedData['__parent__']) {
        initialSourceFieldValues['__parent__'] = processedData['__parent__'];
      }
    } else {
      // For object records, use the object properties directly
      initialSourceFieldValues = { ...firstRecord };
      
      // Also add headers if they're available
      if (headers.length > 0) {
        initialSourceFieldValues['__headers__'] = headers;
      }
    }
    
    // Update the source field values state
    setSourceFieldValues(initialSourceFieldValues);
    
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
   * Enhanced with multiple strategies for handling array-based records
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
      hasHeaders: currentRecord['__headers__'] ? 'yes' : 'no',
      hasParent: currentRecord['__parent__'] ? 'yes' : 'no',
      currentRecordSample: JSON.stringify(currentRecord).slice(0, 100) + '...'
    });
    
    // Create a new mapped data object based on the current record
    const newMappedData: Record<string, any> = {};
    
    // Apply the mappings to the current record, using enhanced array handling
    Object.entries(mappings).forEach(([targetField, sourceField]) => {
      let value;
      let valueFound = false;
      
      if (Array.isArray(currentRecord)) {
        // ENHANCED ARRAY HANDLING: Try multiple strategies to find the value
        
        // Strategy 1: Use sourceFields array for position mapping (most reliable)
        const sourceIndex = sourceFields.indexOf(sourceField);
        if (sourceIndex >= 0 && sourceIndex < currentRecord.length) {
          value = currentRecord[sourceIndex];
          valueFound = true;
          console.log(`Strategy 1: Found array value for ${targetField} at sourceFields index ${sourceIndex}:`, value);
        }
        
        // Strategy 2: Try numeric index if the sourceField looks like a number
        if (!valueFound) {
          const index = parseInt(sourceField, 10);
          if (!isNaN(index) && index >= 0 && index < currentRecord.length) {
            value = currentRecord[index];
            valueFound = true;
            console.log(`Strategy 2: Found array value for ${targetField} using numeric index ${index}:`, value);
          }
        }
        
        // Strategy 3: Check if record has __headers__ and use that for indexing
        if (!valueFound && currentRecord['__headers__'] && Array.isArray(currentRecord['__headers__'])) {
          const headerIndex = currentRecord['__headers__'].indexOf(sourceField);
          if (headerIndex >= 0 && headerIndex < currentRecord.length) {
            value = currentRecord[headerIndex];
            valueFound = true;
            console.log(`Strategy 3: Found array value for ${targetField} using __headers__ index ${headerIndex}:`, value);
          }
        }
        
        // Strategy 4: Check if the parent has headers and use that for indexing
        if (!valueFound && currentRecord['__parent__'] && currentRecord['__parent__'].headers) {
          const parentHeaders = currentRecord['__parent__'].headers;
          if (Array.isArray(parentHeaders)) {
            const headerIndex = parentHeaders.indexOf(sourceField);
            if (headerIndex >= 0 && headerIndex < currentRecord.length) {
              value = currentRecord[headerIndex];
              valueFound = true;
              console.log(`Strategy 4: Found array value for ${targetField} using parent.headers index ${headerIndex}:`, value);
            }
          }
        }
        
        // Strategy 5: Try direct property access as fallback (unusual for arrays but possible)
        if (!valueFound && sourceField in currentRecord) {
          value = currentRecord[sourceField];
          valueFound = true;
          console.log(`Strategy 5: Found array value for ${targetField} using direct property access:`, value);
        }
        
        // Strategy 6: Look for the sourceField in the dataToImport.__headers__ as fallback
        if (!valueFound && dataToImport['__headers__'] && Array.isArray(dataToImport['__headers__'])) {
          const headerIndex = dataToImport['__headers__'].indexOf(sourceField);
          if (headerIndex >= 0 && headerIndex < currentRecord.length) {
            value = currentRecord[headerIndex];
            valueFound = true;
            console.log(`Strategy 6: Found array value for ${targetField} using dataToImport.__headers__ index ${headerIndex}:`, value);
          }
        }
        
        // Strategy 7: For case-insensitive matching
        if (!valueFound && typeof sourceField === 'string') {
          const sourceFieldLower = sourceField.toLowerCase();
          
          // Check if sourceField is a case-insensitive match for any property name in currentRecord
          Object.keys(currentRecord).forEach(key => {
            if (typeof key === 'string' && key.toLowerCase() === sourceFieldLower) {
              value = currentRecord[key];
              valueFound = true;
              console.log(`Strategy 7: Found array value for ${targetField} using case-insensitive match on key ${key}:`, value);
            }
          });
        }
        
        if (!valueFound) {
          console.warn(`Could not find source field "${sourceField}" for target field "${targetField}" in array record`);
        }
      } else {
        // Traditional object property access
        value = currentRecord[sourceField];
        if (value !== undefined) {
          valueFound = true;
          console.log(`Found object value for ${targetField} using property ${sourceField}:`, value);
        } else {
          console.warn(`Object property "${sourceField}" not found for target field "${targetField}"`);
        }
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
   * Completely redesigned to ensure proper UI updates
   * Enhanced with robust header handling for array-based records
   */
  const updateSourceFieldValues = useCallback((recordIndex: number) => {
    if (recordIndex < 0 || recordIndex >= dataToImport.length) {
      console.warn('Invalid record index:', recordIndex);
      return;
    }
    
    console.log(`updateSourceFieldValues called with index ${recordIndex}`, {
      dataLength: dataToImport.length,
      recordIndex,
      hasRecord: !!dataToImport[recordIndex],
      isArray: Array.isArray(dataToImport[recordIndex])
    });
    
    const record = dataToImport[recordIndex];
    
    if (!record) {
      console.error('No record found at index:', recordIndex);
      return;
    }
    
    console.log('Forcefully updating source field values for record:', recordIndex);
    
    // Force a clean state update by creating a new object
    // with explicit property assignments rather than object spread
    const newValues: Record<string, any> = {};
    
    // For object data, copy each property individually
    if (typeof record === 'object' && record !== null && !Array.isArray(record)) {
      Object.keys(record).forEach(key => {
        newValues[key] = record[key];
      });
      
      // If this is an object record but we have sourceFields, add them as headers too
      if (sourceFields.length > 0) {
        newValues['__headers__'] = sourceFields;
      }
    } 
    // For array data, use a more robust approach to ensure header information
    else if (Array.isArray(record)) {
      // ENHANCED ARRAY HANDLING: Use multiple strategies to capture headers
      
      // Strategy 1: Add the sourceFields as headers (most reliable source)
      newValues['__headers__'] = sourceFields;
      console.log('Added __headers__ from sourceFields:', sourceFields);
      
      // Strategy 2: Transfer parent reference with its headers (if available)
      let parentFound = false;
      
      // First check the record itself for a parent reference
      if (record['__parent__']) {
        newValues['__parent__'] = record['__parent__'];
        parentFound = true;
        console.log('Added __parent__ from record directly');
      }
      // Then check the dataToImport array for a parent reference
      else if (dataToImport['__parent__']) {
        newValues['__parent__'] = dataToImport['__parent__'];
        parentFound = true;
        console.log('Added __parent__ from dataToImport array');
      }
      
      // Log parent headers for debugging if found
      if (parentFound && newValues['__parent__']?.headers) {
        console.log('Parent headers found:', newValues['__parent__'].headers);
      }
      
      // Strategy 3: Map the array values to corresponding field names
      // This creates properties like: "League Full Name": "NBA", "Sport": "Basketball"
      sourceFields.forEach((field, index) => {
        if (index < record.length) {
          newValues[field] = record[index];
          console.log(`Mapped field[${index}] '${field}' = '${record[index]}'`);
        }
      });
      
      // Strategy 4: Also add numeric indices directly for positional access
      // This creates properties like: 0: "NBA", 1: "Basketball"
      for (let i = 0; i < record.length; i++) {
        newValues[i] = record[i];
      }
      
      // Strategy 5: Explicitly log all array values for better debugging
      console.log('Array values:', [...record]);
    }
    
    // Add a metadata field with the record index to help with debugging
    newValues['__recordIndex__'] = recordIndex;
    
    console.log('New source field values created:', {
      keys: Object.keys(newValues).length,
      hasHeaders: !!newValues['__headers__'],
      headerCount: newValues['__headers__']?.length || 0,
      hasParent: !!newValues['__parent__'],
      parentHasHeaders: !!newValues['__parent__']?.headers,
      sampleKeys: Object.keys(newValues).slice(0, 5),
      valuesType: typeof newValues
    });
    
    // Use a sequence of updates with RAF for maximum reliability:
    
    // First, clear the current values with an empty object to force a reset
    setSourceFieldValues({});
    
    // Then use RAF to set the new values in the next frame
    requestAnimationFrame(() => {
      console.log('Setting new source field values in animation frame');
      
      // Set the new values with a stable reference
      setSourceFieldValues(newValues);
      
      // Schedule a logging message to confirm state was updated
      setTimeout(() => {
        console.log('Source field values should be updated now');
      }, 50);
    });
  }, [dataToImport, sourceFields]);
  
  /**
   * Update mapped data when a field is mapped
   * Optimized with fingerprinting to prevent unnecessary updates
   * Enhanced with multiple strategies for handling array-based data
   */
  const updateMappedDataForField = useCallback((
    sourceField: string, 
    targetField: string, 
    currentRecordIndex: number | null
  ) => {
    if (currentRecordIndex === null || !dataToImport[currentRecordIndex]) {
      return;
    }
    
    // Get the current record
    const currentRecord = dataToImport[currentRecordIndex];
    
    console.log(`updateMappedDataForField: mapping ${sourceField} to ${targetField}`, {
      recordType: Array.isArray(currentRecord) ? 'array' : 'object',
      sourceFields: sourceFields.slice(0, 5), // Show sample of source fields
      currentRecordKeys: Object.keys(currentRecord).slice(0, 5), // Show sample of record keys
      hasHeaders: currentRecord['__headers__'] ? 'yes' : 'no',
      hasParent: currentRecord['__parent__'] ? 'yes' : 'no',
      sourceField
    });
    
    // Handle both array and object data formats with enhanced strategies
    let value;
    let valueFound = false;
    
    if (Array.isArray(currentRecord)) {
      // ENHANCED ARRAY HANDLING: Try multiple strategies to find the value
      
      // Strategy 1: Use sourceFields array for position mapping (most reliable)
      const sourceIndex = sourceFields.indexOf(sourceField);
      if (sourceIndex >= 0 && sourceIndex < currentRecord.length) {
        value = currentRecord[sourceIndex];
        valueFound = true;
        console.log(`Strategy 1: Found array value for ${targetField} at sourceFields index ${sourceIndex}:`, value);
      }
      
      // Strategy 2: Try numeric index if the sourceField looks like a number
      if (!valueFound) {
        const index = parseInt(sourceField, 10);
        if (!isNaN(index) && index >= 0 && index < currentRecord.length) {
          value = currentRecord[index];
          valueFound = true;
          console.log(`Strategy 2: Found array value for ${targetField} using numeric index ${index}:`, value);
        }
      }
      
      // Strategy 3: Check if record has __headers__ and use that for indexing
      if (!valueFound && currentRecord['__headers__'] && Array.isArray(currentRecord['__headers__'])) {
        const headerIndex = currentRecord['__headers__'].indexOf(sourceField);
        if (headerIndex >= 0 && headerIndex < currentRecord.length) {
          value = currentRecord[headerIndex];
          valueFound = true;
          console.log(`Strategy 3: Found array value for ${targetField} using __headers__ index ${headerIndex}:`, value);
        }
      }
      
      // Strategy 4: Check if the parent has headers and use that for indexing
      if (!valueFound && currentRecord['__parent__'] && currentRecord['__parent__'].headers) {
        const parentHeaders = currentRecord['__parent__'].headers;
        if (Array.isArray(parentHeaders)) {
          const headerIndex = parentHeaders.indexOf(sourceField);
          if (headerIndex >= 0 && headerIndex < currentRecord.length) {
            value = currentRecord[headerIndex];
            valueFound = true;
            console.log(`Strategy 4: Found array value for ${targetField} using parent.headers index ${headerIndex}:`, value);
          }
        }
      }
      
      // Strategy 5: Try direct property access as fallback (unusual for arrays but possible)
      if (!valueFound && sourceField in currentRecord) {
        value = currentRecord[sourceField];
        valueFound = true;
        console.log(`Strategy 5: Found array value for ${targetField} using direct property access:`, value);
      }
      
      // Strategy 6: Look for the sourceField in the dataToImport.__headers__ as fallback
      if (!valueFound && dataToImport['__headers__'] && Array.isArray(dataToImport['__headers__'])) {
        const headerIndex = dataToImport['__headers__'].indexOf(sourceField);
        if (headerIndex >= 0 && headerIndex < currentRecord.length) {
          value = currentRecord[headerIndex];
          valueFound = true;
          console.log(`Strategy 6: Found array value for ${targetField} using dataToImport.__headers__ index ${headerIndex}:`, value);
        }
      }
      
      // Strategy 7: For case-insensitive matching
      if (!valueFound && typeof sourceField === 'string') {
        const sourceFieldLower = sourceField.toLowerCase();
        
        // Check if sourceField is a case-insensitive match for any property name in currentRecord
        Object.keys(currentRecord).forEach(key => {
          if (typeof key === 'string' && key.toLowerCase() === sourceFieldLower) {
            value = currentRecord[key];
            valueFound = true;
            console.log(`Strategy 7: Found array value for ${targetField} using case-insensitive match on key ${key}:`, value);
          }
        });
      }
      
      if (!valueFound) {
        console.warn(`Could not find source field "${sourceField}" for target field "${targetField}" in array record`);
      }
    } else {
      // Traditional object access
      value = currentRecord[sourceField];
      if (value !== undefined) {
        valueFound = true;
        console.log(`Found object property value for ${targetField}:`, value);
      } else {
        console.warn(`Could not find object property "${sourceField}" for target field "${targetField}"`);
      }
    }
    
    // Log the mapping for debugging
    console.log(`Final mapping: ${sourceField} → ${targetField} =`, value);
    
    // Only update if we found a value to map
    if (value !== undefined) {
      setMappedData(prev => {
        // Skip update if the value hasn't changed
        if (prev[targetField] === value) {
          console.log('Value unchanged, skipping update');
          return prev;
        }
        
        console.log('Updating mapped data with new value');
        return {
          ...prev,
          [targetField]: value
        };
      });
    } else {
      console.warn(`No value found for source field "${sourceField}", not updating mapped data`);
    }
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