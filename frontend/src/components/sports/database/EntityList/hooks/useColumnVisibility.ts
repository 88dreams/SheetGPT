import { useState, useEffect, useMemo, useCallback } from 'react';
import { EntityType } from '../../../../../types/sports';

interface ColumnConfigItem {
  key: string;
  label: string;
  type: string;
  // Add other properties if they exist on the items in generatedColumnsArray
}

/**
 * Hook for managing column visibility
 */
export function useColumnVisibility(entityType: EntityType, columnsConfigArray: ColumnConfigItem[]) {
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<{[key: string]: boolean}>({});
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
  const [showFullUuids, setShowFullUuids] = useState<boolean>(false);

  // Derive availableFields from columnsConfigArray.key, memoized
  const availableFields = useMemo(() => {
    if (!Array.isArray(columnsConfigArray) || columnsConfigArray.length === 0) return [];
    return columnsConfigArray.map(colConfig => colConfig.key);
  }, [columnsConfigArray]);

  // Generate initial column visibility based on availableFields derived from columnsConfigArray
  const getInitialVisibility = useCallback(() => {
    if (availableFields.length === 0) return {};
    
    let newVisibility: {[key: string]: boolean} = {};
    const fieldsToHideByDefault = ['id', 'created_at', 'updated_at', 'deleted_at']; // Add our target fields

    availableFields.forEach(fieldKey => {
      const isLikelyIdField = fieldKey.endsWith('_id'); // Keep this for other _id fields
      
      if (fieldsToHideByDefault.includes(fieldKey) || isLikelyIdField) {
        newVisibility[fieldKey] = false;
      } else {
        newVisibility[fieldKey] = true;
      }
    });
    return newVisibility;
  }, [availableFields]);

  /**
   * Initialize columns based on entity data when entity type or data changes
   */
  useEffect(() => {
    if (!entityType || availableFields.length === 0) {
      return;
    }
    
    const storageKey = `entityList_${entityType}_columns`;
    const savedVisibilityJson = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    
    let finalVisibilityState: {[key: string]: boolean} = {};
    const initialDefaults = getInitialVisibility(); // Defines our base defaults
    const fieldsToForceHide = ['created_at', 'updated_at', 'deleted_at'];

    if (savedVisibilityJson) {
      try {
        const parsedSavedVisibility = JSON.parse(savedVisibilityJson);
        // Initialize with ideal defaults for all available fields
        availableFields.forEach(fieldKey => {
          finalVisibilityState[fieldKey] = initialDefaults[fieldKey] !== undefined 
            ? initialDefaults[fieldKey] 
            : true; // Default to true if not in initialDefaults (should be rare)
        });

        // Override with saved user preferences, EXCEPT for fields we want to force hide
        for (const fieldKey in parsedSavedVisibility) {
          if (availableFields.includes(fieldKey) && !fieldsToForceHide.includes(fieldKey)) {
            finalVisibilityState[fieldKey] = parsedSavedVisibility[fieldKey];
          }
        }
        // Ensure forced hidden fields are indeed false, even if storage had them true
        fieldsToForceHide.forEach(fieldToHide => {
            if (availableFields.includes(fieldToHide)) {
                finalVisibilityState[fieldToHide] = false;
            }
        });

      } catch (e) {
        console.error('Error parsing saved column visibility, using initial defaults with overrides:', e);
        finalVisibilityState = { ...initialDefaults };
        // Re-apply force hide over potentially faulty initialDefaults if error occurred during parse
        fieldsToForceHide.forEach(fieldToHide => {
            if (availableFields.includes(fieldToHide)) {
                finalVisibilityState[fieldToHide] = false;
            }
        });
      }
    } else {
      // No saved state, use initial defaults (which already hides these fields correctly)
      finalVisibilityState = { ...initialDefaults };
    }
    
    // Special handling for 'broadcast' or 'production_service' default visible columns
    // This applies if it's effectively a "new" view for this entity type for the user
    if (entityType === 'broadcast' || entityType === 'production_service') { // Ensure type is correct
      const isEffectivelyNewOrResetState = !savedVisibilityJson || 
                                         (savedVisibilityJson && Object.keys(JSON.parse(savedVisibilityJson)).length === 0) ||
                                         (finalVisibilityState === initialDefaults);

      if (isEffectivelyNewOrResetState) {
        const defaultVisibleForType: string[] = [];
        if (entityType === 'broadcast') {
          defaultVisibleForType.push('broadcast_company_name', 'territory', 'league_name', 'entity_name', 'entity_type');
        } else if (entityType === 'production_service') { // Ensure type is correct
          defaultVisibleForType.push('production_company_name', 'entity_name', 'entity_type', 'service_type');
        }
        defaultVisibleForType.forEach(fieldKey => {
          if (availableFields.includes(fieldKey) && !fieldsToForceHide.includes(fieldKey)) {
            finalVisibilityState[fieldKey] = true;
          }
        });
      }
    }

    setVisibleColumns(finalVisibilityState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, columnsConfigArray, availableFields, getInitialVisibility]); // getInitialVisibility is stable

  // Save column visibility to both localStorage and sessionStorage
  useEffect(() => {
    if (Object.keys(visibleColumns).length > 0 && entityType) {
      const storageKey = `entityList_${entityType}_columns`;
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
      sessionStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, entityType]);

  // Toggle visibility of all columns
  const showAllColumns = useCallback(() => {
    if (availableFields.length === 0) return;
    const allVisible = availableFields.reduce((acc, fieldKey) => {
      acc[fieldKey] = true;
      return acc;
    }, {} as {[key: string]: boolean});
    setVisibleColumns(allVisible);
  }, [availableFields]);

  // Toggle a single column's visibility
  const toggleColumnVisibility = useCallback((fieldKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  }, []);

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