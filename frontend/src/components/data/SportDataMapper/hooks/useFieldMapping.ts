import { useState, useCallback, useMemo } from 'react';
import { EntityType } from '../../../../utils/sportDataMapper';
import { fingerprint, areEqual } from '../../../../utils/fingerprint';

/**
 * Custom hook for managing field mappings in the SportDataMapper component
 * Optimized with fingerprinting for better performance
 */
export const useFieldMapping = (initialEntityType: EntityType | null = null) => {
  // State for field mappings
  const [mappingsByEntityType, setMappingsByEntityType] = useState<Record<string, Record<string, string>>>({});
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(initialEntityType);
  const [lastOperationFingerprints, setLastOperationFingerprints] = useState<Record<string, string>>({});
  
  /**
   * Handle field mapping when a source field is dropped onto a target field
   * Optimized with fingerprinting to prevent unnecessary updates
   */
  const handleFieldMapping = useCallback((sourceField: string, targetField: string) => {
    if (!selectedEntityType) return;
    
    // Generate a fingerprint for this operation to detect duplicate calls
    const operationFingerprint = fingerprint({ source: sourceField, target: targetField, type: selectedEntityType });
    
    // Skip if this is a duplicate operation
    if (operationFingerprint === lastOperationFingerprints.handleFieldMapping) {
      console.log('Skipping duplicate mapping operation');
      return;
    }
    
    console.log(`Creating mapping: source=${sourceField}, target=${targetField}`);
    
    setMappingsByEntityType(prev => {
      // Create a new mapping object for the current entity type if it doesn't exist
      const currentMappings = prev[selectedEntityType] || {};
      
      // Check if the mapping already exists
      if (currentMappings[targetField] === sourceField) {
        return prev; // No change needed
      }
      
      // Store mapping with database field (target) as key and source field as value
      const updatedMappings = {
        ...currentMappings,
        [targetField]: sourceField  // e.g., { "name": "League Name" }
      };
      
      // Update the last operation fingerprint
      setLastOperationFingerprints(prev => ({
        ...prev,
        handleFieldMapping: operationFingerprint
      }));
      
      // Return the updated mappings by entity type
      return {
        ...prev,
        [selectedEntityType]: updatedMappings
      };
    });
  }, [selectedEntityType, lastOperationFingerprints]);
  
  /**
   * Clear all mappings for the current entity type
   */
  const clearMappings = useCallback(() => {
    if (!selectedEntityType) return;
    
    // Generate a fingerprint to detect duplicate calls
    const operationFingerprint = fingerprint({ action: 'clearMappings', type: selectedEntityType });
    
    // Skip if this is a duplicate operation
    if (operationFingerprint === lastOperationFingerprints.clearMappings) {
      return;
    }
    
    setMappingsByEntityType(prev => {
      // If there are no mappings for this entity type, skip the update
      if (!prev[selectedEntityType] || Object.keys(prev[selectedEntityType]).length === 0) {
        return prev;
      }
      
      // Update the last operation fingerprint
      setLastOperationFingerprints(prev => ({
        ...prev,
        clearMappings: operationFingerprint
      }));
      
      return {
        ...prev,
        [selectedEntityType]: {}
      };
    });
  }, [selectedEntityType, lastOperationFingerprints]);
  
  /**
   * Remove a specific mapping for the current entity type
   */
  const removeMapping = useCallback((targetField: string) => {
    if (!selectedEntityType) return;
    
    // Generate a fingerprint for this operation to detect duplicate calls
    const operationFingerprint = fingerprint({ action: 'removeMapping', field: targetField, type: selectedEntityType });
    
    // Skip if this is a duplicate operation
    if (operationFingerprint === lastOperationFingerprints.removeMapping) {
      return;
    }
    
    setMappingsByEntityType(prev => {
      const currentMappings = { ...prev[selectedEntityType] };
      
      // If the mapping doesn't exist, skip the update
      if (!(targetField in currentMappings)) {
        return prev;
      }
      
      // Remove the mapping
      delete currentMappings[targetField];
      
      // Update the last operation fingerprint
      setLastOperationFingerprints(prev => ({
        ...prev,
        removeMapping: operationFingerprint
      }));
      
      return {
        ...prev,
        [selectedEntityType]: currentMappings
      };
    });
  }, [selectedEntityType, lastOperationFingerprints]);
  
  /**
   * Get the current mappings for the selected entity type
   * Memoized to prevent unnecessary recalculations
   */
  const getCurrentMappings = useCallback(() => {
    if (!selectedEntityType) return {};
    return mappingsByEntityType[selectedEntityType] || {};
  }, [selectedEntityType, mappingsByEntityType]);
  
  // Memoize the current mappings for consistent reference
  const currentMappings = useMemo(() => getCurrentMappings(), [getCurrentMappings]);
  
  // Create memoized versions of states for stable references
  const memoizedMappingsByEntityType = useMemo(() => mappingsByEntityType, [fingerprint(mappingsByEntityType)]);
  
  return {
    mappingsByEntityType: memoizedMappingsByEntityType,
    selectedEntityType,
    setSelectedEntityType,
    handleFieldMapping,
    clearMappings,
    removeMapping,
    getCurrentMappings: () => currentMappings
  };
};

export default useFieldMapping;