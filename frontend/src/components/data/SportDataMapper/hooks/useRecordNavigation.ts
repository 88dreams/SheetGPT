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
  
  // For debugging in production
  useEffect(() => {
    console.log(`useRecordNavigation - data changed: ${dataToImport.length} records, current index: ${currentRecordIndex}`);
  }, [dataFingerprint, dataToImport.length, currentRecordIndex]);
  
  // Reset current record index when data changes
  useEffect(() => {
    if (dataToImport.length > 0) {
      // Initialize to the first record or keep the current one if it's valid
      if (currentRecordIndex === null || currentRecordIndex >= dataToImport.length) {
        console.log(`Initializing current record to 0 (data length: ${dataToImport.length})`);
        setCurrentRecordIndex(0);
      }
    } else {
      // No data, no current record
      console.log('No data available, setting current record to null');
      setCurrentRecordIndex(null);
    }
  }, [dataFingerprint, dataToImport.length]);
  
  /**
   * Improved function to go to the next record
   * Added debugging and error handling for production issues
   */
  const goToNextRecord = useCallback(() => {
    console.log(`goToNextRecord called, current: ${currentRecordIndex}, total: ${dataToImport.length}`);
    
    if (currentRecordIndex === null || dataToImport.length === 0) {
      console.log("Can't go to next record - current is null or no data available");
      return false;
    }
    
    // Find the next non-excluded record
    let nextIndex = currentRecordIndex;
    let loopGuard = 0;
    const maxLoops = dataToImport.length;
    
    do {
      // Move to the next record, wrapping around if we reach the end
      nextIndex = (nextIndex + 1) % dataToImport.length;
      loopGuard++;
      
      if (loopGuard > maxLoops) {
        console.warn("Loop guard triggered in goToNextRecord - all records might be excluded");
        return false;
      }
    } while (excludedRecords.has(nextIndex) && loopGuard < maxLoops);
    
    console.log(`Moving to next record: ${nextIndex}`);
    
    // Update the current record index
    setCurrentRecordIndex(nextIndex);
    return true;
  }, [currentRecordIndex, dataToImport.length, excludedRecords]);
  
  /**
   * Improved function to go to the previous record
   * Added debugging and error handling for production issues
   */
  const goToPreviousRecord = useCallback(() => {
    console.log(`goToPreviousRecord called, current: ${currentRecordIndex}, total: ${dataToImport.length}`);
    
    if (currentRecordIndex === null || dataToImport.length === 0) {
      console.log("Can't go to previous record - current is null or no data available");
      return false;
    }
    
    // Find the previous non-excluded record
    let prevIndex = currentRecordIndex;
    let loopGuard = 0;
    const maxLoops = dataToImport.length;
    
    do {
      // Move to the previous record, wrapping around if needed
      prevIndex = (prevIndex - 1 + dataToImport.length) % dataToImport.length;
      loopGuard++;
      
      if (loopGuard > maxLoops) {
        console.warn("Loop guard triggered in goToPreviousRecord - all records might be excluded");
        return false;
      }
    } while (excludedRecords.has(prevIndex) && loopGuard < maxLoops);
    
    console.log(`Moving to previous record: ${prevIndex}`);
    
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
        console.log(`Record ${currentRecordIndex} is now included`);
      } else {
        newExcluded.add(currentRecordIndex);
        console.log(`Record ${currentRecordIndex} is now excluded`);
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