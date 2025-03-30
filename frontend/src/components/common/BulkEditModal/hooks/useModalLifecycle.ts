import { useCallback, useEffect, useRef, useState } from 'react';

interface UseModalLifecycleProps {
  visible: boolean;
  onCancel: () => void;
}

/**
 * Hook for managing modal state between fields view and processing view
 */
export default function useModalLifecycle({ visible, onCancel }: UseModalLifecycleProps) {
  // Track which view we're showing - either "fields" or "processing"
  const [currentView, setCurrentView] = useState<'fields' | 'processing'>('fields');
  
  // Prevent infinite updates by tracking previous visibility
  const prevVisibleRef = useRef(visible);
  
  // Reset view when modal visibility changes from false to true
  useEffect(() => {
    // Only update state when visibility changes from false to true to avoid update loops
    if (visible && !prevVisibleRef.current) {
      setCurrentView('fields');
    }
    // Update ref for next render
    prevVisibleRef.current = visible;
  }, [visible]);
  
  // Handlers for view changes and modal close
  const switchToProcessingView = useCallback(() => {
    setCurrentView('processing');
  }, []);
  
  const closeModal = useCallback(() => {
    onCancel();
  }, [onCancel]);
  
  return {
    isVisible: visible,
    currentView,
    switchToProcessingView,
    closeModal
  };
}