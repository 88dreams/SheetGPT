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
  console.log('--- RUNNING NEW useColumnVisibility CODE ---');
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
    availableFields.forEach(fieldKey => {
      // Simpler heuristic for default UUID hiding: hide if ends with _id or is 'id'
      // User can override this with column selector.
      // The original logic to check for a corresponding _name field is complex without full entity data here.
      const isLikelyIdField = fieldKey === 'id' || fieldKey.endsWith('_id');
      newVisibility[fieldKey] = !isLikelyIdField;
    });
    return newVisibility;
  }, [availableFields]);

  /**
   * Initialize columns based on entity data when entity type or data changes
   */
  useEffect(() => {
    if (!entityType || availableFields.length === 0) {
      // If no entity type or no fields from columnsConfigArray, don't proceed or clear visibility
      // setVisibleColumns({}); // Optionally clear if desired when no columns
      return;
    }
    
    const storageKey = `entityList_${entityType}_columns`;
    let savedVisibilityJson = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    
    let newVisibilityState: {[key: string]: boolean} = {};
    
    if (savedVisibilityJson) {
      try {
        const parsedVisibility = JSON.parse(savedVisibilityJson);
        newVisibilityState = { ...parsedVisibility };
        
        // Ensure all current availableFields are in the visibility state
        availableFields.forEach(fieldKey => {
          if (newVisibilityState[fieldKey] === undefined) {
            const isLikelyIdField = fieldKey === 'id' || fieldKey.endsWith('_id');
            newVisibilityState[fieldKey] = !isLikelyIdField; // Default for new fields
          }
        });
      } catch (e) {
        console.error('Error parsing saved column visibility:', e);
        newVisibilityState = getInitialVisibility();
      }
    } else {
      newVisibilityState = getInitialVisibility();
    }
    
    // Special handling for entity visibility but respect user preferences
    // This part seems to rely on availableFields from the data, not just column config keys.
    // It might need adjustment if it's trying to show/hide columns not in columnsConfigArray.
    // For now, assuming the fields mentioned will be in columnsConfigArray if relevant.
    if (entityType === 'broadcast' || entityType === 'production') {
      if ('name' in newVisibilityState && availableFields.includes('name')) {
        // This logic might need to be more nuanced based on desired default displayed name for these types
        // For now, if a generic 'name' column exists from config, it respects saved or initial visibility.
        // If the goal was to always hide a generic 'name' if specific name fields like 'broadcast_company_name' exist,
        // that would require more complex logic here or in getInitialVisibility.
      }
      
      if (Object.keys(newVisibilityState).length === 0 || !savedVisibilityJson) { // Apply defaults if empty or no saved state
        const defaultVisibleForType: string[] = [];
        if (entityType === 'broadcast') {
          defaultVisibleForType.push('broadcast_company_name', 'territory', 'league_name', 'entity_name', 'entity_type');
        } else if (entityType === 'production') {
          defaultVisibleForType.push('production_company_name', 'entity_name', 'entity_type', 'service_type');
        }
        defaultVisibleForType.forEach(fieldKey => {
          if (availableFields.includes(fieldKey)) { // Check against fields derived from columnsConfigArray
            newVisibilityState[fieldKey] = true;
          }
        });
      }
    }
    setVisibleColumns(newVisibilityState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, columnsConfigArray, availableFields, getInitialVisibility]); // getInitialVisibility is now a stable callback

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