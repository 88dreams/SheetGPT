import { useCallback, useEffect, useRef, useState } from 'react';

interface UseModalLifecycleProps {
  visible: boolean;
  onCleanup?: () => void;
}

/**
 * Hook for managing the modal lifecycle and preventing state updates
 * when the component is unmounted or not visible
 */
const useModalLifecycle = ({ visible, onCleanup }: UseModalLifecycleProps) => {
  // State tracking
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Lifecycle refs to track component state
  const isMountedRef = useRef(false);
  const initStartedRef = useRef(false);
  const needsCleanupRef = useRef(false);

  // Initialize and cleanup the modal based on visibility
  useEffect(() => {
    // Track whether we need to run initialization
    const shouldInitialize = visible && !initStartedRef.current;
    const shouldCleanup = !visible && needsCleanupRef.current;
    
    // Initialize modal when it first becomes visible
    if (shouldInitialize) {
      // Prevent duplicate initialization
      initStartedRef.current = true;
      isMountedRef.current = true;
      needsCleanupRef.current = true;
      
      console.log("BulkEditModal: Initializing modal");
      setIsLoading(true);
    }
    
    // Cleanup modal when it becomes invisible
    if (shouldCleanup) {
      console.log("BulkEditModal: Cleaning up modal");
      needsCleanupRef.current = false;
      
      // Delay cleanup to prevent state updates during render
      setTimeout(() => {
        if (!visible) {
          // Mark component as unmounted
          isMountedRef.current = false;
          initStartedRef.current = false;
          
          // Reset state
          if (onCleanup) onCleanup();
          setShowResults(false);
        }
      }, 100);
    }
    
    // Cleanup function for when component unmounts
    return () => {
      isMountedRef.current = false;
    };
  }, [visible, onCleanup]);

  // Safe setState functions that check if component is mounted
  const safeSetIsLoading = useCallback((value: boolean) => {
    if (isMountedRef.current) {
      setIsLoading(value);
    }
  }, []);

  const safeSetShowResults = useCallback((value: boolean) => {
    if (isMountedRef.current) {
      setShowResults(value);
    }
  }, []);

  return {
    isLoading,
    showResults,
    isMountedRef,
    setIsLoading: safeSetIsLoading,
    setShowResults: safeSetShowResults
  };
};

export default useModalLifecycle;