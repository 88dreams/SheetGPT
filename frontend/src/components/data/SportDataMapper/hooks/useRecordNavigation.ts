import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing record navigation in the SportDataMapper component
 */
export const useRecordNavigation = (dataToImport: any[] = []) => {
  // State for record navigation
  const [currentRecordIndex, setCurrentRecordIndex] = useState<number>(0);
  const [excludedRecords, setExcludedRecords] = useState<Set<number>>(new Set());
  
  // Calculate the total number of records
  const totalRecords = useMemo(() => dataToImport.length, [dataToImport]);
  
  // Calculate the number of included records
  const includedRecordsCount = useMemo(() => 
    totalRecords - excludedRecords.size, 
    [totalRecords, excludedRecords]
  );
  
  /**
   * Navigate to the next record
   */
  const goToNextRecord = useCallback(() => {
    if (currentRecordIndex < totalRecords - 1) {
      setCurrentRecordIndex(prev => prev + 1);
    } else if (totalRecords > 0) {
      // Loop back to first record if at the end
      setCurrentRecordIndex(0);
      console.log('Reached end of records, looping back to first record');
    }
  }, [currentRecordIndex, totalRecords]);
  
  /**
   * Navigate to the previous record
   */
  const goToPreviousRecord = useCallback(() => {
    if (currentRecordIndex > 0) {
      setCurrentRecordIndex(prev => prev - 1);
    } else if (totalRecords > 0) {
      // Loop back to last record if at the beginning
      setCurrentRecordIndex(totalRecords - 1);
      console.log('Reached start of records, looping back to last record');
    }
  }, [currentRecordIndex, totalRecords]);
  
  /**
   * Toggle whether the current record is excluded
   */
  const toggleExcludeRecord = useCallback(() => {
    setExcludedRecords(prev => {
      const newExcluded = new Set(prev);
      if (newExcluded.has(currentRecordIndex)) {
        newExcluded.delete(currentRecordIndex);
      } else {
        newExcluded.add(currentRecordIndex);
      }
      return newExcluded;
    });
  }, [currentRecordIndex]);
  
  /**
   * Check if the current record is excluded
   */
  const isCurrentRecordExcluded = useCallback(() => {
    return excludedRecords.has(currentRecordIndex);
  }, [currentRecordIndex, excludedRecords]);
  
  /**
   * Get the current record data
   */
  const getCurrentRecord = useCallback(() => {
    if (totalRecords === 0) return null;
    return dataToImport[currentRecordIndex];
  }, [dataToImport, currentRecordIndex, totalRecords]);
  
  /**
   * Get all records that are not excluded
   */
  const getIncludedRecords = useCallback(() => {
    return dataToImport.filter((_, index) => !excludedRecords.has(index));
  }, [dataToImport, excludedRecords]);
  
  return {
    currentRecordIndex,
    setCurrentRecordIndex,
    excludedRecords,
    totalRecords,
    includedRecordsCount,
    goToNextRecord,
    goToPreviousRecord,
    toggleExcludeRecord,
    isCurrentRecordExcluded,
    getCurrentRecord,
    getIncludedRecords
  };
};

export default useRecordNavigation; 