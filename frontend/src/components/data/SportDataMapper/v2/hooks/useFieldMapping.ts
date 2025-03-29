import { useState, useCallback, useMemo } from 'react';
import { EntityType } from '../../../../../utils/sportDataMapper';

/**
 * Type definition for field mappings structure
 */
export interface FieldMappings {
  [entityType: string]: {
    [targetField: string]: string; // Maps target field to source field
  }
}

/**
 * Custom hook for managing field mappings in the SportDataMapper component
 * 
 * This hook manages the mappings between source fields and target entity fields,
 * organized by entity type.
 */
export function useFieldMapping(initialEntityType: EntityType | null = null) {
  // State for field mappings by entity type
  const [mappingsByEntityType, setMappingsByEntityType] = useState<FieldMappings>({});
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(initialEntityType);
  
  /**
   * Handle field mapping when a source field is dropped onto a target field
   */
  const handleFieldMapping = useCallback((sourceField: string, targetField: string) => {
    if (!selectedEntityType) return;
    
    console.log(`Creating mapping: source=${sourceField}, target=${targetField}`);
    
    setMappingsByEntityType(prev => {
      // Create a new mapping object for the current entity type if it doesn't exist
      const currentMappings = prev[selectedEntityType] || {};
      
      // Store mapping with database field (target) as key and source field as value
      const updatedMappings = {
        ...currentMappings,
        [targetField]: sourceField  // e.g., { "name": "League Name" }
      };
      
      console.log('Updated mappings:', updatedMappings);
      
      // Return the updated mappings by entity type
      return {
        ...prev,
        [selectedEntityType]: updatedMappings
      };
    });
  }, [selectedEntityType]);
  
  /**
   * Clear all mappings for the current entity type
   */
  const clearMappings = useCallback(() => {
    if (!selectedEntityType) return;
    
    setMappingsByEntityType(prev => ({
      ...prev,
      [selectedEntityType]: {}
    }));
  }, [selectedEntityType]);
  
  /**
   * Remove a specific mapping for the current entity type
   */
  const removeMapping = useCallback((targetField: string) => {
    if (!selectedEntityType) return;
    
    setMappingsByEntityType(prev => {
      const currentMappings = { ...prev[selectedEntityType] };
      delete currentMappings[targetField];
      
      return {
        ...prev,
        [selectedEntityType]: currentMappings
      };
    });
  }, [selectedEntityType]);
  
  /**
   * Get the current mappings for the selected entity type
   */
  const currentMappings = useMemo(() => {
    if (!selectedEntityType) return {};
    return mappingsByEntityType[selectedEntityType] || {};
  }, [selectedEntityType, mappingsByEntityType]);
  
  /**
   * Check if a target field has a mapping
   */
  const hasMapping = useCallback((targetField: string) => {
    if (!selectedEntityType) return false;
    const entityMappings = mappingsByEntityType[selectedEntityType] || {};
    return !!entityMappings[targetField];
  }, [selectedEntityType, mappingsByEntityType]);
  
  /**
   * Get the source field for a given target field
   */
  const getSourceField = useCallback((targetField: string) => {
    if (!selectedEntityType) return null;
    const entityMappings = mappingsByEntityType[selectedEntityType] || {};
    return entityMappings[targetField] || null;
  }, [selectedEntityType, mappingsByEntityType]);
  
  /**
   * Get all target fields that have mappings
   */
  const getMappedTargetFields = useMemo(() => {
    if (!selectedEntityType) return [];
    const entityMappings = mappingsByEntityType[selectedEntityType] || {};
    return Object.keys(entityMappings);
  }, [selectedEntityType, mappingsByEntityType]);
  
  /**
   * Reset all mappings for all entity types
   */
  const resetAllMappings = useCallback(() => {
    setMappingsByEntityType({});
  }, []);
  
  return {
    // State
    mappingsByEntityType,
    selectedEntityType,
    currentMappings,
    
    // Setters
    setSelectedEntityType,
    setMappingsByEntityType,
    
    // Actions
    handleFieldMapping,
    clearMappings,
    removeMapping,
    resetAllMappings,
    
    // Selectors
    hasMapping,
    getSourceField,
    getMappedTargetFields
  };
}

export default useFieldMapping;