import { useCallback, useState } from 'react';
import { EntityType } from '../../../../types/sports';
import { FieldValuesMap, UpdateResults } from '../types';
import { useNotification } from '../../../../contexts/NotificationContext';
import { apiClient } from '../../../../utils/apiClient';

interface UseBulkUpdateProps {
  isMounted: React.MutableRefObject<boolean>;
}

/**
 * Hook for processing bulk update operations
 */
const useBulkUpdate = ({ isMounted }: UseBulkUpdateProps) => {
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState<UpdateResults>({ success: 0, failed: 0 });

  // Process bulk update for entity-based mode
  const processEntityBulkUpdate = useCallback(async (
    entityType: EntityType,
    selectedIds: string[],
    updateData: FieldValuesMap,
    onSuccess: (updatedData?: any) => void,
    onComplete: () => void
  ) => {
    setIsProcessing(true);
    setResults({ success: 0, failed: 0 });
    
    try {
      // Process in batches of 10
      const batchSize = 10;
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        // Safety check - cancel if component unmounted
        if (!isMounted.current) break;
        
        const batch = selectedIds.slice(i, i + batchSize);
        
        // Process each entity in the batch
        for (const id of batch) {
          try {
            // Use a direct API call rather than SportsDatabaseService to avoid auth issues
            await apiClient.put(`/sports/entities/${entityType}/${id}`, updateData);
            succeeded++;
          } catch (error) {
            console.error(`Error updating entity ${id}:`, error);
            failed++;
          }
          
          // Update progress after each entity
          processed++;
          if (isMounted.current) {
            setProcessingProgress(Math.round((processed / selectedIds.length) * 100));
            setResults({ success: succeeded, failed });
          }
        }
      }
      
      // Show notification based on results
      if (failed === 0) {
        showNotification('success', `Successfully updated ${succeeded} ${entityType}(s)`);
        
        // After a delay, close and refresh
        setTimeout(() => {
          onSuccess();
          onComplete();
        }, 1500);
      } else {
        showNotification('warning', `Updated ${succeeded} items with ${failed} failures`);
      }
    } catch (error) {
      console.error('Error during bulk update:', error);
      showNotification('error', `Error during bulk update: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (isMounted.current) {
        setIsProcessing(false);
      }
    }
  }, [isMounted, showNotification]);

  // Process bulk update for query-based mode
  const processQueryBulkUpdate = useCallback(async (
    queryResults: any[],
    selectedIndexes: Set<number>,
    updateData: FieldValuesMap,
    onSuccess: (updatedData?: any) => void,
    onComplete: () => void
  ) => {
    setIsProcessing(true);
    setResults({ success: 0, failed: 0 });
    
    try {
      // Create a copy of the results array
      const updatedResults = [...queryResults];
      
      // Process in batches of 10
      const batchSize = 10;
      let processed = 0;
      let successes = 0;
      let failures = 0;
      
      // Convert Set to Array for easier iteration
      const selectedIndexArray = Array.from(selectedIndexes);
      
      for (let i = 0; i < selectedIndexArray.length; i += batchSize) {
        // Safety check - cancel if component unmounted
        if (!isMounted.current) break;
        
        const batch = selectedIndexArray.slice(i, i + batchSize);
        
        // Process each row in the batch
        batch.forEach(index => {
          try {
            // Update each selected field in the result object
            Object.entries(updateData).forEach(([field, value]) => {
              updatedResults[index][field] = value;
            });
            successes++;
          } catch (error) {
            console.error(`Error updating row ${index}:`, error);
            failures++;
          }
        });
        
        // Update progress
        processed += batch.length;
        if (isMounted.current) {
          setProcessingProgress(Math.round((processed / selectedIndexArray.length) * 100));
          setResults({ success: successes, failed: failures });
        }
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Show notification based on results
      if (failures === 0) {
        showNotification('success', `Successfully updated ${successes} rows`);
        
        // After a delay, close and refresh
        setTimeout(() => {
          onSuccess(updatedResults);
          onComplete();
        }, 1500);
      } else {
        showNotification('warning', `Updated ${successes} rows with ${failures} failures`);
      }
    } catch (error) {
      console.error('Error during bulk update:', error);
      showNotification('error', `Error during bulk update: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (isMounted.current) {
        setIsProcessing(false);
      }
    }
  }, [isMounted, showNotification]);

  return {
    isProcessing,
    processingProgress,
    results,
    processEntityBulkUpdate,
    processQueryBulkUpdate
  };
};

export default useBulkUpdate;