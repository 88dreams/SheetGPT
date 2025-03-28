import { useState, useEffect } from 'react';
import { EntityType } from '../../../../../types/sports';

/**
 * Hook for managing column visibility
 */
export function useColumnVisibility(entityType: EntityType, entities: any[]) {
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<{[key: string]: boolean}>({});
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
  const [showFullUuids, setShowFullUuids] = useState<boolean>(false);

  // Generate initial column order based on entity data
  const getInitialVisibility = () => {
    if (!Array.isArray(entities) || entities.length === 0) return {};
    
    // Get fields directly from the data
    const availableFields = Object.keys(entities[0]);
    
    // Set up default visibility
    let newVisibility: {[key: string]: boolean} = {};
    
    availableFields.forEach(field => {
      // Check if this is a UUID field
      const hasCorrespondingNameField = availableFields.includes(field.replace('_id', '_name'));
      const isUuidField = field === 'id' || (field.endsWith('_id') && !hasCorrespondingNameField);
      
      // Hide all UUID fields by default
      if (isUuidField) {
        newVisibility[field] = false;
      } else {
        newVisibility[field] = true;
      }
    });
    
    return newVisibility;
  };

  /**
   * Initialize columns based on entity data when entity type or data changes
   */
  useEffect(() => {
    if (!entityType || !Array.isArray(entities) || entities.length === 0) return;
    
    // Get fields directly from the data
    const availableFields = Object.keys(entities[0]);
    
    // Create a consistent key for storage
    const storageKey = `entityList_${entityType}_columns`;
    
    // Try to load saved column visibility from sessionStorage first, then localStorage
    let savedVisibility = sessionStorage.getItem(storageKey);
    // If not in sessionStorage, try localStorage
    if (!savedVisibility) {
      savedVisibility = localStorage.getItem(storageKey);
    }
    
    let newVisibility: {[key: string]: boolean} = {};
    
    if (savedVisibility) {
      try {
        // Start with saved visibility settings
        const parsedVisibility = JSON.parse(savedVisibility);
        newVisibility = { ...parsedVisibility };
        
        // Add any new fields that might not be in saved settings
        availableFields.forEach(field => {
          if (newVisibility[field] === undefined) {
            // Check if this is a UUID field
            const hasCorrespondingNameField = availableFields.includes(field.replace('_id', '_name'));
            const isUuidField = field === 'id' || (field.endsWith('_id') && !hasCorrespondingNameField);
            
            // Hide all UUID fields by default
            newVisibility[field] = !isUuidField;
          }
        });
      } catch (e) {
        console.error('Error parsing saved column visibility:', e);
        // Fall back to default visibility if we can't parse saved settings
        newVisibility = getInitialVisibility();
      }
    } else {
      // If we don't have saved visibility settings, set up defaults
      newVisibility = getInitialVisibility();
    }
    
    // Special handling for entity visibility but respect user preferences
    if (entityType === 'broadcast' || entityType === 'production') {
      // Remove the generic name field for broadcast and production services
      if ('name' in newVisibility) {
        delete newVisibility['name'];
      }
      
      // Set default visible fields for first load
      if (Object.keys(newVisibility).length === 0) {
        if (entityType === 'broadcast') {
          // Default visible fields for broadcast rights
          ['broadcast_company_name', 'territory', 'league_name', 'entity_name', 'entity_type'].forEach(field => {
            if (availableFields.includes(field)) {
              newVisibility[field] = true;
            }
          });
        } else if (entityType === 'production') {
          // Default visible fields for production services
          ['production_company_name', 'entity_name', 'entity_type', 'service_type'].forEach(field => {
            if (availableFields.includes(field)) {
              newVisibility[field] = true;
            }
          });
        }
      }
    }
    
    // Set visibility state
    setVisibleColumns(newVisibility);
  }, [entityType, entities]);

  // Save column visibility to both localStorage and sessionStorage
  useEffect(() => {
    if (Object.keys(visibleColumns).length > 0 && entityType) {
      const storageKey = `entityList_${entityType}_columns`;
      // Save to localStorage for persistence across sessions
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
      // Also save to sessionStorage for quick access within the current session
      sessionStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, entityType]);

  // Toggle visibility of all columns
  const showAllColumns = () => {
    if (!Array.isArray(entities) || entities.length === 0) return;
    
    // Get fields directly from the data
    const availableFields = Object.keys(entities[0]);
    
    const allVisible = availableFields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {} as {[key: string]: boolean});
    
    setVisibleColumns(allVisible);
  };

  // Toggle a single column's visibility
  const toggleColumnVisibility = (field: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return {
    visibleColumns,
    setVisibleColumns,
    showColumnSelector,
    setShowColumnSelector,
    showFullUuids,
    setShowFullUuids,
    toggleColumnVisibility,
    showAllColumns
  };
}