import { useState, useCallback } from 'react';

/**
 * Interface for UI state in SportDataMapper
 */
export interface UIState {
  viewMode: 'entity' | 'field' | 'global';
  showGuidedWalkthrough: boolean;
  guidedStep: number;
  showFieldHelp: string | null;
  validStructuredData: boolean;
  isEntityUpdateMode: boolean;
}

/**
 * Custom hook for managing UI state in the SportDataMapper component
 * 
 * This hook follows the single responsibility principle and only manages
 * the UI state without any data dependencies.
 */
export function useUiState(initialState?: Partial<UIState>) {
  // Initialize state with defaults or provided values
  const [viewMode, setViewMode] = useState<'entity' | 'field' | 'global'>(
    initialState?.viewMode || 'entity'
  );
  
  // Guided walkthrough state
  const [showGuidedWalkthrough, setShowGuidedWalkthrough] = useState<boolean>(
    initialState?.showGuidedWalkthrough || false
  );
  const [guidedStep, setGuidedStep] = useState<number>(
    initialState?.guidedStep || 1
  );
  
  // Field help state
  const [showFieldHelp, setShowFieldHelp] = useState<string | null>(
    initialState?.showFieldHelp || null
  );
  
  // Data validation state
  const [validStructuredData, setValidStructuredData] = useState<boolean>(
    initialState?.validStructuredData !== undefined ? initialState.validStructuredData : true
  );
  
  // Entity update mode state
  const [isEntityUpdateMode, setIsEntityUpdateMode] = useState<boolean>(
    initialState?.isEntityUpdateMode || false
  );
  
  /**
   * Toggle the view mode between entity, field, and global
   */
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => {
      if (prev === 'entity') return 'field';
      if (prev === 'field') return 'global';
      return 'entity';
    });
  }, []);
  
  /**
   * Start the guided walkthrough
   */
  const startGuidedWalkthrough = useCallback(() => {
    setShowGuidedWalkthrough(true);
    setGuidedStep(1);
  }, []);
  
  /**
   * End the guided walkthrough
   */
  const endGuidedWalkthrough = useCallback(() => {
    setShowGuidedWalkthrough(false);
    setGuidedStep(1);
  }, []);
  
  /**
   * Go to the next step in the guided walkthrough
   */
  const nextGuidedStep = useCallback(() => {
    setGuidedStep(prev => prev + 1);
  }, []);
  
  /**
   * Go to the previous step in the guided walkthrough
   */
  const previousGuidedStep = useCallback(() => {
    setGuidedStep(prev => Math.max(1, prev - 1));
  }, []);
  
  /**
   * Show help for a specific field
   */
  const showHelpForField = useCallback((fieldName: string) => {
    setShowFieldHelp(fieldName);
  }, []);
  
  /**
   * Hide field help
   */
  const hideFieldHelp = useCallback(() => {
    setShowFieldHelp(null);
  }, []);
  
  /**
   * Set the validity of the structured data
   */
  const setDataValidity = useCallback((isValid: boolean) => {
    setValidStructuredData(isValid);
  }, []);
  
  /**
   * Toggle entity update mode
   */
  const toggleEntityUpdateMode = useCallback(() => {
    setIsEntityUpdateMode(prev => !prev);
  }, []);
  
  // Return current state and functions to manipulate it
  return {
    // State
    viewMode,
    showGuidedWalkthrough,
    guidedStep,
    showFieldHelp,
    validStructuredData,
    isEntityUpdateMode,
    
    // Setters
    setViewMode,
    setShowGuidedWalkthrough,
    setGuidedStep,
    setShowFieldHelp,
    setValidStructuredData,
    setIsEntityUpdateMode,
    
    // Helper functions
    toggleViewMode,
    startGuidedWalkthrough,
    endGuidedWalkthrough,
    nextGuidedStep,
    previousGuidedStep,
    showHelpForField,
    hideFieldHelp,
    setDataValidity,
    toggleEntityUpdateMode
  };
}

export default useUiState;