import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Interface for record navigation state
 */
export interface RecordNavigationState {
  currentRecordIndex: number;
  excludedRecords: Set<number>;
}

/**
 * Custom hook for managing record navigation in the SportDataMapper component
 * 
 * This hook handles navigation between records, tracking excluded records, and
 * providing record statistics.
 */
export function useRecordNavigation<T extends unknown[]>(
  dataArray: T,
  initialState?: Partial<RecordNavigationState>
) {
  // State for record navigation
  const [currentRecordIndex, setCurrentRecordIndex] = useState<number>(
    initialState?.currentRecordIndex ?? 0
  );
  
  const [excludedRecords, setExcludedRecords] = useState<Set<number>>(
    initialState?.excludedRecords ?? new Set<number>()
  );
  
  // Calculate the total number of records
  const totalRecords = useMemo(() => dataArray.length, [dataArray]);
  
  // Calculate the number of included records
  const includedRecordsCount = useMemo(() => 
    totalRecords - excludedRecords.size, 
    [totalRecords, excludedRecords]
  );
  
  // Ensure the current record index is valid when data changes
  useEffect(() => {
    if (dataArray.length === 0) {
      setCurrentRecordIndex(0);
    } else if (currentRecordIndex >= dataArray.length) {
      setCurrentRecordIndex(dataArray.length - 1);
    }
  }, [dataArray, currentRecordIndex]);
  
  /**
   * Navigate to the next record
   */
  const goToNextRecord = useCallback(() => {
    if (totalRecords === 0) return;
    
    if (currentRecordIndex < totalRecords - 1) {
      setCurrentRecordIndex(prev => prev + 1);
    } else {
      // Loop back to first record if at the end
      setCurrentRecordIndex(0);
      console.log('Reached end of records, looping back to first record');
    }
  }, [currentRecordIndex, totalRecords]);
  
  /**
   * Navigate to the previous record
   */
  const goToPreviousRecord = useCallback(() => {
    if (totalRecords === 0) return;
    
    if (currentRecordIndex > 0) {
      setCurrentRecordIndex(prev => prev - 1);
    } else {
      // Loop back to last record if at the beginning
      setCurrentRecordIndex(totalRecords - 1);
      console.log('Reached start of records, looping back to last record');
    }
  }, [currentRecordIndex, totalRecords]);
  
  /**
   * Navigate to a specific record index
   */
  const goToRecord = useCallback((index: number) => {
    if (index >= 0 && index < totalRecords) {
      setCurrentRecordIndex(index);
    } else {
      console.warn(`Invalid record index: ${index}. Valid range is 0-${totalRecords - 1}`);
    }
  }, [totalRecords]);
  
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
   * Exclude a specific record
   */
  const excludeRecord = useCallback((index: number) => {
    setExcludedRecords(prev => {
      const newExcluded = new Set(prev);
      newExcluded.add(index);
      return newExcluded;
    });
  }, []);
  
  /**
   * Include a previously excluded record
   */
  const includeRecord = useCallback((index: number) => {
    setExcludedRecords(prev => {
      const newExcluded = new Set(prev);
      newExcluded.delete(index);
      return newExcluded;
    });
  }, []);
  
  /**
   * Check if the current record is excluded
   */
  const isCurrentRecordExcluded = useMemo(() => {
    return excludedRecords.has(currentRecordIndex);
  }, [currentRecordIndex, excludedRecords]);
  
  /**
   * Check if a specific record is excluded
   */
  const isRecordExcluded = useCallback((index: number) => {
    return excludedRecords.has(index);
  }, [excludedRecords]);
  
  /**
   * Get the current record data
   */
  const currentRecord = useMemo(() => {
    if (totalRecords === 0) return null;
    return dataArray[currentRecordIndex];
  }, [dataArray, currentRecordIndex, totalRecords]);
  
  /**
   * Get all records that are not excluded
   */
  const includedRecords = useMemo(() => {
    return dataArray.filter((_, index) => !excludedRecords.has(index));
  }, [dataArray, excludedRecords]);
  
  /**
   * Reset all exclusions
   */
  const resetExclusions = useCallback(() => {
    setExcludedRecords(new Set());
  }, []);
  
  return {
    // State
    currentRecordIndex,
    excludedRecords,
    totalRecords,
    includedRecordsCount,
    
    // Current data
    currentRecord,
    includedRecords,
    
    // Actions and checks
    setCurrentRecordIndex,
    goToNextRecord,
    goToPreviousRecord,
    goToRecord,
    toggleExcludeRecord,
    excludeRecord,
    includeRecord,
    isCurrentRecordExcluded,
    isRecordExcluded,
    resetExclusions
  };
}

export default useRecordNavigation;