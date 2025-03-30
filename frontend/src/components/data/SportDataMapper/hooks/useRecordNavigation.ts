import { useState, useCallback, useMemo, useEffect } from 'react';
import { fingerprint } from '../../../../utils/fingerprint';

/**
 * Custom hook for managing record navigation in the SportDataMapper component
 * Optimized with fingerprinting for better performance 
 */
export function useRecordNavigation(dataToImport: any[]) {
  // Current record index (null means no record is selected)
  const [currentRecordIndex, setCurrentRecordIndex] = useState<number | null>(null);
  
  // Set of excluded record indices
  const [excludedRecords, setExcludedRecords] = useState<Set<number>>(new Set());
  
  // Memoized fingerprint of the data array to track changes
  const dataFingerprint = useMemo(() => fingerprint(dataToImport), [dataToImport]);
  
  // Total number of records (memoized to prevent unnecessary recalculations)
  const totalRecords = useMemo(() => dataToImport.length, [dataToImport.length]);
  
  // Reset current record index when data changes
  useEffect(() => {
    if (dataToImport.length > 0) {
      // Initialize to the first record or keep the current one if it's valid
      if (currentRecordIndex === null || currentRecordIndex >= dataToImport.length) {
        setCurrentRecordIndex(0);
      }
    } else {
      // No data, no current record
      setCurrentRecordIndex(null);
    }
  }, [dataFingerprint, dataToImport.length]);
  
  /**
   * Go to the next record (with circular navigation)
   * Skips excluded records
   */
  const goToNextRecord = useCallback(() => {
    if (currentRecordIndex === null || dataToImport.length === 0) {
      return false;
    }
    
    // Find the next non-excluded record
    let nextIndex = currentRecordIndex;
    let loopGuard = 0;
    const maxLoops = dataToImport.length; // Prevent infinite loops
    
    do {
      // Move to the next record, wrapping around if we reach the end
      nextIndex = (nextIndex + 1) % dataToImport.length;
      loopGuard++;
      
      // Break the loop if all records are excluded or we've done a full cycle
      if (loopGuard > maxLoops) {
        console.warn('All records are excluded or navigation loop ran too long');
        return false;
      }
    } while (excludedRecords.has(nextIndex) && loopGuard < maxLoops);
    
    // Update the current record index
    setCurrentRecordIndex(nextIndex);
    return true;
  }, [currentRecordIndex, dataToImport.length, excludedRecords]);
  
  /**
   * Go to the previous record (with circular navigation)
   * Skips excluded records
   */
  const goToPreviousRecord = useCallback(() => {
    if (currentRecordIndex === null || dataToImport.length === 0) {
      return false;
    }
    
    // Find the previous non-excluded record
    let prevIndex = currentRecordIndex;
    let loopGuard = 0;
    const maxLoops = dataToImport.length; // Prevent infinite loops
    
    do {
      // Move to the previous record, wrapping around if we reach the beginning
      prevIndex = (prevIndex - 1 + dataToImport.length) % dataToImport.length;
      loopGuard++;
      
      // Break the loop if all records are excluded or we've done a full cycle
      if (loopGuard > maxLoops) {
        console.warn('All records are excluded or navigation loop ran too long');
        return false;
      }
    } while (excludedRecords.has(prevIndex) && loopGuard < maxLoops);
    
    // Update the current record index
    setCurrentRecordIndex(prevIndex);
    return true;
  }, [currentRecordIndex, dataToImport.length, excludedRecords]);
  
  /**
   * Toggle whether the current record is excluded
   */
  const toggleExcludeRecord = useCallback(() => {
    if (currentRecordIndex === null) {
      return false;
    }
    
    setExcludedRecords(prev => {
      const newExcluded = new Set(prev);
      
      // Toggle the exclusion status
      if (newExcluded.has(currentRecordIndex)) {
        newExcluded.delete(currentRecordIndex);
      } else {
        newExcluded.add(currentRecordIndex);
      }
      
      return newExcluded;
    });
    
    return true;
  }, [currentRecordIndex]);
  
  /**
   * Check if the current record is excluded
   */
  const isCurrentRecordExcluded = useCallback(() => {
    if (currentRecordIndex === null) {
      return false;
    }
    
    return excludedRecords.has(currentRecordIndex);
  }, [currentRecordIndex, excludedRecords]);
  
  /**
   * Get all non-excluded records
   * Memoized to prevent unnecessary filtering
   */
  const getIncludedRecords = useCallback(() => {
    // If no records are excluded, return all records for efficiency
    if (excludedRecords.size === 0) {
      return dataToImport;
    }
    
    // Filter out excluded records
    return dataToImport.filter((_, index) => !excludedRecords.has(index));
  }, [dataToImport, dataFingerprint, excludedRecords]);
  
  // Memoize included records to avoid recalculating
  const includedRecords = useMemo(() => getIncludedRecords(), [getIncludedRecords]);
  
  // Statistics for navigation
  const stats = useMemo(() => ({
    totalRecords,
    includedRecords: totalRecords - excludedRecords.size,
    excludedRecords: excludedRecords.size
  }), [totalRecords, excludedRecords.size]);
  
  return {
    currentRecordIndex,
    setCurrentRecordIndex,
    totalRecords,
    goToNextRecord,
    goToPreviousRecord,
    toggleExcludeRecord,
    isCurrentRecordExcluded,
    getIncludedRecords: () => includedRecords,
    excludedRecords,
    stats
  };
}

export default useRecordNavigation;