import { useState, useCallback } from 'react';
import { EntityType } from '../../../../utils/sportDataMapper';

/**
 * Custom hook for managing field mappings in the SportDataMapper component
 */
export const useFieldMapping = (initialEntityType: EntityType | null = null) => {
  // State for field mappings
  const [mappingsByEntityType, setMappingsByEntityType] = useState<Record<string, Record<string, string>>>({});
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
  const getCurrentMappings = useCallback(() => {
    if (!selectedEntityType) return {};
    return mappingsByEntityType[selectedEntityType] || {};
  }, [selectedEntityType, mappingsByEntityType]);
  
  return {
    mappingsByEntityType,
    selectedEntityType,
    setSelectedEntityType,
    handleFieldMapping,
    clearMappings,
    removeMapping,
    getCurrentMappings
  };
};

export default useFieldMapping; 