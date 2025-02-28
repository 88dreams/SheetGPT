import { useState } from 'react';

/**
 * Custom hook for managing UI state in the SportDataMapper component
 */
export default function useUiState() {
  // View mode state
  const [viewMode, setViewMode] = useState<'entity' | 'global'>('entity');
  
  // Guided walkthrough state
  const [showGuidedWalkthrough, setShowGuidedWalkthrough] = useState<boolean>(false);
  const [guidedStep, setGuidedStep] = useState<number>(1);
  
  // Field help state
  const [showFieldHelp, setShowFieldHelp] = useState<string | null>(null);
  
  // Data validation state
  const [validStructuredData, setValidStructuredData] = useState<boolean>(true);
  
  /**
   * Toggle the view mode between entity and global
   */
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'entity' ? 'global' : 'entity');
  };
  
  /**
   * Start the guided walkthrough
   */
  const startGuidedWalkthrough = () => {
    setShowGuidedWalkthrough(true);
    setGuidedStep(1);
  };
  
  /**
   * End the guided walkthrough
   */
  const endGuidedWalkthrough = () => {
    setShowGuidedWalkthrough(false);
    setGuidedStep(1);
  };
  
  /**
   * Go to the next step in the guided walkthrough
   */
  const nextGuidedStep = () => {
    setGuidedStep(prev => prev + 1);
  };
  
  /**
   * Go to the previous step in the guided walkthrough
   */
  const previousGuidedStep = () => {
    setGuidedStep(prev => Math.max(1, prev - 1));
  };
  
  /**
   * Show help for a specific field
   */
  const showHelpForField = (fieldName: string) => {
    setShowFieldHelp(fieldName);
  };
  
  /**
   * Hide field help
   */
  const hideFieldHelp = () => {
    setShowFieldHelp(null);
  };
  
  /**
   * Set the validity of the structured data
   */
  const setDataValidity = (isValid: boolean) => {
    setValidStructuredData(isValid);
  };
  
  return {
    // State
    viewMode,
    showGuidedWalkthrough,
    guidedStep,
    showFieldHelp,
    validStructuredData,
    
    // Setters
    setViewMode,
    setShowGuidedWalkthrough,
    setGuidedStep,
    setShowFieldHelp,
    setValidStructuredData,
    
    // Helper functions
    toggleViewMode,
    startGuidedWalkthrough,
    endGuidedWalkthrough,
    nextGuidedStep,
    previousGuidedStep,
    showHelpForField,
    hideFieldHelp,
    setDataValidity
  };
} 